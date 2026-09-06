# -*- coding: utf-8 -*-
"""Resolve which .xlsx a sync run should edit.

A screen folder holds several document kinds (画面設計書 / API設計書 / テスト仕様書)
and often several versions of the same kind — docs/design/ACSMS-SCR-022 alone has
seven files. Picking the wrong one means editing a customer deliverable that was
never meant to change, so resolution is explicit and refuses to guess.

Usage:
    resolve_target.py <screen|path> [token ...] [--latest] [--root DIR]

    resolve_target.py ACSMS-SCR-022                 # 画面設計書, ask if ambiguous
    resolve_target.py ACSMS-SCR-022 v1.2            # pin the version
    resolve_target.py ACSMS-SCR-007 画面設計書 v1.3
    resolve_target.py ACSMS-SCR-022 API設計書 --latest
    resolve_target.py "docs/design/.../foo.xlsx"    # explicit path wins

Exit codes: 0 resolved (path on stdout) | 1 nothing matched | 2 ambiguous.
"""
import re
import sys
import unicodedata
from pathlib import Path

KINDS = ['画面設計書', 'API設計書', 'テスト仕様書']
DEFAULT_KIND = '画面設計書'
VER_RE = re.compile(r'^v?\d+(?:\.\d+)*$', re.I)
FNAME_VER_RE = re.compile(r'[_ ]v(\d+(?:\.\d+)*)\s*\.xlsx$', re.I)


def norm(s):
    """NFKC-fold so full-width tokens match half-width ones, and case-fold."""
    return unicodedata.normalize('NFKC', str(s)).casefold()


def screen_dir(root, token):
    """Accept 'ACSMS-SCR-022', 'SCR-022', '022' or '22'."""
    m = re.search(r'(\d{1,3})\s*$', token)
    if not m:
        return None
    d = root / 'docs' / 'design' / f'ACSMS-SCR-{int(m.group(1)):03d}'
    return d if d.is_dir() else None


def version_of(path):
    """Sort key from the trailing _vN.N in the filename ((0,) when absent)."""
    m = FNAME_VER_RE.search(path.name)
    return tuple(int(x) for x in m.group(1).split('.')) if m else (0,)


def resolve(args, root=Path('.'), latest=False):
    if not args:
        raise SystemExit('usage: resolve_target.py <screen|path> [token ...]')

    # An explicit path always wins — the escape hatch for the handful of
    # filenames carrying typos or a stray space before ".xlsx".
    for a in args:
        if a.lower().endswith('.xlsx') or '/' in a:
            p = (root / a).resolve() if not Path(a).is_absolute() else Path(a)
            if not p.is_file():
                print(f'no such file: {a}', file=sys.stderr)
                raise SystemExit(1)
            return p, []

    d = screen_dir(root, args[0])
    if d is None:
        print(f'cannot resolve a screen folder from {args[0]!r}', file=sys.stderr)
        raise SystemExit(1)

    tokens = args[1:]
    kind = next((t for t in tokens if any(norm(k) == norm(t) for k in KINDS)), None)
    vers = [t for t in tokens if VER_RE.match(t)]
    other = [t for t in tokens
             if t != kind and t not in vers and not t.startswith('--')]

    cands = sorted(d.glob('*.xlsx'))
    if not cands:
        print(f'no .xlsx under {d}', file=sys.stderr)
        raise SystemExit(1)

    def keep(p):
        n = norm(p.name)
        if norm(kind or DEFAULT_KIND) not in n:
            return False
        for v in vers:                       # '_v1.2' / '_V1.2 ' before .xlsx
            # The 'v' is optional in the token but always present in the
            # filename, and a couple of files carry a stray space before .xlsx.
            if not re.search(r'[_ ]v' + re.escape(v.lstrip('vV')) + r'\s*\.xlsx$',
                             p.name, re.I):
                return False
        return all(norm(t) in n for t in other)

    hits = [p for p in cands if keep(p)]
    if not hits:
        print(f'nothing matched in {d}. Available:', file=sys.stderr)
        for p in cands:
            print('  ', p.name, file=sys.stderr)
        raise SystemExit(1)
    if len(hits) > 1:
        if latest:
            hits.sort(key=version_of)
            return hits[-1], hits[:-1]
        print(f'ambiguous — {len(hits)} candidates in {d}:', file=sys.stderr)
        for p in sorted(hits, key=version_of):
            print('  ', p.name, file=sys.stderr)
        print('\nre-run with a version token (e.g. v1.2) or --latest',
              file=sys.stderr)
        raise SystemExit(2)
    return hits[0], []


if __name__ == '__main__':
    argv = [a for a in sys.argv[1:] if a != '--latest']
    root = Path('.')
    if '--root' in argv:
        i = argv.index('--root')
        root = Path(argv[i + 1])
        del argv[i:i + 2]
    target, others = resolve(argv, root=root, latest='--latest' in sys.argv)
    if others:
        print('note: also present ->', ', '.join(p.name for p in others),
              file=sys.stderr)
    print(target)
