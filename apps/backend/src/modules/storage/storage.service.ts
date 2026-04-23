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
    const config = {
      endpoint: this.configService.get<string>('storage.endpoint') ?? '',
      region: this.configService.get<string>('storage.region') ?? 'ap-northeast-1',
      accessKey: this.configService.get<string>('storage.accessKey') ?? '',
      secretKey: this.configService.get<string>('storage.secretKey') ?? '',
      bucket: this.configService.get<string>('storage.bucket') ?? 'agrinews',
    };

    if (providerType === 's3') {
      this.provider = new S3StorageProvider(config);
      this.logger.log({ event: 'storage.init', provider: 's3', region: config.region });
    } else {
      this.provider = new MinioStorageProvider(config);
      this.logger.log({ event: 'storage.init', provider: 'minio', endpoint: config.endpoint });
    }
  }

  upload(key: string, body: Buffer, contentType: string) {
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
