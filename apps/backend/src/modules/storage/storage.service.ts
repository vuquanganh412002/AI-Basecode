import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './interfaces/storage-provider.interface';
import { MinioStorageProvider } from './providers/minio.provider';
import { S3StorageProvider } from './providers/s3.provider';

@Injectable()
export class StorageService implements OnModuleInit, StorageProvider {
  private readonly logger = new Logger(StorageService.name);
  private provider!: StorageProvider;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const providerType = this.configService.get<string>('storage.provider');
    const endpoint = this.configService.get<string>('storage.endpoint') ?? '';
    const region = this.configService.get<string>('storage.region') ?? 'ap-northeast-1';
    const config = {
      endpoint,
      // [public-endpoint] 未設定時は内部 endpoint を既定に。ブラウザは
      // presigned URL で Docker 内部の `minio:9000` でなくこのホスト名を受け取る。
      publicEndpoint:
        this.configService.get<string>('storage.publicEndpoint') ?? endpoint,
      region,
      accessKey: this.configService.get<string>('storage.accessKey') ?? '',
      secretKey: this.configService.get<string>('storage.secretKey') ?? '',
      bucket: this.configService.get<string>('storage.bucket') ?? 'agrinews',
    };

    if (providerType === 's3') {
      this.provider = new S3StorageProvider(config);
      this.logger.log({ event: 'storage.init', provider: 's3', region: config.region });
    } else {
      this.provider = new MinioStorageProvider(config);
      this.logger.log({
        event: 'storage.init',
        provider: 'minio',
        endpoint: config.endpoint,
        publicEndpoint: config.publicEndpoint,
      });
    }
  }

  upload(key: string, body: Buffer, contentType: string) {
    this.logger.log({
      event: 'storage.upload.delegate',
      key,
      contentType,
      bytes: body?.length ?? 0,
    });
    return this.provider.upload(key, body, contentType);
  }

  download(key: string) {
    return this.provider.download(key);
  }

  getSignedUrl(key: string, expiresIn?: number) {
    return this.provider.getSignedUrl(key, expiresIn);
  }

  delete(key: string) {
    return this.provider.delete(key);
  }
}
