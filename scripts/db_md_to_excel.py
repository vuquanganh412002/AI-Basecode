#!/usr/bin/env python3
"""
db_md_to_excel.py — Convert database-design.md → VTI-format Database Design Excel

Usage:
    python3 db_md_to_excel.py <input.md>
    python3 db_md_to_excel.py <input.md> --author "Tran Duc Tuyen"
    python3 db_md_to_excel.py <input.md> --seeder <seeder.md>

If --seeder is omitted, the script auto-detects "seeder.md" in the same
directory as the input file. When a seeder file is found, seed data is
auto-discovered (every section of the form "## N. <table_name>") and
embedded at the bottom of each matching table sheet (under a
"シードデータ" sub-section). Seed columns not in the DDL schema (e.g.
human-readable comment columns) are filtered out automatically.

Output file is saved in the same directory as the input .md file,
with a name matching the VTI pattern:
  【{customer_name}】VTIジャパン_{system_name}_{document_name}_V{version}.xlsx
"""

import sys
import re
from pathlib import Path
from datetime import datetime

try:
    import openpyxl
    from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
    from openpyxl.utils import get_column_letter, column_index_from_string
except ImportError:
    print("ERROR: openpyxl is required.\n  pip install openpyxl")
    sys.exit(1)


# ──────────────────────────────────────────────────────────────────────────────
# Style constants
# ──────────────────────────────────────────────────────────────────────────────

HEADER_BLUE = "FFB4C6E7"
SUB_HEADER  = "FFBDD6EE"
COVER_META  = "FFD9E2F3"
NAVY        = "FF1F3864"
FONT_NAME   = "游ゴシック"

_THIN = Side(style="thin", color="FF000000")
_NONE = Side(style=None)

MAX_COL = 43   # A-AQ


# ──────────────────────────────────────────────────────────────────────────────
# Low-level helpers
# ──────────────────────────────────────────────────────────────────────────────

def _col(letter):
    return column_index_from_string(letter)


def _fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)


def _font(bold=False, size=11, color="FF000000", name=FONT_NAME):
    return Font(name=name, size=size, bold=bold, color=color)


def _align(wrap=True, h="left", v="center"):
    return Alignment(wrap_text=wrap, horizontal=h, vertical=v)


def _apply_borders(ws, sc, ec, row_start, row_end):
    for row in range(row_start, row_end + 1):
        for col in range(sc, ec + 1):
            left   = _THIN if col == sc        else None
            right  = _THIN if col == ec        else None
            top    = _THIN if row == row_start else None
            bottom = _THIN if row == row_end   else None
            if any([left, right, top, bottom]):
                ws.cell(row=row, column=col).border = Border(
                    left=left or _NONE, right=right or _NONE,
                    top=top  or _NONE, bottom=bottom or _NONE,
                )


def _mwrite(ws, sc, ec, row, value, row_end=None,
            fill=None, font=None, align=None, borders=True):
    row_end = row_end or row
    sl, el  = get_column_letter(sc), get_column_letter(ec)
    if not (sc == ec and row == row_end):
        ws.merge_cells(f"{sl}{row}:{el}{row_end}")
    cell = ws[f"{sl}{row}"]
    cell.value = _numval(value)
    if fill:
        cell.fill = fill
    if font:
        cell.font = font
    cell.alignment = align or _align()
    if borders:
        _apply_borders(ws, sc, ec, row, row_end)


def _numval(v):
    """Store numeric strings as numbers to avoid Excel warnings."""
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


def _text_height(text, chars_per_line=40):
    lines = max(1, sum(
        max(1, -(-len(ln) // chars_per_line)) for ln in str(text).split("\n")
    ))
    return max(19.5, lines * 15.0)


def _set_col_widths(ws, col_width=4.25):
    """Set all columns to the same width."""
    for i in range(1, MAX_COL + 1):
        ws.column_dimensions[get_column_letter(i)].width = col_width


def _no_gridlines(ws):
    ws.sheet_view.showGridLines = False


# ──────────────────────────────────────────────────────────────────────────────
# Column layout  (all table sheets use same layout, 43 cols A-AQ)
# ──────────────────────────────────────────────────────────────────────────────

# Meta header for table sheets (A-AQ, 43 cols): each tuple = (sc, ec, label, meta_key)
DB_HDR = [
    (_col("A"),  _col("I"),  "システム・アプリケーション名", "system_name"),
    (_col("J"),  _col("P"),  "資料名",                       "document_name"),
    (_col("Q"),  _col("W"),  "シート名",                     "_sheet_name"),
    (_col("X"),  _col("AB"), "作成日",                       "created_date"),
    (_col("AC"), _col("AG"), "作成者",                       "created_by"),
    (_col("AH"), _col("AL"), "更新日",                       "updated_date"),
    (_col("AM"), _col("AQ"), "更新者",                       "updated_by"),
]

# Meta header for 概要/目次 sheets (A-AO, 41 cols)
OVW_HDR = [
    (_col("A"),  _col("I"),  "システム・アプリケーション名", "system_name"),
    (_col("J"),  _col("P"),  "資料名",                       "document_name"),
    (_col("Q"),  _col("U"),  "シート名",                     "_sheet_name"),
    (_col("V"),  _col("Z"),  "作成日",                       "created_date"),
    (_col("AA"), _col("AE"), "作成者",                       "created_by"),
    (_col("AF"), _col("AJ"), "更新日",                       "updated_date"),
    (_col("AK"), _col("AO"), "更新者",                       "updated_by"),
]
MAX_COL_OVW = 41   # AO

# Table info row: (sc, ec, label/key)
TABLE_INFO = [
    (_col("A"),  _col("I"),  "テーブル（物理名）"),
    (_col("J"),  _col("W"),  None),    # physical name value
    (_col("X"),  _col("AG"), "テーブル名（論理名）"),
    (_col("AH"), _col("AQ"), None),    # logical name value
]

# Column table: each tuple = (sc, ec, header_label, data_align)
COL_DEFS = [
    (_col("A"),  _col("B"),  "No",         "center"),
    (_col("C"),  _col("G"),  "項目名",      "left"),
    (_col("H"),  _col("I"),  "PK",          "center"),
    (_col("J"),  _col("K"),  "IX",          "center"),
    (_col("L"),  _col("M"),  "IX",          "center"),
    (_col("N"),  _col("O"),  "IX",          "center"),
    (_col("P"),  _col("Q"),  "IX",          "center"),
    (_col("R"),  _col("S"),  "IX",          "center"),
    (_col("T"),  _col("W"),  "属性",        "center"),
    (_col("X"),  _col("Z"),  "サイズ",      "center"),
    (_col("AA"), _col("AC"), "IDENTITY",    "center"),
    (_col("AD"), _col("AG"), "NULL許容",    "center"),
    (_col("AH"), _col("AQ"), "備考",        "left"),
]

# Index table: (sc, ec, header_label, data_align)
IDX_DEFS = [
    (_col("A"),  _col("B"),  "項番",                  "center"),
    (_col("C"),  _col("K"),  "インデックス名",          "left"),
    (_col("L"),  _col("S"),  "カラム_名称（論理名）",   "left"),
    (_col("T"),  _col("Z"),  "主キー (PK)",             "center"),
    (_col("AA"), _col("AG"), "ユニーク (Unique)",       "center"),
    (_col("AH"), _col("AQ"), "備考",                   "left"),
]

# 変更履歴 columns — no meta header, title at row1, headers at row2
# Layout matches original: A=No, B:F=発行日, G:J=バージョン, K:Q=担当者,
#                          R:AD=変更内容, AE:AK=確認者, AL:AR=承認者
MAX_COL_CH = 44   # AR
CH_DEFS = [
    (_col("A"),  _col("A"),  "No",        "center"),
    (_col("B"),  _col("F"),  "発行日",     "center"),
    (_col("G"),  _col("J"),  "バージョン", "center"),
    (_col("K"),  _col("Q"),  "担当者",     "center"),
    (_col("R"),  _col("AD"), "変更内容",   "left"),
    (_col("AE"), _col("AK"), "確認者",     "center"),
    (_col("AL"), _col("AR"), "承認者",     "center"),
]


# ──────────────────────────────────────────────────────────────────────────────
# Sheet helpers
# ──────────────────────────────────────────────────────────────────────────────

def _setup_sheet(ws, max_col=None):
    if max_col is None:
        max_col = MAX_COL
    ws.sheet_format.defaultColWidth  = 12.63
    ws.sheet_format.defaultRowHeight = 15.0
    ws.sheet_format.customHeight     = True
    _set_col_widths(ws)
    _no_gridlines(ws)


def _write_meta_header(ws, doc, sheet_name, hdr=None):
    if hdr is None:
        hdr = DB_HDR
    for r in (1, 2, 3):
        ws.row_dimensions[r].height = 40.5 if r == 1 else 18.75

    for sc, ec, label, key in hdr:
        # Row 1: label
        _mwrite(ws, sc, ec, 1, label,
                fill=_fill(HEADER_BLUE),
                font=_font(bold=True),
                align=_align(h="center"))
        # Rows 2-3: value
        val = sheet_name if key == "_sheet_name" else doc.get(key, "")
        _mwrite(ws, sc, ec, 2, val, row_end=3,
                font=_font(),
                align=_align(h="center"))


def _write_table_header(ws, row, col_defs):
    ws.row_dimensions[row].height = 19.5
    for sc, ec, label, *_ in col_defs:
        _mwrite(ws, sc, ec, row, label,
                fill=_fill(HEADER_BLUE),
                font=_font(bold=True),
                align=_align(h="center"))


def _write_data_row(ws, row, col_defs, values):
    height = max(
        (_text_height(str(v)) for v in values if v),
        default=19.5,
    )
    ws.row_dimensions[row].height = height
    for (sc, ec, _, *rest), val in zip(col_defs, values):
        dalign = rest[0] if rest else "left"
        _mwrite(ws, sc, ec, row, str(val) if val is not None else "",
                font=_font(),
                align=_align(h=dalign))


def _section_label(ws, row, text):
    ws.row_dimensions[row].height = 19.5
    _mwrite(ws, 1, MAX_COL, row, text,
            font=_font(bold=True),
            align=_align(h="left"),
            borders=False)


def _distribute_columns(headers, max_col=MAX_COL):
    """Evenly distribute N column headers across max_col cells.

    Returns list of (start_col, end_col, label, align) tuples — same shape
    as the static COL_DEFS used by table sheets.
    """
    n = len(headers)
    if n == 0:
        return []
    base = max_col // n
    extra = max_col - base * n  # first `extra` cols get +1 width
    NUM_SUFFIX = ("_id", "_no", "_value", "_order", "_count")

    defs = []
    sc = 1
    for i, h in enumerate(headers):
        w = base + (1 if i < extra else 0)
        ec = sc + w - 1
        h_low = h.lower()
        align = "center" if any(h_low.endswith(s) for s in NUM_SUFFIX) else "left"
        defs.append((sc, ec, h, align))
        sc = ec + 1
    return defs


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 表紙
# ──────────────────────────────────────────────────────────────────────────────

def write_cover(wb, doc):
    from openpyxl.drawing.image import Image as XLImage

    ws = wb.create_sheet("表紙")
    ws.sheet_format.defaultColWidth  = 12.63
    ws.sheet_format.defaultRowHeight = 15.0
    ws.sheet_format.customHeight     = True
    for i in range(1, MAX_COL + 1):
        ws.column_dimensions[get_column_letter(i)].width = 2.83
    _no_gridlines(ws)

    ws.row_dimensions[1].height  = 19.5
    for r in range(2, 35):
        ws.row_dimensions[r].height = 12.75
    ws.row_dimensions[10].height = 39.75
    ws.row_dimensions[12].height = 33.0
    ws.row_dimensions[15].height = 15.0

    # Border box B2:AQ34
    BOX_TOP, BOX_BOT = 2, 34
    BOX_LC,  BOX_RC  = _col("B"), _col("AQ")
    for col in range(BOX_LC, BOX_RC + 1):
        c = ws.cell(row=BOX_TOP, column=col)
        c.border = Border(
            top  =_THIN,
            left =_THIN if col == BOX_LC else _NONE,
            right=_THIN if col == BOX_RC else _NONE,
        )
    for row in range(BOX_TOP + 1, BOX_BOT):
        ws.cell(row=row, column=BOX_LC).border = Border(left=_THIN)
        ws.cell(row=row, column=BOX_RC).border = Border(right=_THIN)
    for col in range(BOX_LC, BOX_RC + 1):
        c = ws.cell(row=BOX_BOT, column=col)
        c.border = Border(
            bottom=_THIN,
            left  =_THIN if col == BOX_LC else _NONE,
            right =_THIN if col == BOX_RC else _NONE,
        )

    ws.merge_cells("B10:AQ10")
    c = ws["B10"]
    c.value     = doc.get("system_name", "")
    c.font      = Font(name=FONT_NAME, size=26, color=NAVY)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B10"].border  = Border(left=_THIN)
    ws["AQ10"].border = Border(right=_THIN)

    ws.merge_cells("B12:AQ12")
    c = ws["B12"]
    c.value     = doc.get("document_name", "")
    c.font      = Font(name=FONT_NAME, size=24, color=NAVY)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B12"].border  = Border(left=_THIN)
    ws["AQ12"].border = Border(right=_THIN)

    ws.merge_cells("B15:AQ15")
    c = ws["B15"]
    c.value     = f"版{doc.get('format_version', '1.0')}"
    c.font      = Font(name=FONT_NAME, size=15)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B15"].border  = Border(left=_THIN)
    ws["AQ15"].border = Border(right=_THIN)

    # Metadata box rows 20-22 — centered within B:AQ (cols 2-43, center=22.5)
    # Label: Q(17)-V(22), Value: W(23)-AC(29)  → spans 13 cols centered at 23
    meta_rows = [
        ("フォーマットコード",    doc.get("format_code", "17-BM/PM/VTI")),
        ("フォーマットバージョン", doc.get("format_version", "1.0")),
        ("発行日",               doc.get("issue_date", "")),
    ]
    for i, (label, value) in enumerate(meta_rows):
        r = 20 + i
        _mwrite(ws, _col("Q"), _col("V"), r, label,
                fill=_fill(COVER_META), font=_font(size=10),
                align=_align(h="center"))
        _mwrite(ws, _col("W"), _col("AC"), r, value,
                fill=_fill(COVER_META), font=_font(size=10),
                align=_align(h="center"))
        ws.cell(row=r, column=BOX_LC).border = Border(left=_THIN)
        ws.cell(row=r, column=BOX_RC).border = Border(right=_THIN)

    # Logo — centered horizontally in box B:AQ (42 cols × 2.83 ≈ 891px wide)
    # Logo 140px wide; start ≈ (891-140)/2 ≈ 375px from col B → col S(19) anchor
    logo_path = Path(__file__).parent / "vti_logo.png"
    if logo_path.exists():
        img = XLImage(str(logo_path))
        img.width  = 140
        img.height = 54
        ws.add_image(img, "S4")


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 変更履歴
# ──────────────────────────────────────────────────────────────────────────────

def write_changelog(wb, doc, changes):
    ws = wb.create_sheet("変更履歴")
    _setup_sheet(ws, max_col=MAX_COL_CH)

    # Row 1: "変更履歴" title — single merged cell A1:AR1
    ws.row_dimensions[1].height = 19.5
    _mwrite(ws, 1, MAX_COL_CH, 1, "変更履歴",
            fill=_fill(HEADER_BLUE),
            font=_font(bold=True),
            align=_align(h="left"))

    # Row 2: column headers
    _write_table_header(ws, 2, CH_DEFS)

    for i, ch in enumerate(changes):
        _write_data_row(ws, 3 + i, CH_DEFS, [
            str(i + 1),
            ch.get("date", ""),
            ch.get("version", ""),
            ch.get("author", ""),
            ch.get("description", ""),
            ch.get("reviewer", ""),
            ch.get("approver", ""),
        ])


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 概要
# ──────────────────────────────────────────────────────────────────────────────

def write_overview(wb, doc, sys_text, doc_text, related):
    ws = wb.create_sheet("概要")
    _setup_sheet(ws, max_col=MAX_COL_OVW)
    _write_meta_header(ws, doc, "概要", hdr=OVW_HDR)

    def _write_text_lines(ws, r, text):
        """Write each line into its own row at col C — no merge, text overflows naturally."""
        for line in text.split("\n"):
            ws.row_dimensions[r].height = 19.5
            cell = ws.cell(row=r, column=3)
            cell.value     = line
            cell.font      = _font()
            cell.alignment = Alignment(wrap_text=False, horizontal="left", vertical="center")
            r += 1
        return r

    def _write_label(ws, r, text):
        ws.row_dimensions[r].height = 19.5
        cell = ws.cell(row=r, column=2)
        cell.value     = text
        cell.font      = _font(bold=True)
        cell.alignment = Alignment(wrap_text=False, horizontal="left", vertical="center")

    r = 5
    _write_label(ws, r, "1.システム概要")
    r += 1

    # Each line of system text → its own row, merged C:AG
    r = _write_text_lines(ws, r, sys_text)

    _write_label(ws, r, "2.資料概要")
    r += 1

    # Each line of doc text → its own row, merged C:AG
    r = _write_text_lines(ws, r, doc_text)

    _write_label(ws, r, "3.関連資料")
    r += 1

    # Empty separator
    ws.row_dimensions[r].height = 19.5
    r += 1

    # Row 11: related docs header — No at col C, 資料コード D:N, 資料名 O:AO
    r += 1
    rel_defs = [
        (_col("C"),  _col("C"),  "No",        "center"),
        (_col("D"),  _col("N"),  "資料コード", "left"),
        (_col("O"),  _col("AO"), "資料名",     "left"),
    ]
    _write_table_header(ws, r, rel_defs)
    r += 1

    for rd in related:
        _write_data_row(ws, r, rel_defs, [
            rd.get("no", ""),
            rd.get("code", ""),
            rd.get("name", ""),
        ])
        r += 1


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: 目次
# ──────────────────────────────────────────────────────────────────────────────

def write_toc(wb, doc, tables, seed_sheets=None):
    """Write the 目次 (TOC) sheet.

    Args:
        seed_sheets: optional list of (sheet_name, description) for seed sheets
                     appended after the main table list.
    """
    ws = wb.create_sheet("目次")
    _setup_sheet(ws, max_col=MAX_COL_OVW)
    _write_meta_header(ws, doc, "目次", hdr=OVW_HDR)

    r = 5
    # A:B=#, C:M=シート名, N:AL=説明, AM:AO=リンク (matches original)
    toc_defs = [
        (_col("A"),  _col("B"),  "#",       "center"),
        (_col("C"),  _col("M"),  "シート名", "left"),
        (_col("N"),  _col("AL"), "説明",     "left"),
        (_col("AM"), _col("AO"), "リンク",   "center"),
    ]
    _write_table_header(ws, r, toc_defs)
    r += 1

    link_col = _col("AM")

    def _add_link(row, sheet_name):
        cell = ws.cell(row=row, column=link_col)
        cell.value     = "Link"
        cell.hyperlink = f"#{sheet_name}!A1"
        cell.font      = Font(name=FONT_NAME, size=11, color="FF0563C1", underline="single")
        cell.alignment = _align(h="center")

    # 概要 is always first
    idx = 1
    _write_data_row(ws, r, toc_defs, [str(idx), "概要", "", ""])
    _add_link(r, "概要")
    r += 1; idx += 1

    for t in tables:
        _write_data_row(ws, r, toc_defs, [
            str(idx),
            t["physical"],
            t["logical"],
            "",
        ])
        _add_link(r, t["physical"])
        r += 1; idx += 1

    # Seed sheets section (if any)
    if seed_sheets:
        for sheet_name, desc in seed_sheets:
            _write_data_row(ws, r, toc_defs, [
                str(idx),
                sheet_name,
                desc,
                "",
            ])
            _add_link(r, sheet_name)
            r += 1; idx += 1


# ──────────────────────────────────────────────────────────────────────────────
# Sheet: table
# ──────────────────────────────────────────────────────────────────────────────

def write_table_sheet(wb, doc, table, seed_info=None):
    """Write a table sheet with column definitions, indexes, and (optional) seed data.

    Args:
        seed_info: optional {"headers": [...], "rows": [[...]]} appended at end.
    """
    ws = wb.create_sheet(table["physical"])
    _setup_sheet(ws)
    _write_meta_header(ws, doc, table["physical"])

    # Row 4: empty
    ws.row_dimensions[4].height = 19.5

    # Row 5: table physical/logical names
    r = 5
    ws.row_dimensions[r].height = 19.5
    _mwrite(ws, _col("A"), _col("I"), r, "テーブル（物理名）",
            fill=_fill(HEADER_BLUE), font=_font(bold=True),
            align=_align(h="center"))
    _mwrite(ws, _col("J"), _col("W"), r, table["physical"],
            font=_font(), align=_align(h="left"))
    _mwrite(ws, _col("X"), _col("AG"), r, "テーブル名（論理名）",
            fill=_fill(HEADER_BLUE), font=_font(bold=True),
            align=_align(h="center"))
    _mwrite(ws, _col("AH"), _col("AQ"), r, table["logical"],
            font=_font(), align=_align(h="left"))

    # Row 6: empty
    r = 6
    ws.row_dimensions[r].height = 19.5

    # Row 7: column header
    r = 7
    _write_table_header(ws, r, COL_DEFS)
    r += 1

    # Build IX map: column_name → [label, ...] derived from indexes
    # Skip PK indexes (already marked in PK column)
    # Single-col index N  → label float N.0
    # Multi-col index N, position i → label "Na", "Nb", ...
    ix_map = {}
    for ix in table["indexes"]:
        if ix.get("pk") == "〇":   # PK index → skip, already in PK col
            continue
        no   = ix["no"]
        cols = [c.strip() for c in ix["columns"].split(",")]
        if len(cols) == 1:
            ix_map.setdefault(cols[0], []).append(float(no))   # e.g. 3.0
        else:
            for i, cn in enumerate(cols):
                ix_map.setdefault(cn.strip(), []).append(f"{no}{chr(ord('a') + i)}")

    # Column data rows
    for col in table["columns"]:
        slots = (ix_map.get(col["name"], []) + ["", "", "", "", ""])[:5]
        _write_data_row(ws, r, COL_DEFS, [
            col["no"],
            col["name"],
            col["pk"],
            slots[0], slots[1], slots[2], slots[3], slots[4],
            col["type"],
            col["size"],
            col["identity"],
            col["nullable"],
            col["note"],
        ])
        r += 1

    # Empty separator
    ws.row_dimensions[r].height = 19.5
    r += 1

    # Index section
    _section_label(ws, r, "インデックス情報")
    r += 1

    _write_table_header(ws, r, IDX_DEFS)
    r += 1

    for ix in table["indexes"]:
        _write_data_row(ws, r, IDX_DEFS, [
            ix["no"],
            ix["name"],
            ix["columns"],
            ix["pk"],
            ix["unique"],
            ix["note"],
        ])
        r += 1

    # ── Seed data section (optional, appended at end) ───────────────────────
    if seed_info and seed_info.get("rows"):
        # Empty separator
        ws.row_dimensions[r].height = 19.5
        r += 1

        _section_label(ws, r, f"シードデータ ({len(seed_info['rows'])} 件)")
        r += 1

        headers = seed_info["headers"]
        col_defs = _distribute_columns(headers)
        _write_table_header(ws, r, col_defs)
        r += 1

        for row_data in seed_info["rows"]:
            padded = (list(row_data) + [""] * len(headers))[:len(headers)]
            _write_data_row(ws, r, col_defs, padded)
            r += 1


# ──────────────────────────────────────────────────────────────────────────────
# MD parser
# ──────────────────────────────────────────────────────────────────────────────

def _parse_table(lines):
    """Parse a Markdown table (skip separator row). Unescape <br> → newline."""
    rows = []
    for line in lines:
        line = line.strip()
        if not line.startswith("|"):
            break
        if re.match(r"^\|[-| ]+\|$", line):
            continue
        cells = [c.strip().replace("<br>", "\n") for c in line.strip("|").split("|")]
        rows.append(cells)
    return rows


def parse_md(text):
    # ── Frontmatter ───────────────────────────────────────────────────────────
    doc = {}
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if m:
        for line in m.group(1).splitlines():
            kv = line.split(":", 1)
            if len(kv) == 2:
                doc[kv[0].strip()] = kv[1].strip().strip('"')
        text = text[m.end():]

    lines = text.splitlines()
    i     = 0
    n     = len(lines)

    def _skip_blank():
        nonlocal i
        while i < n and not lines[i].strip():
            i += 1

    def _read_until_heading():
        """Collect non-heading lines until next ## or # heading."""
        nonlocal i
        result = []
        while i < n and not lines[i].startswith("#") and lines[i].strip() != "---":
            result.append(lines[i])
            i += 1
        # Strip leading/trailing blank lines
        while result and not result[0].strip():
            result.pop(0)
        while result and not result[-1].strip():
            result.pop()
        return result

    changelog = []
    sys_text  = ""
    doc_text  = ""
    related   = []
    tables    = []

    while i < n:
        line = lines[i].strip()

        if line == "---":
            i += 1
            continue

        if line.startswith("## 変更履歴") or line.startswith("## Lịch sử thay đổi"):
            i += 1; _skip_blank()
            tbl_lines = []
            while i < n and lines[i].strip().startswith("|"):
                tbl_lines.append(lines[i])
                i += 1
            rows = _parse_table(tbl_lines)[1:]  # skip header
            for row in rows:
                if len(row) >= 7:
                    changelog.append({
                        "no":          row[0], "date":        row[1],
                        "version":     row[2], "author":      row[3],
                        "description": row[4], "reviewer":    row[5],
                        "approver":    row[6],
                    })
            continue

        if line.startswith("## システム概要") or line.startswith("## Tổng quan hệ thống"):
            i += 1; _skip_blank()
            collected = _read_until_heading()
            sys_text  = "\n".join(collected)
            continue

        if line.startswith("## 資料概要") or line.startswith("## Tổng quan tài liệu"):
            i += 1; _skip_blank()
            collected = _read_until_heading()
            doc_text  = "\n".join(collected)
            continue

        if line.startswith("## 関連資料") or line.startswith("## Tài liệu liên quan"):
            i += 1; _skip_blank()
            tbl_lines = []
            while i < n and lines[i].strip().startswith("|"):
                tbl_lines.append(lines[i])
                i += 1
            rows = _parse_table(tbl_lines)[1:]  # skip header
            for row in rows:
                if len(row) >= 3:
                    related.append({
                        "no":   row[0],
                        "code": row[1],
                        "name": row[2],
                    })
            continue

        # Table section: # physical (logical)
        m2 = re.match(r"^#\s+(\S+)\s+\((.+)\)\s*$", line)
        if m2:
            physical = m2.group(1)
            logical  = m2.group(2)
            i += 1; _skip_blank()

            columns = []
            indexes = []

            # Read column table
            tbl_lines = []
            while i < n and lines[i].strip().startswith("|"):
                tbl_lines.append(lines[i])
                i += 1
            col_rows = _parse_table(tbl_lines)[1:]  # skip header
            for row in col_rows:
                if len(row) >= 8:
                    columns.append({
                        "no":       row[0], "name":     row[1],
                        "pk":       row[2], "type":     row[3],
                        "size":     row[4], "identity": row[5],
                        "nullable": row[6], "note":     row[7],
                    })

            # Look for ## インデックス / ## Chỉ mục subsection
            _skip_blank()
            if i < n and (lines[i].strip().startswith("## インデックス") or lines[i].strip().startswith("## Chỉ mục")):
                i += 1; _skip_blank()
                tbl_lines = []
                while i < n and lines[i].strip().startswith("|"):
                    tbl_lines.append(lines[i])
                    i += 1
                idx_rows = _parse_table(tbl_lines)[1:]  # skip header
                for row in idx_rows:
                    if len(row) >= 6:
                        indexes.append({
                            "no":      row[0], "name":    row[1],
                            "columns": row[2], "pk":      row[3],
                            "unique":  row[4], "note":    row[5],
                        })

            tables.append({
                "physical": physical,
                "logical":  logical,
                "columns":  columns,
                "indexes":  indexes,
            })
            continue

        i += 1

    return doc, changelog, sys_text, doc_text, related, tables


# ──────────────────────────────────────────────────────────────────────────────
# Seeder parser
# ──────────────────────────────────────────────────────────────────────────────

_SQL_IDENT_RE = re.compile(r"^[a-z_][a-z0-9_]*$")


def _is_sql_identifier(name):
    """True if `name` looks like a SQL/Python snake_case column identifier."""
    return bool(_SQL_IDENT_RE.match(name.strip()))


def parse_seeder(text):
    """Parse seeder.md and aggregate seed rows per target table.

    Auto-discovers every table whose section heading matches the pattern
    ``## N. <table_name>（...）``. The ``<table_name>`` token is treated as a
    physical table name (must match ``[a-zA-Z_][a-zA-Z0-9_]*``). All tables
    that follow are aggregated by matching schema. Sub-sections (### x.y ...)
    under the same parent are aggregated.

    Also detects "共通カラム" (common columns) sub-sections — a 2-column
    key/value table where header is `カラム | 値` — and merges those columns
    into every row of the parent section's seed data.

    Returns:
        dict[str, dict]: {table_name: {"headers": [...], "rows": [[...], ...]}}
        Order preserves the order tables appear in the seeder file.
    """
    lines = text.splitlines()
    n = len(lines)
    i = 0
    # Use insertion-ordered dict to preserve seeder file ordering
    seed_data = {}      # table → {"headers": [...], "rows": [[...]]}
    common_data = {}    # table → {col_name: default_value}
    current_table = None
    in_common_section = False

    # Section heading: "## <num>. <identifier>" where identifier is a valid
    # SQL/Python-style table name. Anything after (e.g. full-width parens) is
    # treated as a label and ignored.
    section_re    = re.compile(r"^##\s+\d+\.\s+([a-zA-Z_][a-zA-Z0-9_]*)")
    subsection_re = re.compile(r"^###\s+(.+)")

    while i < n:
        line = lines[i].strip()

        # Top-level section: ## N. <table_name>
        m = section_re.match(line)
        if m:
            current_table = m.group(1)
            in_common_section = False
            i += 1
            continue

        # Sub-section: ### ... — detect "共通カラム" sub-sections
        m_sub = subsection_re.match(line)
        if m_sub:
            in_common_section = "共通カラム" in m_sub.group(1)
            i += 1
            continue

        # A markdown table starts here
        if current_table and line.startswith("|"):
            tbl_lines = []
            while i < n and lines[i].strip().startswith("|"):
                tbl_lines.append(lines[i])
                i += 1
            rows = _parse_table(tbl_lines)
            if not rows:
                continue
            headers = rows[0]
            data_rows = rows[1:]

            # 共通カラム table: headers like ["カラム", "値"]
            if in_common_section and len(headers) == 2 and headers[0] in ("カラム", "Cột"):
                common_data.setdefault(current_table, {})
                for r_ in data_rows:
                    if len(r_) >= 2:
                        common_data[current_table][r_[0]] = r_[1]
                in_common_section = False  # consume once
                continue

            # Heuristic: only treat as seed data if every header looks like a
            # SQL column identifier (lowercase ASCII snake_case). This skips
            # explanatory tables (e.g. permission matrix with Japanese
            # role-name headers like "日農（管理者）") that share a section
            # with real seed tables.
            if not all(_is_sql_identifier(h) for h in headers):
                continue

            if current_table not in seed_data:
                # First table for this section — anchor headers
                seed_data[current_table] = {"headers": headers, "rows": list(data_rows)}
            elif headers == seed_data[current_table]["headers"]:
                # Subsequent table with matching schema — aggregate rows
                seed_data[current_table]["rows"].extend(data_rows)
            # else: schema mismatch (e.g. metadata table) — ignore silently
            continue

        i += 1

    # ── Merge common columns into each row ──────────────────────────────────
    for tname, common in common_data.items():
        if tname not in seed_data or not common:
            continue
        existing_headers = seed_data[tname]["headers"]
        # Only append common columns that are not already in headers
        extra_cols = [c for c in common.keys() if c not in existing_headers]
        if not extra_cols:
            continue
        seed_data[tname]["headers"] = existing_headers + extra_cols
        extra_values = [common[c] for c in extra_cols]
        seed_data[tname]["rows"] = [
            list(row) + extra_values for row in seed_data[tname]["rows"]
        ]

    return seed_data


# ──────────────────────────────────────────────────────────────────────────────
# Output filename
# ──────────────────────────────────────────────────────────────────────────────

def _output_filename(doc, input_path):
    customer = doc.get("customer_name", "日本農業新聞様")
    system   = doc.get("system_name",   "クラウド版購読者管理システム")
    docname  = doc.get("document_name", "データベース設計書")
    version  = doc.get("format_version", "1.0")
    return input_path.parent / f"【{customer}】VTIジャパン_{system}_{docname}_V{version}.xlsx"


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Convert database-design.md to VTI Excel")
    parser.add_argument("input",   help="Input .md file")
    parser.add_argument("--author", help="Override created_by and updated_by")
    parser.add_argument("--seeder",
                        help="Path to seeder.md (default: <input_dir>/seeder.md if exists)")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)

    text = input_path.read_text(encoding="utf-8")
    doc, changelog, sys_text, doc_text, related, tables = parse_md(text)

    # Author: use --author flag, otherwise default to "Tran Duc Tuyen"
    author = args.author or "Tran Duc Tuyen"
    doc["created_by"] = author
    doc["updated_by"] = author

    # Auto-set updated_date to today; keep created_date from MD
    today = datetime.now().strftime("%Y/%m/%d")
    doc.setdefault("created_date", today)
    doc["updated_date"] = today

    # ── Resolve seeder path ──────────────────────────────────────────────────
    seeder_path = None
    if args.seeder:
        seeder_path = Path(args.seeder)
        if not seeder_path.exists():
            print(f"WARNING: --seeder file not found: {seeder_path} (skipping seed sheets)")
            seeder_path = None
    else:
        candidate = input_path.parent / "seeder.md"
        if candidate.exists():
            seeder_path = candidate

    seed_data = {}
    if seeder_path:
        seed_text = seeder_path.read_text(encoding="utf-8")
        seed_data = parse_seeder(seed_text)

    # Lookup: physical table name → list of actual columns (in DDL order)
    schema_by_table = {
        t["physical"]: [c["name"] for c in t["columns"]]
        for t in tables
    }

    # ── Filter seed columns to match actual table schema ────────────────────
    # Keeps human-readable comment columns in seeder.md (e.g. permission_code
    # in m_roles_permissions) without polluting the seed data section output.
    for tname, sinfo in seed_data.items():
        actual_cols = schema_by_table.get(tname)
        if not actual_cols:
            continue   # table not in DDL — keep all seed cols as-is
        keep_idx = [i for i, h in enumerate(sinfo["headers"]) if h in actual_cols]
        if len(keep_idx) == len(sinfo["headers"]):
            continue   # nothing to filter
        sinfo["headers"] = [sinfo["headers"][i] for i in keep_idx]
        sinfo["rows"] = [
            [row[i] if i < len(row) else "" for i in keep_idx]
            for row in sinfo["rows"]
        ]

    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    write_cover(wb, doc)
    write_changelog(wb, doc, changelog)
    write_toc(wb, doc, tables)
    write_overview(wb, doc, sys_text, doc_text, related)
    # Each table sheet now embeds its seed data (if present) at the bottom
    for table in tables:
        write_table_sheet(wb, doc, table, seed_info=seed_data.get(table["physical"]))

    output_path = _output_filename(doc, input_path)
    wb.save(str(output_path))
    print(f"✓  Saved: {output_path.name}")
    for tname, sinfo in seed_data.items():
        if tname in schema_by_table:
            print(f"   + {tname}: embedded {len(sinfo['rows'])} seed rows")
        else:
            print(f"   ! {tname}: seed found but no matching DDL — skipped")


if __name__ == "__main__":
    main()
