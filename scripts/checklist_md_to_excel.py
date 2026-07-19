#!/usr/bin/env python3
"""
checklist_md_to_excel.py — Convert a code-review Checklist Markdown to Excel
(VTI "Checklist Coding" template format).

The Markdown is produced by the `/code-review` skill (one file per side:
Backend / Frontend). This script rebuilds the customer's 3-sheet workbook
(Cover / Record of change / Checklist) from scratch with openpyxl, then fills
the per-item Assessment + Remark cells from the Markdown.

Usage:
    python3 checklist_md_to_excel.py <input.md>
    python3 checklist_md_to_excel.py <input.md> <output.xlsx>
    python3 checklist_md_to_excel.py <input.md> --author "Tran Duc Tuyen"

Output filename (when not given explicitly) follows the customer pattern:
    {Backend_|Frontend_}Checklist_Coding 【日本農業新聞様】ACSMS-SCR-{NNN}.xlsx

Round-filling rule (per project decision):
    - item OK / NA  → tick the SAME value in all three rounds (U, W, Y)
    - item NOK      → tick only Round 1 (U); leave Round 2/3 empty for re-review
"""

import sys
import re
import datetime
from pathlib import Path

try:
    import openpyxl
    from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
    from openpyxl.worksheet.datavalidation import DataValidation
    from openpyxl.utils import column_index_from_string, get_column_letter
except ImportError:
    print("ERROR: openpyxl is required.\n  pip install openpyxl")
    sys.exit(1)


# ──────────────────────────────────────────────────────────────────────────────
# Template constants (extracted from the source xlsx)
# ──────────────────────────────────────────────────────────────────────────────

FONT_NAME   = "Arial"          # customer's VTI Checklist template
HEADER_BLUE = "FF2E75B5"       # dark-blue table header (row 9-10) — white text
CAT_BLUE    = "FFB4C6E7"       # light-blue category rows + metadata labels
GRAY        = "FFD9D9D9"       # Record-of-change header row
DOC_BOX     = "FFD9E2F3"       # Cover document-code box
WHITE       = "FFFFFFFF"

_THIN = Side(style="thin", color="FF000000")
BORDER_ALL = Border(left=_THIN, right=_THIN, top=_THIN, bottom=_THIN)


def _fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)


def _font(bold=False, size=10, color="FF000000", name=FONT_NAME):
    return Font(name=name, size=size, bold=bold, color=color)


def _align(h="left", v="center", wrap=True):
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap)


def _set_col_widths(ws, ranges):
    """Set column widths over inclusive letter ranges.

    The source template stores widths as spanned <col> ranges
    (e.g. B:S = 3.71). openpyxl can't set a ColumnDimension's min/max
    after the fact, so we assign the width to every column letter in the
    range — Excel renders this identically to the original spans.
    `ranges` = list of (start_letter, end_letter, width).
    """
    for start, end, width in ranges:
        for idx in range(column_index_from_string(start), column_index_from_string(end) + 1):
            ws.column_dimensions[get_column_letter(idx)].width = width


# ──────────────────────────────────────────────────────────────────────────────
# Static checklist content — 42 items across 4 sections.
# Row numbers / A-column formulas / Mandatory values mirror the source xlsx
# exactly (including its quirks, e.g. row 45 restarts at 4.1 then +0.01).
# ──────────────────────────────────────────────────────────────────────────────

# (excel_row, category_label) for the 4 section header rows
CATEGORY_ROWS = [
    (11, 1.0, "Format"),
    (21, 2.0, "Security"),
    (32, 3.0, "Third party"),
    (35, 4.0, "Source code"),
]

# (canonical_id, excel_row, A-column value/formula, mandatory, check-item text)
ITEMS = [
    # §1 Format (rows 12-20)
    ("1.1", 12, 1.1, "Yes", "Is your code following Standard Coding Convention?"),
    ("1.2", 13, "=SUM(A12+0.1)", "Yes", "Do your functions (or classes, methods), parameters, variables have meaningful name and follow naming convention?"),
    ("1.3", 14, "=SUM(A13+0.1)", "Yes", "Did you avoid all hard code?"),
    ("1.4", 15, "=SUM(A14+0.1)", "Yes", "Does your code have no duplication code/comment/import/using?"),
    ("1.5", 16, "=SUM(A15+0.1)", "Yes", "Are all complex logic code, surprises, special cases, and work-around errors commented?"),
    ("1.6", 17, "=SUM(A16+0.1)", "Yes", "Are comments correct, clear and up to date?"),
    ("1.7", 18, "=SUM(A17+0.1)", "Yes", "Is the purpose of each operation commented?"),
    ("1.8", 19, "=SUM(A18+0.1)", "Yes", "Are other relevant facts about each operation commented?"),
    ("1.9", 20, "=SUM(A19+0.1)", "Yes", "Are there corrects comments at the header of each class and functions?"),
    # §2 Security (rows 22-31)
    ("2.1", 22, 2.1, "Yes", "Is your code protected from Injection, SQL Injection ?"),
    ("2.2", 23, "=SUM(A22+0.1)", "Yes", "Do you ensure your code has not Broken Authentication and Session Management ?"),
    ("2.3", 24, "=SUM(A23+0.1)", "Yes", "Does your Access Control sufficient?"),
    ("2.4", 25, "=SUM(A24+0.1)", "Yes", "Is your application protected sufficiently by Security Configuration (right access of folders, data, functionalities)? Do you use access control and permissions to protect resources and limit application/user capabilities?"),
    ("2.5", 26, "=SUM(A25+0.1)", "Yes", "Does your code have no any exposure of sensitive data? Example: Log files do not contain any user private data; Sensitive data is properly encoded and encrypted"),
    ("2.6", 27, "=SUM(A26+0.1)", "Yes", "Does your code include sufficient Attack Protection (against injection, Trojan horse, illegal access)"),
    ("2.7", 28, "=SUM(A27+0.1)", "Yes", "Did you avoid using any Under-protected APIs ?"),
    ("2.8", 29, "=SUM(A28+0.1)", "Yes", "Do you validate all input and output to protect the application ?"),
    ("2.9", 30, "=SUM(A29+0.1)", "Yes", "Do you store data securely?"),
    ("2.10", 31, 2.1, "Yes", "Does your code have no any hardcoded credentials or cryptographic keys?"),
    # §3 Third party (rows 33-34)
    ("3.1", 33, 3.1, "Yes", "Is customer/PM approval of using open/ 3rd-party source code or library available?"),
    ("3.2", 34, 3.2, "Yes", "Are license agreements of open/ 3rd-party source code or library respected?"),
    # §4 Source code (rows 36-56)
    ("4.1", 36, 4.1, "Yes", "Does each operation have a meaningful name that describes what the operation does?"),
    ("4.2", 37, "=SUM(A36+0.1)", "Yes", "Do the parameters have descriptive names?"),
    ("4.3", 38, "=SUM(A37+0.1)", "Yes", "Is the normal path through each operation, clearly distinguishable from other exceptional paths?"),
    ("4.4", 39, "=SUM(A38+0.1)", "No", "Is the operation too long, and can it be simplified by extracting related statements into private operations?"),
    ("4.5", 40, "=SUM(A39+0.1)", "No", "Is the operation too long, and can it be simplified by reducing the number of decision points? (A decision point is a statement where the code can take different paths, for example, if-, else-, and-, while-, and case-statements.)"),
    ("4.6", 41, "=SUM(A40+0.1)", "Yes", "Are the variables well named?"),
    ("4.7", 42, "=SUM(A41+0.1)", "Yes", "Are there general description for the uninterrupted software coding paragraphs?"),
    ("4.8", 43, "=SUM(A42+0.1)", "Yes", "Each time a coding paragraph is updated, are there also description of the change?"),
    ("4.9", 44, "=SUM(A43+0.1)", "Yes", "Do complicated coding paragraphs, which may cause misunderstanding and confusion have comments and explanations?"),
    ("4.10", 45, 4.1, "Yes", "Are structural code paragraph indented according to the structure if it is multi-lined."),
    ("4.11", 46, "=SUM(A45+0.01)", "No", "Does the command line contain more than one command in a line? "),
    ("4.12", 47, "=SUM(A46+0.01)", "No", "Are break sign used when the command line is too long?"),
    ("4.13", 48, "=SUM(A47+0.01)", "No", "Are the command lines which are linked with the previous lines indented just as the next level?"),
    ("4.14", 49, "=SUM(A48+0.01)", "Yes", "Are variable names different from other object names?"),
    ("4.15", 50, "=SUM(A49+0.01)", "Yes", "Are functions named in a common way?"),
    ("4.16", 51, "=SUM(A50+0.01)", "Yes", "Are global functions differentiated from local functions by name?"),
    ("4.17", 52, "=SUM(A51+0.01)", "Yes", "Does function name have meaning?"),
    ("4.18", 53, "=SUM(A52+0.01)", "Yes", "Do object names have meaning and comply with general standards of developing tools?"),
    ("4.19", 54, "=SUM(A53+0.01)", "Yes", "Is the way of naming folders and libraries identified in designing document?"),
    ("4.20", 55, "=SUM(A54+0.01)", "Yes", "Are Folder names and types in conformity with the content and standard of developing tools?"),
    ("4.21", 56, "=SUM(A55+0.01)", "Yes", "Are there any redundant lines of code, not used?"),
]

# Baseline row height is 19.5 (applied to every row 1-65, matching the
# template). These rows are taller — exact values lifted from the source xlsx.
SPECIAL_HEIGHTS = {
    10: 30.75, 13: 30.75, 16: 27.75, 23: 18.75, 25: 43.5, 26: 30.75,
    27: 31.5, 36: 28.5, 38: 30.75, 39: 32.25, 40: 45.0, 44: 31.5,
    48: 27.75, 53: 29.25, 55: 28.5,
}


def _a_numfmt(row: int) -> str:
    """A-column number format per row, mirroring the template exactly.

    - row 9 (`#` header)        → text (`@`)
    - items 3.1-3.2, 4.1-4.9    → one decimal (`0.0`)
    - item 2.10, items 4.10-4.21 → two decimals (`0.00`, renders 2.10 / 4.10)
    - everything else            → General
    """
    if row == 9:
        return "@"
    if row in (33, 34) or 36 <= row <= 44:
        return "0.0"
    if row == 31 or 45 <= row <= 56:
        return "0.00"
    return "General"


# ──────────────────────────────────────────────────────────────────────────────
# Markdown parsing
# ──────────────────────────────────────────────────────────────────────────────

_STATUS_MAP = {
    "✅": "OK", "OK": "OK",
    "❌": "NOK", "NOK": "NOK",
    "⚪": "NA", "NA": "NA", "N/A": "NA",
}


_STATUS_EMOJI = {"✅": "OK", "❌": "NOK", "⚪": "NA"}


def _norm_status(token):
    """Map an emoji / textual status token to OK / NOK / NA (or None).

    Exact alpha match first — NEVER substring, since 'OK' is a substring of
    'NOK' and would silently downgrade every failed item to a pass.
    """
    t = token.strip()
    up = re.sub(r"[^A-Za-z/]", "", t).upper()
    if up in _STATUS_MAP:
        return _STATUS_MAP[up]
    for emoji, val in _STATUS_EMOJI.items():
        if emoji in t:
            return val
    return None


def parse_md(path: Path) -> dict:
    """Parse the review Markdown → metadata + {item_id: (status, remark)}."""
    text = path.read_text(encoding="utf-8")
    meta = {}
    assessments = {}

    # --- metadata: "- Key: value" bullet lines anywhere in the doc ---
    for m in re.finditer(r"^[-*]\s*([A-Za-z /_]+?)\s*[:：]\s*(.+?)\s*$", text, re.M):
        key = m.group(1).strip().lower()
        meta[key] = m.group(2).strip()

    # --- side / scr fallbacks from the H1 title ---
    h1 = re.search(r"^#\s+(.+)$", text, re.M)
    title = h1.group(1) if h1 else ""
    scr_m = re.search(r"(ACSMS-SCR-\d{3})", text)
    if scr_m:
        meta.setdefault("scr", scr_m.group(1))
    if "side" not in meta:
        low = title.lower()
        if "backend" in low:
            meta["side"] = "Backend"
        elif "frontend" in low:
            meta["side"] = "Frontend"

    # --- assessment table rows: | 1.1 | OK | remark... | ---
    valid_ids = {it[0] for it in ITEMS}
    for line in text.splitlines():
        if not line.lstrip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 2:
            continue
        item_id = re.sub(r"[^\d.]", "", cells[0])
        if item_id not in valid_ids:
            continue
        status = _norm_status(cells[1])
        if status is None:
            # Some report tables carry "Check Item" in col 2 and status in col 3.
            status = _norm_status(cells[2]) if len(cells) > 2 else None
            remark = cells[3] if len(cells) > 3 else ""
        else:
            remark = cells[2] if len(cells) > 2 else ""
        if status is None:
            continue
        assessments[item_id] = (status, _clean_remark(remark))

    return {"meta": meta, "assessments": assessments}


def _clean_remark(s: str) -> str:
    """Strip markdown noise (links, code ticks, severity emoji) for the cell."""
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)   # [text](link) → text
    s = s.replace("`", "")
    s = re.sub(r"[🔴🟡🟢⚪✅❌]", "", s)
    return s.strip()


# ──────────────────────────────────────────────────────────────────────────────
# Workbook building
# ──────────────────────────────────────────────────────────────────────────────

def _put(ws, coord, value, *, fill=None, bold=False, size=10, color="FF000000",
         h="left", v="center", wrap=True, border=True, merge=None):
    """Write a value + style at coord; optionally merge a range."""
    cell = ws[coord]
    cell.value = value
    cell.font = _font(bold=bold, size=size, color=color)
    cell.alignment = _align(h=h, v=v, wrap=wrap)
    if fill:
        cell.fill = _fill(fill)
    if border:
        cell.border = BORDER_ALL
    if merge:
        ws.merge_cells(merge)
        # apply border to every cell of the merged range so the outline is complete
        if border:
            for row in ws[merge]:
                for c in row:
                    c.border = BORDER_ALL
            if fill:
                for row in ws[merge]:
                    for c in row:
                        c.fill = _fill(fill)
    return cell


def _fill_region(ws, start, end, hex_color):
    """Paint a solid background fill across an inclusive cell range
    (whole-page white background on the Cover, matching the template)."""
    fill = _fill(hex_color)
    sc, sr = column_index_from_string(re.match(r"([A-Z]+)(\d+)", start).group(1)), int(re.match(r"([A-Z]+)(\d+)", start).group(2))
    ec, er = column_index_from_string(re.match(r"([A-Z]+)(\d+)", end).group(1)), int(re.match(r"([A-Z]+)(\d+)", end).group(2))
    for r in range(sr, er + 1):
        for c in range(sc, ec + 1):
            ws.cell(row=r, column=c).fill = fill


def _frame_border(ws, min_row, max_row, min_col, max_col):
    """Draw a thin rectangle border around the perimeter of a region,
    preserving each cell's existing fill (the Cover decorative frame)."""
    for c in range(min_col, max_col + 1):
        top = ws.cell(row=min_row, column=c)
        bot = ws.cell(row=max_row, column=c)
        top.border = Border(top=_THIN, left=top.border.left, right=top.border.right, bottom=top.border.bottom)
        bot.border = Border(bottom=_THIN, left=bot.border.left, right=bot.border.right, top=bot.border.top)
    for r in range(min_row, max_row + 1):
        lft = ws.cell(row=r, column=min_col)
        rgt = ws.cell(row=r, column=max_col)
        lft.border = Border(left=_THIN, top=lft.border.top, right=lft.border.right, bottom=lft.border.bottom)
        rgt.border = Border(right=_THIN, top=rgt.border.top, left=rgt.border.left, bottom=rgt.border.bottom)


def build_cover(wb):
    ws = wb.create_sheet("Cover")
    ws.sheet_view.showGridLines = False
    _set_col_widths(ws, [("A", "AJ", 3.71)])
    # Row heights: most rows 12.8, with a few tall rows for the title block.
    for r in range(1, 31):
        ws.row_dimensions[r].height = 12.8
    for r, h in {1: 19.5, 10: 41.2, 11: 29.2, 12: 28.5}.items():
        ws.row_dimensions[r].height = h

    # Whole-page white background, then the decorative outer frame B2:AJ30.
    _fill_region(ws, "A1", "AJ30", WHITE)
    _frame_border(ws, 2, 30, column_index_from_string("B"), column_index_from_string("AJ"))

    # Centered title block (no cell border — sits on the white page).
    _put(ws, "B10", "AGRI_CMS", size=26, h="center", v="center", border=False,
         merge="B10:AJ10", color="FF1F3864", fill=WHITE)
    _put(ws, "B12", "Checklist Coding", size=28, h="center", v="center", border=False,
         merge="B12:AJ12", color="FF1F3864", fill=WHITE)

    # Document-code box (N20:R22 labels left/top, S20:W22 values centered).
    box = [("N20", "VTI Document Code", "S20", "04-CL/PM/VTI"),
           ("N21", "VTI Document Version", "S21", 1.0),
           ("N22", "Effective Date", "S22", datetime.datetime(2019, 2, 22))]
    for lk, lv, vk, vv in box:
        _put(ws, lk, lv, fill=DOC_BOX, h="left", v="top",
             merge=f"{lk}:{chr(ord(lk[0]) + 4)}{lk[1:]}")
        c = _put(ws, vk, vv, fill=DOC_BOX, h="center", v="center",
                 merge=f"{vk}:{chr(ord(vk[0]) + 4)}{vk[1:]}")
        if isinstance(vv, datetime.datetime):
            c.number_format = "yyyy/mm/dd"
        elif isinstance(vv, float):
            c.number_format = "0.0"   # render 1.0 (not 1) like the template
    return ws


def build_record_of_change(wb, *, review_date, pic, reviewer, approver):
    ws = wb.create_sheet("Record of change")
    ws.sheet_view.showGridLines = False
    _set_col_widths(ws, [("A", "AT", 3.71)])
    ws.row_dimensions[1].height = 19.5
    ws.row_dimensions[4].height = 41.2
    _put(ws, "A1", "RECORD OF CHANGE", bold=True, size=12, fill=WHITE,
         h="left", border=False, merge=None)
    ws["J1"] = ("(*) When using this template, below records must be cleared "
                "and fill the new record of changes of this document")
    ws["J1"].font = _font(size=9)
    headers = [("A2", "No", "A2"), ("B2", "Date", "B2:F2"),
               ("G2", "Version", "G2:I2"), ("J2", "PIC", "J2:P2"),
               ("Q2", "Change Description", "Q2:AC2"),
               ("AD2", "Reviewer", "AD2:AJ2"), ("AK2", "Approver", "AK2:AQ2")]
    for coord, label, merge in headers:
        _put(ws, coord, label, fill=GRAY, bold=True, h="center",
             merge=(merge if ":" in merge else None))
    # data row 3 + a few empty bordered rows (4-7) for future revisions
    row3 = [("A3", 1.0, "A3"), ("B3", review_date, "B3:F3"),
            ("G3", "1.0", "G3:I3"), ("J3", pic, "J3:P3"),
            ("Q3", "Create new", "Q3:AC3"),
            ("AD3", reviewer, "AD3:AJ3"), ("AK3", approver, "AK3:AQ3")]
    for coord, val, merge in row3:
        c = _put(ws, coord, val, h="center" if coord in ("A3", "G3") else "left",
                 merge=(merge if ":" in merge else None))
        if isinstance(val, (datetime.date, datetime.datetime)):
            c.number_format = "yyyy/mm/dd"
    # empty bordered+merged rows 4-17 (matches the source template extent)
    for r in range(4, 18):
        for spec in [("A", "A"), ("B", "F"), ("G", "I"), ("J", "P"),
                     ("Q", "AC"), ("AD", "AJ"), ("AK", "AQ")]:
            a, b = spec
            merge = f"{a}{r}:{b}{r}" if a != b else None
            _put(ws, f"{a}{r}", None, merge=merge)
    return ws


def build_checklist(wb, *, meta, assessments):
    ws = wb.create_sheet("Checklist")
    ws.sheet_view.showGridLines = False
    # Mirror the source spans: A=4.71, B:S=3.71, T=4.43, U:AJ=3.71.
    _set_col_widths(ws, [
        ("A", "A", 4.71),
        ("B", "S", 3.71),
        ("T", "T", 4.43),
        ("U", "AJ", 3.71),
    ])
    # Baseline 19.5 on every row, then the tall overrides (matches template).
    for r in range(1, 66):
        ws.row_dimensions[r].height = 19.5
    for r, h in SPECIAL_HEIGHTS.items():
        ws.row_dimensions[r].height = h

    # Base format over the whole used range (A1:AJ65): the template author
    # select-all-applied Arial 10 + vertical-center + wrap. Replicating it means
    # empty cells (and any later round-2/3 fill-ins) render in Arial, not the
    # openpyxl Calibri-11 default. Content cells below override via _put().
    _base_font = _font(size=10)
    _base_align = Alignment(vertical="center", wrap_text=True)
    for r in range(1, 66):
        for c in range(1, 37):
            cell = ws.cell(row=r, column=c)
            cell.font = _base_font
            cell.alignment = _base_align

    # White page background — only the margins / gaps AROUND the table, exactly
    # as the template does it. The table interior is left unfilled (it renders
    # white anyway because gridlines are off). Replicating the precise map keeps
    # a clean diff against the source workbook.
    white_ranges = [
        ("A2", "AJ2"), ("A8", "AJ8"),     # gap rows above/below the header band
        ("A57", "AJ58"), ("A62", "AJ65"), # gap rows around the summary block
        ("AH3", "AJ56"),                  # right margin beside the table
        ("A3", "A7"), ("J3", "J7"),       # metadata: left margin + value boxes
        ("A59", "U61"), ("W59", "W61"),   # summary: labels + COUNTIF cells
        ("Y59", "Y61"), ("AA59", "AJ61"),
    ]
    for _a, _b in white_ranges:
        _fill_region(ws, _a, _b, WHITE)

    # --- title row 1 ---
    _put(ws, "A1", "Checklist_Coding", bold=True, size=14, h="center",
         wrap=False, border=False, merge="A1:AH1")

    # --- metadata block (rows 3-7) ---
    today = datetime.date.today()
    rd = meta.get("review date") or meta.get("review_date") or today.isoformat()
    info = [
        ("Project name", meta.get("project name", "AGRI_CMS")),
        ("Project manager", meta.get("project manager", "")),
        ("Products/Files", meta.get("products/files") or meta.get("products", "")),
        ("Reviewer", meta.get("reviewer", "")),
        ("Review date (yyyy/mm/dd)", _to_date(rd)),
    ]
    for i, (label, value) in enumerate(info):
        r = 3 + i
        _put(ws, f"B{r}", label, fill=CAT_BLUE, bold=True, h=None, wrap=False,
             merge=f"B{r}:I{r}")
        c = _put(ws, f"J{r}", value, h="left", wrap=False, merge=f"J{r}:AG{r}")
        if isinstance(value, (datetime.date, datetime.datetime)):
            c.number_format = "yyyy/mm/dd"

    # --- column-header rows 9-10 ---
    a9 = _put(ws, "A9", "#", fill=HEADER_BLUE, bold=True, color=WHITE, h="center",
              wrap=False, merge="A9:A10")
    a9.number_format = "@"
    _put(ws, "B9", "Check Item", fill=HEADER_BLUE, bold=True, color=WHITE,
         h="center", wrap=False, merge="B9:T10")
    _put(ws, "U9", "Assessment", fill=HEADER_BLUE, bold=True, color=WHITE,
         h="center", wrap=False, merge="U9:Z9")
    _put(ws, "U10", "Round 1", fill=HEADER_BLUE, bold=True, color=WHITE,
         h="center", merge="U10:V10")
    _put(ws, "W10", "Round 2", fill=HEADER_BLUE, bold=True, color=WHITE,
         h="center", merge="W10:X10")
    _put(ws, "Y10", "Round 3", fill=HEADER_BLUE, bold=True, color=WHITE,
         h="center", merge="Y10:Z10")
    _put(ws, "AA9", "Mandatory", fill=HEADER_BLUE, bold=True, color=WHITE,
         h="center", wrap=False, merge="AA9:AC10")
    _put(ws, "AD9", "Remark", fill=HEADER_BLUE, bold=True, color=WHITE,
         h="center", wrap=False, merge="AD9:AG10")

    # --- category header rows ---
    for r, num, label in CATEGORY_ROWS:
        ca = _put(ws, f"A{r}", num, fill=CAT_BLUE, bold=True, h=None, merge=None)
        ca.number_format = "General"
        _put(ws, f"B{r}", label, fill=CAT_BLUE, bold=True, h="left", merge=f"B{r}:T{r}")
        _put(ws, f"U{r}", None, fill=CAT_BLUE, merge=f"U{r}:V{r}")
        _put(ws, f"W{r}", None, fill=CAT_BLUE, merge=f"W{r}:X{r}")
        _put(ws, f"Y{r}", None, fill=CAT_BLUE, merge=f"Y{r}:Z{r}")
        # row 11 (Format) carries the Mandatory merge in the source; on the
        # other category rows AA:AC stay unmerged white with top+bottom borders.
        if r == 11:
            _put(ws, f"AA{r}", None, fill=CAT_BLUE, merge=f"AA{r}:AC{r}")
        else:
            # blue-filled but unmerged, with top+bottom borders only
            for cl in ("AA", "AB", "AC"):
                cc = ws[f"{cl}{r}"]
                cc.fill = _fill(CAT_BLUE)
                cc.border = Border(top=_THIN, bottom=_THIN)
        _put(ws, f"AD{r}", None, fill=CAT_BLUE, merge=f"AD{r}:AG{r}")

    # --- item rows ---
    for item_id, r, a_val, mandatory, text in ITEMS:
        ca = _put(ws, f"A{r}", a_val, h=None)
        ca.number_format = _a_numfmt(r)
        _put(ws, f"B{r}", text, h="right", merge=f"B{r}:T{r}")
        status, remark = assessments.get(item_id, (None, ""))
        u, w, y = _round_values(status)
        _put(ws, f"U{r}", u, h="center", merge=f"U{r}:V{r}")
        _put(ws, f"W{r}", w, h="center", merge=f"W{r}:X{r}")
        _put(ws, f"Y{r}", y, h="center", merge=f"Y{r}:Z{r}")
        _put(ws, f"AA{r}", mandatory, h="center", merge=f"AA{r}:AC{r}")
        # Remark policy: an OK item needs no remark — leave it blank.
        # Only NOK / NA carry an (English) explanation.
        remark_out = None if status == "OK" else (remark or None)
        _put(ws, f"AD{r}", remark_out, h="left", merge=f"AD{r}:AG{r}")

    # --- data validations (dropdowns) ---
    item_ranges = "U12:U20 U22:U31 U33:U34 U36:U56 W12:W20 W22:W31 W33:W34 W36:W56 Y12:Y20 Y22:Y31 Y33:Y34 Y36:Y56"
    dv_assess = DataValidation(type="list", formula1='"OK,NOK,NA"', allow_blank=True)
    ws.add_data_validation(dv_assess)
    for rng in item_ranges.split():
        dv_assess.add(rng)
    dv_mand = DataValidation(type="list", formula1='"Yes,No"', allow_blank=True)
    ws.add_data_validation(dv_mand)
    for rng in "AA12:AA20 AA22:AA31 AA33:AA34 AA36:AA56".split():
        dv_mand.add(rng)

    # --- summary block (rows 58-65) ---
    _put(ws, "K58", "Summary", bold=True, h=None, wrap=False, border=False, fill=None)
    summary = [
        (59, "Number of 'OK' items", "OK"),
        (60, "Number of 'NOK' items", "NOK"),
        (61, "Number of 'N/A' items", "NA"),
    ]
    for r, label, code in summary:
        _put(ws, f"O{r}", label, h=None, wrap=False, border=False, merge=None)
        for col in ("U", "W", "Y"):
            rng = f"{col}12:{chr(ord(col)+1)}56"
            _put(ws, f"{col}{r}", f'=COUNTIF({rng},"{code}")', h="center",
                 wrap=False, border=False, merge=f"{col}{r}:{chr(ord(col)+1)}{r}")
    _put(ws, "K63", "Review Result", bold=True, h=None, wrap=False,
         border=False, fill=None)
    for i, label in enumerate(["[       ] - Pass", "[       ] - Review Again",
                               "[       ] - Acceptable"]):
        _put(ws, f"O{63+i}", label, h=None, wrap=False, border=False, merge=None)
    return ws


def _round_values(status):
    """Apply the round-filling rule. Returns (round1, round2, round3)."""
    if status in (None, ""):
        return None, None, None
    if status == "NOK":
        return "NOK", None, None      # only round 1; re-review later
    return status, status, status     # OK / NA → all three rounds


def _to_date(s):
    if isinstance(s, (datetime.date, datetime.datetime)):
        return s
    s = str(s).strip()
    for fmt in ("%Y/%m/%d", "%Y-%m-%d", "%Y.%m.%d"):
        try:
            return datetime.datetime.strptime(s, fmt)
        except ValueError:
            continue
    return s


def build_workbook(data, *, author):
    meta = data["meta"]
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    build_cover(wb)
    build_record_of_change(
        wb,
        review_date=_to_date(meta.get("review date") or meta.get("review_date")
                              or datetime.date.today().isoformat()),
        pic=meta.get("pic") or meta.get("reviewer", author),
        reviewer=meta.get("reviewer", author),
        approver=meta.get("approver", author),
    )
    build_checklist(wb, meta=meta, assessments=data["assessments"])
    return wb


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────

def _output_name(meta) -> str:
    side = (meta.get("side") or "").strip().lower()
    prefix = "Backend_" if side.startswith("back") else "Frontend_" if side.startswith("front") else ""
    scr = meta.get("scr", "ACSMS-SCR-000")
    return f"{prefix}Checklist_Coding 【日本農業新聞様】{scr}.xlsx"


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    opts = {argv[i]: argv[i + 1] for i in range(len(argv) - 1) if argv[i].startswith("--")}
    if not args:
        print(__doc__)
        sys.exit(1)
    in_path = Path(args[0])
    if not in_path.exists():
        print(f"ERROR: input not found: {in_path}")
        sys.exit(1)

    data = parse_md(in_path)
    author = opts.get("--author", "Tran Duc Tuyen")

    if len(args) >= 2:
        out_path = Path(args[1])
    else:
        out_path = in_path.parent / _output_name(data["meta"])

    wb = build_workbook(data, author=author)
    wb.save(out_path)

    n = len(data["assessments"])
    print(f"OK: wrote {out_path}")
    print(f"    side={data['meta'].get('side','?')}  scr={data['meta'].get('scr','?')}  "
          f"assessments parsed={n}/42")
    if n < 42:
        missing = [it[0] for it in ITEMS if it[0] not in data["assessments"]]
        print(f"    WARNING: {42 - n} items missing from the MD (left blank): {missing}")


if __name__ == "__main__":
    main(sys.argv[1:])
