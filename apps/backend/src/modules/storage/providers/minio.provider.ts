import * as Minio from 'minio';
import { StorageProvider } from '../interfaces/storage-provider.interface';

interface MinioConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export class MinioStorageProvider implements StorageProvider {
  private readonly client: Minio.Client;
  private readonly bucket: string;

  constructor(config: MinioConfig) {
    const url = new URL(config.endpoint);
    this.client = new Minio.Client({
      endPoint: url.hostname,
      port: parseInt(url.port || '9000', 10),
      useSSL: url.protocol === 'https:',
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    this.bucket = config.bucket;
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(this.bucket, key, body, body.length, {
      'Content-Type': contentType,
    });
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expiresIn);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
