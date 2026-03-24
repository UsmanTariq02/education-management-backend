import * as bcrypt from 'bcrypt';

export class PasswordUtil {
  static async hash(value: string): Promise<string> {
    return bcrypt.hash(value, 12);
  }

  static async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
