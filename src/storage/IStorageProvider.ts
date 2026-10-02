export interface IStorageProvider {
  name: string;
  uploadFile(localFilePath: string, destinationKey: string): Promise<string>;
  getFileUrl(destinationKey: string): string;
  deleteFile(destinationKey: string): Promise<void>;
  fileExists(destinationKey: string): Promise<boolean>;
}
