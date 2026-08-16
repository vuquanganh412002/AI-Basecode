import { JobFailureException } from './job-failure.exception';

describe('JobFailureException', () => {
  it('should be a plain Error (not HttpException) — no HTTP concept in a non-HTTP context', () => {
    const exc = new JobFailureException('dokusya-apply-due', '3 subscriber(s) failed');
    expect(exc).toBeInstanceOf(Error);
    expect(exc.name).toBe('JobFailureException');
  });

  it('should prefix the message with [jobName] and expose jobName as its own property', () => {
    const exc = new JobFailureException(
      'file-upload-notification',
      'JA 1 not found for file_upload_id 101',
    );
    expect(exc.jobName).toBe('file-upload-notification');
    expect(exc.message).toBe(
      '[file-upload-notification] JA 1 not found for file_upload_id 101',
    );
  });
});
