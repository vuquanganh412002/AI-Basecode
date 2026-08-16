// Drives src/modules/storage/providers/s3.provider.ts.
//
// Regression (backend review finding #16): download()/delete() previously
// had no try/catch at all, unlike upload() which logs bucket/key/err_name/
// http_status on failure specifically to diagnose S3 misconfiguration
// (AccessDenied, NoSuchKey, ...). An IAM/lifecycle-rule drift on the read/
// delete path propagated the raw SDK error with zero diagnostic logging,
// making root-causing S3 permission issues materially slower than on the
// upload path.

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn((input: unknown) => ({ input })),
  GetObjectCommand: jest.fn((input: unknown) => ({ input })),
  DeleteObjectCommand: jest.fn((input: unknown) => ({ input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example.com/key'),
}));

import { S3StorageProvider } from './s3.provider';

function buildProvider(): S3StorageProvider {
  return new S3StorageProvider({
    region: 'ap-northeast-1',
    accessKey: 'AKIA_TEST',
    secretKey: 'secret',
    bucket: 'test-bucket',
  });
}

function asyncBodyOf(text: string) {
  return (async function* () {
    yield Buffer.from(text);
  })();
}

describe('S3StorageProvider', () => {
  let provider: S3StorageProvider;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    sendMock.mockReset();
    provider = buildProvider();
    errorSpy = jest
      .spyOn((provider as unknown as { logger: { error: () => void } }).logger, 'error')
      .mockImplementation(() => undefined);
  });

  describe('download', () => {
    it('should return the concatenated buffer when the SDK call succeeds', async () => {
      sendMock.mockResolvedValue({ Body: asyncBodyOf('hello') });

      const result = await provider.download('ja-1/files/a.pdf');

      expect(result.toString()).toBe('hello');
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log s3.get.failed with bucket/key/err_name/http_status and rethrow when the SDK call fails', async () => {
      const sdkError = Object.assign(new Error('Access Denied'), {
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
      });
      sendMock.mockRejectedValue(sdkError);

      await expect(provider.download('ja-1/files/a.pdf')).rejects.toThrow(
        'Access Denied',
      );

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 's3.get.failed',
          bucket: 'test-bucket',
          region: 'ap-northeast-1',
          key: 'ja-1/files/a.pdf',
          err_name: 'AccessDenied',
          err_message: 'Access Denied',
          http_status: 403,
        }),
      );
    });
  });

  describe('delete', () => {
    it('should resolve without error when the SDK call succeeds', async () => {
      sendMock.mockResolvedValue({});

      await expect(provider.delete('ja-1/files/a.pdf')).resolves.toBeUndefined();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log s3.delete.failed with bucket/key/err_name/http_status and rethrow when the SDK call fails', async () => {
      const sdkError = Object.assign(new Error('The specified key does not exist.'), {
        name: 'NoSuchKey',
        $metadata: { httpStatusCode: 404 },
      });
      sendMock.mockRejectedValue(sdkError);

      await expect(provider.delete('ja-1/files/missing.pdf')).rejects.toThrow(
        'The specified key does not exist.',
      );

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 's3.delete.failed',
          bucket: 'test-bucket',
          region: 'ap-northeast-1',
          key: 'ja-1/files/missing.pdf',
          err_name: 'NoSuchKey',
          http_status: 404,
        }),
      );
    });
  });

  describe('upload', () => {
    it('should still log s3.put.failed with the same diagnostic fields after the errorDiag() refactor', async () => {
      const sdkError = Object.assign(new Error('boom'), {
        name: 'InternalError',
        $metadata: { httpStatusCode: 500 },
      });
      sendMock.mockRejectedValue(sdkError);

      await expect(
        provider.upload('ja-1/files/a.pdf', Buffer.from('x'), 'application/pdf'),
      ).rejects.toThrow('boom');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 's3.put.failed',
          bucket: 'test-bucket',
          region: 'ap-northeast-1',
          key: 'ja-1/files/a.pdf',
          err_name: 'InternalError',
          http_status: 500,
        }),
      );
    });
  });
});
