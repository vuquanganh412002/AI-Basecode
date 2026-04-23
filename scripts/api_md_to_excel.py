#!/usr/bin/env python3
"""
md_to_excel.py — Convert {screen}-api.md to Excel (VTI API design template format)

Usage:
    python md_to_excel.py <input.md>
    python md_to_excel.py <input.md> <output.xlsx>

Output file defaults to same directory as input, with .xlsx extension.
"""

import sys
import re
from pathlib import Path

try:
    import openpyxl
    from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
    from openpyxl.utils import get_column_letter, column_index_from_string
except ImportError:
    print("ERROR: openpyxl is required.\n  pip install openpyxl")
    sys.exit(1)


# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────

HEADER_BLUE = "FFB4C6E7"   # bold metadata header (row 1) + 変更履歴 header
SUB_HEADER  = "FFBDD6EE"   # table sub-headers inside API detail / error / api-list
COVER_META  = "FFD9E2F3"   # cover page metadata box
NAVY        = "FF1F3864"   # cover page title text
FONT_NAME   = "游ゴシック"

_THIN = Side(style="thin", color="FF000000")
_NONE = Side(style=None)


# ──────────────────────────────────────────────────────────────────────────────
# Low-level helpers
# ──────────────────────────────────────────────────────────────────────────────

def _fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)


def _font(bold=False, size=11, color="FF000000", name=FONT_NAME):
    return Font(name=name, size=size, bold=bold, color=color)


def _align(wrap=True, h="left", v="center"):
    return Alignment(wrap_text=wrap, horizontal=h, vertical=v)


def _col(letter):
    return column_index_from_string(letter)


def _val(v):
    """Convert a string to int or float if it is purely numeric, otherwise return as-is.
    Prevents Excel 'Number Stored as Text' warnings."""
    if not isinstance(v, str):
        return v
    s = v.strip()
    if not s:
        return v
    try:
        return int(s)
    except ValueError:
        pass
    try:
        return float(s)
    except ValueError:
        pass
    return v


def _letter(col_idx):
    return get_column_letter(col_idx)


def _apply_merge_borders(ws, sc, ec, row_start, row_end, no_bottom=False):
    """
    Apply borders ONLY on the outer edges of a merged range (sc:ec, row_start:row_end).
    Truly interior cells (no side needs a border) are left untouched — no XML written.
    no_bottom=True skips the bottom border on row_end.
    """
    for row in range(row_start, row_end + 1):
        for col in range(sc, ec + 1):
            left   = _THIN if col == sc         else None
            right  = _THIN if col == ec         else None
            top    = _THIN if row == row_start  else None
            bottom = _THIN if row == row_end and not no_bottom else None
            if any([left, right, top, bottom]):
                ws.cell(row=row, column=col).border = Border(
                    left=left or _NONE, right=right or _NONE,
                    top=top  or _NONE, bottom=bottom or _NONE,
                )


def _mwrite(ws, sc, ec, row, value, row_end=None,
            fill=None, font=None, align=None, borders=True, no_bottom=False,
            number_format=None):
    """
    Merge cells sc:ec at row (optionally row:row_end), write value, apply style.
    Borders are applied via _apply_merge_borders — only outer edges.
    no_bottom=True skips bottom border (used for meta header row 3).
    number_format='@' forces text format (prevents Excel date auto-conversion).
    """
    row_end = row_end or row
    sl, el = _letter(sc), _letter(ec)

    if sc == ec and row == row_end:
        pass  # single cell, no merge needed
    else:
        ws.merge_cells(f"{sl}{row}:{el}{row_end}")

    cell = ws[f"{sl}{row}"]
    if number_format:
        cell.number_format = number_format
    cell.value = _val(value)
    if fill:
        cell.fill = fill
    if font:
        cell.font = font
    if align:
        cell.alignment = align
    else:
        cell.alignment = _align()

    if borders:
        _apply_merge_borders(ws, sc, ec, row, row_end, no_bottom=no_bottom)


# ──────────────────────────────────────────────────────────────────────────────
# Column layout constants  (A=1 … AK=37)
# ──────────────────────────────────────────────────────────────────────────────

# Standard metadata header (3-row header on all content sheets)
# Each tuple: (start_col, end_col, row1_label, meta_key)
HDR = [
    (_col("A"),  _col("I"),  "システム・アプリケーション名", "system_name"),
    (_col("J"),  _col("P"),  "ドキュメント",                "document_name"),
    (_col("Q"),  _col("U"),  "シート名",                    "_sheet_name"),
    (_col("V"),  _col("Y"),  "作成日",                      "created_date"),
    (_col("Z"),  _col("AC"), "作成者",                      "created_by"),
    (_col("AD"), _col("AG"), "更新日",                      "updated_date"),
    (_col("AH"), _col("AK"), "更新者",                      "updated_by"),
]

# 変更履歴 columns
CHANGELOG_COLS = [
    (_col("A"),  _col("B"),  "No",      "center"),
    (_col("C"),  _col("G"),  "発行日",   "center"),
    (_col("H"),  _col("J"),  "版数",     "center"),
    (_col("K"),  _col("Q"),  "担当者",   "center"),
    (_col("R"),  _col("V"),  "変更内容", "left"),
    (_col("W"),  _col("AA"), "確認者",   "center"),
    (_col("AB"), _col("AG"), "承認者",   "center"),
]

# エラー一覧 columns
ERROR_COLS = [
    (_col("A"),  _col("B"),  "#",          "center"),
    (_col("C"),  _col("I"),  "エラータイプ", "left"),
    (_col("J"),  _col("U"),  "エラーコード", "left"),
    (_col("V"),  _col("AK"), "エラーメッセージ", "left"),
]

# API一覧 columns
API_LIST_COLS = [
    (_col("A"),  _col("B"),  "#",    "center"),
    (_col("C"),  _col("I"),  "API ID", "left"),
    (_col("J"),  _col("R"),  "API名",  "left"),
    (_col("S"),  _col("AC"), "説明",   "left"),
    (_col("AD"), _col("AK"), "URL",   "left"),
]

# API detail — summary label/value
SUMM_LSC, SUMM_LEC = _col("B"), _col("I")   # label cols
SUMM_VSC, SUMM_VEC = _col("J"), _col("AK")  # value cols
HTTP_CSC, HTTP_CEC = _col("J"), _col("M")   # HTTP code number
HTTP_TSC, HTTP_TEC = _col("N"), _col("AK")  # HTTP code text

# API detail — request params columns
# Tuple: (start_col, end_col, header_label, data_align)  — data_align defaults to "left"
PARAM_COLS = [
    (_col("B"),  _col("B"),  "#",              "center"),
    (_col("C"),  _col("L"),  "パラメーターID",  "left"),
    (_col("M"),  _col("P"),  "タイプ",          "center"),
    (_col("Q"),  _col("S"),  "繰り返し",         "center"),
    (_col("T"),  _col("X"),  "必須",             "center"),
    (_col("Y"),  _col("AB"), "最小長",           "center"),
    (_col("AC"), _col("AE"), "最大長",           "center"),
    (_col("AF"), _col("AK"), "説明",             "left"),
]

# API detail — response data columns (field_id col C top-level / D nested)
RESP_HDR_COLS = [
    (_col("B"),  _col("B"),  "#",              "center"),
    (_col("C"),  _col("L"),  "項目ID",          "left"),
    (_col("M"),  _col("P"),  "タイプ",          "center"),
    (_col("Q"),  _col("S"),  "繰り返し",         "center"),
    (_col("T"),  _col("X"),  "フォーマット",     "center"),
    (_col("Y"),  _col("AE"), "Nullable",        "center"),
    (_col("AF"), _col("AK"), "説明",             "left"),
]


# ──────────────────────────────────────────────────────────────────────────────
# Sheet setup
# ──────────────────────────────────────────────────────────────────────────────

def _set_col_widths(ws, width, max_col):
    """Set ALL columns 1..max_col to the same explicit width (matches template XML range)."""
    for i in range(1, max_col + 1):
        ws.column_dimensions[get_column_letter(i)].width = width


def _no_gridlines(ws):
    ws.sheet_view.showGridLines = False


def _setup(ws, max_col=37, col_width=4.25):
    """
    Standard content sheet setup.
    max_col=37 (A-AK) for most sheets; 33 (A-AG) for 変更履歴.
    Mirrors template XML: <col customWidth="1" min="1" max=N width=W/>
    """
    ws.sheet_format.defaultColWidth = 12.63
    ws.sheet_format.defaultRowHeight = 15.0
    ws.sheet_format.customHeight = True
    _set_col_widths(ws, col_width, max_col)
    ws.freeze_panes = None
    _no_gridlines(ws)


# ──────────────────────────────────────────────────────────────────────────────
# Metadata header (rows 1-3) — shared by all content sheets
# ──────────────────────────────────────────────────────────────────────────────

def _write_meta_header(ws, doc, sheet_name):
    """
    Row 1: header labels (bold, HEADER_BLUE fill), each group merged sc:ec.
    Rows 2-3: value cells merged sc:ec spanning both rows.
    Border = outer edges only (merge-boundary pattern).
    """
    for r in (1, 2, 3):
        ws.row_dimensions[r].height = 19.5

    for sc, ec, label, key in HDR:
        # Row 1 label — single row merge
        _mwrite(ws, sc, ec, 1,
                label,
                fill=_fill(HEADER_BLUE),
                font=_font(bold=True),
                align=_align(h="center"),
                borders=True)

        # Rows 2-3 value — vertical merge, center-aligned
        value = sheet_name if key == "_sheet_name" else doc.get(key, "")
        # Force text format on date cells to prevent Excel auto-conversion
        fmt = '@' if key in _DATE_KEYS else None
        _mwrite(ws, sc, ec, 2, value, row_end=3,
                font=_font(),
                align=_align(h="center"),
                borders=True,
                number_format=fmt)


# ──────────────────────────────────────────────────────────────────────────────
# Table row helpers
# ──────────────────────────────────────────────────────────────────────────────

def _write_table_header(ws, row, col_defs, fill_color=SUB_HEADER, height=19.5):
    ws.row_dimensions[row].height = height
    for col_def in col_defs:
        sc, ec, label = col_def[0], col_def[1], col_def[2]
        _mwrite(ws, sc, ec, row, label,
                fill=_fill(fill_color),
                font=_font(bold=True),
                align=_align(h="center"),
                borders=True)


def _write_data_row(ws, row, col_defs, values, height=None):
    if height is None:
        # Auto-calculate from longest value so all sheets benefit without manual tuning
        height = max(
            (_text_height(str(v), chars_per_line=45) for v in values if v),
            default=15.75,
        )
    ws.row_dimensions[row].height = height
    for col_def, val in zip(col_defs, values):
        sc, ec = col_def[0], col_def[1]
        data_align = col_def[3] if len(col_def) > 3 else "left"
        _mwrite(ws, sc, ec, row, val,
                font=_font(),
                align=_align(h=data_align),
                borders=True)


def _blank_row(ws, row, height=19.5):
    ws.row_dimensions[row].height = height


def _section_title(ws, row, text, col_start="A", col_end="AK", height=19.5):
    """Section title row — no borders, just bold text."""
    ws.row_dimensions[row].height = height
    sc, ec = _col(col_start), _col(col_end)
    if sc != ec:
        ws.merge_cells(f"{col_start}{row}:{col_end}{row}")
    cell = ws[f"{col_start}{row}"]
    cell.value = text
    cell.font = _font(bold=True)
    cell.alignment = _align()
    # No borders


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 表紙
# ──────────────────────────────────────────────────────────────────────────────

def write_cover(wb, doc):
    from openpyxl.drawing.image import Image as XLImage
    import os

    ws = wb.create_sheet("表紙")
    ws.sheet_format.defaultColWidth = 12.63
    ws.sheet_format.defaultRowHeight = 15.0
    ws.sheet_format.customHeight = True
    _set_col_widths(ws, 3.25, 37)   # template: <col min="1" max="37" width="3.25"/>
    _no_gridlines(ws)

    # ── Row heights (matching template exactly) ──────────────────────────
    ws.row_dimensions[1].height = 19.5
    for r in range(2, 221):
        ws.row_dimensions[r].height = 12.75
    ws.row_dimensions[10].height = 39.75
    ws.row_dimensions[12].height = 33.0
    ws.row_dimensions[15].height = 15.0

    # ── Surrounding border box: B2:AK34 ─────────────────────────────────
    BOX_TOP, BOX_BOT = 2, 34
    BOX_LC,  BOX_RC  = _col("B"), _col("AK")

    # Top row: all cells B-AK get top border; corners get left/right too
    for col in range(BOX_LC, BOX_RC + 1):
        c = ws.cell(row=BOX_TOP, column=col)
        c.border = Border(
            top   = _THIN,
            left  = _THIN if col == BOX_LC else _NONE,
            right = _THIN if col == BOX_RC else _NONE,
        )
    # Side rows: only B (left) and AK (right)
    for row in range(BOX_TOP + 1, BOX_BOT):
        ws.cell(row=row, column=BOX_LC).border = Border(left=_THIN)
        ws.cell(row=row, column=BOX_RC).border = Border(right=_THIN)
    # Bottom row: all cells B-AK get bottom border
    for col in range(BOX_LC, BOX_RC + 1):
        c = ws.cell(row=BOX_BOT, column=col)
        c.border = Border(
            bottom = _THIN,
            left   = _THIN if col == BOX_LC else _NONE,
            right  = _THIN if col == BOX_RC else _NONE,
        )

    # ── System title ─────────────────────────────────────────────────────
    ws.merge_cells("B10:AK10")
    c = ws["B10"]
    c.value = doc.get("system_name", "")
    c.font = Font(name=FONT_NAME, size=26, color=NAVY)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    # Preserve side borders from box
    ws["B10"].border  = Border(left=_THIN)
    ws["AK10"].border = Border(right=_THIN)

    # ── Document type ────────────────────────────────────────────────────
    ws.merge_cells("B12:AK12")
    c = ws["B12"]
    c.value = doc.get("document_name", "")
    c.font = Font(name=FONT_NAME, size=24, color=NAVY)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B12"].border  = Border(left=_THIN)
    ws["AK12"].border = Border(right=_THIN)

    # ── Version ──────────────────────────────────────────────────────────
    ws.merge_cells("B15:AK15")
    c = ws["B15"]
    c.value = f"版{doc.get('format_version', '1.0')}"
    c.font = Font(name=FONT_NAME, size=15)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B15"].border  = Border(left=_THIN)
    ws["AK15"].border = Border(right=_THIN)

    # ── Metadata box (rows 18-20, cols L:R=label, S:Y=value) ─────────────
    meta_rows = [
        ("フォーマットコード",    doc.get("format_code", "")),
        ("フォーマットバージョン", doc.get("format_version", "")),
        ("発行日",               doc.get("issue_date", "")),
    ]
    for i, (label, value) in enumerate(meta_rows):
        r = 18 + i
        ws.merge_cells(f"L{r}:R{r}")
        c = ws[f"L{r}"]
        c.value = label
        c.fill = _fill(COVER_META)
        c.font = _font(size=10)
        c.alignment = _align(h="center")
        _apply_merge_borders(ws, _col("L"), _col("R"), r, r)

        ws.merge_cells(f"S{r}:Y{r}")
        c = ws[f"S{r}"]
        # Force text format on 発行日 value to prevent Excel date auto-conversion
        if label == "発行日":
            c.number_format = '@'
        c.value = value
        c.fill = _fill(COVER_META)
        c.font = _font(size=10)
        c.alignment = _align(h="center")
        _apply_merge_borders(ws, _col("S"), _col("Y"), r, r)

        # Preserve right side border of box on AK
        ws.cell(row=r, column=BOX_RC).border = Border(right=_THIN)
        # Preserve left side border of box on B
        ws.cell(row=r, column=BOX_LC).border = Border(left=_THIN)

    # ── VTI logo (top-right area, col P row 3, matches template anchor) ──
    logo_path = Path(__file__).parent / "vti_logo.png"
    if logo_path.exists():
        img = XLImage(str(logo_path))
        # Original size: 318x122 px. Template EMU: cx=1333500 cy=514350
        # 1 EMU = 1/914400 inch; at 96 DPI: 1 px = 914400/96 EMU = 9525 EMU
        # cx=1333500 → 1333500/9525 ≈ 140 px; cy=514350 → 54 px
        img.width  = 140
        img.height = 54
        ws.add_image(img, "P3")


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 変更履歴
# ──────────────────────────────────────────────────────────────────────────────

def write_changelog(wb, doc, changes):
    ws = wb.create_sheet("変更履歴")
    _setup(ws, max_col=33, col_width=4.25)  # template: <col min="1" max="33" width="4.25"/>

    _write_table_header(ws, 1, CHANGELOG_COLS, fill_color=HEADER_BLUE, height=19.5)

    for i, ch in enumerate(changes):
        row = 2 + i
        _write_data_row(ws, row, CHANGELOG_COLS, [
            str(i + 1),
            ch.get("date", ""),
            ch.get("version", ""),
            ch.get("author", ""),
            ch.get("description", ""),
            ch.get("reviewer", ""),
            ch.get("approver", ""),
        ], height=19.5)
        # Force text format on 発行日 column to prevent Excel date auto-conversion
        date_sc = CHANGELOG_COLS[1][0]  # 発行日 start col
        ws.cell(row=row, column=date_sc).number_format = '@'


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 概要
# ──────────────────────────────────────────────────────────────────────────────

def write_overview(wb, doc, sys_lines, purpose_lines, related_docs):
    ws = wb.create_sheet("概要")
    _setup(ws)
    _write_meta_header(ws, doc, "概要")

    row = 4
    _blank_row(ws, row)

    # 1. システム概要
    row += 1
    _section_title(ws, row, "1.システム概要", "B", "AK")

    for line in sys_lines:
        row += 1
        ws.row_dimensions[row].height = 19.5
        ws.merge_cells(f"C{row}:AK{row}")
        c = ws[f"C{row}"]
        c.value = line
        c.font = _font()
        c.alignment = _align()

    row += 1
    _blank_row(ws, row)

    # 2. 資料目的
    row += 1
    _section_title(ws, row, "2.資料目的", "B", "AK")

    HIGHLIGHT = "FFFFFF99"   # light yellow — easy to spot the screen name
    for line in purpose_lines:
        row += 1
        ws.row_dimensions[row].height = 19.5
        ws.merge_cells(f"C{row}:AK{row}")
        c = ws[f"C{row}"]
        c.value = line
        c.font = _font(bold=True)
        c.fill = _fill(HIGHLIGHT)
        c.alignment = _align()

    row += 1
    _blank_row(ws, row)

    # 3. 関連資料
    row += 1
    _section_title(ws, row, "3.関連資料", "B", "AK")

    row += 1
    _blank_row(ws, row)

    # Header: C=No, D:N=資料コード, O:AG=資料名
    REL_COLS = [
        (_col("C"), _col("C"),  "No",       "center"),
        (_col("D"), _col("N"),  "資料コード", "left"),
        (_col("O"), _col("AG"), "資料名",    "left"),
    ]
    row += 1
    _write_table_header(ws, row, REL_COLS, fill_color=HEADER_BLUE)

    rows_to_write = related_docs if related_docs else [{}, {}]
    for i, rd in enumerate(rows_to_write):
        row += 1
        _write_data_row(ws, row, REL_COLS, [
            str(i + 1) if related_docs else "",
            rd.get("code", ""),
            rd.get("name", ""),
        ])


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: エラー一覧
# ──────────────────────────────────────────────────────────────────────────────

def write_errors(wb, doc, errors):
    ws = wb.create_sheet("エラー一覧")
    _setup(ws)
    _write_meta_header(ws, doc, "エラー一覧")

    row = 4
    _blank_row(ws, row)

    row += 1
    _write_table_header(ws, row, ERROR_COLS, fill_color=HEADER_BLUE)

    for i, err in enumerate(errors):
        row += 1
        _write_data_row(ws, row, ERROR_COLS, [
            str(i + 1),
            err.get("error_type", ""),
            err.get("error_code", ""),
            err.get("error_message", ""),
        ], height=19.5)


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: API一覧
# ──────────────────────────────────────────────────────────────────────────────

def write_api_list(wb, doc, apis):
    ws = wb.create_sheet("API一覧")
    _setup(ws)
    _write_meta_header(ws, doc, "API一覧")

    row = 4
    _blank_row(ws, row)

    row += 1
    _write_table_header(ws, row, API_LIST_COLS, fill_color=HEADER_BLUE)

    for i, api in enumerate(apis):
        row += 1
        api_id = api.get("api_id", "")
        _write_data_row(ws, row, API_LIST_COLS, [
            str(i + 1),
            api_id,
            api.get("api_name", ""),
            api.get("description", ""),
            api.get("uri", ""),
        ], height=15.75)

        # Internal hyperlink: API ID cell → corresponding API detail sheet
        if api_id:
            cell = ws.cell(row=row, column=_col("C"))
            cell.hyperlink = f"#'{api_id}'!A1"
            cell.font = Font(name=FONT_NAME, size=11, color="FF0563C1", underline="single")


# ──────────────────────────────────────────────────────────────────────────────
# Auto row height helper
# ──────────────────────────────────────────────────────────────────────────────

def _text_height(text, chars_per_line=None, line_height=18.0, min_height=15.75):
    """
    Estimate row height for cell text (font size 11, Yu Gothic).
    - line_height=18 is generous for Yu Gothic 11pt (renders taller than western fonts).
    - If text has explicit newlines (e.g. JSON blocks), count those lines.
    - If chars_per_line is given, also estimate wrapped lines for long single lines.
      For Japanese text use chars_per_line≈45 (double-width chars); ASCII ≈ 80.
    - Capped at 409 (Excel maximum row height).
    """
    if not text:
        return min_height
    lines = text.split('\n')
    if chars_per_line:
        total = 0
        for line in lines:
            total += max(1, -(-len(line) // chars_per_line))  # ceiling division
        num_lines = total
    else:
        num_lines = len(lines)
    return min(409, max(min_height, num_lines * line_height))


def _resp_row_height(field):
    """Auto row height for a response field row — driven by description length."""
    desc = field.get("description", "") or ""
    fid  = field.get("field_id", "") or ""
    return _text_height(desc or fid, chars_per_line=30)


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: API detail  (one sheet per API)
# ──────────────────────────────────────────────────────────────────────────────

def write_api_detail(wb, doc, api):
    api_id = api.get("api_id", "API")
    ws = wb.create_sheet(api_id)
    _setup(ws)
    _write_meta_header(ws, doc, api_id)

    row = 4
    _blank_row(ws, row)

    # ── 1.概要 ──────────────────────────────────────────────────────────
    row += 1
    _section_title(ws, row, "1.概要")

    row += 1
    _blank_row(ws, row)

    summary_items = [
        ("API名",                 api.get("api_name", "")),
        ("概要",                  api.get("summary_desc", "")),
        ("URI",                  api.get("uri", "")),
        ("メソッド",              api.get("method", "")),
        ("リクエストボディー",      api.get("request_body", "")),
        ("リクエストパラメーター",  api.get("request_params_str", "")),
        ("ヘッダ",                api.get("header", "")),
    ]

    for label, value in summary_items:
        row += 1
        display = value.replace("\\n", "\n")
        ws.row_dimensions[row].height = _text_height(display, chars_per_line=100)
        _mwrite(ws, SUMM_LSC, SUMM_LEC, row, label,
                fill=_fill(HEADER_BLUE), font=_font(), align=_align(), borders=True)
        _mwrite(ws, SUMM_VSC, SUMM_VEC, row, display,
                font=_font(), align=_align(), borders=True)

    # HTTP response codes — label spans multiple rows vertically
    http_codes = api.get("http_codes", [])
    if http_codes:
        code_start = row + 1
        code_end   = code_start + len(http_codes) - 1

        # Label merged vertically
        _mwrite(ws, SUMM_LSC, SUMM_LEC, code_start, "HTTPレスポンスコード",
                row_end=code_end,
                fill=_fill(HEADER_BLUE), font=_font(size=9), align=_align(), borders=True)

        for code, text in http_codes:
            row += 1
            ws.row_dimensions[row].height = _text_height(text, chars_per_line=100)
            _mwrite(ws, HTTP_CSC, HTTP_CEC, row, code,
                    font=_font(), align=_align(h="center"), borders=True)
            _mwrite(ws, HTTP_TSC, HTTP_TEC, row, text,
                    font=_font(), align=_align(), borders=True)

    # ── 2. リクエストパラメータ ───────────────────────────────────────────
    row += 1
    _blank_row(ws, row)

    row += 1
    _section_title(ws, row, "2. リクエストパラメータ")

    row += 1
    _blank_row(ws, row)

    row += 1
    _write_table_header(ws, row, PARAM_COLS, fill_color=HEADER_BLUE)

    for param in api.get("params", []):
        row += 1
        _write_data_row(ws, row, PARAM_COLS, [
            param.get("no", ""),
            param.get("param_id", ""),
            param.get("type", ""),
            param.get("repeat", ""),
            param.get("required", ""),
            param.get("min_len", ""),
            param.get("max_len", ""),
            param.get("description", ""),
        ])

    # ── 3. レスポンスデータ ───────────────────────────────────────────────
    row += 1
    _blank_row(ws, row)

    row += 1
    _section_title(ws, row, "3.レスポンスデータ")

    row += 1
    _blank_row(ws, row)

    row += 1
    _write_table_header(ws, row, RESP_HDR_COLS, fill_color=HEADER_BLUE)

    row = _write_response_fields(ws, row + 1, api.get("response_fields", []))

    # ── Examples ─────────────────────────────────────────────────────────
    row += 1
    _blank_row(ws, row)

    def _write_example(ws, row, label, content):
        """Label row (no wrap, no border) + content row (with borders, auto height)."""
        ws.row_dimensions[row].height = 19.5
        _mwrite(ws, _col("B"), _col("I"), row, label,
                font=_font(bold=True), align=_align(wrap=False), borders=False)

        row += 1
        ws.row_dimensions[row].height = _text_height(content)
        _mwrite(ws, _col("C"), _col("AK"), row, content,
                font=_font(), align=_align(), borders=True)
        return row + 1

    req_ex      = api.get("request_example", "")
    resp_ok     = api.get("response_success", "")
    resp_errors = api.get("response_errors", [])

    if req_ex:
        row += 1
        row = _write_example(ws, row, "リクエスト", req_ex)
    if resp_ok:
        row += 1
        row = _write_example(ws, row, "レスポンス（成功）", resp_ok)
    for label, code in resp_errors:
        row += 1
        row = _write_example(ws, row, f"レスポンス（失敗 {label}）", code)

    # ── 4. 処理手順 ───────────────────────────────────────────────────────
    row += 1
    _blank_row(ws, row)

    row += 1
    _section_title(ws, row, "4. 処理手順")

    for step in api.get("steps", []):
        row += 1
        title = step.get("title", "")
        ws.row_dimensions[row].height = _text_height(title, chars_per_line=100)
        _mwrite(ws, _col("B"), _col("AK"), row, title,
                font=_font(bold=True), borders=False)

        for item in step.get("items", []):
            row += 1
            text = item.get("text", "")
            if item.get("type") == "code":
                # Code block — bordered box, auto height from explicit newlines
                ws.row_dimensions[row].height = min(409, _text_height(text))
                _mwrite(ws, _col("C"), _col("AK"), row, text,
                        font=_font(size=9), align=_align(), borders=True)
            else:
                ws.row_dimensions[row].height = _text_height(text, chars_per_line=50)
                col = "C" if item.get("indent", 1) == 1 else "D"
                _mwrite(ws, _col(col), _col("AK"), row, text,
                        font=_font(size=9), align=_align(), borders=False)


def _write_response_fields(ws, start_row, fields):
    """
    Write response fields with nesting.
    - Top-level: field_id in col C
    - Child (→): field_id in col D; consecutive children share merged col C (empty)
    Returns the last row written.
    """
    row = start_row
    i = 0
    while i < len(fields):
        field = fields[i]
        if not field.get("nested", False):
            _write_resp_row(ws, row, field, id_col="C")
            ws.row_dimensions[row].height = _resp_row_height(field)
            row += 1
            i += 1
        else:
            # Collect consecutive child fields
            group_start = row
            while i < len(fields) and fields[i].get("nested", False):
                _write_resp_row(ws, row, fields[i], id_col="D")
                ws.row_dimensions[row].height = _resp_row_height(fields[i])
                row += 1
                i += 1
            group_end = row - 1

            # Merge col C across the child group (empty visual indent)
            if group_end > group_start:
                ws.merge_cells(f"C{group_start}:C{group_end}")
            # Apply borders on the merged C column group
            _apply_merge_borders(ws, _col("C"), _col("C"), group_start, group_end)

    return row - 1


def _write_resp_row(ws, row, field, id_col):
    """Write one response data row. id_col is 'C' (top-level) or 'D' (nested)."""
    # # — col B (single cell)
    c = ws.cell(row=row, column=_col("B"))
    c.value = _val(field.get("no", ""))
    c.font = _font()
    c.alignment = _align(h="center")
    _apply_merge_borders(ws, _col("B"), _col("B"), row, row)

    # Field ID — C:L (top-level) or D:L (nested)
    id_sc = _col(id_col)
    id_ec = _col("L")
    _mwrite(ws, id_sc, id_ec, row, field.get("field_id", ""),
            font=_font(), align=_align(), borders=True)

    # If nested, col C is left empty (will be merged by caller)
    if id_col == "D":
        pass  # C cell left empty; merge handled in _write_response_fields

    # タイプ M:P
    _mwrite(ws, _col("M"), _col("P"), row, field.get("type", ""),
            font=_font(), align=_align(h="center"), borders=True)
    # 繰り返し Q:S
    _mwrite(ws, _col("Q"), _col("S"), row, field.get("repeat", ""),
            font=_font(), align=_align(h="center"), borders=True)
    # フォーマット T:X
    _mwrite(ws, _col("T"), _col("X"), row, field.get("format", ""),
            font=_font(), align=_align(h="center"), borders=True)
    # Nullable Y:AE
    _mwrite(ws, _col("Y"), _col("AE"), row, field.get("nullable", ""),
            font=_font(), align=_align(h="center"), borders=True)
    # 説明 AF:AK
    _mwrite(ws, _col("AF"), _col("AK"), row, field.get("description", ""),
            font=_font(), align=_align(), borders=True)


# ──────────────────────────────────────────────────────────────────────────────
# Date formatting helper
# ──────────────────────────────────────────────────────────────────────────────

def _format_date(value):
    """Normalize a date string to yyyy/mm/dd format.
    Handles yyyy-mm-dd, yyyy/mm/dd, and other common separators.
    Returns the original value unchanged if it does not look like a date."""
    if not isinstance(value, str):
        return value
    s = value.strip()
    # Match patterns like 2026-04-06 or 2026/04/06
    m = re.match(r'^(\d{4})[\-/\.](\d{1,2})[\-/\.](\d{1,2})$', s)
    if m:
        return f"{m.group(1)}/{int(m.group(2)):02d}/{int(m.group(3)):02d}"
    return value


# Date-related frontmatter keys that should be formatted as yyyy/mm/dd
_DATE_KEYS = {'issue_date', 'created_date', 'updated_date'}


# ──────────────────────────────────────────────────────────────────────────────
# Markdown parser
# ──────────────────────────────────────────────────────────────────────────────

def parse_frontmatter(text):
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return {}, text
    try:
        end = next(i for i, l in enumerate(lines[1:], 1) if l.strip() == "---")
    except StopIteration:
        return {}, text
    meta = {}
    for line in lines[1:end]:
        if ":" in line:
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, "\n".join(lines[end + 1:])


def parse_md_table(lines):
    """Parse a markdown table into list of dicts."""
    headers = None
    rows = []
    for line in lines:
        line = line.strip()
        if not line.startswith("|"):
            continue
        if re.match(r"^\|[-| :]+\|$", line):
            continue
        cols = [c.strip() for c in line.strip("|").split("|")]
        if headers is None:
            headers = cols
        else:
            rows.append(dict(zip(headers, cols)))
    return rows


def parse_code_block(section_text):
    """Extract content from the first ``` fence in a section."""
    in_fence = False
    content = []
    for line in section_text.splitlines():
        if line.strip().startswith("```"):
            if in_fence:
                break
            in_fence = True
            continue
        if in_fence:
            content.append(line)
    return "\n".join(content).strip()


def parse_labeled_code_blocks(section_text):
    """
    Parse multiple labeled code blocks from a section.
    Format:
        ### 401 Unauthorized
        ```json
        { ... }
        ```
    Returns [(label, code), ...]
    """
    results = []
    current_label = None
    in_fence = False
    content = []
    for line in section_text.splitlines():
        h3 = re.match(r"^###\s+(.+)$", line)
        if h3:
            if current_label is not None and content:
                results.append((current_label, "\n".join(content).strip()))
            current_label = h3.group(1).strip()
            in_fence = False
            content = []
            continue
        if line.strip().startswith("```"):
            if in_fence:
                in_fence = False
            else:
                in_fence = True
            continue
        if in_fence and current_label is not None:
            content.append(line)
    if current_label is not None and content:
        results.append((current_label, "\n".join(content).strip()))
    return results


def parse_steps(section_text):
    """Parse processing steps section.
    Supports code fences (``` ... ```) inside steps — stored as {"type": "code", "text": ...}.
    Regular bullets stored as {"type": "text", "indent": 1|2, "text": ...}.
    """
    steps = []
    current = None
    in_fence = False
    fence_lines = []

    def _flush_fence():
        if fence_lines and current is not None:
            current["items"].append({"type": "code", "text": "\n".join(fence_lines)})
        fence_lines.clear()

    for line in section_text.splitlines():
        h3 = re.match(r"^###\s+(.+)$", line)
        if h3:
            if in_fence:
                _flush_fence()
                in_fence = False
            if current:
                steps.append(current)
            current = {"title": h3.group(1).strip(), "items": []}
            continue
        if current is None:
            continue
        if line.strip().startswith("```"):
            if in_fence:
                _flush_fence()
                in_fence = False
            else:
                in_fence = True
            continue
        if in_fence:
            fence_lines.append(line)
            continue
        m2 = re.match(r"^  - (.+)$", line)
        if m2:
            current["items"].append({"type": "text", "indent": 2, "text": m2.group(1).strip()})
            continue
        m1 = re.match(r"^- (.+)$", line)
        if m1:
            current["items"].append({"type": "text", "indent": 1, "text": m1.group(1).strip()})
    if in_fence:
        _flush_fence()
    if current:
        steps.append(current)
    return steps


def parse_http_codes(value_str):
    """'200:OK, 400:Bad request' → [('200','OK'), ('400','Bad request')]"""
    codes = []
    for part in value_str.split(","):
        part = part.strip()
        if ":" in part:
            code, _, text = part.partition(":")
            codes.append((code.strip(), text.strip()))
    return codes


def get_h2_section(text, heading):
    """Extract body of a specific ## heading from text."""
    pattern = re.compile(
        rf"^##\s+{re.escape(heading)}\s*$(.+?)(?=^##\s|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    m = pattern.search(text)
    return m.group(1) if m else ""


def split_h1(text):
    """Split text by # headings, return [(title, body), ...]."""
    pattern = re.compile(r"^# (.+)$", re.MULTILINE)
    positions = [(m.start(), m.group(1).strip()) for m in pattern.finditer(text)]
    results = []
    for i, (pos, title) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        nl = text.find("\n", pos)
        body_start = nl + 1 if nl >= 0 else end
        results.append((title, text[body_start:end]))
    return results


def parse_document(md_text):
    doc_meta, rest = parse_frontmatter(md_text)

    # Format date fields in frontmatter to yyyy/mm/dd
    for key in _DATE_KEYS:
        if key in doc_meta:
            doc_meta[key] = _format_date(doc_meta[key])

    # Global body = everything before first # API heading
    first_api = re.search(r"^# API\b", rest, re.MULTILINE)
    global_body = rest[: first_api.start()] if first_api else rest

    # ── Global sections ──────────────────────────────────────────────────
    issue_date = doc_meta.get("issue_date", "")
    changes_raw = parse_md_table(get_h2_section(global_body, "変更履歴").splitlines())
    changes = [
        {
            "date":        _format_date(
                               r.get("発行日", "").replace("{issue_date}", issue_date)
                           ),
            "version":     r.get("版数", ""),
            "author":      r.get("担当者", ""),
            "description": r.get("変更内容", ""),
            "reviewer":    r.get("確認者", ""),
            "approver":    r.get("承認者", ""),
        }
        for r in changes_raw
    ]

    sys_lines = [
        l.rstrip()
        for l in get_h2_section(global_body, "システム概要").strip().splitlines()
        if l.strip()
    ]
    # Replace {screen_name} / {screen_id} placeholders so each screen's MD
    # stays generic while the Excel output shows the correct screen name.
    screen_name = doc_meta.get("screen_name", "")
    screen_id   = doc_meta.get("screen_id", "")
    # Extract screen number (e.g. "002" from "ACSMS-SCR-002")
    screen_number_match = re.search(r'(\d+)$', screen_id)
    screen_number = screen_number_match.group(1) if screen_number_match else ""
    purpose_lines = [
        l.rstrip()
         .replace("{screen_name}", screen_name)
         .replace("{screen_id}",   screen_id)
        for l in get_h2_section(global_body, "資料目的").strip().splitlines()
        if l.strip()
    ]

    related_raw = parse_md_table(get_h2_section(global_body, "関連資料").splitlines())
    related = [{"code": r.get("資料コード", ""), "name": r.get("資料名", "")}
               for r in related_raw]

    errors_raw = parse_md_table(get_h2_section(global_body, "エラー一覧").splitlines())
    errors = [
        {
            "error_type":    r.get("エラータイプ", ""),
            "error_code":    r.get("エラーコード", ""),
            "error_message": r.get("エラーメッセージ", ""),
        }
        for r in errors_raw
    ]

    # ── API sections ─────────────────────────────────────────────────────
    apis = []
    for heading, body in split_h1(rest):
        parts = heading.strip().split(None, 1)
        if len(parts) < 2 or parts[0].upper() != "API":
            continue
        api_id = parts[1].strip()
        # Replace {screen_number} placeholder (e.g. "002" from screen_id "ACSMS-SCR-002")
        if screen_number:
            api_id = api_id.replace("{screen_number}", screen_number)
        api_id_prefix = doc_meta.get("api_id_prefix", "")
        if api_id_prefix:
            api_id = api_id.replace("{api_id_prefix}", api_id_prefix)

        # Summary table (key-value)
        summ = {}
        for row in parse_md_table(get_h2_section(body, "概要").splitlines()):
            if "項目" in row and "内容" in row:
                summ[row["項目"]] = row["内容"]
            elif len(row) >= 2:
                vals = list(row.values())
                summ[vals[0]] = vals[1]

        http_codes = parse_http_codes(summ.get("HTTPレスポンスコード", ""))

        params_raw = parse_md_table(get_h2_section(body, "リクエストパラメータ").splitlines())
        params = [
            {
                "no":          r.get("#", ""),
                "param_id":    r.get("パラメーターID", ""),
                "type":        r.get("タイプ", ""),
                "repeat":      r.get("繰り返し", ""),
                "required":    r.get("必須", ""),
                "min_len":     r.get("最小長", ""),
                "max_len":     r.get("最大長", ""),
                "description": r.get("説明", ""),
            }
            for r in params_raw
        ]

        resp_raw = parse_md_table(get_h2_section(body, "レスポンスデータ").splitlines())
        resp_fields = []
        for r in resp_raw:
            fid = r.get("項目ID", "").strip()
            resp_fields.append({
                "no":          r.get("#", ""),
                "field_id":    fid.lstrip("→").strip(),
                "type":        r.get("タイプ", ""),
                "repeat":      r.get("繰り返し", ""),
                "format":      r.get("フォーマット", ""),
                "nullable":    r.get("Nullable", ""),
                "description": r.get("説明", ""),
                "nested":      fid.startswith("→"),
            })

        apis.append({
            "api_id":            api_id,
            "api_name":          summ.get("API名", ""),
            "summary_desc":      summ.get("概要", ""),
            "uri":               summ.get("URI", ""),
            "method":            summ.get("メソッド", ""),
            "request_body":      summ.get("リクエストボディー", ""),
            "request_params_str": summ.get("リクエストパラメーター", ""),
            "header":            summ.get("ヘッダ", ""),
            "http_codes":        http_codes,
            "params":            params,
            "response_fields":   resp_fields,
            "request_example":   parse_code_block(get_h2_section(body, "リクエスト例")),
            "response_success":  parse_code_block(get_h2_section(body, "レスポンス成功例")),
            "response_errors":   parse_labeled_code_blocks(get_h2_section(body, "レスポンス失敗例")),
            "steps":             parse_steps(get_h2_section(body, "処理手順")),
            "description":       summ.get("概要", ""),
        })

    return {
        "meta":        doc_meta,
        "changes":     changes,
        "sys_overview": sys_lines,
        "doc_purpose": purpose_lines,
        "related_docs": related,
        "errors":      errors,
        "apis":        apis,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def generate_excel(data, output_path):
    from datetime import datetime
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    d = data["meta"]
    # Auto-set updated_date to today's run date (YYYY/MM/DD)
    d["updated_date"] = datetime.now().strftime("%Y/%m/%d")
    write_cover(wb, d)
    write_changelog(wb, d, data["changes"])
    write_overview(wb, d, data["sys_overview"], data["doc_purpose"], data["related_docs"])
    write_errors(wb, d, data["errors"])
    write_api_list(wb, d, data["apis"])
    for api in data["apis"]:
        write_api_detail(wb, d, api)

    wb.save(output_path)
    print(f"✓  Saved: {output_path}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Convert API markdown to Excel")
    parser.add_argument("input", help="Input .md file")
    parser.add_argument("output", nargs="?", help="Output .xlsx file (optional)")
    parser.add_argument("--author", help="Override updated_by (更新者) in header")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)

    md_text = input_path.read_text(encoding="utf-8")
    data = parse_document(md_text)

    # Auto-detect screen_id from parent folder name (e.g. ACSMS-SCR-002)
    folder_name = input_path.resolve().parent.name
    folder_match = re.match(r'^(ACSMS-SCR-\d+)', folder_name)
    if folder_match:
        data["meta"]["screen_id"] = folder_match.group(1)

    # Override created_by and updated_by if --author is given
    if args.author:
        data["meta"]["created_by"] = args.author
        data["meta"]["updated_by"] = args.author

    if args.output:
        output_path = Path(args.output)
    else:
        m = data["meta"]
        customer = m.get("customer_name", "")
        system   = m.get("system_name", "")
        doc_name = m.get("document_name", "")
        screen   = m.get("screen_name", "")
        version  = m.get("format_version", "1.0")
        if customer and system and doc_name and screen:
            fname = f"【{customer}】VTIジャパン_{system}_{doc_name}_{screen}_V{version}.xlsx"
        else:
            fname = input_path.stem + ".xlsx"
        output_path = input_path.parent / fname

    print(f"Parsed: {len(data['apis'])} API(s), "
          f"{len(data['errors'])} error(s), "
          f"{len(data['changes'])} changelog row(s)")

    generate_excel(data, output_path)


if __name__ == "__main__":
    main()
