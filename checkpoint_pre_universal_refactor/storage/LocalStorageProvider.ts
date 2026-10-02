import fs from 'fs';
import path from 'path';
import { IStorageProvider } from './IStorageProvider.js';

export class LocalStorageProvider implements IStorageProvider {
  public name = 'local';
  private storageDir: string;
  private baseUrl: string;

  constructor(storageDir?: string, baseUrl?: string) {
    this.storageDir = path.resolve(storageDir || process.env.OUTPUT_DIR || './output');
    this.baseUrl = baseUrl || process.env.APP_URL || 'http://localhost:4000';

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async uploadFile(localFilePath: string, destinationKey: string): Promise<string> {
    const destPath = path.join(this.storageDir, destinationKey);

    // Nếu localFilePath khác destPath thì copy
    if (path.resolve(localFilePath) !== path.resolve(destPath)) {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(localFilePath, destPath);
    }

    return this.getFileUrl(destinationKey);
  }

  getFileUrl(destinationKey: string): string {
    const cleanKey = destinationKey.replace(/\\/g, '/');
    return `${this.baseUrl}/output/${cleanKey}`;
  }

  async deleteFile(destinationKey: string): Promise<void> {
    const destPath = path.join(this.storageDir, destinationKey);
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
  }

  async fileExists(destinationKey: string): Promise<boolean> {
    const destPath = path.join(this.storageDir, destinationKey);
    return fs.existsSync(destPath);
  }
}
