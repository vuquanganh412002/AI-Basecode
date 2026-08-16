// Drives src/common/utils/file-delivery.ts.
//
// Regression (backend review finding #12): sendBinaryAttachment()'s ASCII
// fallback filename only stripped non-ASCII characters, leaving '"' and '\'
// untouched even though both are valid ASCII and survive into the quoted
// `filename="..."` header parameter unescaped. A file uploaded with a '"'
// in its original name (nothing upstream validates beyond the extension —
// see finding #7) produced a malformed Content-Disposition header on every
// future download of that file (the quoted string closes early), which
// some clients parse leniently enough to pick up an unintended second
// filename parameter — a filename-spoofing vector.

import type { Response } from 'express';
import { contentTypeFor, sendBinaryAttachment } from './file-delivery';

function buildResMock() {
  const headers: Record<string, string> = {};
  const res = {
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return { res: res as unknown as Response, headers };
}

describe('contentTypeFor', () => {
  it('should map known extensions to their MIME type', () => {
    expect(contentTypeFor('a.pdf')).toBe('application/pdf');
    expect(contentTypeFor('a.csv')).toBe('text/csv');
    expect(contentTypeFor('a.PNG')).toBe('image/png');
  });

  it('should fall back to application/octet-stream for unknown extensions', () => {
    expect(contentTypeFor('a.unknown')).toBe('application/octet-stream');
  });
});

describe('sendBinaryAttachment', () => {
  it('should quote a plain ASCII filename as-is', () => {
    const { res, headers } = buildResMock();
    sendBinaryAttachment(res, {
      body: Buffer.from('x'),
      contentType: 'application/pdf',
      contentLength: 1,
      fileName: 'report.pdf',
    });

    expect(headers['Content-Disposition']).toBe(
      "attachment; filename=\"report.pdf\"; filename*=UTF-8''report.pdf",
    );
  });

  // Regression: a '"' in the original filename previously closed the
  // quoted-string early, corrupting the header structure.
  it('should backslash-escape a double-quote in the filename (RFC 6266 quoted-string)', () => {
    const { res, headers } = buildResMock();
    sendBinaryAttachment(res, {
      body: Buffer.from('x'),
      contentType: 'application/pdf',
      contentLength: 1,
      fileName: 'evil".pdf',
    });

    const disposition = headers['Content-Disposition'];
    // The ASCII-fallback filename= parameter must contain the quote
    // escaped (\") rather than a bare " that terminates the quoted string.
    expect(disposition).toContain('filename="evil\\".pdf"');
    // Sanity: exactly two un-escaped quote characters delimit the
    // filename= value (the opening and closing one) — i.e. no bare
    // (non-backslash-preceded) '"' appears mid-value.
    const filenameMatch = /filename="((?:[^"\\]|\\.)*)"/.exec(disposition);
    expect(filenameMatch?.[1]).toBe('evil\\".pdf');
  });

  it('should backslash-escape a literal backslash in the filename', () => {
    const { res, headers } = buildResMock();
    sendBinaryAttachment(res, {
      body: Buffer.from('x'),
      contentType: 'application/pdf',
      contentLength: 1,
      fileName: 'a\\b.pdf',
    });

    expect(headers['Content-Disposition']).toContain('filename="a\\\\b.pdf"');
  });

  it('should still percent-encode the RFC 5987 filename* value for non-ASCII names', () => {
    const { res, headers } = buildResMock();
    sendBinaryAttachment(res, {
      body: Buffer.from('x'),
      contentType: 'application/pdf',
      contentLength: 1,
      fileName: '増減連絡票.pdf',
    });

    expect(headers['Content-Disposition']).toContain(
      `filename*=UTF-8''${encodeURIComponent('増減連絡票.pdf')}`,
    );
    // Non-ASCII chars are replaced with '_' in the quoted fallback
    // (5 chars in 増減連絡票 → 5 underscores).
    expect(headers['Content-Disposition']).toContain('filename="_____.pdf"');
  });

  it('should set Content-Type, Content-Length, and Cache-Control headers and send 200', () => {
    const { res, headers } = buildResMock();
    sendBinaryAttachment(res, {
      body: Buffer.from('hello'),
      contentType: 'text/csv',
      contentLength: 5,
      fileName: 'a.csv',
    });

    expect(headers['Content-Type']).toBe('text/csv');
    expect(headers['Content-Length']).toBe('5');
    expect(headers['Cache-Control']).toBe('no-store');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(Buffer.from('hello'));
  });
});
