import JSZip from 'jszip';

import { buildZipArchive } from './zip';

async function namesIn(buf: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buf);
  return Object.keys(zip.files);
}

describe('buildZipArchive', () => {
  it('bundles every entry under its given name', async () => {
    const buf = await buildZipArchive([
      { name: 'a.pdf', body: Buffer.from('A') },
      { name: 'b.csv', body: Buffer.from('B') },
    ]);
    expect((await namesIn(buf)).sort()).toEqual(['a.pdf', 'b.csv']);
  });

  it('round-trips the file content byte-for-byte', async () => {
    const buf = await buildZipArchive([
      { name: 'x.txt', body: Buffer.from('hello world') },
    ]);
    const zip = await JSZip.loadAsync(buf);
    expect(await zip.file('x.txt')!.async('string')).toBe('hello world');
  });

  it('de-duplicates same-named entries with " (n)" before the extension', async () => {
    const buf = await buildZipArchive([
      { name: 'dup.pdf', body: Buffer.from('1') },
      { name: 'dup.pdf', body: Buffer.from('2') },
      { name: 'dup.pdf', body: Buffer.from('3') },
    ]);
    expect((await namesIn(buf)).sort()).toEqual([
      'dup (1).pdf',
      'dup (2).pdf',
      'dup.pdf',
    ]);
  });

  it('de-duplicates extensionless names by appending " (n)"', async () => {
    const buf = await buildZipArchive([
      { name: 'README', body: Buffer.from('1') },
      { name: 'README', body: Buffer.from('2') },
    ]);
    expect((await namesIn(buf)).sort()).toEqual(['README', 'README (1)']);
  });

  it('preserves non-ASCII (Japanese) entry names', async () => {
    const buf = await buildZipArchive([
      { name: '増減通知_202604.pdf', body: Buffer.from('jp') },
    ]);
    expect(await namesIn(buf)).toEqual(['増減通知_202604.pdf']);
  });

  it('handles an empty entry list', async () => {
    const buf = await buildZipArchive([]);
    expect(await namesIn(buf)).toEqual([]);
  });
});
