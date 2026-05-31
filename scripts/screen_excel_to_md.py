#!/usr/bin/env python3
"""
screen_excel_to_md.py — Convert 画面設計書 Excel back to screen-design.md.

Supports two workbook layouts:
  * vti — original customer VTI template (画面ID at B5, items header at row 9)
  * gen — workbooks produced by screen_md_to_excel.py (画面ID at B9, items header at row 11)

Layout is auto-detected by probing the 画面ID cell in 画面項目定義. Every
row and column found in the source Excel is preserved in the Markdown
output — including section headers, multi-line cells (rendered as <br>),
and columns the destination MD format would normally drop.

Usage:
    python screen_excel_to_md.py <input.xlsx>           # writes <dir>/screen-design.md
    python screen_excel_to_md.py <input.xlsx> <out.md>
"""

import sys
from pathlib import Path

import openpyxl
from openpyxl.utils import get_column_letter


# ─── Layouts ─────────────────────────────────────────────────────────────────
#
# Each layout defines the column positions used in that workbook style.
# Header column names mirror the labels written in the source Excel — they
# also become the Markdown column titles.

ITEMS_COLS_VTI = [
    ('No',                     2),   # B
    ('項目名',                 3),   # C
    ('項目ID',                 6),   # F
    ('項目タイプ',             9),   # I
    ('入力/出力',             12),   # L
    ('必須',                  14),   # N
    ('入力データ型',          15),   # O
    ('最小桁数',              18),   # R
    ('最大桁数',              20),   # T
    ('文字揃え',              22),   # V
    ('フォーマット',          24),   # X
    ('テーブル名（論理名）',  28),   # AB
    ('テーブル名（物理名）',  31),   # AE
    ('カラム名（論理名）',    34),   # AH
    ('カラム名（物理名）',    37),   # AK
    ('表示条件',              41),   # AO
    ('デフォルト値',          44),   # AR
    ('備考',                  49),   # AW
]

ITEMS_COLS_GEN = [
    ('No',                     2),   # B
    ('項目名',                 3),   # C
    ('項目ID',                 7),   # G
    ('項目タイプ',            11),   # K
    ('入力/出力',             14),   # N
    ('必須',                  17),   # Q
    ('入力データ型',          19),   # S
    ('最小桁数',              22),   # V
    ('最大桁数',              25),   # Y
    ('実桁数',                28),   # AB
    ('文字揃え',              30),   # AD
    ('フォーマット',          33),   # AG
    ('テーブル名（論理名）',  37),   # AK
    ('テーブル名（物理名）',  42),   # AP
    ('カラム名（論理名）',    47),   # AU
    ('カラム名（物理名）',    52),   # AZ
    ('表示条件',              57),   # BE
    ('デフォルト値',          60),   # BH
    ('備考',                  64),   # BL
]

# SCR-028 style: header label '文字揃え' was typed at AD but the actual data
# merge for the column lives one slot later at AG (and every following column
# shifts the same way). デフォルト値 has no physical data column in this
# variant — we still emit the markdown column but it stays blank.
#
# Overflow convention: when カラム名（物理名）needs to express a multi-segment
# value like `m_todofuken.todofuken_name || haitatsu_shikuchoson || …`, the
# customer sometimes types each segment into its own physical cell along the
# row (BE → BH → BL), trailing every-but-last segment with a `\` line-
# continuation marker. We detect that by a trailing `\` on the BE value and
# fold the following two cells back into カラム名（物理名）— see
# `_vti2_merge_column_overflow` below.
ITEMS_COLS_VTI2 = [
    ('No',                     2),   # B
    ('項目名',                 3),   # C
    ('項目ID',                 7),   # G
    ('項目タイプ',            11),   # K
    ('入力/出力',             14),   # N
    ('必須',                  17),   # Q
    ('入力データ型',          19),   # S
    ('最小桁数',              22),   # V
    ('最大桁数',              25),   # Y
    ('実桁数',                28),   # AB
    ('文字揃え',              33),   # AG  (label says AD, data lives at AG)
    ('フォーマット',          37),   # AK
    ('テーブル名（論理名）',  42),   # AP
    ('テーブル名（物理名）',  47),   # AU
    ('カラム名（論理名）',    52),   # AZ
    ('カラム名（物理名）',    57),   # BE
    ('表示条件',              60),   # BH
    ('デフォルト値',         999),   # no data column — always emit empty
    ('備考',                  64),   # BL
]

# Indices (into ITEMS_COLS_VTI2) of the columns that participate in the
# vti2 column-name overflow. Used by _vti2_merge_column_overflow.
VTI2_COL_PHY_IDX = 15   # カラム名（物理名）
VTI2_DISP_IDX    = 16   # 表示条件
VTI2_BIKO_IDX    = 18   # 備考

CHANGE_COLS_VTI = [
    ('No', 1), ('発行日', 3), ('版数', 8), ('担当者', 11),
    ('変更内容', 18), ('確認者', 23), ('承認者', 28),
]

CHANGE_COLS_GEN = [
    ('No', 1), ('発行日', 3), ('版数', 8), ('担当者', 11),
    ('変更内容', 18), ('確認者', 23), ('承認者', 28),
]

TOC_COLS_VTI = [('No', 1), ('シート名', 3), ('説明', 8)]
TOC_COLS_GEN = [('No', 2), ('シート名', 4), ('説明', 11)]

FUNC_LIST_COLS = [
    ('#', 2), ('機能', 3), ('項目', 8), ('イベント', 11), ('説明', 14),
]

MSG_COLS = [('#', 2), ('メッセージコード', 3), ('メッセージ内容', 7)]


LAYOUTS = {
    'vti': {
        # 画面項目定義
        'items_screen_id_row':   5,
        'items_screen_name_row': 6,
        'items_header_row':      9,
        'items_cols':            ITEMS_COLS_VTI,
        # 機能定義
        'func_screen_id_row':    5,
        'func_screen_name_row':  6,
        # 機能定義 section markers are detected by scanning for "A. 機能一覧" / "B. 機能詳細"
        # メッセージ情報
        'msg_screen_id_row':     5,
        'msg_screen_name_row':   6,
        'msg_header_row':        9,
        # 画面イメージ / 画面遷移
        'image_screen_id_row':   5,
        'image_screen_name_row': 6,
        # Lookup row offsets for screen meta values (in VTI: 画面ID at B, value at J=10, 概要 at Q=17, value at V=22)
        'meta_id_label_col':   2,   # B
        'meta_id_value_col':  10,   # J
        'meta_summary_label_col': 17,  # Q
        'meta_summary_value_col': 22,  # V
        # 変更履歴 / 目次
        'change_header_row':     1,
        'change_cols':           CHANGE_COLS_VTI,
        'toc_header_row':        6,
        'toc_cols':              TOC_COLS_VTI,
    },
    'gen': {
        'items_screen_id_row':   9,
        'items_screen_name_row': 10,
        'items_header_row':      11,
        'items_cols':            ITEMS_COLS_GEN,
        'func_screen_id_row':    9,
        'func_screen_name_row':  10,
        'msg_screen_id_row':     9,
        'msg_screen_name_row':   10,
        'msg_header_row':        11,
        'image_screen_id_row':   9,
        'image_screen_name_row': 10,
        'meta_id_label_col':   2,   # B
        'meta_id_value_col':   3,   # C (script writes value to C:F)
        'meta_summary_label_col': 7,   # G
        'meta_summary_value_col': 11,  # K
        'change_header_row':     5,
        'change_cols':           CHANGE_COLS_GEN,
        'toc_header_row':        5,
        'toc_cols':              TOC_COLS_GEN,
    },
    # SCR-028 customer template — screen-meta + headers in gen positions,
    # but items columns shifted (label 文字揃え lives at AD while data lives
    # one cell later at AG) and changelog uses vti-style header at row 1.
    'vti2': {
        'items_screen_id_row':   9,
        'items_screen_name_row': 10,
        'items_header_row':      11,
        'items_cols':            ITEMS_COLS_VTI2,
        'func_screen_id_row':    9,
        'func_screen_name_row':  10,
        'msg_screen_id_row':     9,
        'msg_screen_name_row':   10,
        'msg_header_row':        11,
        'image_screen_id_row':   9,
        'image_screen_name_row': 10,
        'meta_id_label_col':   2,
        'meta_id_value_col':   3,
        'meta_summary_label_col': 7,
        'meta_summary_value_col': 11,
        'change_header_row':     1,
        'change_cols':           CHANGE_COLS_VTI,
        'toc_header_row':        5,
        'toc_cols':              TOC_COLS_GEN,
    },
}


def detect_layout(wb):
    """
    Probe 画面項目定義 to pick the right coordinate set:
      画面ID label at B5  → vti  (original VTI template, items header row 9)
      画面ID label at B9  → vti2 OR gen (items header row 11)
        ↳ Within row-9 group, distinguish vti2 from gen by checking whether
          the data column for 文字揃え (header AD11) actually lives at AD or
          is shifted to AG. SCR-028 has the label at AD but no data merge
          starting at AD anywhere in the data area → vti2.
    Default to vti when 画面項目定義 is absent.
    """
    if '画面項目定義' not in wb.sheetnames:
        return 'vti'

    ws = wb['画面項目定義']

    if ws.cell(5, 2).value and '画面ID' in str(ws.cell(5, 2).value):
        return 'vti'

    if not (ws.cell(9, 2).value and '画面ID' in str(ws.cell(9, 2).value)):
        return 'vti'

    # Header row 11 layout disambiguation.
    # vti2 fingerprint: the 文字揃え label exists at AD11, but no merged data
    # cell starts at column AD in the data block — values were typed one slot
    # to the right.
    if str(ws.cell(11, 30).value or '').strip() != '文字揃え':
        return 'gen'

    # Look for ANY non-empty cell value in column AD across the data rows.
    # The template may pre-merge empty cells at AD even in vti2, so the
    # presence of an AD-rooted merge alone is not enough — we need an
    # actual value to conclude the data is properly aligned (gen).
    has_data_value_at_AD = False
    for r in range(12, 101):
        v = ws.cell(r, 30).value
        if v is not None and str(v).strip():
            has_data_value_at_AD = True
            break
    return 'gen' if has_data_value_at_AD else 'vti2'


# ─── Cell / merge helpers ────────────────────────────────────────────────────

def build_merge_index(ws):
    """
    Return two structures:
      origins[(r, c)] = (origin_r, origin_c, max_r, max_c)
      values [(r, c)] = effective value at (r, c) — top-left value for merged cells
    """
    origins = {}
    values  = {}
    for mr in ws.merged_cells.ranges:
        v = ws.cell(mr.min_row, mr.min_col).value
        for r in range(mr.min_row, mr.max_row + 1):
            for c in range(mr.min_col, mr.max_col + 1):
                origins[(r, c)] = (mr.min_row, mr.min_col, mr.max_row, mr.max_col)
                values [(r, c)] = v
    return origins, values


def cell_value(ws, r, c, merged_values):
    if (r, c) in merged_values:
        return merged_values[(r, c)]
    return ws.cell(r, c).value


def cell_text(v):
    """Stringify, normalize newlines → <br>, escape pipe."""
    if v is None:
        return ''
    if hasattr(v, 'strftime') and not isinstance(v, str):
        try:
            return v.strftime('%Y/%m/%d')
        except Exception:
            pass
    s = str(v)
    # strip surrounding whitespace but keep internal
    s = s.strip()
    s = s.replace('\r\n', '\n').replace('\r', '\n')
    # Escape backslashes first so a value ending with `\` does NOT escape
    # the next column separator in the rendered markdown table. Then
    # escape pipes. Finally collapse newlines to <br>.
    s = s.replace('\\', '\\\\')
    s = s.replace('|', '\\|')
    s = s.replace('\n', '<br>')
    return s


def is_origin(origins, r, c):
    """True when (r, c) is the top-left of its merge range, or unmerged."""
    if (r, c) not in origins:
        return True
    or_r, or_c, _, _ = origins[(r, c)]
    return (or_r, or_c) == (r, c)


def section_header_at(ws, r, origins, header_col=2, min_span=5):
    """
    If row r is a 'section header' row — a wide merge starting at header_col
    spanning at least min_span columns — return its text. Otherwise None.
    """
    key = (r, header_col)
    if key not in origins:
        return None
    or_r, or_c, max_r, max_c = origins[key]
    if (or_r, or_c) != (r, header_col):
        return None
    if max_r != r:
        return None
    if max_c - or_c + 1 < min_span:
        return None
    v = ws.cell(r, header_col).value
    if v is None or not str(v).strip():
        return None
    return str(v).strip()


def row_has_any(ws, r, cols, merged_values):
    for c in cols:
        v = cell_value(ws, r, c, merged_values)
        if v is not None and str(v).strip():
            return True
    return False


def last_data_row(ws, cols, merged_values, start_row, end_row=None,
                  max_blank=15):
    """
    Walk downward from start_row, return the last row that has content in
    any of `cols`. Stops after `max_blank` consecutive blank rows or once
    end_row is reached.
    """
    limit = end_row if end_row is not None else ws.max_row
    last = start_row - 1
    blank = 0
    r = start_row
    while r <= limit:
        if row_has_any(ws, r, cols, merged_values):
            last = r
            blank = 0
        else:
            blank += 1
            if blank >= max_blank:
                break
        r += 1
    return last


# ─── Doc-meta header (rows 1-2 on every content sheet) ───────────────────────

def emit_doc_header(ws, origins, merged_values):
    """
    Convert the 7-column document header (rows 1-2) to a markdown table.
    Row 1 = labels (システム・アプリケーション名 / ドキュメント / シート名 / 作成日 / 作成者 / 更新日 / 更新者).
    Row 2 = values.
    """
    labels = []
    values = []
    for c in range(1, ws.max_column + 1):
        if is_origin(origins, 1, c):
            v = ws.cell(1, c).value
            if v is not None and str(v).strip():
                labels.append(cell_text(v))
        if is_origin(origins, 2, c):
            v = ws.cell(2, c).value
            if v is not None and str(v).strip():
                values.append(cell_text(v))

    if not labels:
        return []

    # Pad value row to match label count so the markdown table is consistent.
    while len(values) < len(labels):
        values.append('')
    values = values[:len(labels)]

    return [
        '| ' + ' | '.join(labels) + ' |',
        '| ' + ' | '.join(['---'] * len(labels)) + ' |',
        '| ' + ' | '.join(values) + ' |',
    ]


def emit_screen_meta(ws, layout, origins, merged_values,
                     id_row, name_row):
    """
    Emit the screen-meta box as a markdown bullet list. The Excel layout
    has the labels on the left column so there is no natural table header
    — rendering as bullets avoids the broken "headerless table" output.
    """
    id_value_col   = layout['meta_id_value_col']
    sum_value_col  = layout['meta_summary_value_col']

    screen_id   = cell_text(cell_value(ws, id_row, id_value_col, merged_values))
    summary     = cell_text(cell_value(ws, id_row, sum_value_col, merged_values))
    screen_name = cell_text(cell_value(ws, name_row, id_value_col, merged_values))

    return [
        f'- **画面ID**: {screen_id}',
        f'- **画面名**: {screen_name}',
        f'- **概要**: {summary}',
    ]


# ─── Sheet: 表紙 ─────────────────────────────────────────────────────────────

def convert_cover(ws, origins, merged_values):
    lines = ['## 表紙', '']
    for r in range(1, min(35, ws.max_row) + 1):
        row_vals = []
        for c in range(1, ws.max_column + 1):
            if not is_origin(origins, r, c):
                continue
            v = ws.cell(r, c).value
            if v is None:
                continue
            s = str(v).strip()
            if not s:
                continue
            row_vals.append(s)

        if not row_vals:
            continue

        if len(row_vals) == 1:
            lines.append(f'**{row_vals[0]}**')
            lines.append('')
        elif len(row_vals) == 2:
            # Metadata pairs (フォーマットコード / バージョン / 発行日) —
            # rendered as bullets because there is no natural table header.
            lines.append(f'- **{row_vals[0]}**: {row_vals[1]}')
        else:
            lines.append('| ' + ' | '.join(row_vals) + ' |')

    return '\n'.join(lines).rstrip() + '\n'


# ─── Sheet: 変更履歴 ─────────────────────────────────────────────────────────

def convert_change_history(ws, layout, origins, merged_values):
    lines = ['## 変更履歴', '']

    cols = layout['change_cols']
    header_row = layout['change_header_row']

    # Always emit the canonical 7-column header so output is stable.
    headers = [name for name, _ in cols]
    lines.append('| ' + ' | '.join(headers) + ' |')
    lines.append('| ' + ' | '.join(['---'] * len(headers)) + ' |')

    col_indices = [c for _, c in cols]
    last = last_data_row(ws, col_indices, merged_values, header_row + 1,
                         end_row=header_row + 50, max_blank=10)
    for r in range(header_row + 1, last + 1):
        if not row_has_any(ws, r, col_indices, merged_values):
            continue
        row_vals = [cell_text(cell_value(ws, r, c, merged_values))
                    for _, c in cols]
        lines.append('| ' + ' | '.join(row_vals) + ' |')

    return '\n'.join(lines).rstrip() + '\n'


# ─── Sheet: 目次 ─────────────────────────────────────────────────────────────

def convert_toc(ws, layout, origins, merged_values):
    lines = ['## 目次', '']
    lines.extend(emit_doc_header(ws, origins, merged_values))
    lines.append('')

    cols = layout['toc_cols']
    header_row = layout['toc_header_row']
    headers = [name for name, _ in cols]
    lines.append('| ' + ' | '.join(headers) + ' |')
    lines.append('| ' + ' | '.join(['---'] * len(headers)) + ' |')

    col_indices = [c for _, c in cols]
    last = last_data_row(ws, col_indices, merged_values, header_row + 1,
                         end_row=header_row + 50, max_blank=10)
    for r in range(header_row + 1, last + 1):
        if not row_has_any(ws, r, col_indices, merged_values):
            continue
        row_vals = [cell_text(cell_value(ws, r, c, merged_values))
                    for _, c in cols]
        lines.append('| ' + ' | '.join(row_vals) + ' |')

    return '\n'.join(lines).rstrip() + '\n'


# ─── Sheet: 画面遷移 ─────────────────────────────────────────────────────────

def convert_transition(ws, layout, origins, merged_values):
    lines = ['## 画面遷移', '']
    lines.extend(emit_doc_header(ws, origins, merged_values))
    lines.append('')

    # Free-form note(s) anywhere below the doc header.
    extra = []
    for r in range(4, min(ws.max_row, 50) + 1):
        for c in range(1, ws.max_column + 1):
            if not is_origin(origins, r, c):
                continue
            v = ws.cell(r, c).value
            if v is not None and str(v).strip():
                extra.append(cell_text(v))

    if extra:
        lines.extend(extra)
    else:
        lines.append('> ※ 画面遷移図はExcelファイル内の図を参照してください。')

    return '\n'.join(lines).rstrip() + '\n'


# ─── Sheet: 画面イメージ ─────────────────────────────────────────────────────

def convert_screen_image(ws, layout, origins, merged_values):
    lines = ['## 画面イメージ', '']
    lines.extend(emit_doc_header(ws, origins, merged_values))
    lines.append('')

    id_row   = layout['image_screen_id_row']
    name_row = layout['image_screen_name_row']
    lines.extend(emit_screen_meta(ws, layout, origins, merged_values,
                                  id_row, name_row))
    lines.append('')

    # Notes / free text below the meta box.
    skip_rows = {id_row, name_row}
    extra = []
    for r in range(id_row + 2, min(ws.max_row, 50) + 1):
        if r in skip_rows:
            continue
        for c in range(1, ws.max_column + 1):
            if not is_origin(origins, r, c):
                continue
            v = ws.cell(r, c).value
            if v is not None and str(v).strip():
                extra.append(cell_text(v))

    if extra:
        lines.extend(extra)
    lines.append('')
    lines.append('> ※ 画面イメージはExcelファイル内の画像を参照してください。')

    return '\n'.join(lines).rstrip() + '\n'


# ─── Sheet: 画面項目定義 ─────────────────────────────────────────────────────

def _vti2_merge_column_overflow(row_vals):
    """
    SCR-028 (vti2) overflow handling.

    When カラム名（物理名）needs multiple segments joined by ` || `, the
    customer types them across the trailing physical cells of the row,
    ending every-but-last segment with a literal `\\` continuation marker.
    Result of reading individual cells:

        カラム名（物理名）= 'm_todofuken.todofuken_name \\'
        表示条件          = '\\'
        備考              = 'haitatsu_shikuchoson \\'

    We detect overflow when カラム名（物理名）ends with `\\` (post cell_text
    escaping it shows as `\\\\`), then absorb 表示条件 + 備考 back into
    カラム名（物理名）and blank the borrowed columns. Segments that are
    pure-`\\` placeholders are dropped; trailing `\\` is stripped from each
    segment before joining with ` || `.

    Operates in-place on `row_vals` (the post-cell_text list).
    """
    col_phy = row_vals[VTI2_COL_PHY_IDX]
    if not col_phy.endswith('\\\\'):
        return   # not overflow mode

    raw_segments = [
        col_phy,
        row_vals[VTI2_DISP_IDX],
        row_vals[VTI2_BIKO_IDX],
    ]

    def clean(seg):
        # Strip the cell_text-escaped backslash pair, then surrounding ws.
        if seg.endswith('\\\\'):
            seg = seg[:-2]
        return seg.strip()

    parts = [clean(s) for s in raw_segments]
    # Drop empty / placeholder-only segments.
    parts = [p for p in parts if p]

    # Escape pipes for markdown — literal `||` would split the table cell.
    row_vals[VTI2_COL_PHY_IDX] = ' \\|\\| '.join(parts)
    row_vals[VTI2_DISP_IDX]    = ''
    row_vals[VTI2_BIKO_IDX]    = ''


def convert_screen_items(ws, layout, origins, merged_values):
    lines = ['## 画面項目定義', '']
    lines.extend(emit_doc_header(ws, origins, merged_values))
    lines.append('')

    id_row   = layout['items_screen_id_row']
    name_row = layout['items_screen_name_row']
    lines.extend(emit_screen_meta(ws, layout, origins, merged_values,
                                  id_row, name_row))
    lines.append('')

    cols       = layout['items_cols']
    header_row = layout['items_header_row']
    col_indices = [c for _, c in cols]
    headers     = [name for name, _ in cols]
    header_col  = cols[0][1]   # usually 2 = B
    is_vti2     = cols is ITEMS_COLS_VTI2

    last = last_data_row(ws, col_indices, merged_values, header_row + 1,
                         max_blank=20)

    # Walk rows; split into sections at wide merges.
    current_section = None
    section_rows    = []
    sections        = []   # list of (name, [row_data_lists])

    def flush():
        nonlocal section_rows, current_section
        if section_rows or current_section:
            sections.append((current_section or '', section_rows[:]))
        section_rows = []

    for r in range(header_row + 1, last + 1):
        sec = section_header_at(ws, r, origins, header_col=header_col,
                                min_span=5)
        if sec is not None:
            flush()
            current_section = sec
            continue

        # Data row: only honor cells that are their own merge origin so
        # we don't duplicate a value across the merged range.
        row_vals = []
        any_content = False
        for _, c in cols:
            if is_origin(origins, r, c):
                v = ws.cell(r, c).value
            else:
                # Use the merged value (visible to the user) for read-only display.
                v = cell_value(ws, r, c, merged_values)
            text = cell_text(v)
            row_vals.append(text)
            if text:
                any_content = True

        if any_content:
            if is_vti2:
                _vti2_merge_column_overflow(row_vals)
            section_rows.append(row_vals)

    flush()

    # Emit one ### + table per section.
    for name, rows in sections:
        if not name and not rows:
            continue
        if name:
            lines.append(f'### {name}')
            lines.append('')
        if rows:
            lines.append('| ' + ' | '.join(headers) + ' |')
            lines.append('| ' + ' | '.join(['---'] * len(headers)) + ' |')
            for row in rows:
                lines.append('| ' + ' | '.join(row) + ' |')
            lines.append('')

    return '\n'.join(lines).rstrip() + '\n'


# ─── Sheet: 機能定義 ─────────────────────────────────────────────────────────

def _find_func_section_row(ws, origins, marker_substrings, search_max=80):
    """Return the row index whose B-column merge text contains any marker."""
    for r in range(1, search_max + 1):
        sec = section_header_at(ws, r, origins, header_col=2, min_span=5)
        if sec is None:
            continue
        for marker in marker_substrings:
            if marker in sec:
                return r, sec
    return None, None


def convert_function_def(ws, layout, origins, merged_values):
    lines = ['## 機能定義', '']
    lines.extend(emit_doc_header(ws, origins, merged_values))
    lines.append('')

    id_row   = layout['func_screen_id_row']
    name_row = layout['func_screen_name_row']
    lines.extend(emit_screen_meta(ws, layout, origins, merged_values,
                                  id_row, name_row))
    lines.append('')

    a_row, a_label = _find_func_section_row(ws, origins, ['A.', '機能一覧'])
    b_row, b_label = _find_func_section_row(ws, origins, ['B.', '機能詳細'])

    # ── A. 機能一覧 ─────────────────────────────────────────────────────────
    if a_row is not None:
        lines.append(f'### {a_label or "A. 機能一覧"}')
        lines.append('')

        # The first row after the section header is the column header row.
        # Verify by reading B and treat row a_row+1 as such if it matches
        # the expected #/機能 layout; otherwise still treat it as header.
        header_row = a_row + 1
        col_indices = [c for _, c in FUNC_LIST_COLS]
        headers = [name for name, _ in FUNC_LIST_COLS]

        # Detect headers from the Excel itself if present (fall back to
        # canonical names).
        excel_headers = []
        for name, c in FUNC_LIST_COLS:
            v = cell_value(ws, header_row, c, merged_values)
            excel_headers.append(cell_text(v) or name)

        lines.append('| ' + ' | '.join(excel_headers) + ' |')
        lines.append('| ' + ' | '.join(['---'] * len(excel_headers)) + ' |')

        # Data rows: from header_row+1 until we hit B. or run out.
        stop_row = b_row - 1 if b_row else last_data_row(
            ws, col_indices, merged_values, header_row + 1,
            end_row=header_row + 60, max_blank=10)
        r = header_row + 1
        while r <= stop_row:
            sec = section_header_at(ws, r, origins, header_col=2, min_span=5)
            if sec is not None:
                # Another section appeared early — stop.
                break
            if row_has_any(ws, r, col_indices, merged_values):
                row_vals = []
                for _, c in FUNC_LIST_COLS:
                    if is_origin(origins, r, c):
                        v = ws.cell(r, c).value
                    else:
                        v = cell_value(ws, r, c, merged_values)
                    row_vals.append(cell_text(v))
                lines.append('| ' + ' | '.join(row_vals) + ' |')
            r += 1
        lines.append('')

    # ── B. 機能詳細 ─────────────────────────────────────────────────────────
    if b_row is not None:
        lines.append(f'### {b_label or "B. 機能詳細"}')
        lines.append('')

        # Two templates show up in practice:
        #   SCR-014 (vti): bullets share a single B-numbered row, with a
        #     multi-line value in column D. We split D on '\n' to recover
        #     individual bullets.
        #   SCR-028 (vti2): every bullet is its own row, with the bullet
        #     text living in a wide merge starting at column B (and step
        #     numbers like "1.1" / titles like "1. 画面初期表示" sometimes
        #     in B, sometimes paired with a text column at C).
        # The two styles are merged uniformly by classifying each row's
        # (B, C, D) triple via regex on B.
        import re
        STEP_NUM    = re.compile(r'^\d+$')              # "1", "2", "10"
        # Require whitespace after the dot so "1.1" is NOT treated as a
        # "1. 1"-style title — only forms like "1. 画面初期表示" match.
        STEP_TITLE  = re.compile(r'^(\d+)\.\s+(.+)')
        SUB_STEP    = re.compile(r'^\d+\.\d+$')          # "1.1", "10.4"
        SUB_INLINE  = re.compile(r'^(\d+\.\d+)\s+(.+)')  # "1.1 text"

        last = last_data_row(ws, [2, 3, 4], merged_values, b_row + 1,
                             max_blank=20)

        def split_lines(s):
            if not s:
                return []
            s = s.replace('\r\n', '\n').replace('\r', '\n')
            return [ln.rstrip() for ln in s.split('\n') if ln.strip()]

        for r in range(b_row + 1, last + 1):
            b_raw = cell_value(ws, r, 2, merged_values)
            d_raw = cell_value(ws, r, 4, merged_values)

            # Only treat C as its own column when the cell is its own merge
            # origin (or unmerged). In vti workbooks B and C are merged
            # together — pulling C via merged_values would just echo B
            # (e.g. C23 = '1' because it's the tail of the B-numbered merge).
            c_txt = ''
            if is_origin(origins, r, 3):
                c_v = ws.cell(r, 3).value
                if c_v is not None:
                    c_txt = str(c_v).strip()

            b_txt = '' if b_raw is None else str(b_raw).strip()
            d_txt = '' if d_raw is None else str(d_raw).strip()

            if not b_txt and not c_txt and not d_txt:
                continue

            # Pick the "text column": prefer C (vti2/gen), fall back to D (vti).
            text = c_txt or d_txt

            # Case 1: B holds a finished "#### N. title" — e.g. "1. 画面初期表示"
            m_title = STEP_TITLE.match(b_txt)
            if m_title:
                lines.append('')
                lines.append(f'#### {b_txt}')
                lines.append('')
                continue

            # Case 2: B is just "N" and the title lives in the text column.
            if STEP_NUM.match(b_txt) and text:
                head, *tail = split_lines(text)
                lines.append('')
                lines.append(f'#### {b_txt}. {head.lstrip()}')
                for ln in tail:
                    lines.append(f'  - {ln.lstrip()}')
                lines.append('')
                continue

            # Case 3: B is a sub-step "N.M" with text in C or D.
            if SUB_STEP.match(b_txt):
                head, *tail = split_lines(text) if text else ['']
                lines.append(f'- **{b_txt}** {head.lstrip()}')
                for ln in tail:
                    lines.append(f'  - {ln.lstrip()}')
                continue

            # Case 4: B is an inline "N.M text" (vti2 sometimes packs both).
            m_inline = SUB_INLINE.match(b_txt)
            if m_inline:
                lines.append(f'- **{m_inline.group(1)}** {m_inline.group(2)}')
                continue

            # Case 5: plain continuation. Use whichever side has text, split
            # multi-line content so no information is lost.
            for ln in split_lines(b_txt) or split_lines(text):
                lines.append(f'  - {ln.lstrip()}')

    return '\n'.join(lines).rstrip() + '\n'


# ─── Sheet: メッセージ情報 ───────────────────────────────────────────────────

def convert_messages(ws, layout, origins, merged_values):
    lines = ['## メッセージ情報', '']
    lines.extend(emit_doc_header(ws, origins, merged_values))
    lines.append('')

    id_row   = layout['msg_screen_id_row']
    name_row = layout['msg_screen_name_row']
    lines.extend(emit_screen_meta(ws, layout, origins, merged_values,
                                  id_row, name_row))
    lines.append('')

    header_row = layout['msg_header_row']
    headers    = [name for name, _ in MSG_COLS]
    col_indices = [c for _, c in MSG_COLS]

    lines.append('| ' + ' | '.join(headers) + ' |')
    lines.append('| ' + ' | '.join(['---'] * len(headers)) + ' |')

    last = last_data_row(ws, col_indices, merged_values, header_row + 1,
                         max_blank=15)
    for r in range(header_row + 1, last + 1):
        if not row_has_any(ws, r, col_indices, merged_values):
            continue
        row_vals = [cell_text(cell_value(ws, r, c, merged_values))
                    for _, c in MSG_COLS]
        lines.append('| ' + ' | '.join(row_vals) + ' |')

    return '\n'.join(lines).rstrip() + '\n'


# ─── Driver ──────────────────────────────────────────────────────────────────

def convert_workbook(input_path, output_path=None):
    wb = openpyxl.load_workbook(input_path, data_only=True)
    layout_name = detect_layout(wb)
    layout = LAYOUTS[layout_name]

    title = Path(input_path).stem
    parts = [f'# {title}\n']

    sheet_handlers = {
        '表紙':          lambda ws, o, v: convert_cover(ws, o, v),
        '変更履歴':      lambda ws, o, v: convert_change_history(ws, layout, o, v),
        '目次':          lambda ws, o, v: convert_toc(ws, layout, o, v),
        '画面遷移':      lambda ws, o, v: convert_transition(ws, layout, o, v),
        '画面イメージ':  lambda ws, o, v: convert_screen_image(ws, layout, o, v),
        '画面項目定義':  lambda ws, o, v: convert_screen_items(ws, layout, o, v),
        '機能定義':      lambda ws, o, v: convert_function_def(ws, layout, o, v),
        'メッセージ情報': lambda ws, o, v: convert_messages(ws, layout, o, v),
    }

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        origins, merged_values = build_merge_index(ws)

        handler = sheet_handlers.get(sheet_name)
        if handler:
            section = handler(ws, origins, merged_values)
        else:
            section = f'## {sheet_name}\n\n> ※ このシートは自動変換に対応していません。\n'
        parts.append(section.rstrip())

    md = '\n\n---\n\n'.join(parts) + '\n'

    if output_path is None:
        output_path = Path(input_path).parent / 'screen-design.md'
    output_path = Path(output_path)
    output_path.write_text(md, encoding='utf-8')

    print(f'Detected layout: {layout_name}')
    print(f'✓ Saved: {output_path}')
    return output_path


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    if not input_path.exists():
        print(f'ERROR: file not found: {input_path}')
        sys.exit(1)

    output_path = Path(sys.argv[2]) if len(sys.argv) >= 3 else None
    convert_workbook(input_path, output_path)


if __name__ == '__main__':
    main()
