// SmtpMailProvider — wraps nodemailer.createTransport().sendMail().
// Mock nodemailer so the spec runs without an SMTP server.

const sendMailMock = jest.fn();
const createTransportMock = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: (...args: unknown[]) => {
    createTransportMock(...args);
    return { sendMail: sendMailMock };
  },
}));

import { SmtpMailProvider } from './smtp.provider';

describe('SmtpMailProvider', () => {
  beforeEach(() => {
    sendMailMock.mockReset();
    createTransportMock.mockReset();
  });

  it('should create the transport with host/port and OMIT auth when user is empty (Mailpit / dev SMTP)', () => {
    new SmtpMailProvider({
      host: 'localhost',
      port: 1025,
      user: '',
      pass: '',
      from: 'noreply@example.com',
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'localhost',
      port: 1025,
      auth: undefined,
    });
  });

  it('should create the transport WITH auth when user is provided', () => {
    new SmtpMailProvider({
      host: 'smtp.example.com',
      port: 587,
      user: 'noreply',
      pass: 'secret',
      from: 'noreply@example.com',
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      auth: { user: 'noreply', pass: 'secret' },
    });
  });

  it('should send a text-only mail with from/to/subject/text', async () => {
    const provider = new SmtpMailProvider({
      host: 'localhost',
      port: 1025,
      user: '',
      pass: '',
      from: 'noreply@example.com',
    });

    await provider.sendMail({
      to: 'user@example.com',
      subject: '件名',
      text: '本文',
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: 'user@example.com',
      subject: '件名',
      text: '本文',
    });
  });

  it('should attach html field when html option is set', async () => {
    const provider = new SmtpMailProvider({
      host: 'localhost',
      port: 1025,
      user: '',
      pass: '',
      from: 'noreply@example.com',
    });

    await provider.sendMail({
      to: 'user@example.com',
      subject: 's',
      html: '<p>hi</p>',
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: 'user@example.com',
      subject: 's',
      html: '<p>hi</p>',
    });
  });

  it('should attach both text + html when both options are set', async () => {
    const provider = new SmtpMailProvider({
      host: 'localhost',
      port: 1025,
      user: '',
      pass: '',
      from: 'noreply@example.com',
    });

    await provider.sendMail({
      to: 'user@example.com',
      subject: 's',
      html: '<p>hi</p>',
      text: 'hi',
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: 'user@example.com',
      subject: 's',
      text: 'hi',
      html: '<p>hi</p>',
    });
  });

  it('should propagate the underlying nodemailer error when sendMail() rejects', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const provider = new SmtpMailProvider({
      host: 'localhost',
      port: 1025,
      user: '',
      pass: '',
      from: 'noreply@example.com',
    });

    await expect(
      provider.sendMail({ to: 'u@e.com', subject: 's', text: 't' }),
    ).rejects.toThrow('ECONNREFUSED');
  });
});
