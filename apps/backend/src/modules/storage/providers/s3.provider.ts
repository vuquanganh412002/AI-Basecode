import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from '@/modules/storage/interfaces/storage-provider.interface';

interface S3Config {
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly hasExplicitCreds: boolean;

  constructor(config: S3Config) {
    this.client = new S3Client({
      region: config.region,
      credentials: config.accessKey
        ? { accessKeyId: config.accessKey, secretAccessKey: config.secretKey }
        : undefined,
    });
    this.bucket = config.bucket;
    this.region = config.region;
    // [diag] When false the SDK falls back to the default provider chain
    // (ECS task role / env / instance profile). A wrong/missing task role
    // is the most common "uploads silently fail" cause in prod.
    this.hasExplicitCreds = Boolean(config.accessKey);
    this.logger.log({
      event: 's3.provider.init',
      bucket: this.bucket,
      region: this.region,
      explicit_credentials: this.hasExplicitCreds,
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    this.logger.log({
      event: 's3.put.start',
      bucket: this.bucket,
      region: this.region,
      key,
      contentType,
      bytes: body?.length ?? 0,
    });
    try {
      const res = await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      this.logger.log({
        event: 's3.put.ok',
        bucket: this.bucket,
        key,
        etag: res.ETag ?? '',
        status_code: res.$metadata?.httpStatusCode ?? null,
      });
      return key;
    } catch (err) {
      // [diag] Surface the real AWS error — name (AccessDenied,
      // NoSuchBucket, CredentialsProviderError, …) is what pinpoints
      // the misconfiguration. Re-throw so the service compensates.
      this.logger.error({
        event: 's3.put.failed',
        bucket: this.bucket,
        region: this.region,
        key,
        err_name: (err as Error).name,
        err_message: (err as Error).message,
        http_status:
          (err as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode ?? null,
      });
      throw err;
    }
  }

  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = response.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
