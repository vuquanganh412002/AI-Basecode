"""Restore the original <cols>/<sheetFormatPr> blocks after any openpyxl save.

openpyxl materialises a ColumnDimension (default width 13) for every column it
touches and serialises them all, which widens columns that the source file had
set narrower. Patch the XML directly instead of re-saving through openpyxl.

Usage: python3 restore_cols.py ORIGINAL.xlsx TARGET.xlsx
"""
import os, re, sys, zipfile

RE_COLS = re.compile(r'<cols>.*?</cols>', re.S)
RE_FMT = re.compile(r'<sheetFormatPr\b[^>]*/>')
RE_ROOT = re.compile(r'<worksheet\b[^>]*>')
RE_NS = re.compile(r'xmlns:([A-Za-z_][\w.-]*)=')
RE_PREFIXED_ATTR = re.compile(r'\s+([A-Za-z_][\w.-]*):[\w.-]+="[^"]*"')


def declared_prefixes(xml):
    """Namespace prefixes declared on the sheet's root <worksheet> element."""
    root = RE_ROOT.search(xml)
    return set(RE_NS.findall(root.group(0))) if root else set()


def strip_undeclared(fragment, allowed):
    """Drop prefixed attributes whose namespace the target root never declares.

    Excel writes ``<sheetFormatPr ... x14ac:dyDescent="0.2"/>`` and declares
    ``xmlns:x14ac`` on the root; openpyxl's output root declares no such
    prefix, so copying the attribute across produces an *unbound prefix* parse
    error and the workbook no longer opens. These attributes are cosmetic
    hints, so dropping them is lossless in practice.
    """
    return RE_PREFIXED_ATTR.sub(
        lambda m: '' if m.group(1) not in allowed else m.group(0), fragment)


def sheetmap(z):
    wb = z.read('xl/workbook.xml').decode('utf-8')
    rels = z.read('xl/_rels/workbook.xml.rels').decode('utf-8')
    rid2t = {}
    for m in re.finditer(r'<Relationship\b[^>]*>', rels):
        i = re.search(r'Id="([^"]+)"', m.group(0))
        t = re.search(r'Target="([^"]+)"', m.group(0))
        if i and t:
            rid2t[i.group(1)] = t.group(1)
    out = {}
    for m in re.finditer(r'<sheet\b[^>]*/>', wb):
        n = re.search(r'name="([^"]+)"', m.group(0))
        r = re.search(r'r:id="([^"]+)"', m.group(0))
        if n and r:
            tgt = rid2t[r.group(1)].lstrip('/')
            out[n.group(1)] = tgt if tgt.startswith('xl/') else 'xl/' + tgt
    return out


def main(orig_p, cur_p):
    zo, zc = zipfile.ZipFile(orig_p), zipfile.ZipFile(cur_p)
    mo, mc = sheetmap(zo), sheetmap(zc)
    patched = {}
    for name, ofile in mo.items():
        cfile = mc.get(name)
        if not cfile:
            continue
        oxml, cxml = zo.read(ofile).decode('utf-8'), zc.read(cfile).decode('utf-8')
        ocols, ofmt = RE_COLS.search(oxml), RE_FMT.search(oxml)
        # Namespace prefixes the TARGET root declares — anything else must be
        # stripped out of the fragments we inject (see strip_undeclared).
        allowed = declared_prefixes(cxml)
        new = cxml
        if ocols and RE_COLS.search(new):
            frag = strip_undeclared(ocols.group(0), allowed)
            new = RE_COLS.sub(lambda _: frag, new, count=1)
        elif not ocols:
            new = RE_COLS.sub('', new, count=1)
        if ofmt and RE_FMT.search(new):
            frag = strip_undeclared(ofmt.group(0), allowed)
            new = RE_FMT.sub(lambda _: frag, new, count=1)
        if new != cxml:
            patched[cfile] = new.encode('utf-8')
            print('patched', name)
    zo.close()
    zc.close()

    tmp = cur_p + '.tmp'
    zin = zipfile.ZipFile(cur_p)
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            zi = zipfile.ZipInfo(item.filename, date_time=item.date_time)
            zi.compress_type = item.compress_type
            zi.external_attr = item.external_attr
            zout.writestr(zi, patched.get(item.filename, zin.read(item.filename)))
    zin.close()
    os.replace(tmp, cur_p)
    print('column widths restored ->', cur_p)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
