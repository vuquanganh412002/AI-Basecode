#!/usr/bin/env python3
"""
screen_md_to_excel.py — Convert screen-design.md to Excel (VTI 画面設計書 template format)

Usage:
    python screen_md_to_excel.py <input.md>
    python screen_md_to_excel.py <input.md> <output.xlsx>

Output file defaults to same directory as input, with .xlsx extension,
auto-named from the document title in the Markdown.
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

HEADER_BLUE  = "FFB4C6E7"   # bold metadata header (row 1) + 変更履歴 header
SUB_HEADER   = "FFBDD7EE"   # section headers inside content sheets (画面項目定義, etc.)
SCREEN_META  = "FFD9E1F2"   # 画面ID/画面名 label rows
COVER_META   = "FFDBE2F1"   # cover page metadata box (フォーマットコード, etc.)
NAVY         = "FF1F3864"   # cover page title text color
FONT_NAME    = "游ゴシック"

_THIN = Side(style="thin", color="FF000000")
_NONE = Side(style=None)

_DATE_KEYS = {"created_date", "updated_date"}


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


def _letter(col_idx):
    return get_column_letter(col_idx)


def _val(v):
    """Convert numeric strings to int/float; prevents 'Number Stored as Text' warnings."""
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


def _apply_merge_borders(ws, sc, ec, row_start, row_end, no_bottom=False):
    """Apply borders only on the outer edges of a merged range."""
    for row in range(row_start, row_end + 1):
        for col in range(sc, ec + 1):
            left   = _THIN if col == sc        else None
            right  = _THIN if col == ec        else None
            top    = _THIN if row == row_start else None
            bottom = _THIN if row == row_end and not no_bottom else None
            if any([left, right, top, bottom]):
                ws.cell(row=row, column=col).border = Border(
                    left=left or _NONE, right=right or _NONE,
                    top=top  or _NONE, bottom=bottom or _NONE,
                )


def _mwrite(ws, sc, ec, row, value, row_end=None,
            fill=None, font=None, align=None, borders=True, no_bottom=False,
            number_format=None):
    """Merge cells sc:ec at row (optionally row:row_end), write value, apply style."""
    row_end = row_end or row
    sl, el = _letter(sc), _letter(ec)
    if sc == ec and row == row_end:
        pass
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
    cell.alignment = align if align else _align()
    if borders:
        _apply_merge_borders(ws, sc, ec, row, row_end, no_bottom=no_bottom)


def _text_height(text, chars_per_line=None, line_height=18.0, min_height=15.75):
    """Estimate row height for cell text."""
    if not text:
        return min_height
    lines = text.split('\n')
    if chars_per_line:
        total = 0
        for line in lines:
            total += max(1, -(-len(line) // chars_per_line))
        num_lines = total
    else:
        num_lines = len(lines)
    return min(409, max(min_height, num_lines * line_height))


# ──────────────────────────────────────────────────────────────────────────────
# Column layout constants
# ──────────────────────────────────────────────────────────────────────────────

# Standard metadata header (3-row header on all content sheets, A:AK = 37 cols)
HDR = [
    (_col("A"),  _col("I"),  "システム・アプリケーション名", "system_name"),
    (_col("J"),  _col("P"),  "ドキュメント",                "document_name"),
    (_col("Q"),  _col("U"),  "シート名",                    "_sheet_name"),
    (_col("V"),  _col("Y"),  "作成日",                      "created_date"),
    (_col("Z"),  _col("AC"), "作成者",                      "created_by"),
    (_col("AD"), _col("AG"), "更新日",                      "updated_date"),
    (_col("AH"), _col("AK"), "更新者",                      "updated_by"),
]

# 変更履歴 column definitions (max_col=33 = AG)
CHANGELOG_COLS = [
    (_col("A"),  _col("B"),  "No",      "center"),
    (_col("C"),  _col("G"),  "発行日",   "center"),
    (_col("H"),  _col("J"),  "版数",     "center"),
    (_col("K"),  _col("Q"),  "担当者",   "center"),
    (_col("R"),  _col("V"),  "変更内容", "left"),
    (_col("W"),  _col("AA"), "確認者",   "center"),
    (_col("AB"), _col("AG"), "承認者",   "center"),
]

# 目次 column definitions (row 5 header, B:AG)
TOC_COLS = [
    (_col("B"),  _col("C"),  "No",      "center"),
    (_col("D"),  _col("J"),  "シート名", "left"),
    (_col("K"),  _col("AG"), "説明",     "left"),
]

# 画面項目定義 column definitions (max_col=73 = BU)
ITEMS_COLS = [
    (_col("B"),  _col("B"),  "No",                 "center"),
    (_col("C"),  _col("F"),  "項目名",              "left"),
    (_col("G"),  _col("J"),  "項目ID",              "left"),
    (_col("K"),  _col("M"),  "項目タイプ",           "center"),
    (_col("N"),  _col("P"),  "入力/出力",            "center"),
    (_col("Q"),  _col("R"),  "必須",                "center"),
    (_col("S"),  _col("U"),  "入力データ型",         "center"),
    (_col("V"),  _col("X"),  "最小桁数",             "center"),
    (_col("Y"),  _col("AA"), "最大桁数",             "center"),
    (_col("AB"), _col("AC"), "実桁数",              "center"),
    (_col("AD"), _col("AF"), "文字揃え",             "center"),
    (_col("AG"), _col("AJ"), "フォーマット",         "left"),
    (_col("AK"), _col("AO"), "テーブル名（論理名）", "left"),
    (_col("AP"), _col("AT"), "テーブル名（物理名）", "left"),
    (_col("AU"), _col("AY"), "カラム名（論理名）",   "left"),
    (_col("AZ"), _col("BD"), "カラム名（物理名）",   "left"),
    (_col("BE"), _col("BG"), "表示条件",             "left"),
    (_col("BH"), _col("BK"), "デフォルト値",         "left"),
    (_col("BL"), _col("BU"), "備考",                "left"),
]

# MD 画面項目定義 header columns mapping (17 columns in the MD table)
# Maps column index in the MD table to the ITEMS_COLS index (skipping 最小桁数/実桁数)
# MD header: No. | 項目名 | 項目ID | 項目タイプ | 入力/出力 | 必須 | 入力データ型 | 最大桁数 |
#            文字揃え | フォーマット | テーブル名（論理名） | テーブル名（物理名） |
#            カラム名（論理名） | カラム名（物理名） | 表示条件 | デフォルト値 | 備考
# Maps to ITEMS_COLS indices: 0,1,2,3,4,5,6,8,10,11,12,13,14,15,16,17,18
MD_ITEMS_COL_MAP = [0, 1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18]

# 機能定義 A section (機能一覧) column definitions
FUNC_LIST_COLS = [
    (_col("B"),  _col("B"),  "#",      "center"),
    (_col("C"),  _col("G"),  "機能",   "left"),
    (_col("H"),  _col("J"),  "項目",   "left"),
    (_col("K"),  _col("M"),  "イベント", "left"),
    (_col("N"),  _col("AK"), "説明",   "left"),
]

# メッセージ情報 column definitions
MSG_COLS = [
    (_col("B"),  _col("B"),  "#",               "center"),
    (_col("C"),  _col("F"),  "メッセージコード", "left"),
    (_col("G"),  _col("AK"), "メッセージ内容",   "left"),
]


# ──────────────────────────────────────────────────────────────────────────────
# Sheet setup
# ──────────────────────────────────────────────────────────────────────────────

def _set_col_widths(ws, width, max_col):
    for i in range(1, max_col + 1):
        ws.column_dimensions[get_column_letter(i)].width = width


def _no_gridlines(ws):
    ws.sheet_view.showGridLines = False


def _setup(ws, max_col=37, col_width=5.0):
    """Standard content sheet setup for screen design (5.0pt columns)."""
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
    """Row 1: header labels; Rows 2-3: merged value cells."""
    for r in (1, 2, 3):
        ws.row_dimensions[r].height = 16.5

    for sc, ec, label, key in HDR:
        _mwrite(ws, sc, ec, 1,
                label,
                fill=_fill(HEADER_BLUE),
                font=_font(bold=True),
                align=_align(h="center"),
                borders=True)

        value = sheet_name if key == "_sheet_name" else doc.get(key, "")
        fmt = '@' if key in _DATE_KEYS else None
        _mwrite(ws, sc, ec, 2, value, row_end=3,
                font=_font(),
                align=_align(h="center"),
                borders=True,
                number_format=fmt)


# ──────────────────────────────────────────────────────────────────────────────
# Screen meta rows (画面ID / 画面名) — used in 画面項目定義, 機能定義, メッセージ情報
# ──────────────────────────────────────────────────────────────────────────────

def _write_screen_meta(ws, row, screen_id, screen_name, summary, max_col=37):
    """
    Write the 画面ID / 画面名 box (2 rows).
    Row N:   | 画面ID | <screen_id> | 概要 | <summary> |
    Row N+1: | 画面名 | <screen_name> |     |           |
    Column layout (B:AK or B:BU): label B, value C:F, label G, value H:AK/BU
    """
    ec = max_col  # right-most column for the summary value

    # Row N: 画面ID label
    _mwrite(ws, _col("B"), _col("B"), row, "画面ID",
            fill=_fill(SCREEN_META), font=_font(bold=True), align=_align(h="center"), borders=True)
    _mwrite(ws, _col("C"), _col("F"), row, screen_id,
            fill=_fill(SCREEN_META), font=_font(), align=_align(), borders=True,
            number_format='@')
    _mwrite(ws, _col("G"), _col("J"), row, "概要",
            fill=_fill(SCREEN_META), font=_font(bold=True), align=_align(h="center"), borders=True)
    _mwrite(ws, _col("K"), ec, row, summary,
            fill=_fill(SCREEN_META), font=_font(), align=_align(), borders=True)

    # Row N+1: 画面名 label
    row2 = row + 1
    _mwrite(ws, _col("B"), _col("B"), row2, "画面名",
            fill=_fill(SCREEN_META), font=_font(bold=True), align=_align(h="center"), borders=True)
    _mwrite(ws, _col("C"), _col("F"), row2, screen_name,
            fill=_fill(SCREEN_META), font=_font(), align=_align(), borders=True)
    _mwrite(ws, _col("G"), _col("J"), row2, "",
            fill=_fill(SCREEN_META), font=_font(), align=_align(), borders=True)
    _mwrite(ws, _col("K"), ec, row2, "",
            fill=_fill(SCREEN_META), font=_font(), align=_align(), borders=True)

    ws.row_dimensions[row].height = 18.0
    ws.row_dimensions[row2].height = 18.0


def _write_table_header(ws, row, col_defs, fill_color=SUB_HEADER, height=18.0):
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
        height = max(
            (_text_height(str(v), chars_per_line=40) for v in values if v),
            default=18.0,
        )
        height = max(height, 18.0)
    ws.row_dimensions[row].height = height
    for col_def, val in zip(col_defs, values):
        sc, ec = col_def[0], col_def[1]
        data_align = col_def[3] if len(col_def) > 3 else "left"
        _mwrite(ws, sc, ec, row, val,
                font=_font(),
                align=_align(h=data_align),
                borders=True)


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 表紙
# ──────────────────────────────────────────────────────────────────────────────

def write_cover(wb, doc):
    from openpyxl.drawing.image import Image as XLImage

    ws = wb.create_sheet("表紙")
    ws.sheet_format.defaultColWidth = 12.63
    ws.sheet_format.defaultRowHeight = 15.0
    ws.sheet_format.customHeight = True

    # 表紙: col width 3.71 for all columns A:AK (37 cols)
    _set_col_widths(ws, 3.71, 37)
    _no_gridlines(ws)

    # Row heights
    ws.row_dimensions[1].height = 19.5
    for r in range(2, 221):
        ws.row_dimensions[r].height = 12.75
    ws.row_dimensions[10].height = 39.75
    ws.row_dimensions[12].height = 33.0
    ws.row_dimensions[15].height = 15.0

    # Surrounding border box: B2:AK34
    BOX_TOP, BOX_BOT = 2, 34
    BOX_LC, BOX_RC = _col("B"), _col("AK")

    for col in range(BOX_LC, BOX_RC + 1):
        c = ws.cell(row=BOX_TOP, column=col)
        c.border = Border(
            top   = _THIN,
            left  = _THIN if col == BOX_LC else _NONE,
            right = _THIN if col == BOX_RC else _NONE,
        )
    for row in range(BOX_TOP + 1, BOX_BOT):
        ws.cell(row=row, column=BOX_LC).border = Border(left=_THIN)
        ws.cell(row=row, column=BOX_RC).border = Border(right=_THIN)
    for col in range(BOX_LC, BOX_RC + 1):
        c = ws.cell(row=BOX_BOT, column=col)
        c.border = Border(
            bottom = _THIN,
            left   = _THIN if col == BOX_LC else _NONE,
            right  = _THIN if col == BOX_RC else _NONE,
        )

    # System name (row 10)
    ws.merge_cells("B10:AK10")
    c = ws["B10"]
    c.value = doc.get("system_name", "")
    c.font = Font(name=FONT_NAME, size=26, color=NAVY)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B10"].border  = Border(left=_THIN)
    ws["AK10"].border = Border(right=_THIN)

    # Document type (row 12)
    ws.merge_cells("B12:AK12")
    c = ws["B12"]
    c.value = doc.get("document_name", "")
    c.font = Font(name=FONT_NAME, size=24, color=NAVY)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B12"].border  = Border(left=_THIN)
    ws["AK12"].border = Border(right=_THIN)

    # Screen name (row 14) — only for 画面設計書
    screen_name = doc.get("cover_screen_name", "")
    if screen_name:
        ws.merge_cells("B14:AK14")
        c = ws["B14"]
        c.value = screen_name
        c.font = Font(name=FONT_NAME, size=18, color=NAVY)
        c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
        ws["B14"].border  = Border(left=_THIN)
        ws["AK14"].border = Border(right=_THIN)

    # Version (row 16)
    ws.merge_cells("B16:AK16")
    c = ws["B16"]
    c.value = f"版{doc.get('cover_version', '1.0')}"
    c.font = Font(name=FONT_NAME, size=16, color=NAVY)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B16"].border  = Border(left=_THIN)
    ws["AK16"].border = Border(right=_THIN)

    # Metadata box (rows 20-22, cols O:S=label, T:X=value)
    meta_rows = [
        ("フォーマットコード",    doc.get("format_code", "")),
        ("フォーマットバージョン", doc.get("format_version", "")),
        ("発行日",               doc.get("issue_date", "")),
    ]
    for i, (label, value) in enumerate(meta_rows):
        r = 20 + i
        ws.merge_cells(f"O{r}:S{r}")
        c = ws[f"O{r}"]
        c.value = label
        c.fill = _fill(COVER_META)
        c.font = _font(size=10)
        c.alignment = _align(h="center")
        _apply_merge_borders(ws, _col("O"), _col("S"), r, r)

        ws.merge_cells(f"T{r}:X{r}")
        c = ws[f"T{r}"]
        if label == "発行日":
            c.number_format = '@'
        c.value = value
        c.fill = _fill(COVER_META)
        c.font = _font(size=10)
        c.alignment = _align(h="center")
        _apply_merge_borders(ws, _col("T"), _col("X"), r, r)

        ws.cell(row=r, column=BOX_RC).border = Border(right=_THIN)
        ws.cell(row=r, column=BOX_LC).border = Border(left=_THIN)

    # VTI logo (top-right, col P row 3)
    logo_path = Path(__file__).parent / "vti_logo.png"
    if logo_path.exists():
        img = XLImage(str(logo_path))
        img.width  = 140
        img.height = 54
        ws.add_image(img, "P3")


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 変更履歴
# ──────────────────────────────────────────────────────────────────────────────

def write_changelog(wb, doc, changes):
    ws = wb.create_sheet("変更履歴")
    _setup(ws, max_col=33, col_width=5.0)

    _write_meta_header(ws, doc, "変更履歴")

    row = 4
    ws.row_dimensions[row].height = 15.0  # spacer

    row = 5
    _write_table_header(ws, row, CHANGELOG_COLS, fill_color=HEADER_BLUE, height=18.0)

    for i, ch in enumerate(changes):
        row += 1
        _write_data_row(ws, row, CHANGELOG_COLS, [
            ch.get("no", str(i + 1)),
            ch.get("date", ""),
            ch.get("version", ""),
            ch.get("author", ""),
            ch.get("description", ""),
            ch.get("reviewer", ""),
            ch.get("approver", ""),
        ], height=18.0)
        date_sc = CHANGELOG_COLS[1][0]
        ws.cell(row=row, column=date_sc).number_format = '@'


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 目次
# ──────────────────────────────────────────────────────────────────────────────

def write_toc(wb, doc, toc_entries):
    ws = wb.create_sheet("目次")
    _setup(ws, max_col=33, col_width=5.0)

    _write_meta_header(ws, doc, "目次")

    row = 4
    ws.row_dimensions[row].height = 15.0

    row = 5
    _write_table_header(ws, row, TOC_COLS, fill_color=HEADER_BLUE, height=18.0)

    for i, entry in enumerate(toc_entries):
        row += 1
        _write_data_row(ws, row, TOC_COLS, [
            entry.get("no", str(float(i + 1))),
            entry.get("sheet_name", ""),
            entry.get("description", ""),
        ], height=18.0)


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 画面遷移 (stub — contains image in actual xlsx)
# ──────────────────────────────────────────────────────────────────────────────

def write_screen_transition(wb, doc, screen_id, screen_name, note=""):
    ws = wb.create_sheet("画面遷移")
    _setup(ws, max_col=37, col_width=5.0)

    _write_meta_header(ws, doc, "画面遷移")

    if note:
        row = 5
        ws.row_dimensions[row].height = 18.0
        ws.merge_cells(f"B{row}:AK{row}")
        c = ws[f"B{row}"]
        c.value = note
        c.font = _font()
        c.alignment = _align()


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 画面イメージ (stub — contains image in actual xlsx)
# ──────────────────────────────────────────────────────────────────────────────

def write_screen_image(wb, doc, screen_id, screen_name, summary, note=""):
    ws = wb.create_sheet("画面イメージ")
    _setup(ws, max_col=37, col_width=5.0)

    _write_meta_header(ws, doc, "画面イメージ")

    row = 4
    ws.row_dimensions[row].height = 15.0

    # Screen meta box
    row = 5
    _write_screen_meta(ws, row, screen_id, screen_name, summary, max_col=_col("AK"))

    if note:
        row = 8
        ws.row_dimensions[row].height = 18.0
        ws.merge_cells(f"B{row}:AK{row}")
        c = ws[f"B{row}"]
        c.value = note
        c.font = _font()
        c.alignment = _align()


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 画面項目定義
# ──────────────────────────────────────────────────────────────────────────────

def write_screen_items(wb, doc, screen_id, screen_name, summary, sections):
    """
    sections: list of dicts {name: str, rows: list of lists (17 values each)}
    """
    ws = wb.create_sheet("画面項目定義")
    MAX_COL = 73  # BU
    _setup(ws, max_col=MAX_COL, col_width=5.0)

    _write_meta_header(ws, doc, "画面項目定義")

    row = 4
    ws.row_dimensions[row].height = 15.0

    # Rows 5-8: blank spacer rows
    for r in range(5, 9):
        ws.row_dimensions[r].height = 15.0

    # Rows 9-10: screen meta
    row = 9
    _write_screen_meta(ws, row, screen_id, screen_name, summary, max_col=MAX_COL)

    # Row 11: column headers
    row = 11
    _write_table_header(ws, row, ITEMS_COLS, fill_color=HEADER_BLUE, height=18.0)

    current_row = 12
    for section in sections:
        # Section header row (light blue, spanning B:BU)
        ws.row_dimensions[current_row].height = 18.0
        _mwrite(ws, _col("B"), MAX_COL, current_row, section.get("name", ""),
                fill=_fill(SUB_HEADER),
                font=_font(bold=True),
                align=_align(),
                borders=True)
        current_row += 1

        for data_row in section.get("rows", []):
            # data_row: 17 values from MD table (see MD_ITEMS_COL_MAP)
            # Build full ITEMS_COLS-length list (19 columns), filling missing slots with ""
            full_row = [""] * len(ITEMS_COLS)
            for md_idx, items_idx in enumerate(MD_ITEMS_COL_MAP):
                if md_idx < len(data_row):
                    full_row[items_idx] = data_row[md_idx]

            # Auto height from longest value
            h = max(
                (_text_height(str(v), chars_per_line=30) for v in full_row if v),
                default=18.0,
            )
            h = max(h, 18.0)
            _write_data_row(ws, current_row, ITEMS_COLS, full_row, height=h)
            current_row += 1


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 機能定義
# ──────────────────────────────────────────────────────────────────────────────

def write_function_def(wb, doc, screen_id, screen_name, summary, func_list, func_details):
    """
    func_list: list of dicts {no, feature, item, event, description}
    func_details: list of dicts {title, items: [{step, text, indent}]}
    """
    ws = wb.create_sheet("機能定義")
    _setup(ws, max_col=37, col_width=5.0)

    _write_meta_header(ws, doc, "機能定義")

    row = 4
    ws.row_dimensions[row].height = 15.0

    # Rows 5-8: spacer
    for r in range(5, 9):
        ws.row_dimensions[r].height = 15.0

    # Rows 9-10: screen meta
    row = 9
    _write_screen_meta(ws, row, screen_id, screen_name, summary, max_col=_col("AK"))

    # ── A. 機能一覧 ───────────────────────────────────────────────────────────
    row = 11
    ws.row_dimensions[row].height = 18.0
    _mwrite(ws, _col("B"), _col("AK"), row, "A. 機能一覧",
            fill=_fill(SUB_HEADER),
            font=_font(bold=True),
            align=_align(),
            borders=True)

    row = 12
    _write_table_header(ws, row, FUNC_LIST_COLS, fill_color=HEADER_BLUE, height=18.0)

    current_row = 13
    for i, func in enumerate(func_list):
        _write_data_row(ws, current_row, FUNC_LIST_COLS, [
            func.get("no", str(float(i + 1))),
            func.get("feature", ""),
            func.get("item", ""),
            func.get("event", ""),
            func.get("description", ""),
        ], height=18.0)
        current_row += 1

    # Spacer row
    ws.row_dimensions[current_row].height = 15.0
    current_row += 1

    # ── B. 機能詳細 ───────────────────────────────────────────────────────────
    ws.row_dimensions[current_row].height = 18.0
    _mwrite(ws, _col("B"), _col("AK"), current_row, "B. 機能詳細",
            fill=_fill(SUB_HEADER),
            font=_font(bold=True),
            align=_align(),
            borders=True)
    current_row += 1

    for detail in func_details:
        # Detail title (e.g. "1. 新規登録画面初期表示")
        title = detail.get("title", "")
        ws.row_dimensions[current_row].height = 18.0
        ws.merge_cells(f"B{current_row}:AK{current_row}")
        c = ws[f"B{current_row}"]
        c.value = title
        c.font = _font(bold=True)
        c.alignment = _align()
        current_row += 1

        for item in detail.get("items", []):
            step = item.get("step", "")
            text = item.get("text", "")
            indent = item.get("indent", 1)

            h = max(_text_height(text, chars_per_line=60), 18.0)
            ws.row_dimensions[current_row].height = h

            if step:
                # Step number in col B (e.g. "1.1", "1.2")
                c = ws.cell(row=current_row, column=_col("B"))
                c.value = step
                c.font = _font()
                c.alignment = _align(h="center")

                # Text in cols C:AK (indent=1) or D:AK (indent=2)
                text_col = "C" if indent <= 1 else "D"
            else:
                # No step — text spans B:AK
                text_col = "B"

            text_sc = _col(text_col)
            _mwrite(ws, text_sc, _col("AK"), current_row, text,
                    font=_font(),
                    align=_align(),
                    borders=False)
            current_row += 1

        # Spacer between sections
        ws.row_dimensions[current_row].height = 15.0
        current_row += 1


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: メッセージ情報
# ──────────────────────────────────────────────────────────────────────────────

def write_messages(wb, doc, screen_id, screen_name, summary, messages):
    ws = wb.create_sheet("メッセージ情報")
    _setup(ws, max_col=37, col_width=5.0)

    _write_meta_header(ws, doc, "メッセージ情報")

    row = 4
    ws.row_dimensions[row].height = 15.0

    # Rows 5-8: spacer
    for r in range(5, 9):
        ws.row_dimensions[r].height = 15.0

    # Rows 9-10: screen meta
    row = 9
    _write_screen_meta(ws, row, screen_id, screen_name, summary, max_col=_col("AK"))

    # Row 11: column headers
    row = 11
    _write_table_header(ws, row, MSG_COLS, fill_color=HEADER_BLUE, height=18.0)

    for i, msg in enumerate(messages):
        row += 1
        _write_data_row(ws, row, MSG_COLS, [
            msg.get("no", str(float(i + 1))),
            msg.get("code", ""),
            msg.get("content", ""),
        ], height=18.0)


# ──────────────────────────────────────────────────────────────────────────────
# Markdown parser
# ──────────────────────────────────────────────────────────────────────────────

def _parse_md_table(lines):
    """
    Parse a markdown table into a list of rows (list of strings).
    Skips the separator row (--- cells).
    """
    rows = []
    for line in lines:
        line = line.strip()
        if not line.startswith("|"):
            break
        if re.match(r"^\|[\s\-|]+\|$", line):
            continue  # separator row
        cells = [c.strip() for c in line.strip("|").split("|")]
        rows.append(cells)
    return rows


def _clean_br(text):
    """Replace <br> tags with newlines."""
    return re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)


def parse_document(md_text):
    """
    Parse screen-design.md into structured data for Excel generation.
    Returns (doc_meta, sections_data).
    """
    doc = {}
    sections_data = {}

    # Split into top-level sections by "## " headings (after frontmatter dividers)
    # First, split by "---" separators to get section blocks
    raw_lines = md_text.splitlines()

    # Extract document title from first H1
    for line in raw_lines:
        line = line.strip()
        if line.startswith("# "):
            doc["_title"] = line[2:].strip()
            break

    # Split into sections at "## " headings
    sections = {}
    current_section = None
    current_lines = []

    for line in raw_lines:
        stripped = line.rstrip()
        if stripped.startswith("## "):
            if current_section:
                sections[current_section] = current_lines
            current_section = stripped[3:].strip()
            current_lines = []
        else:
            if current_section:
                current_lines.append(stripped)

    if current_section:
        sections[current_section] = current_lines

    # ── Parse 表紙 ─────────────────────────────────────────────────────────────
    cover_lines = sections.get("表紙", [])
    doc["system_name"] = ""
    doc["document_name"] = ""
    doc["cover_screen_name"] = ""
    doc["cover_version"] = "1.0"
    doc["format_code"] = ""
    doc["format_version"] = ""
    doc["issue_date"] = ""

    bold_items = []
    for line in cover_lines:
        m = re.match(r"^\*\*(.+?)\*\*", line.strip())
        if m:
            bold_items.append(m.group(1))

    if len(bold_items) >= 1:
        doc["system_name"] = bold_items[0]
    if len(bold_items) >= 2:
        doc["cover_screen_name"] = bold_items[1]
    if len(bold_items) >= 3:
        ver = bold_items[2]
        m = re.match(r"版\s*([\d.]+)", ver)
        if m:
            doc["cover_version"] = m.group(1)

    # 画面設計書 is the document_name
    doc["document_name"] = "画面設計書"

    # Parse metadata table in 表紙
    cover_text = "\n".join(cover_lines)
    for line in cover_lines:
        if "フォーマットコード" in line:
            parts = [c.strip() for c in line.strip("|").split("|")]
            if len(parts) >= 2:
                doc["format_code"] = parts[1]
        elif "フォーマットバージョン" in line:
            parts = [c.strip() for c in line.strip("|").split("|")]
            if len(parts) >= 2:
                doc["format_version"] = parts[1]
        elif "発行日" in line and "|" in line:
            parts = [c.strip() for c in line.strip("|").split("|")]
            if len(parts) >= 2:
                doc["issue_date"] = parts[1]

    # ── Parse standard meta from any section header table ──────────────────────
    # Format: | システム・アプリケーション名 | ドキュメント | シート名 | 作成日 | 作成者 | 更新日 | 更新者 |
    # (first row)  then  | value | value | value | value | value |  (second row)
    def _parse_sheet_meta(section_lines):
        """Extract created_date, created_by, updated_date, updated_by from section header tables."""
        for i, line in enumerate(section_lines):
            if "システム・アプリケーション名" in line:
                # Look for the value row (skip separator)
                j = i + 1
                while j < len(section_lines):
                    vline = section_lines[j].strip()
                    if vline.startswith("|") and not re.match(r"^\|[\s\-|]+\|$", vline):
                        cells = [c.strip() for c in vline.strip("|").split("|")]
                        # cells: [sys_name, doc_name, sheet_name, created_date, created_by, ...]
                        if len(cells) >= 5:
                            if not doc.get("created_date") and len(cells) > 3:
                                doc["created_date"] = cells[3]
                            if not doc.get("created_by") and len(cells) > 4:
                                doc["created_by"] = cells[4]
                            if not doc.get("updated_date") and len(cells) > 5:
                                doc["updated_date"] = cells[5]
                            if not doc.get("updated_by") and len(cells) > 6:
                                doc["updated_by"] = cells[6]
                        break
                    j += 1
                break

    for sec_name, sec_lines in sections.items():
        if sec_name != "表紙":
            _parse_sheet_meta(sec_lines)
            break

    # ── Parse 変更履歴 ──────────────────────────────────────────────────────────
    changes = []
    for line in sections.get("変更履歴", []):
        if not line.strip().startswith("|"):
            continue
        if "No" in line or re.match(r"^\|[\s\-|]+\|$", line.strip()):
            continue
        cells = [_clean_br(c.strip()) for c in line.strip("|").split("|")]
        if len(cells) >= 7:
            changes.append({
                "no":          cells[0],
                "date":        cells[1],
                "version":     cells[2],
                "author":      cells[3],
                "description": cells[4],
                "reviewer":    cells[5],
                "approver":    cells[6],
            })
    sections_data["changes"] = changes

    # ── Parse 目次 ──────────────────────────────────────────────────────────────
    toc_entries = []
    in_toc_table = False
    for line in sections.get("目次", []):
        stripped = line.strip()
        if not stripped.startswith("|"):
            in_toc_table = False
            continue
        if "No" in stripped and "シート名" in stripped:
            in_toc_table = True
            continue
        if re.match(r"^\|[\s\-|]+\|$", stripped):
            continue
        if in_toc_table:
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cells) >= 3:
                toc_entries.append({
                    "no":           cells[0],
                    "sheet_name":   cells[1],
                    "description":  cells[2],
                })
    sections_data["toc"] = toc_entries

    # ── Parse 画面遷移 note ─────────────────────────────────────────────────────
    transition_note = ""
    for line in sections.get("画面遷移", []):
        stripped = line.strip()
        if stripped and not stripped.startswith("|") and not stripped.startswith("#"):
            transition_note = stripped
            break
    sections_data["transition_note"] = transition_note

    # ── Parse 画面イメージ meta ──────────────────────────────────────────────────
    image_meta = {"screen_id": "", "screen_name": "", "summary": "", "note": ""}
    for line in sections.get("画面イメージ", []):
        stripped = line.strip()
        if stripped.startswith("> "):
            image_meta["note"] = stripped[2:].strip()
        elif stripped.startswith("|") and "画面ID" in stripped:
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cells) >= 4:
                image_meta["screen_id"] = cells[1]
                image_meta["summary"]   = cells[3]
        elif stripped.startswith("|") and "画面名" in stripped:
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cells) >= 2:
                image_meta["screen_name"] = cells[1]
    sections_data["image_meta"] = image_meta

    # ── Parse 画面項目定義 ───────────────────────────────────────────────────────
    items_screen = {"screen_id": "", "screen_name": "", "summary": "", "sections": []}
    items_lines = sections.get("画面項目定義", [])
    current_section_name = ""
    current_section_rows = []
    items_in_section = False  # only collect rows after a ### subsection header

    def _flush_items_section():
        if current_section_name or current_section_rows:
            items_screen["sections"].append({
                "name": current_section_name,
                "rows": current_section_rows[:],
            })

    for line in items_lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Subsection header "### ..."
        if stripped.startswith("### "):
            _flush_items_section()
            current_section_name = stripped[4:].strip()
            current_section_rows = []
            items_in_section = True
            continue

        # Screen meta table (always check regardless of section state)
        if stripped.startswith("|") and "画面ID" in stripped:
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cells) >= 4:
                items_screen["screen_id"] = cells[1]
                items_screen["summary"]   = cells[3]
            continue
        if stripped.startswith("|") and "画面名" in stripped:
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cells) >= 2:
                items_screen["screen_name"] = cells[1]
            continue

        # Only collect data rows after a ### section header
        if not items_in_section:
            continue

        if stripped.startswith("|"):
            if re.match(r"^\|[\s\-|]+\|$", stripped):
                continue
            if "No" in stripped and "項目名" in stripped:
                continue
            cells = [_clean_br(c.strip()) for c in stripped.strip("|").split("|")]
            if cells and any(cells):
                current_section_rows.append(cells)

    _flush_items_section()
    sections_data["items"] = items_screen

    # ── Parse 機能定義 ───────────────────────────────────────────────────────────
    func_data = {
        "screen_id": "", "screen_name": "", "summary": "",
        "func_list": [], "func_details": [],
    }
    func_lines = sections.get("機能定義", [])
    func_state = None  # "list_header", "list", "detail_header", "detail"
    current_detail = None

    for line in func_lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Screen meta
        if stripped.startswith("|") and "画面ID" in stripped:
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cells) >= 4:
                func_data["screen_id"] = cells[1]
                func_data["summary"]   = cells[3]
            continue
        if stripped.startswith("|") and "画面名" in stripped:
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cells) >= 2:
                func_data["screen_name"] = cells[1]
            continue

        # Section headers
        if stripped == "### A. 機能一覧":
            func_state = "list_header"
            continue
        if stripped == "### B. 機能詳細":
            if current_detail:
                func_data["func_details"].append(current_detail)
                current_detail = None
            func_state = "detail"
            continue

        if func_state == "list_header" or func_state == "list":
            if stripped.startswith("|"):
                if re.match(r"^\|[\s\-|]+\|$", stripped):
                    continue
                if "#" in stripped and "機能" in stripped:
                    func_state = "list"
                    continue
                cells = [c.strip() for c in stripped.strip("|").split("|")]
                if len(cells) >= 5 and any(cells):
                    func_data["func_list"].append({
                        "no":          cells[0],
                        "feature":     cells[1],
                        "item":        cells[2],
                        "event":       cells[3],
                        "description": cells[4],
                    })
            continue

        if func_state == "detail":
            # Detail subsection "#### N. タイトル"
            m = re.match(r"^####\s+(.+)$", stripped)
            if m:
                if current_detail:
                    func_data["func_details"].append(current_detail)
                current_detail = {"title": m.group(1).strip(), "items": []}
                continue

            if current_detail is None:
                continue

            # Step items: "- **N.N** text" or "  - ・text"
            m_step = re.match(r"^-\s+\*\*([\d.]+)\*\*\s*(.*)", stripped)
            if m_step:
                step = m_step.group(1)
                text = m_step.group(2).strip()
                current_detail["items"].append({"step": step, "text": text, "indent": 1})
                continue

            m_bullet = re.match(r"^-\s+(.+)$", stripped)
            if m_bullet:
                text = m_bullet.group(1).strip()
                # Remove leading ・ bullet
                if text.startswith("・"):
                    text = text[1:].strip()
                current_detail["items"].append({"step": "", "text": text, "indent": 2})
                continue

    if current_detail:
        func_data["func_details"].append(current_detail)

    sections_data["func"] = func_data

    # ── Parse メッセージ情報 ──────────────────────────────────────────────────────
    msg_data = {"screen_id": "", "screen_name": "", "summary": "", "messages": []}
    msg_lines = sections.get("メッセージ情報", [])
    in_msg_table = False

    for line in msg_lines:
        stripped = line.strip()
        if not stripped:
            continue

        if stripped.startswith("|") and "画面ID" in stripped:
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cells) >= 4:
                msg_data["screen_id"] = cells[1]
                msg_data["summary"]   = cells[3]
            continue
        if stripped.startswith("|") and "画面名" in stripped:
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if len(cells) >= 2:
                msg_data["screen_name"] = cells[1]
            continue

        if stripped.startswith("|"):
            if re.match(r"^\|[\s\-|]+\|$", stripped):
                continue
            if "#" in stripped and "メッセージ" in stripped:
                in_msg_table = True
                continue
            if in_msg_table:
                cells = [c.strip() for c in stripped.strip("|").split("|")]
                if len(cells) >= 3 and any(cells):
                    msg_data["messages"].append({
                        "no":      cells[0],
                        "code":    cells[1],
                        "content": cells[2],
                    })

    sections_data["msg"] = msg_data

    return doc, sections_data


# ──────────────────────────────────────────────────────────────────────────────
# Excel generation
# ──────────────────────────────────────────────────────────────────────────────

def generate_excel(doc, sections_data, output_path):
    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    # 1. 表紙
    write_cover(wb, doc)

    # 2. 変更履歴
    write_changelog(wb, doc, sections_data.get("changes", []))

    # 3. 目次
    write_toc(wb, doc, sections_data.get("toc", []))

    # 4. 画面遷移
    write_screen_transition(
        wb, doc,
        screen_id="",
        screen_name="",
        note=sections_data.get("transition_note", ""),
    )

    # 5. 画面イメージ
    img_meta = sections_data.get("image_meta", {})
    write_screen_image(
        wb, doc,
        screen_id=img_meta.get("screen_id", ""),
        screen_name=img_meta.get("screen_name", ""),
        summary=img_meta.get("summary", ""),
        note=img_meta.get("note", ""),
    )

    # 6. 画面項目定義
    items = sections_data.get("items", {})
    write_screen_items(
        wb, doc,
        screen_id=items.get("screen_id", ""),
        screen_name=items.get("screen_name", ""),
        summary=items.get("summary", ""),
        sections=items.get("sections", []),
    )

    # 7. 機能定義
    func = sections_data.get("func", {})
    write_function_def(
        wb, doc,
        screen_id=func.get("screen_id", ""),
        screen_name=func.get("screen_name", ""),
        summary=func.get("summary", ""),
        func_list=func.get("func_list", []),
        func_details=func.get("func_details", []),
    )

    # 8. メッセージ情報
    msg = sections_data.get("msg", {})
    write_messages(
        wb, doc,
        screen_id=msg.get("screen_id", ""),
        screen_name=msg.get("screen_name", ""),
        summary=msg.get("summary", ""),
        messages=msg.get("messages", []),
    )

    wb.save(output_path)
    print(f"✓ Saved: {output_path}")


def _auto_output_name(input_path, doc):
    """
    Auto-generate output filename from doc metadata.
    Pattern: 【日本農業新聞様】VTIジャパン_{system}_{doc}_{screen}_V{version}.xlsx
    """
    title = doc.get("_title", "")
    if title:
        # Strip leading "# " and use as filename (already cleaned)
        safe = re.sub(r'[\\/*?:"<>|]', "_", title)
        return input_path.parent / f"{safe}.xlsx"

    system  = re.sub(r"\s+", "", doc.get("system_name", "SYSTEM"))
    docname = re.sub(r"\s+", "", doc.get("document_name", "画面設計書"))
    screen  = re.sub(r"\s+", "", doc.get("cover_screen_name", ""))
    version = doc.get("cover_version", "1.0").replace(".", "")
    fname = f"【日本農業新聞様】VTIジャパン_{system}_{docname}"
    if screen:
        fname += f"_{screen}"
    fname += f"_V{version}.xlsx"
    safe = re.sub(r'[\\/*?:"<>|]', "_", fname)
    return input_path.parent / safe


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)

    md_text = input_path.read_text(encoding="utf-8")
    doc, sections_data = parse_document(md_text)

    if len(sys.argv) >= 3:
        output_path = Path(sys.argv[2])
    else:
        output_path = _auto_output_name(input_path, doc)

    generate_excel(doc, sections_data, output_path)


if __name__ == "__main__":
    main()
