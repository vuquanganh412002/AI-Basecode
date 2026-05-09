#!/usr/bin/env python3
"""
testcase_md_to_excel.py — Convert {screen}-testcase.md to Excel (VTI testcase template format).

Usage:
    python3 testcase_md_to_excel.py <input.md>
    python3 testcase_md_to_excel.py <input.md> <output.xlsx>
    python3 testcase_md_to_excel.py <input.md> --author "Display Name"

Default output: same dir as <input.md>, with VTI naming pattern derived from
frontmatter:
  【{customer_name}】VTIジャパン_{system_name}_{document_name}_{screen_name}_v{format_version}.xlsx

Sibling of:
  - .claude/skills/gen-testcase-doc/SKILL.md  (the markdown generator)
  - scripts/api_md_to_excel.py                (shares VTI styling — patterns
                                               for cover, meta header, and
                                               overview prose are copied
                                               from there for consistency)

Sheets produced (mirror the customer's VTI template):
  - 表紙          (cover with framed title box)
  - 変更履歴      (changelog)
  - 概要          (overview: VTI meta header + システム概要 / 資料目的 / 関連資料)
  - テスト報告書  (test report — per-round stats with COUNTIF formulas)
  - Viewpoint    (flat per-TC summary with VTI meta header)
  - 機能          (main testcase sheet — rows 1-8 metadata + stats grid,
                   rows 10-11 column headers, rows 12+ testcase data)
"""
from __future__ import annotations

import argparse
import math
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

try:
    import openpyxl
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import column_index_from_string, get_column_letter
    from openpyxl.cell.rich_text import CellRichText, TextBlock
    from openpyxl.cell.text import InlineFont
except ImportError:  # pragma: no cover
    print("ERROR: openpyxl is required.\n  pip install openpyxl")
    sys.exit(1)


# ─── Style constants (match scripts/api_md_to_excel.py for visual coherence)

HEADER_BLUE = "FFB4C6E7"   # main column-header fill
SUB_HEADER  = "FFBDD6EE"   # secondary header fill (sub-header rows, category bands)
LIGHT_BLUE  = "FFDEEAF6"   # very light blue (機能 metadata + stats grid headers)
COVER_META  = "FFD9E2F3"   # cover-page metadata box
META_LABEL  = "FFFFE699"   # 機能 sheet metadata label cells (rows 1-4)
HIGHLIGHT   = "FFFFFF99"   # 資料目的 yellow highlight
NAVY        = "FF1F3864"   # cover-page title text colour
FONT_NAME   = "游ゴシック"

_THIN = Side(style="thin", color="FF000000")
_NONE = Side(style=None)


def _fill(hex_color: str) -> PatternFill:
    return PatternFill("solid", fgColor=hex_color)


def _font(bold: bool = False, size: int = 11,
          color: str = "FF000000", name: str = FONT_NAME,
          italic: bool = False) -> Font:
    return Font(name=name, size=size, bold=bold, italic=italic, color=color)


def _align(wrap: bool = True, h: str = "left", v: str = "center") -> Alignment:
    return Alignment(wrap_text=wrap, horizontal=h, vertical=v)


def _col(letter: str) -> int:
    return column_index_from_string(letter)


def _letter(col_idx: int) -> str:
    return get_column_letter(col_idx)


def _apply_borders(ws, sc: int, ec: int, rs: int, re_: int,
                   no_bottom: bool = False) -> None:
    """Outer-edge borders only on a merged range (sc:ec, rs:re_)."""
    for row in range(rs, re_ + 1):
        for col in range(sc, ec + 1):
            left   = _THIN if col == sc  else None
            right  = _THIN if col == ec  else None
            top    = _THIN if row == rs  else None
            bottom = _THIN if row == re_ and not no_bottom else None
            if any([left, right, top, bottom]):
                ws.cell(row=row, column=col).border = Border(
                    left=left or _NONE, right=right or _NONE,
                    top=top or _NONE, bottom=bottom or _NONE,
                )


def _mwrite(
    ws,
    sc: int,
    ec: int,
    row: int,
    value,
    row_end: int | None = None,
    fill: PatternFill | None = None,
    font: Font | None = None,
    align: Alignment | None = None,
    borders: bool = True,
    no_bottom: bool = False,
    number_format: str | None = None,
) -> None:
    """Merge sc:ec at row..row_end, write value, apply style."""
    row_end = row_end or row
    sl, el = _letter(sc), _letter(ec)
    if not (sc == ec and row == row_end):
        ws.merge_cells(f"{sl}{row}:{el}{row_end}")
    cell = ws[f"{sl}{row}"]
    if number_format:
        cell.number_format = number_format
    cell.value = value
    if fill:
        cell.fill = fill
    if font:
        cell.font = font
    cell.alignment = align or _align()
    if borders:
        _apply_borders(ws, sc, ec, row, row_end, no_bottom=no_bottom)


def _set_col_widths(ws, max_col: int, width: float) -> None:
    for i in range(1, max_col + 1):
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.sheet_view.showGridLines = False


def _num(v):
    """Coerce a numeric-looking string to int/float to avoid Excel's
    "Number Stored as Text" warning. Non-numeric strings pass through."""
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


# Date-related frontmatter keys formatted as yyyy/mm/dd in the metadata header
_DATE_KEYS = {"issue_date", "created_date", "updated_date"}


def _format_date(value: str) -> str:
    if not isinstance(value, str):
        return value
    s = value.strip()
    m = re.match(r"^(\d{4})[\-/\.](\d{1,2})[\-/\.](\d{1,2})$", s)
    if m:
        return f"{m.group(1)}/{int(m.group(2)):02d}/{int(m.group(3)):02d}"
    return value


# VTI meta header (rows 1-3 on 概要 / Viewpoint sheets — shared with api/db docs)
HDR = [
    (_col("A"),  _col("I"),  "システム・アプリケーション名", "system_name"),
    (_col("J"),  _col("P"),  "ドキュメント",                "document_name"),
    (_col("Q"),  _col("U"),  "シート名",                    "_sheet_name"),
    (_col("V"),  _col("Y"),  "作成日",                      "issue_date"),
    (_col("Z"),  _col("AC"), "作成者",                      "author"),
    (_col("AD"), _col("AG"), "更新日",                      "issue_date"),
    (_col("AH"), _col("AK"), "更新者",                      "author"),
]


def _write_meta_header(ws, doc, sheet_name: str) -> None:
    for r in (1, 2, 3):
        ws.row_dimensions[r].height = 19.5
    for sc, ec, label, key in HDR:
        _mwrite(ws, sc, ec, 1, label,
                fill=_fill(HEADER_BLUE),
                font=_font(bold=True),
                align=_align(h="center"),
                borders=True)
        if key == "_sheet_name":
            value = sheet_name
        else:
            value = doc.meta.get(key, "")
            if key in _DATE_KEYS:
                value = _format_date(value)
        fmt = "@" if key in _DATE_KEYS else None
        _mwrite(ws, sc, ec, 2, value, row_end=3,
                font=_font(),
                align=_align(h="center"),
                borders=True,
                number_format=fmt)


# ─── Markdown parsing ───────────────────────────────────────────────────────

@dataclass
class TestCase:
    tc_id: str = ""
    desc: str = ""
    requirement_id: str = ""
    type_: str = ""           # "N" / "A" / "B" (boundary) / verbatim
    precondition: str = ""
    steps: str = ""
    expected: str = ""
    remarks: str = ""


@dataclass
class Section:
    title: str
    cases: list[TestCase] = field(default_factory=list)


@dataclass
class RelatedDoc:
    code: str = ""
    name: str = ""


@dataclass
class Viewpoint:
    """One row from the canonical テスト観点 strategy doc.

    Source: docs/design/common/testcase-viewpoints.md, the table under
    `## 2. Bảng viewpoint tổng quan`. Rendered as the テスト観点 sheet
    (system-wide strategy overview, not a per-TC dump).
    """
    id: str = ""
    category: str = ""
    name: str = ""
    risk: str = ""
    scope: str = ""
    tc_estimate: str = ""


@dataclass
class Document:
    meta: dict = field(default_factory=dict)
    changelog: list[dict] = field(default_factory=list)  # rows
    sys_lines: list[str] = field(default_factory=list)
    purpose_lines: list[str] = field(default_factory=list)
    related_docs: list[RelatedDoc] = field(default_factory=list)
    sections: list[Section] = field(default_factory=list)


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return {}, text
    try:
        end = next(i for i, ln in enumerate(lines[1:], 1) if ln.strip() == "---")
    except StopIteration:
        return {}, text
    meta = {}
    for ln in lines[1:end]:
        if ":" in ln:
            k, _, v = ln.partition(":")
            meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, "\n".join(lines[end + 1:])


def _parse_md_table(lines: list[str]) -> list[dict]:
    headers: list[str] | None = None
    rows: list[dict] = []
    for ln in lines:
        s = ln.strip()
        if not s.startswith("|"):
            continue
        if re.match(r"^\|[-| :]+\|$", s):
            continue
        cols = [c.strip() for c in s.strip("|").split("|")]
        if headers is None:
            headers = cols
        else:
            rows.append(dict(zip(headers, cols)))
    return rows


def _split_sections(text: str, max_level: int = 6) -> list[tuple[int, str, str]]:
    """Split markdown by heading. Headings deeper than max_level are kept inside the parent body."""
    out: list[tuple[int, str, str]] = []
    cur_level: int | None = None
    cur_title: str = ""
    cur_body: list[str] = []
    for ln in text.splitlines():
        m = re.match(r"^(#{1,6})\s+(.*)$", ln)
        level = len(m.group(1)) if m else None
        if m and level is not None and level <= max_level:
            if cur_level is not None:
                out.append((cur_level, cur_title, "\n".join(cur_body)))
            cur_level = level
            cur_title = m.group(2).strip()
            cur_body = []
        else:
            if cur_level is not None:
                cur_body.append(ln)
    if cur_level is not None:
        out.append((cur_level, cur_title, "\n".join(cur_body)))
    return out


def _normalize_type(t: str) -> str:
    t = t.strip()
    if not t:
        return ""
    low = t.lower()
    if low.startswith("a") or "異常" in t:
        return "A"
    if low.startswith("n") or "正常" in t:
        return "N"
    if low.startswith("b") or "境界" in t:
        return "B"
    return t


def _parse_case_body(body: str) -> TestCase:
    """Parse the body of a TC (everything after `## TC-... — title`)."""
    tc = TestCase()
    body_lines = body.splitlines()

    # Walk index-by-index so multi-line fields (前提条件 with sub-bullets)
    # can absorb continuation lines. Required because the gen-testcase-doc
    # SKILL renders 前提条件 as
    #   - **前提条件**:
    #     - role: NICHINO_ADMIN
    #     - ログイン済 + MFA認証済
    # — the value is empty on the head line and lives on indented bullets
    # below.
    i = 0
    while i < len(body_lines):
        ln = body_lines[i]
        m = re.match(r"^\s*-\s+\*\*([^*]+)\*\*\s*:\s*(.*)$", ln)
        if not m:
            i += 1
            continue
        key = m.group(1).strip()
        val = m.group(2).strip()
        # Absorb continuation lines (indented; not a new ``- **field**:`` and not a heading)
        cont: list[str] = []
        j = i + 1
        while j < len(body_lines):
            nxt = body_lines[j]
            if nxt.strip() == "":
                # Blank inside a multi-line field is allowed — keep absorbing
                # only if the next non-blank line is still indented.
                k = j + 1
                while k < len(body_lines) and body_lines[k].strip() == "":
                    k += 1
                if k >= len(body_lines):
                    break
                peek = body_lines[k]
                if peek.startswith("#"):
                    break
                if re.match(r"^\s*-\s+\*\*[^*]+\*\*\s*:", peek):
                    break
                if not peek.startswith((" ", "\t")):
                    break
                j += 1
                continue
            if nxt.startswith("#"):
                break
            if re.match(r"^\s*-\s+\*\*[^*]+\*\*\s*:", nxt):
                break
            if not nxt.startswith((" ", "\t")):
                break
            # Indented line — strip one level of bullet/indent and keep
            stripped = nxt.lstrip()
            if stripped.startswith("- "):
                stripped = stripped[2:]
            cont.append(stripped.rstrip())
            j += 1
        combined_val = val
        if cont:
            joined = "\n".join(cont).strip()
            combined_val = (val + "\n" + joined).strip() if val else joined

        if key in ("種類", "Type"):
            tc.type_ = _normalize_type(combined_val)
        elif key in ("前提条件", "Precondition"):
            tc.precondition = "" if combined_val in ("(なし)", "(none)", "-", "") else combined_val
        elif key in ("要件ID", "Requirement ID"):
            tc.requirement_id = "" if combined_val in ("(空)", "-", "") else combined_val
        i = j

    sub_secs = _split_sections("\n".join(body_lines), max_level=3)
    for level, title, sub_body in sub_secs:
        if level != 3:
            continue
        text = sub_body.strip()
        if title.startswith("手順"):
            tc.steps = text
        elif title.startswith("期待結果"):
            tc.expected = text
        elif title.startswith("備考"):
            tc.remarks = "" if text in ("(なし)", "(none)", "-", "") else text
        # テスト結果 (1回目 / 2回目) tables intentionally discarded
    return tc


def _strip_markdown_list_markers(text: str) -> str:
    """Strip leading `- ` / `* ` from bullets; preserve blank lines so the
    new gen-testcase-doc format (multi-line ``ステップN：`` blocks with a
    blank line between consecutive steps) renders with the right vertical
    rhythm in the Excel cell.

    Consecutive blank lines collapse to a single one so accidental
    extra spacing in the markdown doesn't bloat the cell.
    """
    out_lines: list[str] = []
    prev_blank = False
    for ln in text.splitlines():
        s = ln.strip()
        if not s:
            if prev_blank or not out_lines:
                continue   # collapse runs of blanks; skip leading blanks
            out_lines.append("")
            prev_blank = True
            continue
        if s.startswith("- ") or s.startswith("* "):
            out_lines.append(s[2:].lstrip())
        else:
            out_lines.append(s)
        prev_blank = False
    # Drop trailing blank
    while out_lines and out_lines[-1] == "":
        out_lines.pop()
    return "\n".join(out_lines)


def parse_viewpoints_md(path: Path) -> list[Viewpoint]:
    """Parse the canonical strategy doc (docs/design/common/testcase-viewpoints.md).

    The script reads the overview table under `## 2. Bảng viewpoint tổng quan`
    and ignores the prose detail sections — the Excel sheet is meant to give
    customers the strategy at a glance, not the full senior-test-lead notes.
    """
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    sections = _split_sections(text, max_level=2)
    for level, title, body in sections:
        if level == 2 and ("viewpoint tổng quan" in title.lower() or "観点一覧" in title):
            return _parse_viewpoint_table(body.splitlines())
    return []


def _parse_viewpoint_table(lines: list[str]) -> list[Viewpoint]:
    rows = _parse_md_table(lines)
    out: list[Viewpoint] = []
    for row in rows:
        vid = (row.get("観点ID") or "").strip()
        if not vid or "Tổng" in vid or "**Tổng**" in (row.get("TC見積") or ""):
            continue   # skip total / blank rows
        out.append(Viewpoint(
            id=vid,
            category=(row.get("大分類") or "").strip(),
            name=(row.get("観点名") or "").strip(),
            risk=(row.get("リスク") or "").strip(),
            scope=(row.get("対象画面範囲") or "").strip(),
            tc_estimate=(row.get("TC見積") or "").strip(),
        ))
    return out


def parse_md(text: str) -> Document:
    meta, body = _parse_frontmatter(text)
    doc = Document(meta=meta)

    sections = _split_sections(body, max_level=2)
    current_section: Section | None = None

    for level, title, sub_body in sections:
        if level == 2 and title == "変更履歴":
            doc.changelog = _parse_md_table(sub_body.splitlines())
            continue
        if level == 2 and title == "システム概要":
            doc.sys_lines = [ln.rstrip() for ln in sub_body.splitlines() if ln.strip()]
            continue
        if level == 2 and title == "資料目的":
            doc.purpose_lines = [ln.rstrip() for ln in sub_body.splitlines() if ln.strip()]
            continue
        if level == 2 and title == "関連資料":
            for r in _parse_md_table(sub_body.splitlines()):
                doc.related_docs.append(RelatedDoc(
                    code=r.get("資料コード", "").strip(),
                    name=r.get("資料名", "").strip(),
                ))
            continue
        if level == 2 and title == "テストカテゴリ一覧":
            continue  # informational — re-derived from sections
        if level == 1 and title.startswith("カテゴリ"):
            m = re.match(r"^カテゴリ\s+\d+\s*[:：]\s*(.*)$", title)
            cat_title = m.group(1).strip() if m else title
            current_section = Section(title=cat_title)
            doc.sections.append(current_section)
            continue
        if level == 2 and (title.startswith("TC-") or title.startswith("ACSMS-TC-")):
            if current_section is None:
                current_section = Section(title="(uncategorized)")
                doc.sections.append(current_section)
            # Accept both legacy `TC-005-001` and current `ACSMS-TC-005-001`
            # heading prefixes. The latter is the canonical form per
            # gen-testcase-doc skill — the testcase code in the heading is
            # what fills the 要件ID column on the 機能 sheet.
            m = re.match(r"^((?:ACSMS-)?TC-[\w\-]+)\s*[—\-:]\s*(.*)$", title)
            if m:
                tc_id = m.group(1)
                desc = m.group(2).strip()
            else:
                tc_id, desc = title, ""
            tc = _parse_case_body(sub_body)
            tc.tc_id = tc_id
            tc.desc = desc
            current_section.cases.append(tc)
            continue

    return doc


# ─── Sheet: 表紙 (cover) ────────────────────────────────────────────────────

def write_cover(wb, doc: Document) -> None:
    from openpyxl.drawing.image import Image as XLImage

    ws = wb.create_sheet("表紙")
    ws.sheet_format.defaultColWidth = 14.5
    ws.sheet_format.defaultRowHeight = 12.75
    ws.sheet_format.customHeight = True
    _set_col_widths(ws, max_col=37, width=3.25)
    ws.column_dimensions["A"].width = 3.66

    ws.row_dimensions[1].height = 19.5
    for r in range(2, 36):
        ws.row_dimensions[r].height = 12.75
    ws.row_dimensions[10].height = 29.25
    ws.row_dimensions[12].height = 39.0

    # Outer border box B2:AK34
    BOX_TOP, BOX_BOT = 2, 34
    BOX_LC, BOX_RC = _col("B"), _col("AK")
    for col in range(BOX_LC, BOX_RC + 1):
        c = ws.cell(row=BOX_TOP, column=col)
        c.border = Border(
            top=_THIN,
            left=_THIN if col == BOX_LC else _NONE,
            right=_THIN if col == BOX_RC else _NONE,
        )
    for row in range(BOX_TOP + 1, BOX_BOT):
        ws.cell(row=row, column=BOX_LC).border = Border(left=_THIN)
        ws.cell(row=row, column=BOX_RC).border = Border(right=_THIN)
    for col in range(BOX_LC, BOX_RC + 1):
        c = ws.cell(row=BOX_BOT, column=col)
        c.border = Border(
            bottom=_THIN,
            left=_THIN if col == BOX_LC else _NONE,
            right=_THIN if col == BOX_RC else _NONE,
        )

    # System title at row 10 — system_name (e.g. クラウド版購読者管理システム)
    ws.merge_cells("B10:AK10")
    c = ws["B10"]
    c.value = doc.meta.get("system_name", "")
    c.font = Font(name=FONT_NAME, size=26, color=NAVY)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B10"].border = Border(left=_THIN)
    ws["AK10"].border = Border(right=_THIN)

    # Screen name at row 12 (e.g. 単価マスタ登録画面) — NOT the document type
    ws.merge_cells("B12:AK12")
    c = ws["B12"]
    c.value = doc.meta.get("screen_name", "")
    c.font = Font(name=FONT_NAME, size=24, color=NAVY)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B12"].border = Border(left=_THIN)
    ws["AK12"].border = Border(right=_THIN)

    # Version row 15 — "版1.0"
    ws.merge_cells("B15:AK15")
    c = ws["B15"]
    c.value = f"版{doc.meta.get('format_version', '1.0')}"
    c.font = Font(name=FONT_NAME, size=15)
    c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws["B15"].border = Border(left=_THIN)
    ws["AK15"].border = Border(right=_THIN)

    # Metadata box (rows 18-20, label N:R, value S:W)
    meta_rows = [
        ("フォーマットコード",    doc.meta.get("format_code", "")),
        ("フォーマットバージョン", doc.meta.get("format_version", "")),
        ("発行日",                _format_date(doc.meta.get("issue_date", ""))),
    ]
    for i, (label, value) in enumerate(meta_rows):
        r = 18 + i
        _mwrite(ws, _col("N"), _col("R"), r, label,
                fill=_fill(COVER_META),
                font=_font(size=10),
                align=_align(h="center"))
        # Force text format on date so Excel doesn't auto-convert
        fmt = "@" if label == "発行日" else None
        _mwrite(ws, _col("S"), _col("W"), r, value,
                fill=_fill(COVER_META),
                font=_font(size=10),
                align=_align(h="center"),
                number_format=fmt)

    # VTI logo — top-right area at P3 (matches customer template anchor).
    # Sibling scripts/api_md_to_excel.py + scripts/db_md_to_excel.py use
    # the same logo file. Native asset is 318×122 px; render at 140×54 px
    # to match the template's EMU sizing (cx=1333500 cy=514350).
    logo_path = Path(__file__).parent / "vti_logo.png"
    if logo_path.exists():
        img = XLImage(str(logo_path))
        img.width = 140
        img.height = 54
        ws.add_image(img, "P3")


# ─── Sheet: 変更履歴 ────────────────────────────────────────────────────────

# Customer's changelog: 項番 / 発行日 / バージョン / 担当者 / 変更内容 / 確認者 / 承認者
CHL_COLS = [
    (_col("A"),  _col("A"),  "項番"),
    (_col("B"),  _col("E"),  "発行日"),
    (_col("F"),  _col("H"),  "バージョン"),
    (_col("I"),  _col("N"),  "担当者"),
    (_col("O"),  _col("V"),  "変更内容"),
    (_col("W"),  _col("AB"), "確認者"),
    (_col("AC"), _col("AH"), "承認者"),
]


def write_changelog(wb, doc: Document) -> None:
    ws = wb.create_sheet("変更履歴")
    ws.sheet_format.defaultColWidth = 3.33
    # Narrow uniform columns (3.33) so the merged label/value cells line up
    # consistently with the rest of the workbook's content sheets. Column A
    # is wider (8) so the 項番 (No) column reads comfortably without merging.
    _set_col_widths(ws, max_col=34, width=3.33)
    ws.column_dimensions["A"].width = 8.0

    # Header row
    ws.row_dimensions[1].height = 22.5
    for sc, ec, label in CHL_COLS:
        _mwrite(ws, sc, ec, 1, label,
                fill=_fill(HEADER_BLUE),
                font=_font(bold=True),
                align=_align(h="center"))

    # The MD table uses old keys (No., 版数). Map them onto customer keys.
    KEY_MAP = {
        "項番": ("No.", "項番"),
        "発行日": ("発行日",),
        "バージョン": ("版数", "バージョン"),
        "担当者": ("担当者",),
        "変更内容": ("変更内容",),
        "確認者": ("確認者",),
        "承認者": ("承認者",),
    }

    for i, row in enumerate(doc.changelog, start=2):
        ws.row_dimensions[i].height = 22.5
        for (sc, ec, label) in CHL_COLS:
            keys = KEY_MAP.get(label, (label,))
            value = ""
            for k in keys:
                if k in row and row[k]:
                    value = row[k]
                    break
            align = _align(h="left") if label == "変更内容" else _align(h="center")
            # 項番 is genuinely numeric — coerce to int so Excel doesn't flag
            # "Number stored as text". Versions like '1.0' stay as strings
            # because they're version labels, not numbers (覚えておく:
            # `_num('1.0')` returns 1.0 as float — explicit guard skips that).
            if label == "項番":
                value = _num(value)
            _mwrite(ws, sc, ec, i, value,
                    font=_font(),
                    align=align)


# ─── Sheet: 概要 ────────────────────────────────────────────────────────────

def _section_title(ws, row: int, text: str, col_start: str = "B",
                   col_end: str = "AK", height: float = 19.5) -> None:
    ws.row_dimensions[row].height = height
    sc, ec = _col(col_start), _col(col_end)
    if sc != ec:
        ws.merge_cells(f"{col_start}{row}:{col_end}{row}")
    cell = ws[f"{col_start}{row}"]
    cell.value = text
    cell.font = _font(bold=True)
    cell.alignment = _align()


def write_overview(wb, doc: Document) -> None:
    ws = wb.create_sheet("概要")
    ws.sheet_format.defaultColWidth = 12.63
    _set_col_widths(ws, max_col=37, width=4.25)

    _write_meta_header(ws, doc, "概要")

    row = 4
    ws.row_dimensions[row].height = 15.0  # blank spacer

    # 1. システム概要
    row += 1
    _section_title(ws, row, "1.システム概要")
    for line in doc.sys_lines:
        row += 1
        ws.row_dimensions[row].height = 19.5
        ws.merge_cells(f"C{row}:AK{row}")
        c = ws[f"C{row}"]
        c.value = line
        c.font = _font()
        c.alignment = _align()

    row += 1
    ws.row_dimensions[row].height = 15.0

    # 2. 資料目的 — yellow highlight, bold
    row += 1
    _section_title(ws, row, "2.資料目的")
    for line in doc.purpose_lines:
        row += 1
        ws.row_dimensions[row].height = 19.5
        ws.merge_cells(f"C{row}:AK{row}")
        c = ws[f"C{row}"]
        c.value = line
        c.font = _font(bold=True)
        c.fill = _fill(HIGHLIGHT)
        c.alignment = _align()

    row += 1
    ws.row_dimensions[row].height = 15.0

    # 3. 関連資料
    row += 1
    _section_title(ws, row, "3.関連資料")

    row += 1
    ws.row_dimensions[row].height = 15.0

    REL_COLS = [
        (_col("C"), _col("C"),  "No"),
        (_col("D"), _col("N"),  "資料コード"),
        (_col("O"), _col("AG"), "資料名"),
    ]
    row += 1
    ws.row_dimensions[row].height = 22.5
    for sc, ec, label in REL_COLS:
        _mwrite(ws, sc, ec, row, label,
                fill=_fill(HEADER_BLUE),
                font=_font(bold=True),
                align=_align(h="center"))

    rows_to_write = doc.related_docs if doc.related_docs else [RelatedDoc()]
    for i, rd in enumerate(rows_to_write, start=1):
        row += 1
        ws.row_dimensions[row].height = 22.5
        _mwrite(ws, _col("C"), _col("C"), row,
                i if doc.related_docs else "",   # int — avoid text-as-number warning
                font=_font(),
                align=_align(h="center"))
        _mwrite(ws, _col("D"), _col("N"), row, rd.code,
                font=_font(),
                align=_align(h="left"))
        _mwrite(ws, _col("O"), _col("AG"), row, rd.name,
                font=_font(),
                align=_align(h="left"))


# ─── Sheet: 機能 (main testcase data) ──────────────────────────────────────

# Column ranges (matches audited customer Excel)
COL_NUM       = (_col("A"),  _col("A"))   # #
COL_REQ       = (_col("B"),  _col("D"))   # 要件ID
COL_DESC      = (_col("E"),  _col("I"))   # 説明
COL_PRE       = (_col("J"),  _col("P"))   # 前提条件
COL_STEPS     = (_col("Q"),  _col("W"))   # ステップ／手順
COL_EXPECTED  = (_col("X"),  _col("AD"))  # 期待結果／アウトプット
COL_TYPE      = (_col("AE"), _col("AF"))  # 種類

COL_R1_RESULT = (_col("AG"), _col("AI"))
COL_R1_ACTUAL = (_col("AJ"), _col("AL"))
COL_R1_OWNER  = (_col("AM"), _col("AO"))
COL_R1_DATE   = (_col("AP"), _col("AR"))
COL_R1_BUG    = (_col("AS"), _col("AU"))

COL_R2_RESULT = (_col("AV"), _col("AX"))
COL_R2_ACTUAL = (_col("AY"), _col("BA"))
COL_R2_OWNER  = (_col("BB"), _col("BD"))
COL_R2_DATE   = (_col("BE"), _col("BG"))
COL_R2_BUG    = (_col("BH"), _col("BJ"))

COL_REMARKS   = (_col("BK"), _col("BQ"))   # 備考 spans 7 cols (matches customer merge BK:BQ)

R1_RANGE = (COL_R1_RESULT[0], COL_R1_BUG[1])     # AG..AU
R2_RANGE = (COL_R2_RESULT[0], COL_R2_BUG[1])     # AV..BJ
RESULT_SUBS = [
    ("結果",                COL_R1_RESULT, COL_R2_RESULT),
    ("実績／\nアウトプット", COL_R1_ACTUAL, COL_R2_ACTUAL),
    ("担当者",              COL_R1_OWNER,  COL_R2_OWNER),
    ("確認日付\n（MM/DD）", COL_R1_DATE,   COL_R2_DATE),
    ("バグID",              COL_R1_BUG,    COL_R2_BUG),
]

LAST_COL = COL_REMARKS[1]   # BQ (column 69)
DATA_START_ROW = 12

# Column width (in Excel char-units) for 機能 + Viewpoint sheets. Auto row
# height calculations multiply this by the number of cells in a merge to
# estimate how many visual lines the wrapped content needs.
_KINOU_WIDTH = 4.0


def _write_kinou_meta_block(ws, doc: Document) -> None:
    """4-row metadata block shared by 機能 and Viewpoint sheets (rows 1-4).

    Customer layout (matches the template both sheets follow verbatim):
      R1: A:E=テストレベル | F:Q=value || R:V=機能／モジュール | W:AH=screen ref
      R2: A:E=作成者       | F:Q=value || R:V=作成日           | W:AH=date
      R3: A:E=確認者       | F:Q=value || R:V=確認日           | W:AH=(empty)
      R4: A:E=テスト環境   | F:AH=value (single-line, no right pair)
    """
    feature_label = (
        f'{doc.meta.get("screen_id", "")}_{doc.meta.get("screen_name", "")}'
        .strip("_")
    )
    issue_date = _format_date(doc.meta.get("issue_date", ""))

    LBL = (_col("A"),  _col("E"))    # left label
    LV  = (_col("F"),  _col("Q"))    # left value
    RBL = (_col("R"),  _col("V"))    # right label
    RV  = (_col("W"),  _col("AH"))   # right value
    LV4 = (_col("F"),  _col("AH"))   # row 4 spans full right side

    rows = [
        # (left_label, left_value, right_label, right_value)
        ("テストレベル", doc.meta.get("test_level", ""),
         "機能／モジュール", feature_label),
        ("作成者",       doc.meta.get("author", ""),
         "作成日",         issue_date),
        ("確認者",       doc.meta.get("reviewer", ""),
         "確認日",         ""),
        ("テスト環境",   doc.meta.get("test_environment", ""),
         None,            None),  # row 4 — value spans full right side
    ]
    for i, (ll, lv, rl, rv) in enumerate(rows, start=1):
        ws.row_dimensions[i].height = 22.5
        _mwrite(ws, LBL[0], LBL[1], i, ll,
                fill=_fill(LIGHT_BLUE),
                font=_font(bold=True),
                align=_align(h="center"))
        if rl is None:
            # Single value spans F:AH on row 4
            _mwrite(ws, LV4[0], LV4[1], i, lv,
                    font=_font(), align=_align(h="left"))
        else:
            _mwrite(ws, LV[0], LV[1], i, lv,
                    font=_font(), align=_align(h="left"))
            _mwrite(ws, RBL[0], RBL[1], i, rl,
                    fill=_fill(LIGHT_BLUE),
                    font=_font(bold=True),
                    align=_align(h="center"))
            fmt = "@" if rl in ("作成日", "確認日") else None
            _mwrite(ws, RV[0], RV[1], i, rv,
                    font=_font(),
                    align=_align(h="left"),
                    number_format=fmt)


def write_kinou_sheet(wb, doc: Document) -> None:
    ws = wb.create_sheet("機能")
    ws.sheet_format.defaultColWidth = 12.63
    # Extend to col BQ (69) — the customer's 備考 merge is BK:BQ, 7 cols wide.
    _set_col_widths(ws, max_col=69, width=_KINOU_WIDTH)

    # ── Rows 1-4: project / environment metadata ────────────────────────
    _write_kinou_meta_block(ws, doc)

    # ── Rows 5-8: stats grid (matches customer template exactly) ────────
    # Row 5  (top labels)         : A:S = 分類            | T:AH = テスト結果
    # Row 6  (sub-headers)        : A:G = 回目 | H:J 正常 | K:M 異常 | N:P 境界値 | Q:S 合計 |
    #                               T:V 合格 | W:Y 不合格 | Z:AB 未テスト | AC:AE N/A | AF:AH 合計
    # Row 7  (1回目 counters)     : A:G = 1回目 | COUNTIFs over 種類 (AE:AF) and 1回目 result (AG:AI)
    # Row 8  (2回目 counters)     : A:G = 2回目 | COUNTIFs over 種類 (AE:AF) and 2回目 result (AV:AX)
    # All cells end at column AH — no extra 進捗 column (customer uses 合計 = SUM(T:AE)).
    ws.row_dimensions[5].height = 22.5
    ws.row_dimensions[6].height = 22.5

    _mwrite(ws, _col("A"), _col("S"),  5, "分類",
            fill=_fill(LIGHT_BLUE), font=_font(bold=True), align=_align(h="center"))
    _mwrite(ws, _col("T"), _col("AH"), 5, "テスト結果",
            fill=_fill(LIGHT_BLUE), font=_font(bold=True), align=_align(h="center"))

    # Row 6 sub-headers (no vertical merging — customer uses single-row)
    for sc, ec, label in [
        (_col("A"),  _col("G"),  "回目"),
        (_col("H"),  _col("J"),  "正常"),
        (_col("K"),  _col("M"),  "異常"),
        (_col("N"),  _col("P"),  "境界値"),
        (_col("Q"),  _col("S"),  "合計"),
        (_col("T"),  _col("V"),  "合格"),
        (_col("W"),  _col("Y"),  "不合格"),
        (_col("Z"),  _col("AB"), "未テスト"),
        (_col("AC"), _col("AE"), "N/A"),
        (_col("AF"), _col("AH"), "合計"),
    ]:
        _mwrite(ws, sc, ec, 6, label,
                fill=_fill(LIGHT_BLUE), font=_font(bold=True), align=_align(h="center"))

    # Defensive end row — matches customer's 1049 buffer so adding test cases
    # later doesn't require touching the formulas.
    type_col = _letter(COL_TYPE[0])      # AE
    type_col_end = _letter(COL_TYPE[1])  # AF (種類 is merged AE:AF)
    r1_col = _letter(COL_R1_RESULT[0])   # AG
    r1_col_end = _letter(COL_R1_RESULT[1])  # AI (結果 1回目 merged AG:AI)
    r2_col = _letter(COL_R2_RESULT[0])   # AV
    r2_col_end = _letter(COL_R2_RESULT[1])  # AX (結果 2回目 merged AV:AX)
    REF_END = 1049
    rng_type = f"${type_col}${DATA_START_ROW}:${type_col_end}${REF_END}"
    rng_r1 = f"${r1_col}${DATA_START_ROW}:${r1_col_end}${REF_END}"
    rng_r2 = f"${r2_col}${DATA_START_ROW}:${r2_col_end}${REF_END}"

    # Rows 7 / 8: counters. Mirrors customer's formula style — references the
    # row-6 label cell (T$6, W$6, Z$6, AC$6) so result counters self-document.
    for round_label, row, rng_round in [("1回目", 7, rng_r1), ("2回目", 8, rng_r2)]:
        ws.row_dimensions[row].height = 22.5
        _mwrite(ws, _col("A"), _col("G"), row, round_label,
                fill=_fill(LIGHT_BLUE), font=_font(bold=True), align=_align(h="center"))
        _mwrite(ws, _col("H"), _col("J"), row, f'=COUNTIF({rng_type},"N")',
                font=_font(), align=_align(h="center"))
        _mwrite(ws, _col("K"), _col("M"), row, f'=COUNTIF({rng_type},"A")',
                font=_font(), align=_align(h="center"))
        _mwrite(ws, _col("N"), _col("P"), row, f'=COUNTIF({rng_type},"B")',
                font=_font(), align=_align(h="center"))
        _mwrite(ws, _col("Q"), _col("S"), row, f"=SUM(H{row}:P{row})",
                font=_font(bold=True), align=_align(h="center"))
        _mwrite(ws, _col("T"), _col("V"), row, f'=COUNTIF({rng_round},T$6)',
                font=_font(), align=_align(h="center"))
        _mwrite(ws, _col("W"), _col("Y"), row, f'=COUNTIF({rng_round},W$6)',
                font=_font(), align=_align(h="center"))
        _mwrite(ws, _col("Z"), _col("AB"), row, f'=COUNTIF({rng_round},Z$6)',
                font=_font(), align=_align(h="center"))
        _mwrite(ws, _col("AC"), _col("AE"), row, f'=COUNTIF({rng_round},AC$6)',
                font=_font(), align=_align(h="center"))
        _mwrite(ws, _col("AF"), _col("AH"), row, f"=SUM(T{row}:AE{row})",
                font=_font(bold=True), align=_align(h="center"))

    # Spacer row 9
    ws.row_dimensions[9].height = 12.75

    # ── Rows 10-11: column headers + sub-headers ─────────────────────────
    ws.row_dimensions[10].height = 36.0
    ws.row_dimensions[11].height = 36.0

    # Customer uses LIGHT_BLUE (FFDEEAF6) consistently for both top headers
    # and sub-headers in 機能 and Viewpoint — matches their visual style.
    def _hdr(rng, row, value, row_end=None, fill=LIGHT_BLUE):
        _mwrite(ws, rng[0], rng[1], row, value, row_end=row_end,
                fill=_fill(fill), font=_font(bold=True), align=_align(h="center"))

    _hdr(COL_NUM,      10, "#",                    row_end=11)
    _hdr(COL_REQ,      10, "要件ID",                row_end=11)
    _hdr(COL_DESC,     10, "説明",                  row_end=11)
    _hdr(COL_PRE,      10, "前提条件",              row_end=11)
    _hdr(COL_STEPS,    10, "ステップ／手順",         row_end=11)
    _hdr(COL_EXPECTED, 10, "期待結果／アウトプット", row_end=11)
    _hdr(COL_TYPE,     10, "種類",                  row_end=11)
    _hdr(R1_RANGE,     10, "テスト1回目の結果")
    _hdr(R2_RANGE,     10, "テスト2回目の結果")
    _hdr(COL_REMARKS,  10, "備考",                  row_end=11)

    # Row 11 sub-headers under R1/R2 — also LIGHT_BLUE
    for label, r1_rng, r2_rng in RESULT_SUBS:
        _hdr(r1_rng, 11, label)
        _hdr(r2_rng, 11, label)

    # ── Data rows ────────────────────────────────────────────────────────
    # Track section-header rows so we can exclude them from data-validation
    # ranges (only TC rows accept dropdown values).
    section_header_rows: list[int] = []
    tc_rows: list[int] = []

    row = DATA_START_ROW
    seq = 0
    for sec in doc.sections:
        # Section header row — single merged cell A:BQ with SUB_HEADER fill
        ws.row_dimensions[row].height = 22.5
        _mwrite(ws, _col("A"), LAST_COL, row, sec.title,
                fill=_fill(SUB_HEADER),
                font=_font(bold=True),
                align=_align(h="left", v="center"))
        section_header_rows.append(row)
        row += 1
        for tc in sec.cases:
            seq += 1
            _write_tc_row(ws, row, tc, seq)
            tc_rows.append(row)
            row += 1

    # ── Data validations (matches customer template) ────────────────────
    _attach_data_validations(ws, tc_rows)


def _row_ranges(rows: list[int]) -> list[tuple[int, int]]:
    """Compress a sorted list of row numbers into contiguous (start, end) ranges."""
    if not rows:
        return []
    out: list[tuple[int, int]] = []
    start = end = rows[0]
    for r in rows[1:]:
        if r == end + 1:
            end = r
        else:
            out.append((start, end))
            start = end = r
    out.append((start, end))
    return out


def _attach_data_validations(ws, tc_rows: list[int]) -> None:
    """Attach the customer's three data-validation lists to TC rows.

    - 種類 (AE)              → "N,A,B"
    - 1回目 結果 (AG)        → "合格,不合格,未テスト,N/A"
    - 2回目 結果 (AV)        → "合格,不合格,未テスト,N/A"
    """
    from openpyxl.worksheet.datavalidation import DataValidation

    if not tc_rows:
        return
    ranges = _row_ranges(tc_rows)
    type_col = _letter(COL_TYPE[0])     # AE
    r1_col   = _letter(COL_R1_RESULT[0])  # AG
    r2_col   = _letter(COL_R2_RESULT[0])  # AV

    def _add(formula: str, col_letter: str) -> None:
        dv = DataValidation(type="list", formula1=formula, allow_blank=True)
        for start, end in ranges:
            dv.add(f"{col_letter}{start}:{col_letter}{end}")
        ws.add_data_validation(dv)

    _add('"N,A,B"', type_col)
    _add('"合格,不合格,未テスト,N/A"', r1_col)
    _add('"合格,不合格,未テスト,N/A"', r2_col)

    # テストレベル dropdown on metadata row 1 (F1) — matches customer.
    from openpyxl.worksheet.datavalidation import DataValidation
    dv_level = DataValidation(type="list",
                              formula1='"単体テスト,結合テスト,システムテスト"',
                              allow_blank=True)
    dv_level.add("F1")
    ws.add_data_validation(dv_level)


def _visual_lines(text: str, chars_per_line: float) -> int:
    """Approximate the number of visual lines a wrapped cell consumes.

    `chars_per_line` is the cell's effective width in monospaced ASCII chars
    (Excel column width × column count). CJK characters count as ~2 chars
    because they're double-width in most fonts.
    """
    if not text:
        return 1
    total = 0
    for line in text.split("\n"):
        # Sum effective char width — CJK doubles, ASCII counts as 1.
        eff = sum(2 if ord(c) >= 0x2E80 else 1 for c in line)
        total += max(1, math.ceil(eff / max(1.0, chars_per_line)))
    return total


def _compute_row_height(cells: list[tuple[float, str]],
                        line_pt: float = 16.0,
                        min_pt: float = 30.0,
                        max_pt: float = 450.0) -> float:
    """cells = [(chars_per_line, text), …]. Returns row height in points
    sized to fit the cell that needs the most visual lines."""
    if not cells:
        return min_pt
    lines = max(_visual_lines(t, w) for w, t in cells)
    return max(min_pt, min(max_pt, lines * line_pt))


def _row_height_for(text: str) -> float:
    """Legacy single-cell helper kept for callers that don't track widths.

    Prefer _compute_row_height for accurate sizing — this only counts hard
    line breaks in the text, not soft wrapping.
    """
    if not text:
        return 18.0
    lines = text.count("\n") + 1
    return max(30.0, min(450.0, lines * 18.0))


# Bold-prefix detector — matches ``ステップN：``, ``ステップN:`` (legacy
# half-width), ``補足：`` and the legacy ``全体:``. The full-width colon
# `：` is the canonical form per gen-testcase-doc SKILL; half-width is
# accepted for backward compat with older markdown.
_STEP_PREFIX_RE = re.compile(r"^(ステップ\d+[：:]|補足[：:]|全体[：:])\s?(.*)$")


def _bold_step_prefix(text: str) -> "CellRichText | str":
    """Return a CellRichText that bolds ``ステップN：`` / ``補足：`` line
    prefixes; returns the input string unchanged if no prefix is found.

    Used for the 手順 and 期待結果 cells so the customer's reviewer can
    scan the step boundaries at a glance — bold prefix + plain action.

    Implementation note — line breaks: a standalone ``\\n`` TextBlock
    isn't reliably rendered as a hard line break by Excel readers
    (openpyxl serialises it as a run whose only content is whitespace,
    and some readers collapse it). To stay safe, every ``\\n`` is
    APPENDED to a non-empty TextBlock's text — never a standalone block.
    Blank lines (rendered as an empty string in the input) merge their
    ``\\n`` into the previous TextBlock too.
    """
    if not text:
        return text
    lines = text.split("\n")
    if not any(_STEP_PREFIX_RE.match(ln) for ln in lines):
        return text
    plain = InlineFont(rFont="メイリオ", sz=10)
    bold = InlineFont(rFont="メイリオ", sz=10, b=True)
    parts: list[TextBlock] = []
    last_line = len(lines) - 1
    for idx, ln in enumerate(lines):
        suffix = "\n" if idx < last_line else ""
        if ln == "":
            # Blank line: merge \n into the previous block's text instead
            # of emitting a standalone newline TextBlock.
            if parts and suffix:
                last = parts[-1]
                parts[-1] = TextBlock(last.font, last.text + suffix)
            continue
        m = _STEP_PREFIX_RE.match(ln)
        if m:
            prefix = m.group(1)
            rest = m.group(2)
            if rest:
                parts.append(TextBlock(bold, prefix))
                parts.append(TextBlock(plain, " " + rest + suffix))
            else:
                # Bold prefix alone on its line — suffix attached to bold
                # block so the line break lives inside a non-empty run.
                parts.append(TextBlock(bold, prefix + suffix))
        else:
            parts.append(TextBlock(plain, ln + suffix))
    return CellRichText(*parts)


def _write_tc_row(ws, row: int, tc: TestCase, seq: int) -> None:
    steps_text = _strip_markdown_list_markers(tc.steps)
    expected_text = _strip_markdown_list_markers(tc.expected)
    pre_text = tc.precondition or ""
    desc_text = tc.desc or ""
    remarks_text = tc.remarks or ""

    # Auto-size row height: each cell knows its merged-column width × column-
    # count so we can estimate how many visual lines text wraps into. The
    # row takes the max across all cells so nothing is clipped.
    # Column width is _KINOU_WIDTH (set on the sheet); col counts come from
    # the COL_* tuple sizes.
    cw = _KINOU_WIDTH
    # 要件ID column = the testcase code from the H2 heading (e.g.
    # `ACSMS-TC-005-001`). Per the gen-testcase-doc skill convention the
    # H2 heading is the single source of truth — but we still honour an
    # explicit `- **要件ID**:` field when the legacy md format is in use.
    req_id = tc.requirement_id or tc.tc_id
    cells = [
        (cw * (COL_REQ[1]      - COL_REQ[0]      + 1), req_id),
        (cw * (COL_DESC[1]     - COL_DESC[0]     + 1), desc_text),
        (cw * (COL_PRE[1]      - COL_PRE[0]      + 1), pre_text),
        (cw * (COL_STEPS[1]    - COL_STEPS[0]    + 1), steps_text),
        (cw * (COL_EXPECTED[1] - COL_EXPECTED[0] + 1), expected_text),
        (cw * (COL_REMARKS[1]  - COL_REMARKS[0]  + 1), remarks_text),
    ]
    ws.row_dimensions[row].height = _compute_row_height(cells)

    align_top = _align(h="left", v="top", wrap=True)
    align_top_center = _align(h="center", v="top", wrap=True)

    # Static sequence number — `=ROW()-11` produced gaps because section-header
    # rows (interleaved between sections) inflate the offset. Numbering must be
    # 1..N over only TC rows.
    _mwrite(ws, COL_NUM[0], COL_NUM[1], row, seq,
            font=_font(), align=align_top_center)
    _mwrite(ws, COL_REQ[0], COL_REQ[1], row, req_id,
            font=_font(), align=align_top)
    _mwrite(ws, COL_DESC[0], COL_DESC[1], row, desc_text,
            font=_font(), align=align_top)
    _mwrite(ws, COL_PRE[0], COL_PRE[1], row, pre_text,
            font=_font(), align=align_top)
    _mwrite(ws, COL_STEPS[0], COL_STEPS[1], row, _bold_step_prefix(steps_text),
            font=_font(), align=align_top)
    _mwrite(ws, COL_EXPECTED[0], COL_EXPECTED[1], row, _bold_step_prefix(expected_text),
            font=_font(), align=align_top)
    _mwrite(ws, COL_TYPE[0], COL_TYPE[1], row, tc.type_,
            font=_font(), align=align_top_center)

    for _, r1, r2 in RESULT_SUBS:
        _mwrite(ws, r1[0], r1[1], row, "", font=_font(), align=align_top_center)
        _mwrite(ws, r2[0], r2[1], row, "", font=_font(), align=align_top_center)

    _mwrite(ws, COL_REMARKS[0], COL_REMARKS[1], row, remarks_text,
            font=_font(), align=align_top)


# ─── Sheet: テスト報告書 ──────────────────────────────────────────────────

def write_test_report(wb, doc: Document) -> None:
    """テスト報告書 — title + project info + 2-round summary block.

    Mirrors customer template: each round has 2 data rows (additional 機能
    can be added) followed by a 合計 row that SUMs them. Stats values are
    pulled from the 機能 sheet's stats grid (rows 7/8) via INDIRECT, so
    when the operator adds testcases and the 機能 COUNTIFs update, this
    sheet updates automatically — no manual recount.
    """
    ws = wb.create_sheet("テスト報告書")
    ws.sheet_format.defaultColWidth = 5.0
    # Uniform 5.0 columns so merged label/value bands line up consistently.
    # Column A is widened to 13 because it carries section labels
    # (テスト1回目 / テスト2回目) and the # column header.
    _set_col_widths(ws, max_col=34, width=5.0)
    ws.column_dimensions["A"].width = 13.0

    # ── Row 1: title ─────────────────────────────────────────────────────
    ws.row_dimensions[1].height = 28.5
    _mwrite(ws, _col("A"), _col("AH"), 1,
            "<単体/結合/システム> テスト報告書",
            fill=_fill(HEADER_BLUE),
            font=_font(bold=True, size=14),
            align=_align(h="center"))

    # ── Rows 3-4: project info (4-cell layout matches customer) ─────────
    project_name = doc.meta.get("system_name", "")
    pm = doc.meta.get("reviewer", "")
    author = doc.meta.get("author", "")
    issue_date = _format_date(doc.meta.get("issue_date", ""))

    def _kv_pair(row: int, l1: str, v1: str, l2: str, v2: str,
                 v2_text_format: bool = False) -> None:
        ws.row_dimensions[row].height = 22.5
        _mwrite(ws, _col("A"), _col("F"), row, l1,
                fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="left"))
        _mwrite(ws, _col("G"), _col("O"), row, v1,
                font=_font(), align=_align(h="left"))
        _mwrite(ws, _col("P"), _col("W"), row, l2,
                fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="left"))
        _mwrite(ws, _col("X"), _col("AH"), row, v2,
                font=_font(), align=_align(h="left"),
                number_format="@" if v2_text_format else None)

    _kv_pair(3, "プロジェクト名", project_name, "プロジェクトマネージャ", pm)
    _kv_pair(4, "担当者",         author,       "作成日",                issue_date,
             v2_text_format=True)

    # ── Rows 6-7: column header (2 rows with vertical merges where needed)
    # Row 6 spans (top headers):
    #   A:A=#  | B:G=機能名  | H:P=テストケース分類  | Q:S=合計  | T:AH=テスト結果
    # Row 7 sub-headers under テストケース分類 (H:J 正常, K:M 異常, N:P 境界)
    # and under テスト結果 (T:V 合格, W:Y 不合格, Z:AB 未テスト, AC:AE N/A,
    # AF:AH 進捗（%）). #/機能名/合計 vertically merge across 6+7.
    ws.row_dimensions[6].height = 22.5
    ws.row_dimensions[7].height = 22.5

    _mwrite(ws, _col("A"), _col("A"), 6, "#",          row_end=7,
            fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="center"))
    _mwrite(ws, _col("B"), _col("G"), 6, "機能名",      row_end=7,
            fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="center"))
    _mwrite(ws, _col("H"), _col("P"), 6, "テストケース分類",
            fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="center"))
    _mwrite(ws, _col("Q"), _col("S"), 6, "合計",        row_end=7,
            fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="center"))
    _mwrite(ws, _col("T"), _col("AH"), 6, "テスト結果",
            fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="center"))

    for sc, ec, lab in [
        (_col("H"),  _col("J"),  "正常"),
        (_col("K"),  _col("M"),  "異常"),
        (_col("N"),  _col("P"),  "境界"),
        (_col("T"),  _col("V"),  "合格"),
        (_col("W"),  _col("Y"),  "不合格"),
        (_col("Z"),  _col("AB"), "未テスト"),
        (_col("AC"), _col("AE"), "N/A"),
        (_col("AF"), _col("AH"), "進捗（%）"),
    ]:
        _mwrite(ws, sc, ec, 7, lab,
                fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="center"))

    # ── Round blocks ─────────────────────────────────────────────────────
    # Each round = 1 label row + 2 data rows + 1 合計 row.
    # Customer formulas:
    #   Data row N: pulls each metric from 機能!H{stats_row} via INDIRECT(B{N})
    #   Total row : SUM of the two data rows; 進捗 = (合格+不合格+N/A)/合計
    # stats_row = 7 for 1回目, 8 for 2回目 (matching 機能 sheet layout).
    def _round_block(label_row: int, label: str, stats_row: int) -> None:
        # Round label — single A-only cell (not merged across)
        ws.row_dimensions[label_row].height = 22.5
        _mwrite(ws, _col("A"), _col("A"), label_row, label,
                fill=_fill(LIGHT_BLUE),
                font=_font(bold=True),
                align=_align(h="left"))

        d1 = label_row + 1   # data row 1
        d2 = label_row + 2   # data row 2 (empty placeholder)
        tot = label_row + 3  # 合計 row

        # Helper to write a data row that pulls from 機能 stats via INDIRECT.
        def _write_data_row(r: int, num: int, sheet_value: str) -> None:
            ws.row_dimensions[r].height = 22.5
            _mwrite(ws, _col("A"), _col("A"), r, num,
                    font=_font(), align=_align(h="center"))
            _mwrite(ws, _col("B"), _col("G"), r, sheet_value,
                    font=_font(), align=_align(h="left"))
            for col_pair, source_col in [
                (("H",  "J"),  "H"),
                (("K",  "M"),  "K"),
                (("N",  "P"),  "N"),
                (("Q",  "S"),  "Q"),
                (("T",  "V"),  "T"),
                (("W",  "Y"),  "W"),
                (("Z",  "AB"), "Z"),
                (("AC", "AE"), "AC"),
            ]:
                if sheet_value:
                    formula = (
                        f'=INDIRECT("\'"&$B{r}&"\'!{source_col}{stats_row}",TRUE)'
                    )
                else:
                    formula = ""
                _mwrite(ws, _col(col_pair[0]), _col(col_pair[1]), r, formula,
                        font=_font(), align=_align(h="center"))
            # 進捗 = (合格 + 不合格 + N/A) / 合計  — matches customer
            progress = f"=IFERROR((T{r}+W{r}+AC{r})/Q{r},0)" if sheet_value else ""
            _mwrite(ws, _col("AF"), _col("AH"), r, progress,
                    font=_font(), align=_align(h="center"),
                    number_format="0.0%")

        _write_data_row(d1, 1, "機能")
        _write_data_row(d2, 2, "")    # second slot left blank — operator can add another sheet name

        # Total row — SUM the two data rows above + recompute 進捗
        ws.row_dimensions[tot].height = 22.5
        _mwrite(ws, _col("A"), _col("A"), tot, "",
                font=_font(), align=_align(h="center"))
        _mwrite(ws, _col("B"), _col("G"), tot, "合計",
                fill=_fill(SUB_HEADER),
                font=_font(bold=True), align=_align(h="center"))
        for col_pair in [
            ("H",  "J"),  ("K",  "M"),  ("N",  "P"),  ("Q",  "S"),
            ("T",  "V"),  ("W",  "Y"),  ("Z",  "AB"), ("AC", "AE"),
        ]:
            sc_letter = col_pair[0]
            ec_letter = col_pair[1]
            _mwrite(ws, _col(sc_letter), _col(ec_letter), tot,
                    f"=SUM({sc_letter}{d1}:{ec_letter}{d2})",
                    font=_font(bold=True), align=_align(h="center"))
        _mwrite(ws, _col("AF"), _col("AH"), tot,
                f"=IFERROR((T{tot}+W{tot}+AC{tot})/Q{tot},0)",
                font=_font(bold=True), align=_align(h="center"),
                number_format="0.0%")

    # 1回目 occupies rows 8 (label) / 9-10 (data) / 11 (合計).
    # 2回目 occupies rows 12 (label) / 13-14 (data) / 15 (合計).
    _round_block(label_row=8,  label="テスト1回目", stats_row=7)
    _round_block(label_row=12, label="テスト2回目", stats_row=8)


# ─── Sheet: Viewpoint ──────────────────────────────────────────────────────

def write_viewpoint(wb, doc: Document, viewpoints: list[Viewpoint]) -> None:
    """テスト観点 — system-wide test strategy overview.

    Renders the 37 viewpoints from the canonical doc
    (docs/design/common/testcase-viewpoints.md) as a strategy table.
    Senior reviewers read this first to understand coverage breadth before
    diving into 機能 sheet TC details.

    If `viewpoints` is empty (common file missing), the sheet still renders
    with VTI metadata header + empty table — the operator can fill in by
    hand or rerun once the strategy doc lands.
    """
    ws = wb.create_sheet("テスト観点")
    ws.sheet_format.defaultColWidth = 12.63
    _set_col_widths(ws, max_col=37, width=4.25)

    # VTI metadata header rows 1-3 — same shape as 概要 sheet.
    _write_meta_header(ws, doc, "テスト観点")

    # Section title
    row = 5
    _section_title(ws, row, "1. テスト観点一覧", col_start="B", col_end="AK")

    row += 2  # one blank spacer row before the table

    # Table column layout — fits cleanly in A:AK with proportional widths.
    VP_COLS = [
        (_col("B"),  _col("B"),  "#"),
        (_col("C"),  _col("E"),  "観点ID"),
        (_col("F"),  _col("L"),  "大分類"),
        (_col("M"),  _col("T"),  "観点名"),
        (_col("U"),  _col("V"),  "リスク"),
        (_col("W"),  _col("AC"), "対象画面範囲"),
        (_col("AD"), _col("AF"), "TC見積"),
    ]
    ws.row_dimensions[row].height = 28.5
    for sc, ec, label in VP_COLS:
        _mwrite(ws, sc, ec, row, label,
                fill=_fill(LIGHT_BLUE),
                font=_font(bold=True),
                align=_align(h="center"))

    # Data rows — one per viewpoint
    seq = 0
    for vp in viewpoints:
        row += 1
        seq += 1
        cw = 4.25
        cells = [
            (cw * 3, vp.id),
            (cw * 7, vp.category),
            (cw * 8, vp.name),
            (cw * 2, vp.risk),
            (cw * 7, vp.scope),
            (cw * 3, vp.tc_estimate),
        ]
        ws.row_dimensions[row].height = _compute_row_height(cells, line_pt=18.0)

        align_left = _align(h="left", v="top", wrap=True)
        align_center = _align(h="center", v="top", wrap=True)

        _mwrite(ws, _col("B"), _col("B"), row, seq,
                font=_font(), align=align_center)
        _mwrite(ws, _col("C"), _col("E"), row, vp.id,
                font=_font(), align=align_center)
        _mwrite(ws, _col("F"), _col("L"), row, vp.category,
                font=_font(), align=align_left)
        _mwrite(ws, _col("M"), _col("T"), row, vp.name,
                font=_font(), align=align_left)
        # Risk cell — use semantic colours so 高 jumps out at reviewers
        risk_fill = None
        if vp.risk == "高":
            risk_fill = _fill("FFFFC7CE")   # light red
        elif vp.risk == "中":
            risk_fill = _fill("FFFFEB9C")   # light yellow
        elif vp.risk == "低":
            risk_fill = _fill("FFC6EFCE")   # light green
        _mwrite(ws, _col("U"), _col("V"), row, vp.risk,
                fill=risk_fill,
                font=_font(bold=True), align=align_center)
        _mwrite(ws, _col("W"), _col("AC"), row, vp.scope,
                font=_font(), align=align_left)
        # TC見積 — coerce to int when purely numeric
        _mwrite(ws, _col("AD"), _col("AF"), row, _num(vp.tc_estimate),
                font=_font(), align=align_center)

    # Total row
    if viewpoints:
        row += 1
        ws.row_dimensions[row].height = 22.5
        _mwrite(ws, _col("B"), _col("T"), row, "合計",
                fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="right"))
        _mwrite(ws, _col("U"), _col("V"), row, "",
                fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="center"))
        _mwrite(ws, _col("W"), _col("AC"), row, "",
                fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="center"))
        # Sum the TC見積 column
        first_data_row = row - len(viewpoints)
        _mwrite(ws, _col("AD"), _col("AF"), row,
                f"=SUM(AD{first_data_row}:AD{row - 1})",
                fill=_fill(SUB_HEADER), font=_font(bold=True), align=_align(h="center"))

    # ── 凡例 (Legend) — explain VP-{group}-{nn} naming convention ──
    # Customer's Japanese reviewer reads the table first; the prefix
    # A/B/C/D/E/F is meaningful (group classification by risk axis), but
    # without a legend they have to flip back to the strategy doc to
    # decode it. Embedding the legend keeps the Excel self-contained.
    if viewpoints:
        row += 2
        _write_viewpoint_legend(ws, row, viewpoints)


def _write_viewpoint_legend(ws, row: int, viewpoints: list[Viewpoint]) -> None:
    """Render the VP-{group}-{nn} naming convention legend block.

    Group descriptions are stable (defined in the testcase-viewpoints.md
    strategy doc), so we embed them here. Counts are derived from the
    actual viewpoint list so a doc revision with new VPs flows through
    without code change.
    """
    # Section title
    _section_title(ws, row, "2. 観点ID 命名規約・グループ凡例",
                   col_start="B", col_end="AK")
    row += 2

    # Header row
    LEGEND_COLS = [
        (_col("B"),  _col("C"),  "グループ"),
        (_col("D"),  _col("F"),  "接頭辞"),
        (_col("G"),  _col("L"),  "名称"),
        (_col("M"),  _col("N"),  "観点数"),
        (_col("O"),  _col("Q"),  "リスク傾向"),
        (_col("R"),  _col("AK"), "代表的なテスト観点"),
    ]
    ws.row_dimensions[row].height = 28.5
    for sc, ec, label in LEGEND_COLS:
        _mwrite(ws, sc, ec, row, label,
                fill=_fill(LIGHT_BLUE),
                font=_font(bold=True),
                align=_align(h="center"))

    # Stable group descriptions (kept in sync with testcase-viewpoints.md §3
    # group headings). Counts come from the runtime viewpoint list.
    GROUPS = [
        ("A", "VP-A-NN", "セキュリティ・権限",       "高",    "RBAC、DataScope、項目レベル制限、URL直接攻撃、セッション失効、XSS、CSRF、レート制限、アカウントロック、SQL注入"),
        ("B", "VP-B-NN", "データバリデーション",    "中",    "必須／長さ／形式／半角全角／日付／通貨／m_code／重複キー／IME・貼付ハンドリング"),
        ("C", "VP-C-NN", "業務ロジック",             "高",    "CRUD 永続化、同時編集競合、論理削除＋FK、税計算、購読者ルール、Excel 取込、レポート集計"),
        ("D", "VP-D-NN", "統合・システム",           "高",    "ログイン＋MFA、セッション管理、パスワード再発行、監査ログ、S3、メール、CSV 準拠、ネットワーク／500"),
        ("E", "VP-E-NN", "非機能・ユーザビリティ", "低〜中", "レイアウト、レスポンシブ、キーボード操作、ブラウザ互換、マルチタブ同期、未保存変更ガード"),
        ("F", "VP-F-NN", "性能",                     "中",    "性能ベンチマーク、大量データ表示性能"),
    ]
    # Count VPs per group dynamically from the runtime list
    group_counts: dict[str, int] = {}
    for vp in viewpoints:
        m = re.match(r"^VP-([A-F])-", vp.id)
        if m:
            group_counts[m.group(1)] = group_counts.get(m.group(1), 0) + 1

    align_left = _align(h="left", v="top", wrap=True)
    align_center = _align(h="center", v="top", wrap=True)

    for letter, prefix, name, risk_trend, examples in GROUPS:
        row += 1
        # Estimate height based on examples cell width (col R..AK = 20 cols × 4.25 width ≈ 85 chars/line)
        cw = 4.25
        cells = [(cw * 20, examples)]
        ws.row_dimensions[row].height = _compute_row_height(cells, line_pt=18.0)
        _mwrite(ws, _col("B"), _col("C"), row, letter,
                font=_font(bold=True), align=align_center)
        _mwrite(ws, _col("D"), _col("F"), row, prefix,
                font=_font(), align=align_center)
        _mwrite(ws, _col("G"), _col("L"), row, name,
                font=_font(), align=align_left)
        _mwrite(ws, _col("M"), _col("N"), row, group_counts.get(letter, 0),
                font=_font(), align=align_center)
        _mwrite(ws, _col("O"), _col("Q"), row, risk_trend,
                font=_font(), align=align_center)
        _mwrite(ws, _col("R"), _col("AK"), row, examples,
                font=_font(), align=align_left)

    # Naming convention note row
    row += 2
    note = (
        "命名規約：VP-{グループ記号}-{NN} 形式（NN はグループ内の2桁連番）。"
        "新規観点は同グループの末尾に追加する（例：VP-A-11）。"
        "グループ記号はリスク軸による分類で、JSTQB FL の品質特性区分に準拠する。"
    )
    ws.row_dimensions[row].height = _row_height_for(note)
    _mwrite(ws, _col("B"), _col("AK"), row, note,
            font=_font(italic=True), align=_align(h="left", v="top", wrap=True))


# ─── Output filename ────────────────────────────────────────────────────────

def _vti_filename(doc: Document) -> str:
    customer = doc.meta.get("customer_name", "")
    system = doc.meta.get("system_name", "")
    document = doc.meta.get("document_name", "")
    screen = doc.meta.get("screen_name", "")
    version = doc.meta.get("format_version", "1.0")
    if not (customer and system and document and screen):
        return ""
    return f"【{customer}】VTIジャパン_{system}_{document}_{screen}_v{version}.xlsx"


# ─── Main ───────────────────────────────────────────────────────────────────

def _find_default_viewpoints_path(input_path: Path) -> Path:
    """Locate the canonical strategy doc relative to the project root.

    Walk up from the input file until we find `docs/design/common/`. This
    keeps the script repo-agnostic — works no matter where the user runs
    it from.
    """
    cur = input_path.resolve().parent
    while cur != cur.parent:
        candidate = cur / "docs" / "design" / "common" / "testcase-viewpoints.md"
        if candidate.exists():
            return candidate
        cur = cur.parent
    # Fallback: project default
    return Path(__file__).resolve().parent.parent / "docs" / "design" / "common" / "testcase-viewpoints.md"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("input", type=Path, help="Input .md path")
    parser.add_argument("output", nargs="?", type=Path, default=None,
                        help="Output .xlsx path (default: VTI naming pattern next to input)")
    parser.add_argument("--author", default=None,
                        help="Override author shown in metadata")
    parser.add_argument("--viewpoints", type=Path, default=None,
                        help="Path to canonical viewpoints doc "
                             "(default: docs/design/common/testcase-viewpoints.md)")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"ERROR: input not found: {args.input}", file=sys.stderr)
        return 2

    text = args.input.read_text(encoding="utf-8")
    doc = parse_md(text)
    if args.author:
        doc.meta["author"] = args.author

    # Locate + parse the canonical viewpoints doc.
    vp_path = args.viewpoints or _find_default_viewpoints_path(args.input)
    viewpoints = parse_viewpoints_md(vp_path)
    if viewpoints:
        print(f"  Loaded viewpoints: {len(viewpoints)} from {vp_path}")
    else:
        print(f"  ⚠ Viewpoints file not found or empty: {vp_path}")
        print(f"  → テスト観点 sheet will render with table headers only.")

    if args.output:
        out = args.output
    else:
        fname = _vti_filename(doc)
        if not fname:
            fname = args.input.with_suffix(".xlsx").name
        out = args.input.parent / fname

    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # Build sheets in customer-canonical order
    write_cover(wb, doc)
    write_changelog(wb, doc)
    write_overview(wb, doc)
    write_test_report(wb, doc)
    write_viewpoint(wb, doc, viewpoints)
    write_kinou_sheet(wb, doc)

    out.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out)

    total = sum(len(s.cases) for s in doc.sections)
    print(f"✓ Wrote {out}")
    print(f"  Sheets: {wb.sheetnames}")
    print(f"  Sections: {len(doc.sections)}  Testcases: {total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
