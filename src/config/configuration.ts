export interface AppConfiguration {
  app: {
    port: number;
    corsOrigin: string;
  };
  database: {
    url: string;
  };
  auth: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  swagger: {
    title: string;
    description: string;
    version: string;
  };
  notifications: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    smtpFromEmail: string;
    smtpFromName: string;
    whatsappCallmebotApiKey: string;
  };
}

export default (): AppConfiguration => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  auth: {
    secret: process.env.JWT_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  swagger: {
    title: process.env.SWAGGER_TITLE ?? 'Education Management API',
    description: process.env.SWAGGER_DESCRIPTION ?? 'Education Management SaaS backend',
    version: process.env.SWAGGER_VERSION ?? '1.0.0',
  },
  notifications: {
    smtpHost: process.env.SMTP_HOST ?? '',
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    smtpFromEmail: process.env.SMTP_FROM_EMAIL ?? '',
    smtpFromName: process.env.SMTP_FROM_NAME ?? 'EduFlow',
    whatsappCallmebotApiKey: process.env.WHATSAPP_CALLMEBOT_API_KEY ?? '',
  },
});
