# -*- coding: utf-8 -*-
"""Markup helpers for syncing a customer 画面設計書 (.xlsx) with implemented code.

Convention applied to the customer's workbook — two colours, one meaning each:
text this pass ADDS (corrections, new rows, renumbering, the marker) is
ADDITION red; text it STRIKES OUT keeps the ACCENT colour; the customer's own
untouched text stays black.

  * column A : '{M/D} VTI追記' — small coloured marker on every touched row
  * fragment : strike it, correction immediately after, same line
               (`revise_part`)
  * line     : strike it, correction on a fresh line beneath
               (`revise_line`, `revise`)
  * added    : whole content / a new line coloured (`set_accent`, `add_line`)

Always open the workbook with ``load_workbook(path, rich_text=True)`` — without
that flag openpyxl flattens any pre-existing rich text and silently destroys
markup a previous pass wrote.

After EVERY ``wb.save()`` run ``restore_cols.py``; openpyxl rewrites <cols> and
widens columns. See that script's docstring.
"""
from copy import copy
from datetime import date

from openpyxl.cell.rich_text import CellRichText, TextBlock
from openpyxl.cell.text import InlineFont
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.cell_range import CellRange

# Strike colour — the Google-palette "dark orange 1" (cam đậm 1). Carried by
# every run this skill strikes out, so removed text reads as one colour.
ACCENT = 'FFE69138'

# Addition colour — everything this pass WRITES (corrections, new content,
# renumbered No. cells, the column-A marker) is red, so the reader can tell at
# a glance what was taken out (orange, struck) from what went in (red).
ADDITION = 'FFFF0000'

# Colours earlier passes used for their markup: red before 2026-08, dark cyan 1
# in the 2026-08 pass. Recognised on read so a cell corrected again keeps that
# pass's markup — its addition is struck *in the current strike colour* rather
# than flattened to a plain black strike.
LEGACY_ACCENTS = ('FFFF0000', 'FF45818E')
_ACCENTS = tuple(dict.fromkeys((ACCENT, ADDITION) + LEGACY_ACCENTS))

_CFG = {'mark': None, 'font': 'Meiryo', 'size': 9, 'mark_size': 6,
        'color': ACCENT, 'add_color': ADDITION}
_FONTS = {}


def default_mark(when=None, suffix='VTI追記'):
    """'8/18 VTI追記' for 2026-08-18 (no zero padding, matching the workbook)."""
    d = when or date.today()
    return f'{d.month}/{d.day} {suffix}'


def configure(mark=None, font='Meiryo', size=9, mark_size=6, color=ACCENT,
              add_color=ADDITION):
    """Set the marker text, body font and the two revision colours.

    Call once per run, before the first write. `mark` defaults to today's date.
    `size` must match the sheet's body font size or the struck/coloured runs
    render at a different size than the text around them. `color` (ARGB) is
    the strike colour, `add_color` the colour of everything written.
    """
    _CFG.update(mark=mark or default_mark(), font=font, size=size,
                mark_size=mark_size, color=color, add_color=add_color)
    _FONTS.clear()
    _FONTS.update(
        black=InlineFont(rFont=font, sz=size),
        # the customer's own black text, struck out by this pass
        strike=InlineFont(rFont=font, sz=size, strike=True),
        accent=InlineFont(rFont=font, sz=size, color=add_color),
        # an earlier revision's addition, struck by this one
        accent_strike=InlineFont(rFont=font, sz=size, strike=True, color=color),
    )
    return _CFG['mark']


def _fonts():
    if not _FONTS:
        configure()
    return _FONTS


# ---------------------------------------------------------------- primitives

def _is_accent(color):
    """True for a run this skill (or an earlier pass) coloured as a revision."""
    return color is not None and getattr(color, 'rgb', None) in _ACCENTS


def _kind_of(strike, color):
    if strike:
        return 'accent_strike' if _is_accent(color) else 'strike'
    return 'accent' if _is_accent(color) else 'black'


def _supersede(kind):
    """Kind a run becomes once it is superseded by a newer correction."""
    return 'accent_strike' if kind in ('accent', 'accent_strike') else 'strike'


def read_runs(cell):
    """Cell content as ``[(kind, text), ...]``.

    kind is black / strike / accent / accent_strike. Reads markup an EARLIER
    revision wrote instead of flattening it: a cell corrected twice keeps the
    first pass's markup, and text that pass added in colour is struck *in that
    colour* when this pass supersedes it.
    """
    v = cell.value
    if v is None or v == '':
        return []
    if isinstance(v, CellRichText):
        runs = []
        for blk in v:
            if isinstance(blk, TextBlock):
                if blk.text:
                    runs.append((_kind_of(blk.font.strike, blk.font.color), blk.text))
            elif str(blk):
                runs.append(('black', str(blk)))
        return runs
    return [(_kind_of(cell.font.strike, cell.font.color), str(v))]


def plain(cell):
    """Flattened text of a cell, rich or not."""
    return ''.join(t for _, t in read_runs(cell))


def _slice_runs(runs, start, end):
    """Sub-list of `runs` covering plain-text offsets [start, end)."""
    out, pos = [], 0
    for kind, txt in runs:
        a, b = pos, pos + len(txt)
        pos = b
        s, e = max(a, start), min(b, end)
        if s < e:
            out.append((kind, txt[s - a:e - a]))
    return out


def _rstrip_nl(runs):
    """Drop trailing newlines so an appended line doesn't leave a blank one."""
    out = list(runs)
    while out:
        kind, txt = out[-1]
        stripped = txt.rstrip('\n')
        if stripped:
            out[-1] = (kind, stripped)
            break
        out.pop()
    return out


def accent_font(cell):
    """Recolour a cell's font to the addition colour, keeping name/size/bold."""
    f = cell.font
    cell.font = Font(name=f.name or _CFG['font'], size=f.size or _CFG['size'],
                     bold=f.bold, italic=f.italic, color=_CFG['add_color'])


def mark(ws, row, col=1):
    """Stamp the '{M/D} VTI追記' marker into column A of `row` (idempotent)."""
    txt = _CFG['mark'] or configure()
    c = ws.cell(row, col)
    cur = str(c.value or '').strip()
    if txt in cur:
        return
    c.value = f'{cur}\n{txt}' if cur else txt
    c.font = Font(name=_CFG['font'], size=_CFG['mark_size'],
                  color=_CFG['add_color'])
    al = copy(c.alignment)
    al.wrap_text = True
    al.vertical = 'center'
    c.alignment = al


def rich(ws, row, col, runs, do_mark=True):
    """Write mixed runs.  runs = [(kind, text), ...].

    kind is 'black' | 'strike' | 'accent' | 'accent_strike'.
    """
    f = _fonts()
    ws.cell(row, col).value = CellRichText(
        [TextBlock(f[kind], txt) for kind, txt in runs if txt])
    if do_mark:
        mark(ws, row)


def set_accent(ws, row, col, text, do_mark=True):
    """Replace a cell's content with brand-new coloured text (a pure addition)."""
    c = ws.cell(row, col)
    c.value = text
    accent_font(c)
    if do_mark:
        mark(ws, row)


# ------------------------------------------------------------------ revisions
#
# Two shapes, picked by how much of the text is wrong (see SKILL.md):
#
#   revise_part()  a fragment inside a sentence  → strike it, correction
#                  immediately after it, on the same line
#   revise_line()  one whole line of a multi-line cell → strike that line,
#                  correction on a fresh line directly beneath it
#   revise()       the cell's entire text        → same, for a single-line cell
#
# Correcting a whole line in place would leave two full sentences running into
# each other on one wrapped line, which is unreadable in a narrow merged column;
# a fragment pushed onto its own line loses the context that makes the change
# legible. Hence the split.


def revise_part(ws, row, col, old, new, occurrence=None, do_mark=True):
    """Fragment edit — strike `old` where it sits, `new` right after it.

    Everything around the fragment stays exactly as it was. Raises when `old`
    is absent, or ambiguous and no `occurrence` (1-based) was given: silently
    editing the wrong copy of a repeated phrase is worse than stopping.
    """
    runs = read_runs(ws.cell(row, col))
    text = ''.join(t for _, t in runs)
    hits = text.count(old)
    if not old:
        raise ValueError('revise_part: empty search fragment')
    if hits == 0:
        raise ValueError(f'revise_part: {old!r} not found in {ws.title}!'
                         f'{get_column_letter(col)}{row}')
    if hits > 1 and occurrence is None:
        raise ValueError(f'revise_part: {old!r} appears {hits}× in {ws.title}!'
                         f'{get_column_letter(col)}{row} — pass occurrence=1..{hits}')
    start = -1
    for _ in range(occurrence or 1):
        start = text.index(old, start + 1)
    end = start + len(old)
    rich(ws, row, col,
         _slice_runs(runs, 0, start)
         + [(_supersede(k), t) for k, t in _slice_runs(runs, start, end)]
         + [('accent', new)]
         + _slice_runs(runs, end, len(text)),
         do_mark=do_mark)


def revise_line(ws, row, col, target, new, do_mark=True):
    """Line edit — strike one line, `new` on a fresh line beneath it.

    `target` selects the line: a 0-based index, or any substring unique to it.
    The other lines of the cell are left untouched.
    """
    runs = read_runs(ws.cell(row, col))
    text = ''.join(t for _, t in runs)
    lines = text.split('\n')
    if isinstance(target, int):
        if not -len(lines) <= target < len(lines):
            raise ValueError(f'revise_line: line {target} outside 0..{len(lines) - 1}')
        i = target % len(lines)
    else:
        hits = [k for k, ln in enumerate(lines) if target in ln]
        if not hits:
            raise ValueError(f'revise_line: no line contains {target!r} in '
                             f'{ws.title}!{get_column_letter(col)}{row}')
        if len(hits) > 1:
            raise ValueError(f'revise_line: {target!r} matches lines {hits} — '
                             'narrow the substring or pass an index')
        i = hits[0]
    start = sum(len(ln) + 1 for ln in lines[:i])
    end = start + len(lines[i])
    rich(ws, row, col,
         _slice_runs(runs, 0, start)
         + [(_supersede(k), t) for k, t in _slice_runs(runs, start, end)]
         + [('accent', '\n' + new)]
         + _slice_runs(runs, end, len(text)),
         do_mark=do_mark)


def revise(ws, row, col, new, do_mark=True):
    """Whole-cell edit — strike everything present, `new` on the line below."""
    runs = _rstrip_nl(read_runs(ws.cell(row, col)))
    if not runs:
        return set_accent(ws, row, col, new, do_mark=do_mark)
    rich(ws, row, col,
         [(_supersede(k), t) for k, t in runs] + [('accent', '\n' + new)],
         do_mark=do_mark)


def add_line(ws, row, col, text, do_mark=True):
    """Pure addition — a new coloured line under the existing content, which stays black."""
    runs = _rstrip_nl(read_runs(ws.cell(row, col)))
    if not runs:
        return set_accent(ws, row, col, text, do_mark=do_mark)
    rich(ws, row, col, runs + [('accent', '\n' + text)], do_mark=do_mark)


def append_accent(ws, row, col, extra, sep='', do_mark=True):
    """Inline extension — keep the current text, append `extra` on the same line.

    For a whole new sentence/bullet use `add_line()`; this is for tacking a
    clause onto the end of an existing line.
    """
    runs = read_runs(ws.cell(row, col))
    if sep:
        runs = _rstrip_nl(runs) + [('black', sep)]
    rich(ws, row, col, runs + [('accent', extra)], do_mark=do_mark)


def renumber(ws, row, col, new_no, do_mark=True):
    """Rewrite a No.-column cell as a plain coloured number — no strike, no old value.

    Sequence numbers carry no information once superseded, so striking them
    just adds noise. Keep the numeric type so the General format renders `11`
    rather than `11.0`; match the type of the neighbouring rows.
    """
    c = ws.cell(row, col)
    f = c.font
    c.value = new_no
    c.font = Font(name=f.name or _CFG['font'], size=f.size or _CFG['size'],
                  bold=f.bold, italic=f.italic, strike=False,
                  color=_CFG['add_color'])
    if do_mark:
        mark(ws, row)


# ------------------------------------------------------------- row insertion

def insert_rows_keep(ws, idx, n, template_row):
    """insert_rows() that also shifts merges/heights and clones row styling.

    openpyxl's ``insert_rows`` moves cell values but leaves merged ranges and
    row dimensions where they were, so a plain insert silently corrupts every
    merged block below the insertion point. Both are rebuilt here.

    `template_row` is read BEFORE the insert and supplies style, height and
    merge spans for the freshly created rows — pass the row directly above the
    insertion point so the new rows inherit that section's formatting.
    """
    orig = [str(m) for m in ws.merged_cells.ranges]

    # Merge pattern of the template row, as (min_col, max_col) spans. Derive it
    # from the pre-unmerge snapshot; reading ws.merged_cells after unmerging
    # yields an empty list and the new rows end up with no merges at all.
    tpl_spans = []
    for spec in orig:
        r = CellRange(spec)
        if r.min_row == r.max_row == template_row and r.max_col > r.min_col:
            tpl_spans.append((r.min_col, r.max_col))

    tpl_height = ws.row_dimensions[template_row].height
    tpl_styles = [copy(ws.cell(template_row, c)._style)
                  for c in range(1, ws.max_column + 1)]

    shifted = []
    for spec in orig:
        r = CellRange(spec)
        if r.min_row >= idx:
            r.shift(row_shift=n)
        elif r.max_row >= idx:
            r.expand(down=n)
        shifted.append(str(r))
    for spec in orig:
        ws.unmerge_cells(spec)

    heights = {r: ws.row_dimensions[r].height
               for r in range(idx, ws.max_row + 2)
               if ws.row_dimensions[r].height is not None}

    ws.insert_rows(idx, n)

    for spec in shifted:
        ws.merge_cells(spec)
    for r, h in sorted(heights.items(), reverse=True):
        ws.row_dimensions[r + n].height = h

    for off in range(n):
        row = idx + off
        ws.row_dimensions[row].height = tpl_height
        for c in range(1, ws.max_column + 1):
            ws.cell(row, c)._style = copy(tpl_styles[c - 1])
        for mn, mx in tpl_spans:
            ws.merge_cells(start_row=row, end_row=row,
                           start_column=mn, end_column=mx)
    return idx


def clone_row_style(ws, src_row, dst_row, max_col=None):
    """Copy every cell style from `src_row` to `dst_row`.

    Used to strip markup colouring off a row (e.g. the 変更履歴 revision row,
    which is a plain log entry and must stay black) while keeping borders,
    fills and alignment identical to its neighbours.
    """
    for c in range(1, (max_col or ws.max_column) + 1):
        ws.cell(dst_row, c)._style = copy(ws.cell(src_row, c)._style)
