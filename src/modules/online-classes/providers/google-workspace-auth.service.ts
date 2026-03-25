import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSign } from 'node:crypto';
import type { AppConfiguration } from '../../../config/configuration';

type AccessTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

@Injectable()
export class GoogleWorkspaceAuthService {
  private readonly tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

  constructor(private readonly configService: ConfigService<AppConfiguration, true>) {}

  async getAccessToken(scopes: string[], subjectOverride?: string): Promise<string> {
    const clientEmail = this.configService.get('googleWorkspace.clientEmail', { infer: true });
    const privateKey = this.configService.get('googleWorkspace.privateKey', { infer: true });
    const delegatedAdminEmail =
      subjectOverride || this.configService.get('googleWorkspace.delegatedAdminEmail', { infer: true });

    if (!clientEmail || !privateKey || !delegatedAdminEmail) {
      throw new BadRequestException(
        'Google Workspace integration is not configured. Set client email, private key, and delegated admin email.',
      );
    }

    const scopeKey = `${delegatedAdminEmail}:${scopes.sort().join(' ')}`;
    const cached = this.tokenCache.get(scopeKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const assertion = this.buildSignedJwtAssertion({
      clientEmail,
      privateKey,
      delegatedAdminEmail,
      scopes,
      issuedAt,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    const data = (await response.json()) as AccessTokenResponse & {
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !data.access_token) {
      throw new BadRequestException(
        data.error_description || data.error || 'Google OAuth token exchange failed',
      );
    }

    this.tokenCache.set(scopeKey, {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    });

    return data.access_token;
  }

  private buildSignedJwtAssertion(args: {
    clientEmail: string;
    privateKey: string;
    delegatedAdminEmail: string;
    scopes: string[];
    issuedAt: number;
  }): string {
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: args.clientEmail,
      sub: args.delegatedAdminEmail,
      scope: args.scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: args.issuedAt,
      exp: args.issuedAt + 3600,
    };

    const signingInput = `${this.base64Url(JSON.stringify(header))}.${this.base64Url(JSON.stringify(payload))}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(args.privateKey.replace(/\\n/g, '\n'));

    return `${signingInput}.${this.base64Url(signature)}`;
  }

  private base64Url(input: string | Buffer): string {
    return Buffer.from(input)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
}
