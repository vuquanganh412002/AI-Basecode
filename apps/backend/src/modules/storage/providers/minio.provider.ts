import * as Minio from 'minio';
import { StorageProvider } from '@/modules/storage/interfaces/storage-provider.interface';

interface MinioConfig {
  endpoint: string;
  /**
   * presigned URL 用のブラウザ向けホスト。未設定時は endpoint。dev で BE が
   * `http://minio:9000`(Docker DNS)、ブラウザは `http://localhost:9000` を叩く場合に必須。
   */
  publicEndpoint?: string;
  /**
   * AWS region ラベル。MinIO は region 不問だが、未設定だと minio-js の
   * presignedGetObject が endpoint へ HEAD で自動検出する → public host が BE
   * コンテナから到達不能で致命的。明示指定で検出呼び出しを回避。
   */
  region?: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export class MinioStorageProvider implements StorageProvider {
  /** upload / download / delete 用(Docker DNS ホスト名)。 */
  private readonly client: Minio.Client;
  /**
   * getSignedUrl 専用。public endpoint で構成しブラウザ向け URL を正しく署名。
   * MinIO SigV4 は canonical request に host ヘッダを含むため、署名後の文字列置換は
   * 署名を壊す → client を 2 つ持つ。
   */
  private readonly signingClient: Minio.Client;
  private readonly bucket: string;

  constructor(config: MinioConfig) {
    const region = config.region ?? 'us-east-1';
    const url = new URL(config.endpoint);
    this.client = new Minio.Client({
      endPoint: url.hostname,
      port: parseInt(url.port || '9000', 10),
      useSSL: url.protocol === 'https:',
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region,
    });

    const pubUrl = new URL(config.publicEndpoint ?? config.endpoint);
    const sameAsInternal =
      pubUrl.hostname === url.hostname &&
      pubUrl.port === url.port &&
      pubUrl.protocol === url.protocol;
    this.signingClient = sameAsInternal
      ? this.client
      : new Minio.Client({
          endPoint: pubUrl.hostname,
          port: Number.parseInt(pubUrl.port || '9000', 10),
          useSSL: pubUrl.protocol === 'https:',
          accessKey: config.accessKey,
          secretKey: config.secretKey,
          // [region-explicit] 無いと minio-js が bucket region 検出のため pubUrl へ
          // HEAD を投げ、public host が BE コンテナから不達で ECONNREFUSED。
          region,
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
    // [signing-client] public-endpoint client を使い URL の host を SigV4 canonical
    // request の host と一致させる。presignedGetObject はローカルで URL を組んで署名するだけで通信しない。
    return this.signingClient.presignedGetObject(this.bucket, key, expiresIn);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
