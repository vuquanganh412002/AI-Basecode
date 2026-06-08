// SesMailProvider — wraps @aws-sdk/client-ses SESClient.send().
// Mock the SDK so the spec runs without AWS credentials / network.

import { SendEmailCommand } from '@aws-sdk/client-ses';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-ses', () => {
  return {
    SESClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
    SendEmailCommand: jest.fn().mockImplementation((input) => ({ input })),
  };
});

// Import AFTER jest.mock so the SDK is replaced.
import { SesMailProvider } from './ses.provider';

describe('SesMailProvider', () => {
  beforeEach(() => {
    sendMock.mockReset();
    (SendEmailCommand as unknown as jest.Mock).mockClear();
  });

  it('should send a text-only mail with the configured From address and UTF-8 charset', async () => {
    const provider = new SesMailProvider({
      region: 'ap-northeast-1',
      from: 'noreply@example.com',
    });

    await provider.sendMail({
      to: 'user@example.com',
      subject: '件名',
      text: '本文',
    });

    expect(SendEmailCommand).toHaveBeenCalledTimes(1);
    const cmdInput = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(cmdInput).toEqual({
      Source: 'noreply@example.com',
      Destination: { ToAddresses: ['user@example.com'] },
      Message: {
        Subject: { Data: '件名', Charset: 'UTF-8' },
        Body: { Text: { Data: '本文', Charset: 'UTF-8' } },
      },
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('should attach Html body when html option is set', async () => {
    const provider = new SesMailProvider({ region: 'us-east-1', from: 'a@b.com' });

    await provider.sendMail({
      to: 'user@example.com',
      subject: 's',
      html: '<p>hi</p>',
    });

    const cmdInput = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(cmdInput.Message.Body).toEqual({
      Html: { Data: '<p>hi</p>', Charset: 'UTF-8' },
    });
    expect(cmdInput.Message.Body.Text).toBeUndefined();
  });

  it('should set ConfigurationSetName when configurationSet is configured', async () => {
    const provider = new SesMailProvider({
      region: 'ap-northeast-1',
      from: 'a@b.com',
      configurationSet: 'agn-dev-ses-config',
    });

    await provider.sendMail({ to: 'u@e.com', subject: 's', text: 't' });

    const cmdInput = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(cmdInput.ConfigurationSetName).toBe('agn-dev-ses-config');
  });

  it('should omit ConfigurationSetName when configurationSet is not configured', async () => {
    const provider = new SesMailProvider({ region: 'us-east-1', from: 'a@b.com' });

    await provider.sendMail({ to: 'u@e.com', subject: 's', text: 't' });

    const cmdInput = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(cmdInput.ConfigurationSetName).toBeUndefined();
  });

  it('should attach both Html and Text when both options are set (multipart/alternative)', async () => {
    const provider = new SesMailProvider({ region: 'us-east-1', from: 'a@b.com' });

    await provider.sendMail({
      to: 'user@example.com',
      subject: 's',
      html: '<p>hi</p>',
      text: 'hi',
    });

    const cmdInput = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(cmdInput.Message.Body.Html).toEqual({
      Data: '<p>hi</p>',
      Charset: 'UTF-8',
    });
    expect(cmdInput.Message.Body.Text).toEqual({
      Data: 'hi',
      Charset: 'UTF-8',
    });
  });

  it('should propagate the underlying SES error when send() rejects', async () => {
    sendMock.mockRejectedValueOnce(new Error('throttled'));
    const provider = new SesMailProvider({ region: 'us-east-1', from: 'a@b.com' });

    await expect(
      provider.sendMail({ to: 'u@e.com', subject: 's', text: 't' }),
    ).rejects.toThrow('throttled');
  });
});
