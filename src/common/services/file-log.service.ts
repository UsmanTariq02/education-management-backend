import { Injectable } from '@nestjs/common';
import { mkdir, appendFile } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class FileLogService {
  private readonly logDirectory = join(process.cwd(), 'logs');

  async logError(payload: {
    message: string | string[];
    stack?: string;
    statusCode?: number;
    method?: string;
    url?: string;
  }): Promise<void> {
    const lines = [
      `[${new Date().toISOString()}] ${this.formatMessage(payload)}`,
      payload.stack ? `STACK: ${payload.stack}` : null,
      '---',
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n');

    await mkdir(this.logDirectory, { recursive: true });
    await appendFile(this.resolveDailyErrorLogFile(), `${lines}\n`, 'utf8');
  }

  private formatMessage(payload: {
    message: string | string[];
    statusCode?: number;
    method?: string;
    url?: string;
  }) {
    const message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
    const requestPart =
      payload.method && payload.url ? ` ${payload.method} ${payload.url}` : '';
    const statusPart = payload.statusCode ? ` status=${payload.statusCode}` : '';

    return `${message}${statusPart}${requestPart}`;
  }

  private resolveDailyErrorLogFile() {
    const date = new Date().toISOString().slice(0, 10);
    return join(this.logDirectory, `error-${date}.log`);
  }
}
