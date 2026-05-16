import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const SECRET_PREFIX = 'v1';
const ALGORITHM = 'aes-256-gcm';

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string, secret: string): string {
  const iv = randomBytes(12);
  const key = deriveKey(secret);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [SECRET_PREFIX, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(value: string, secret: string): string {
  const [prefix, ivBase64, tagBase64, encryptedBase64] = value.split(':');

  if (prefix !== SECRET_PREFIX || !ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error('Invalid encrypted secret format');
  }

  const key = deriveKey(secret);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedBase64, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}
