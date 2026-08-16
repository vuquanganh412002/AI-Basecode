// Drives src/modules/file-upload/file-signature.ts.
//
// Regression (backend review finding #7): file-upload.service.ts's
// validateUploadInputs() only checked the claimed filename extension, never
// the file's actual bytes. Renaming an HTML/JS payload to payload.pdf
// (an allowed extension) was accepted, stored, and served back with
// Content-Type: application/pdf — a content-type confusion / disguised
// payload vector.

import { matchesDeclaredFileType } from './file-signature';

const PDF_BYTES = Buffer.from('%PDF-1.4\n%mock');
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const ZIP_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
const OLE_BYTES = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);
const HTML_PAYLOAD = Buffer.from('<html><script>alert(1)</script></html>');

describe('matchesDeclaredFileType', () => {
  it('should accept a real PDF for a .pdf filename', () => {
    expect(matchesDeclaredFileType('a.pdf', PDF_BYTES)).toBe(true);
  });

  it('should reject an HTML payload disguised as a .pdf filename', () => {
    expect(matchesDeclaredFileType('payload.pdf', HTML_PAYLOAD)).toBe(false);
  });

  it('should accept a real PNG for a .png filename and reject a fake one', () => {
    expect(matchesDeclaredFileType('a.png', PNG_BYTES)).toBe(true);
    expect(matchesDeclaredFileType('payload.png', HTML_PAYLOAD)).toBe(false);
  });

  it('should accept real JPEG bytes for .jpg / .jpeg filenames', () => {
    expect(matchesDeclaredFileType('a.jpg', JPEG_BYTES)).toBe(true);
    expect(matchesDeclaredFileType('a.jpeg', JPEG_BYTES)).toBe(true);
    expect(matchesDeclaredFileType('payload.jpg', HTML_PAYLOAD)).toBe(false);
  });

  it('should accept a ZIP container for .zip/.xlsx/.docx/.pptx filenames', () => {
    expect(matchesDeclaredFileType('a.zip', ZIP_BYTES)).toBe(true);
    expect(matchesDeclaredFileType('a.xlsx', ZIP_BYTES)).toBe(true);
    expect(matchesDeclaredFileType('a.docx', ZIP_BYTES)).toBe(true);
    expect(matchesDeclaredFileType('a.pptx', ZIP_BYTES)).toBe(true);
    expect(matchesDeclaredFileType('payload.xlsx', HTML_PAYLOAD)).toBe(false);
  });

  it('should accept an OLE compound file for legacy .doc/.xls/.ppt filenames', () => {
    expect(matchesDeclaredFileType('a.doc', OLE_BYTES)).toBe(true);
    expect(matchesDeclaredFileType('a.xls', OLE_BYTES)).toBe(true);
    expect(matchesDeclaredFileType('a.ppt', OLE_BYTES)).toBe(true);
    expect(matchesDeclaredFileType('payload.doc', HTML_PAYLOAD)).toBe(false);
  });

  it('should NOT content-check plain text formats (.csv/.txt) — no reliable magic number', () => {
    expect(matchesDeclaredFileType('a.csv', HTML_PAYLOAD)).toBe(true);
    expect(matchesDeclaredFileType('a.txt', HTML_PAYLOAD)).toBe(true);
  });

  it('should return true for an unrecognized extension (allow-list is enforced elsewhere)', () => {
    expect(matchesDeclaredFileType('a.unknownext', HTML_PAYLOAD)).toBe(true);
  });

  it('should return true for a filename with no extension (handled elsewhere)', () => {
    expect(matchesDeclaredFileType('noext', HTML_PAYLOAD)).toBe(true);
  });

  it('should not throw on a buffer shorter than the expected signature', () => {
    expect(matchesDeclaredFileType('a.pdf', Buffer.from('%P'))).toBe(false);
  });
});
