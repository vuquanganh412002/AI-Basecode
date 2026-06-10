import * as Minio from 'minio';
import { StorageProvider } from '@/modules/storage/interfaces/storage-provider.interface';

interface MinioConfig {
  endpoint: string;
  /**
   * Browser-facing host used to rewrite presigned URLs. Defaults to
   * `endpoint` when unset. Required in dev where the BE talks to
   * `http://minio:9000` (Docker DNS) but the browser must hit
   * `http://localhost:9000`.
   */
  publicEndpoint?: string;
  /**
   * AWS region label. MinIO doesn't care which region but minio-js's
   * `presignedGetObject` auto-detects by calling HEAD against the
   * configured endpoint when this is unset — fatal for the signing
   * client because the public host isn't reachable from the BE
   * container. Pass it explicitly to skip the detect call.
   */
  region?: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export class MinioStorageProvider implements StorageProvider {
  /** Used for upload / download / delete via Docker DNS hostname. */
  private readonly client: Minio.Client;
  /**
   * Used ONLY for `getSignedUrl`. Configured with the public endpoint
   * so the browser-facing URL is signed correctly. MinIO SigV4 includes
   * the `host` header in the canonical request — post-signing string
   * replacement breaks the signature, hence two clients.
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
          // [region-explicit] Without this, minio-js fires a HEAD
          // request against `pubUrl` to detect the bucket region —
          // ECONNREFUSED because the public host isn't reachable from
          // the BE container.
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
    // [signing-client] Use the public-endpoint client so the host in
    // the URL matches the host in the SigV4 canonical request. The
    // signing client never fires a network request — `presignedGetObject`
    // just builds + signs the URL string locally.
    return this.signingClient.presignedGetObject(this.bucket, key, expiresIn);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
