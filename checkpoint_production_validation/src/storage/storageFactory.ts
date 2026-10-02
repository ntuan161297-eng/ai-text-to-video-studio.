import { IStorageProvider } from './IStorageProvider.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { S3StorageProvider } from './S3StorageProvider.js';

export class StorageFactory {
  private static instance: IStorageProvider;

  public static getProvider(providerType?: string): IStorageProvider {
    if (this.instance) {
      return this.instance;
    }

    const type = (providerType || process.env.STORAGE_PROVIDER || 'local').toLowerCase();

    if (type === 's3' || type === 'r2' || type === 'minio') {
      this.instance = new S3StorageProvider();
    } else {
      this.instance = new LocalStorageProvider();
    }

    return this.instance;
  }
}
