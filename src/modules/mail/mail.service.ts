import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MailMessageStatus, MailRecipientType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentPortalUserContext } from '../../common/interfaces/current-portal-user.interface';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { OrganizationAccessService } from '../../common/services/organization-access.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateMailMessageDto } from './dto/create-mail-message.dto';
import { MailContactsQueryDto } from './dto/mail-contacts-query.dto';
import { MailQueryDto } from './dto/mail-query.dto';
import { ReplyMailMessageDto } from './dto/reply-mail-message.dto';
import { UpdateMailDraftDto } from './dto/update-mail-draft.dto';

type MailActor = {
  organizationId: string;
  email: string;
  displayName: string;
  kind: 'USER' | 'PORTAL';
};

type MailFolder = 'inbox' | 'sent' | 'drafts' | 'starred' | 'trash' | 'all';

type MailRecipientPayload = {
  email: string;
  name?: string;
  recipientType?: MailRecipientType;
};

type MailAudienceGroup = 'STAFF' | 'TEACHER' | 'STUDENT' | 'PARENT';

type MailState = {
  readAt: Date | null;
  starredAt: Date | null;
  archivedAt: Date | null;
  trashedAt: Date | null;
};

function hasUserId(actor: CurrentUserContext | CurrentPortalUserContext): actor is CurrentUserContext {
  return 'userId' in actor;
}

@Injectable()
export class MailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  async listMailbox(query: MailQueryDto, actor: CurrentUserContext | CurrentPortalUserContext, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    const where = this.buildFolderWhere(query.folder ?? 'inbox', mailActor.email, mailActor.organizationId, query.search);
    const orderBy = this.resolveOrderBy(query.folder ?? 'inbox');

    const [items, total, counts] = await Promise.all([
      this.prisma.mailMessage.findMany({
        where,
        include: {
          conversation: true,
          recipients: true,
        },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.mailMessage.count({ where }),
      this.resolveFolderCounts(mailActor.organizationId, mailActor.email),
    ]);

    return {
      items: items.map((item) => this.serializeMessage(item, mailActor.email, query.folder ?? 'inbox')),
      total,
      page: query.page,
      limit: query.limit,
      counts,
    };
  }

  async getConversation(conversationId: string, actor: CurrentUserContext | CurrentPortalUserContext, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    const conversation = await this.prisma.mailConversation.findFirst({
      where: {
        id: conversationId,
        organizationId: mailActor.organizationId,
      },
      include: {
        messages: {
          include: {
            recipients: true,
            conversation: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Mail conversation not found');
    }

    return {
      ...conversation,
      messages: conversation.messages.map((message) => this.serializeMessage(message, mailActor.email, 'all')),
    };
  }

  async createDraft(payload: CreateMailMessageDto, actor: CurrentUserContext | CurrentPortalUserContext, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    const normalizedRecipients = this.normalizeRecipients(payload.recipients, payload.sendNow === false);
    const conversation = await this.resolveConversation(payload.conversationId, payload.subject, mailActor);
    const message = await this.prisma.mailMessage.create({
      data: {
        organizationId: mailActor.organizationId,
        conversationId: conversation.id,
        senderEmail: mailActor.email,
        senderName: mailActor.displayName,
        subject: payload.subject.trim(),
        body: payload.body.trim(),
        status: payload.sendNow === false ? MailMessageStatus.DRAFT : MailMessageStatus.SENT,
        sentAt: payload.sendNow === false ? null : new Date(),
        recipients: {
          create: normalizedRecipients.map((recipient) => ({
            email: recipient.email,
            name: recipient.name ?? null,
            recipientType: recipient.recipientType ?? MailRecipientType.TO,
          })),
        },
      },
      include: {
        conversation: true,
        recipients: true,
      },
    });

    if (payload.sendNow !== false) {
      await this.prisma.mailConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: message.sentAt ?? new Date() },
      });
    }

    await this.auditLogService.log({
      actorUserId: hasUserId(actor) ? actor.userId : undefined,
      module: 'mail',
      action: payload.sendNow === false ? 'create-draft' : 'send',
      targetId: message.id,
      metadata: {
        conversationId: conversation.id,
        recipients: message.recipients.map((recipient) => recipient.email),
        subject: message.subject,
        status: message.status,
      },
    });

    return this.serializeMessage(message, mailActor.email, 'all');
  }

  async updateDraft(id: string, payload: UpdateMailDraftDto, actor: CurrentUserContext | CurrentPortalUserContext, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    const message = await this.assertEditableDraft(id, mailActor.organizationId, mailActor.email);
    const normalizedRecipients = payload.recipients ? this.normalizeRecipients(payload.recipients, true) : null;

    const updated = await this.prisma.mailMessage.update({
      where: { id: message.id },
      data: {
        subject: payload.subject?.trim(),
        body: payload.body?.trim(),
        recipients: normalizedRecipients
          ? {
              deleteMany: {},
              create: normalizedRecipients.map((recipient) => ({
                email: recipient.email,
                name: recipient.name ?? null,
                recipientType: recipient.recipientType ?? MailRecipientType.TO,
              })),
            }
          : undefined,
      },
      include: {
        conversation: true,
        recipients: true,
      },
    });

    await this.auditLogService.log({
      actorUserId: hasUserId(actor) ? actor.userId : undefined,
      module: 'mail',
      action: 'update-draft',
      targetId: updated.id,
      metadata: { conversationId: updated.conversationId, subject: updated.subject },
    });

    return this.serializeMessage(updated, mailActor.email, 'drafts');
  }

  async sendDraft(id: string, actor: CurrentUserContext | CurrentPortalUserContext, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    const message = await this.assertEditableDraft(id, mailActor.organizationId, mailActor.email);

    const sent = await this.prisma.mailMessage.update({
      where: { id: message.id },
      data: {
        status: MailMessageStatus.SENT,
        sentAt: new Date(),
      },
      include: {
        conversation: true,
        recipients: true,
      },
    });

    await this.prisma.mailConversation.update({
      where: { id: sent.conversationId },
      data: { lastMessageAt: sent.sentAt ?? new Date() },
    });

    await this.auditLogService.log({
      actorUserId: hasUserId(actor) ? actor.userId : undefined,
      module: 'mail',
      action: 'send-draft',
      targetId: sent.id,
      metadata: { conversationId: sent.conversationId, subject: sent.subject },
    });

    return this.serializeMessage(sent, mailActor.email, 'sent');
  }

  async reply(conversationId: string, payload: ReplyMailMessageDto, actor: CurrentUserContext | CurrentPortalUserContext, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    const conversation = await this.prisma.mailConversation.findFirst({
      where: {
        id: conversationId,
        organizationId: mailActor.organizationId,
      },
      include: {
        messages: {
          include: {
            recipients: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Mail conversation not found');
    }

    const participants = new Map<string, MailRecipientPayload>();
    for (const message of conversation.messages) {
      participants.set(message.senderEmail.toLowerCase(), {
        email: message.senderEmail,
        name: message.senderName,
      });
      for (const recipient of message.recipients) {
        participants.set(recipient.email.toLowerCase(), {
          email: recipient.email,
          name: recipient.name ?? undefined,
          recipientType: recipient.recipientType,
        });
      }
    }

    const normalizedRecipients = this.normalizeRecipients(
      payload.recipients?.length
        ? payload.recipients
        : [...participants.values()].filter((recipient) => recipient.email.toLowerCase() !== mailActor.email.toLowerCase()),
    );

    const message = await this.prisma.mailMessage.create({
      data: {
        organizationId: mailActor.organizationId,
        conversationId: conversation.id,
        senderEmail: mailActor.email,
        senderName: mailActor.displayName,
        subject: conversation.subject,
        body: payload.body.trim(),
        status: MailMessageStatus.SENT,
        sentAt: new Date(),
        recipients: {
          create: normalizedRecipients.map((recipient) => ({
            email: recipient.email,
            name: recipient.name ?? null,
            recipientType: recipient.recipientType ?? MailRecipientType.TO,
          })),
        },
      },
      include: {
        conversation: true,
        recipients: true,
      },
    });

    await this.prisma.mailConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: message.sentAt ?? new Date() },
    });

    await this.auditLogService.log({
      actorUserId: hasUserId(actor) ? actor.userId : undefined,
      module: 'mail',
      action: 'reply',
      targetId: message.id,
      metadata: { conversationId: conversation.id, subject: message.subject },
    });

    return this.serializeMessage(message, mailActor.email, 'sent');
  }

  async markRead(id: string, actor: CurrentUserContext | CurrentPortalUserContext, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    await this.updateCurrentState(id, mailActor, { readAt: new Date() });
    return { updated: true };
  }

  async toggleStar(id: string, actor: CurrentUserContext | CurrentPortalUserContext, starred: boolean, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    await this.updateCurrentState(id, mailActor, { starredAt: starred ? new Date() : null });
    return { starred };
  }

  async archive(id: string, actor: CurrentUserContext | CurrentPortalUserContext, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    await this.updateCurrentState(id, mailActor, { archivedAt: new Date(), trashedAt: null });
    return { archived: true };
  }

  async trash(id: string, actor: CurrentUserContext | CurrentPortalUserContext, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    await this.updateCurrentState(id, mailActor, { trashedAt: new Date() });
    return { trashed: true };
  }

  async restore(id: string, actor: CurrentUserContext | CurrentPortalUserContext, organizationId?: string) {
    const mailActor = await this.resolveActor(actor, organizationId);
    await this.updateCurrentState(id, mailActor, { archivedAt: null, trashedAt: null });
    return { restored: true };
  }

  async getContacts(query: MailContactsQueryDto, actor: CurrentUserContext | CurrentPortalUserContext) {
    const mailActor = await this.resolveActor(actor, query.organizationId);
    const search = query.search?.trim();
    const limit = query.limit ?? 50;
    const audienceFilters = this.normalizeAudienceFilters(query.audience);
    const hasAudienceFilters = audienceFilters.length > 0;
    const includeStaff = !hasAudienceFilters || audienceFilters.includes('STAFF');
    const includeTeachers = !hasAudienceFilters || audienceFilters.includes('TEACHER');
    const includeStudents = !hasAudienceFilters || audienceFilters.includes('STUDENT');
    const includeParents = !hasAudienceFilters || audienceFilters.includes('PARENT');

    let users: Array<{
      firstName: string;
      lastName: string;
      email: string;
      userRoles: Array<{ role: { name: string } }>;
    }> = [];
    let teachers: Array<{
      fullName: string;
      email: string | null;
    }> = [];

    if (includeStaff) {
      users = await this.prisma.user.findMany({
        where: {
          organizationId: mailActor.organizationId,
          ...(search
            ? {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          userRoles: {
            select: {
              role: {
                select: { name: true },
              },
            },
          },
        },
        take: limit,
      });
    }

    if (includeTeachers) {
      teachers = await this.prisma.teacher.findMany({
        where: {
          organizationId: mailActor.organizationId,
          ...(search
            ? {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          fullName: true,
          email: true,
        },
        take: limit,
      });
    }

    let portalAccounts: Array<{
      email: string;
      type: 'STUDENT' | 'PARENT';
      student: { fullName: string; guardianName: string };
    }> = [];
    let students: Array<{
      fullName: string;
      guardianName: string;
      email: string | null;
      guardianEmail: string | null;
    }> = [];

    if (mailActor.kind === 'USER' && (includeStudents || includeParents)) {
      if (includeStudents || includeParents) {
        portalAccounts = await this.prisma.portalAccount.findMany({
          where: {
            organizationId: mailActor.organizationId,
            ...(search ? { email: { contains: search, mode: 'insensitive' } } : {}),
            ...(includeStudents && !includeParents
              ? { type: 'STUDENT' }
              : includeParents && !includeStudents
                ? { type: 'PARENT' }
                : {}),
          },
          select: {
            email: true,
            type: true,
            student: {
              select: {
                fullName: true,
                guardianName: true,
              },
            },
          },
          take: limit,
        });
      }

      students = await this.prisma.student.findMany({
        where: {
          organizationId: mailActor.organizationId,
          ...(search
            ? {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                  { guardianEmail: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          fullName: true,
          guardianName: true,
          email: true,
          guardianEmail: true,
        },
        take: limit,
      });
    }

    const contacts = new Map<
      string,
      { email: string; name: string; role: string; kind: 'USER' | 'TEACHER' | 'STUDENT' | 'PORTAL'; audienceGroup: MailAudienceGroup }
    >();

    for (const user of users) {
      contacts.set(user.email.toLowerCase(), {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: user.userRoles.map((item: { role: { name: string } }) => item.role.name).join(', ') || 'Staff',
        kind: 'USER',
        audienceGroup: 'STAFF',
      });
    }

    for (const teacher of teachers) {
      if (!teacher.email) continue;
      contacts.set(teacher.email.toLowerCase(), {
        email: teacher.email,
        name: teacher.fullName,
        role: 'Teacher',
        kind: 'TEACHER',
        audienceGroup: 'TEACHER',
      });
    }

    for (const portalAccount of portalAccounts) {
      const audienceGroup: MailAudienceGroup = portalAccount.type === 'PARENT' ? 'PARENT' : 'STUDENT';
      contacts.set(portalAccount.email.toLowerCase(), {
        email: portalAccount.email,
        name: portalAccount.type === 'PARENT' ? portalAccount.student.guardianName : portalAccount.student.fullName,
        role: portalAccount.type === 'PARENT' ? 'Parent portal' : 'Student portal',
        kind: 'PORTAL',
        audienceGroup,
      });
    }

    for (const student of students) {
      if (includeStudents && student.email) {
        contacts.set(student.email.toLowerCase(), {
          email: student.email,
          name: student.fullName,
          role: 'Student',
          kind: 'STUDENT',
          audienceGroup: 'STUDENT',
        });
      }
      if (includeParents && student.guardianEmail) {
        contacts.set(student.guardianEmail.toLowerCase(), {
          email: student.guardianEmail,
          name: student.guardianName,
          role: 'Guardian',
          kind: 'STUDENT',
          audienceGroup: 'PARENT',
        });
      }
    }

    return [...contacts.values()].sort((left, right) => left.name.localeCompare(right.name)).slice(0, limit);
  }

  private async resolveActor(actor: CurrentUserContext | CurrentPortalUserContext, requestedOrganizationId?: string): Promise<MailActor> {
    if ('accountId' in actor) {
      if (!actor.organizationId) {
        throw new NotFoundException('Organization context is required');
      }

      const student = await this.prisma.student.findFirst({
        where: {
          id: actor.studentId,
          organizationId: actor.organizationId,
        },
        select: {
          fullName: true,
          guardianName: true,
        },
      });

      if (!student) {
        throw new NotFoundException('Portal student context not found');
      }

      return {
        organizationId: actor.organizationId,
        email: actor.email,
        displayName: actor.accountType === 'PARENT' ? student.guardianName : student.fullName,
        kind: 'PORTAL',
      };
    }

    const organizationId = await this.resolveDashboardOrganizationId(actor, requestedOrganizationId);
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        organizationId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User context not found');
    }

    return {
      organizationId,
      email: user.email,
      displayName: `${user.firstName} ${user.lastName}`.trim(),
      kind: 'USER',
    };
  }

  private async resolveDashboardOrganizationId(actor: CurrentUserContext, requestedOrganizationId?: string): Promise<string> {
    if (actor.organizationId) {
      return actor.organizationId;
    }

    if (!actor.roles.includes('SUPER_ADMIN')) {
      throw new NotFoundException('Organization context is required');
    }

    const organizationId = requestedOrganizationId?.trim();
    if (!organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    await this.organizationAccessService.assertOrganizationAccessible(organizationId);
    return organizationId;
  }

  private normalizeAudienceFilters(audience?: string[]): MailAudienceGroup[] {
    const filters = new Set<MailAudienceGroup>();

    for (const value of audience ?? []) {
      const normalized = value.trim().toUpperCase();
      if (normalized === 'STAFF' || normalized === 'TEACHER' || normalized === 'STUDENT' || normalized === 'PARENT') {
        filters.add(normalized);
      }
    }

    return [...filters];
  }

  private async resolveConversation(conversationId: string | undefined, subject: string, actor: MailActor) {
    if (conversationId) {
      const existing = await this.prisma.mailConversation.findFirst({
        where: {
          id: conversationId,
          organizationId: actor.organizationId,
        },
      });

      if (!existing) {
        throw new NotFoundException('Mail conversation not found');
      }

      return existing;
    }

    return this.prisma.mailConversation.create({
      data: {
        organizationId: actor.organizationId,
        subject: subject.trim(),
        createdByEmail: actor.email,
        lastMessageAt: new Date(),
      },
    });
  }

  private normalizeRecipients(recipients: MailRecipientPayload[], allowEmpty = false): MailRecipientPayload[] {
    const unique = new Map<string, MailRecipientPayload>();

    for (const recipient of recipients) {
      const email = recipient.email.trim().toLowerCase();
      if (!email) continue;
      unique.set(email, {
        email,
        name: recipient.name?.trim() || undefined,
        recipientType: recipient.recipientType ?? MailRecipientType.TO,
      });
    }

    if (!unique.size && !allowEmpty) {
      throw new BadRequestException('At least one recipient is required');
    }

    return [...unique.values()];
  }

  private buildFolderWhere(folder: MailFolder, email: string, organizationId: string, search?: string): Prisma.MailMessageWhereInput {
    const normalizedEmail = email.toLowerCase();
    const searchWhere: Prisma.MailMessageWhereInput | undefined = search?.trim()
      ? {
          OR: [
            { subject: { contains: search.trim(), mode: 'insensitive' } },
            { body: { contains: search.trim(), mode: 'insensitive' } },
            { senderEmail: { contains: search.trim(), mode: 'insensitive' } },
            { senderName: { contains: search.trim(), mode: 'insensitive' } },
            {
              recipients: {
                some: {
                  email: { contains: search.trim(), mode: 'insensitive' },
                },
              },
            },
          ],
        }
      : undefined;

    const folderWhere: Record<MailFolder, Prisma.MailMessageWhereInput> = {
      inbox: {
        organizationId,
        status: MailMessageStatus.SENT,
        senderEmail: { not: normalizedEmail },
        recipients: {
          some: {
            email: normalizedEmail,
            trashedAt: null,
            archivedAt: null,
          },
        },
      },
      sent: {
        organizationId,
        senderEmail: normalizedEmail,
        status: MailMessageStatus.SENT,
        senderTrashedAt: null,
      },
      drafts: {
        organizationId,
        senderEmail: normalizedEmail,
        status: MailMessageStatus.DRAFT,
        senderTrashedAt: null,
      },
      starred: {
        organizationId,
        OR: [
          {
            senderEmail: normalizedEmail,
            senderStarredAt: { not: null },
            senderTrashedAt: null,
          },
          {
            recipients: {
              some: {
                email: normalizedEmail,
                starredAt: { not: null },
                trashedAt: null,
              },
            },
          },
        ],
      },
      trash: {
        organizationId,
        OR: [
          {
            senderEmail: normalizedEmail,
            senderTrashedAt: { not: null },
          },
          {
            recipients: {
              some: {
                email: normalizedEmail,
                trashedAt: { not: null },
              },
            },
          },
        ],
      },
      all: {
        organizationId,
        OR: [
          { senderEmail: normalizedEmail },
          {
            recipients: {
              some: { email: normalizedEmail },
            },
          },
        ],
      },
    };

    if (!searchWhere) {
      return folderWhere[folder];
    }

    return {
      AND: [folderWhere[folder], searchWhere],
    };
  }

  private resolveOrderBy(folder: MailFolder): Prisma.MailMessageOrderByWithRelationInput[] {
    if (folder === 'drafts') {
      return [{ updatedAt: 'desc' }];
    }

    return [{ sentAt: 'desc' }, { createdAt: 'desc' }];
  }

  private async resolveFolderCounts(organizationId: string, email: string): Promise<{
    inbox: { total: number; unread: number };
    sent: { total: number; unread: number };
    drafts: { total: number; unread: number };
    starred: { total: number; unread: number };
    trash: { total: number; unread: number };
  }> {
    const normalizedEmail = email.toLowerCase();
    const [inboxTotal, inboxUnread, sentTotal, draftsTotal, starredTotal, starredUnread, trashTotal, trashUnread] = await Promise.all([
      this.prisma.mailMessage.count({
        where: {
          organizationId,
          status: MailMessageStatus.SENT,
          senderEmail: { not: normalizedEmail },
          recipients: {
            some: {
              email: normalizedEmail,
              trashedAt: null,
              archivedAt: null,
            },
          },
        },
      }),
      this.prisma.mailMessage.count({
        where: {
          organizationId,
          status: MailMessageStatus.SENT,
          senderEmail: { not: normalizedEmail },
          recipients: {
            some: {
              email: normalizedEmail,
              readAt: null,
              trashedAt: null,
              archivedAt: null,
            },
          },
        },
      }),
      this.prisma.mailMessage.count({
        where: {
          organizationId,
          senderEmail: normalizedEmail,
          status: MailMessageStatus.SENT,
          senderTrashedAt: null,
        },
      }),
      this.prisma.mailMessage.count({
        where: {
          organizationId,
          senderEmail: normalizedEmail,
          status: MailMessageStatus.DRAFT,
          senderTrashedAt: null,
        },
      }),
      this.prisma.mailMessage.count({
        where: {
          organizationId,
          OR: [
            {
              senderEmail: normalizedEmail,
              senderStarredAt: { not: null },
              senderTrashedAt: null,
            },
            {
              recipients: {
                some: {
                  email: normalizedEmail,
                  starredAt: { not: null },
                  trashedAt: null,
                },
              },
            },
          ],
        },
      }),
      this.prisma.mailMessage.count({
        where: {
          organizationId,
          OR: [
            {
              senderEmail: normalizedEmail,
              senderStarredAt: { not: null },
              senderTrashedAt: null,
              senderReadAt: null,
            },
            {
              recipients: {
                some: {
                  email: normalizedEmail,
                  starredAt: { not: null },
                  trashedAt: null,
                  readAt: null,
                },
              },
            },
          ],
        },
      }),
      this.prisma.mailMessage.count({
        where: {
          organizationId,
          OR: [
            {
              senderEmail: normalizedEmail,
              senderTrashedAt: { not: null },
            },
            {
              recipients: {
                some: {
                  email: normalizedEmail,
                  trashedAt: { not: null },
                },
              },
            },
          ],
        },
      }),
      this.prisma.mailMessage.count({
        where: {
          organizationId,
          OR: [
            {
              senderEmail: normalizedEmail,
              senderTrashedAt: { not: null },
              senderReadAt: null,
            },
            {
              recipients: {
                some: {
                  email: normalizedEmail,
                  trashedAt: { not: null },
                  readAt: null,
                },
              },
            },
          ],
        },
      }),
    ]);

    return {
      inbox: { total: inboxTotal, unread: inboxUnread },
      sent: { total: sentTotal, unread: 0 },
      drafts: { total: draftsTotal, unread: 0 },
      starred: { total: starredTotal, unread: starredUnread },
      trash: { total: trashTotal, unread: trashUnread },
    };
  }

  private serializeMessage(
    message: Prisma.MailMessageGetPayload<{ include: { conversation: true; recipients: true } }>,
    email: string,
    folder: MailFolder,
  ) {
    const normalizedEmail = email.toLowerCase();
    const recipient = message.recipients.find((item) => item.email.toLowerCase() === normalizedEmail) ?? null;
    const isSender = message.senderEmail.toLowerCase() === normalizedEmail;
    const state: MailState = isSender
      ? {
          readAt: message.senderReadAt,
          starredAt: message.senderStarredAt,
          archivedAt: message.senderArchivedAt,
          trashedAt: message.senderTrashedAt,
        }
      : {
          readAt: recipient?.readAt ?? null,
          starredAt: recipient?.starredAt ?? null,
          archivedAt: recipient?.archivedAt ?? null,
          trashedAt: recipient?.trashedAt ?? null,
        };

    return {
      id: message.id,
      organizationId: message.organizationId,
      conversationId: message.conversationId,
      conversationSubject: message.conversation.subject,
      senderEmail: message.senderEmail,
      senderName: message.senderName,
      subject: message.subject,
      body: message.body,
      bodyPreview: this.buildPreview(message.body),
      status: message.status,
      sentAt: message.sentAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      recipients: message.recipients.map((item) => ({
        id: item.id,
        email: item.email,
        name: item.name,
        recipientType: item.recipientType,
        readAt: item.readAt,
        starredAt: item.starredAt,
        archivedAt: item.archivedAt,
        trashedAt: item.trashedAt,
      })),
      isSender,
      folder,
      state,
      unread: !state.readAt,
    };
  }

  private buildPreview(body: string): string {
    return body.replace(/\s+/g, ' ').trim().slice(0, 180);
  }

  private async assertEditableDraft(id: string, organizationId: string, email: string) {
    const message = await this.prisma.mailMessage.findFirst({
      where: {
        id,
        organizationId,
        senderEmail: email,
        status: MailMessageStatus.DRAFT,
        senderTrashedAt: null,
      },
      include: {
        conversation: true,
        recipients: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Draft mail message not found');
    }

    return message;
  }

  private async updateCurrentState(
    id: string,
    actor: MailActor,
    data: { readAt?: Date | null; starredAt?: Date | null; archivedAt?: Date | null; trashedAt?: Date | null },
  ) {
    const message = await this.prisma.mailMessage.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
        OR: [
          { senderEmail: actor.email },
          { recipients: { some: { email: actor.email } } },
        ],
      },
      include: {
        recipients: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Mail message not found');
    }

    if (message.senderEmail.toLowerCase() === actor.email.toLowerCase()) {
      await this.prisma.mailMessage.update({
        where: { id },
        data: {
          senderReadAt: data.readAt,
          senderStarredAt: data.starredAt,
          senderArchivedAt: data.archivedAt,
          senderTrashedAt: data.trashedAt,
        },
      });
      return;
    }

    await this.prisma.mailRecipient.updateMany({
      where: {
        mailMessageId: id,
        email: actor.email,
      },
      data,
    });
  }
}
