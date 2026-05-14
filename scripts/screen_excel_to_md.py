"""
screen_excel_to_md.py — Convert screen-design Excel to lossless Markdown.

Embeds cell-coordinate anchors as HTML comments so the MD can be converted
back to Excel by `screen_md_to_excel.py` without losing format. The original
Excel acts as the format template; this MD carries only cell *values* +
coordinates.

Usage:
    python screen_excel_to_md.py <input.xlsx> [output.md]

Output (default):
    <excel_dir>/screen-design.md
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterable

import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet


# ──────────────────────────────────────────────────────────────────────────────
# Anchor syntax (kept minimal — must round-trip via screen_md_to_excel.py)
# ──────────────────────────────────────────────────────────────────────────────
#
#   <!--xl-sheet "Sheet Name"-->                # opens a sheet section
#   <!--xl B5-->VALUE                           # scalar cell write
#   <!--xl-table cols=B,C,G,K,...-->            # column map for following rows
#   <!--xl-row 11-->| v1 | v2 | v3 |            # data row; pipe-cells map 1:1
#                                                 to the cols= list
#   <!--xl-section "検索エリア" row=10-->       # section header rendered as ###
#
# Newlines inside a cell are encoded as the literal '<br>' (markdown-friendly)
# and decoded back to '\n' by the reverse converter.
# Pipe characters inside cells are escaped as '\|' inside table cells only.


# Sheets we render with rich layout. Order matches the Excel convention.
SHEET_ORDER = [
    "表紙",
    "変更履歴",
    "目次",
    "画面遷移",
    "画面イメージ",
    "画面項目定義",
    "機能定義",
    "メッセージ情報",
]


def _esc_cell(v) -> str:
    if v is None:
        return ""
    s = str(v)
    return s.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>").replace("|", "\\|")


def _esc_scalar(v) -> str:
    if v is None:
        return ""
    return str(v).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>")


def _build_merge_map(ws: Worksheet):
    """Return (origin_map, skip_set).

    origin_map[(r,c)] = value at the merge's top-left.
    skip_set         = cells that are NOT the merge top-left.
    """
    origin = {}
    skip = set()
    for mr in ws.merged_cells.ranges:
        v = ws.cell(mr.min_row, mr.min_col).value
        for r in range(mr.min_row, mr.max_row + 1):
            for c in range(mr.min_col, mr.max_col + 1):
                origin[(r, c)] = v
                if (r, c) != (mr.min_row, mr.min_col):
                    skip.add((r, c))
    return origin, skip


def _val(ws, r, c, origin):
    if (r, c) in origin:
        return origin[(r, c)]
    return ws.cell(r, c).value


def _row_anchor_cells(ws, row: int, cols: list[int], origin, skip) -> list[str]:
    """Read a row at given columns, return escaped cell strings."""
    out = []
    for c in cols:
        if (row, c) in skip:
            out.append("")
        else:
            out.append(_esc_cell(_val(ws, row, c, origin)))
    return out


def _data_bounds(ws, origin) -> tuple[int, int]:
    max_r = max_c = 0
    for r in range(1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            v = _val(ws, r, c, origin)
            if v is not None and str(v).strip():
                if r > max_r:
                    max_r = r
                if c > max_c:
                    max_c = c
    return max_r, max_c


def _section_merge_at(ws, row: int) -> bool:
    """True iff row has a wide merge starting at column B (section header)."""
    for mr in ws.merged_cells.ranges:
        if mr.min_row == row and mr.min_col == 2 and mr.max_col >= 30:
            return True
    return False


def _scalar_cell_line(cell_ref: str, value) -> str:
    """`<!--xl B5-->value` if non-empty, else empty string."""
    if value is None or str(value).strip() == "":
        return ""
    return f"<!--xl {cell_ref}-->{_esc_scalar(value)}"


# ──────────────────────────────────────────────────────────────────────────────
# Per-sheet converters
# ──────────────────────────────────────────────────────────────────────────────

def _render_doc_header(ws, origin, skip) -> list[str]:
    """Rows 1-3: 7-column document header (システム・アプリ名 etc.)."""
    out = ["<!--xl-header-->"]
    header_cells = [
        ("B1", "システム・アプリケーション名"),
        ("F1", "ドキュメント"),
        ("J1", "シート名"),
        ("M1", "作成日"),
        ("P1", "作成者"),
        ("U1", "更新日"),
        ("X1", "更新者"),
    ]
    value_cells = ["B2", "F2", "J2", "M2", "P2", "U2", "X2"]

    # Render header label row + value row as a 2-row MD table for readability.
    labels = []
    values = []
    for (label_ref, _), val_ref in zip(header_cells, value_cells):
        col_letter = "".join(ch for ch in label_ref if ch.isalpha())
        row = int("".join(ch for ch in label_ref if ch.isdigit()))
        col_idx = openpyxl.utils.column_index_from_string(col_letter)
        labels.append(_esc_cell(_val(ws, row, col_idx, origin)) or "")
        v_col = openpyxl.utils.column_index_from_string("".join(ch for ch in val_ref if ch.isalpha()))
        v_row = int("".join(ch for ch in val_ref if ch.isdigit()))
        values.append(_esc_cell(_val(ws, v_row, v_col, origin)) or "")

    out.append("| " + " | ".join(labels) + " |")
    out.append("| " + " | ".join(["---"] * len(labels)) + " |")
    out.append("<!--xl-row 2 cols=B,F,J,M,P,U,X-->| " + " | ".join(values) + " |")
    out.append("")
    return out


def _render_screen_meta(ws, origin) -> list[str]:
    """Rows 5-6: 画面ID / 画面名 / 概要 (5 sheets share this layout)."""
    out = []
    # B5: '画面ID' label;  J5: ACSMS-SCR-XXX value;  V5: '概要' label;  X5: summary
    sid_label = _val(ws, 5, 2, origin)
    sid_value = _val(ws, 5, 10, origin)
    sum_label = _val(ws, 5, 22, origin)
    sum_value = _val(ws, 5, 24, origin)
    sname_label = _val(ws, 6, 2, origin)
    sname_value = _val(ws, 6, 10, origin)

    out.append("| 画面ID | 値 | 概要 | 値 |")
    out.append("| --- | --- | --- | --- |")
    out.append(
        f"<!--xl-row 5 cols=B,J,V,X-->| "
        f"{_esc_cell(sid_label)} | {_esc_cell(sid_value)} | "
        f"{_esc_cell(sum_label)} | {_esc_cell(sum_value)} |"
    )
    out.append(
        f"<!--xl-row 6 cols=B,J-->| {_esc_cell(sname_label)} | {_esc_cell(sname_value)} |  |  |"
    )
    out.append("")
    return out


def render_cover(ws, origin, skip) -> list[str]:
    out = ["## 表紙", "", "<!--xl-sheet 表紙-->"]
    max_r, _ = _data_bounds(ws, origin)
    # Cover holds title text in column B-ish, scattered. Emit every non-empty
    # *origin* cell as `<!--xl REF-->value` so it round-trips exactly.
    for r in range(1, max_r + 1):
        for c in range(1, ws.max_column + 1):
            if (r, c) in skip:
                continue
            v = ws.cell(r, c).value
            if v is None or str(v).strip() == "":
                continue
            ref = f"{get_column_letter(c)}{r}"
            out.append(_scalar_cell_line(ref, v))
    out.append("")
    return out


def render_change_history(ws, origin, skip) -> list[str]:
    out = ["## 変更履歴", "", "<!--xl-sheet 変更履歴-->"]

    # Row 1 is the table header: No / 発行日 / 版数 / 担当者 / 変更内容 / 確認者 / 承認者
    # Excel-side columns observed at: B, F, J, N, R, X, AB (approximate — read
    # what actually exists). We pick the columns by finding non-empty cells in
    # row 1.
    header_cols = []
    for c in range(1, ws.max_column + 1):
        if (1, c) in skip:
            continue
        v = ws.cell(1, c).value
        if v is not None and str(v).strip():
            header_cols.append(c)

    if not header_cols:
        out.append("> (空)")
        out.append("")
        return out

    col_letters = [get_column_letter(c) for c in header_cols]
    headers = [_esc_cell(ws.cell(1, c).value) for c in header_cols]

    out.append(f"<!--xl-table cols={','.join(col_letters)}-->")
    out.append("| " + " | ".join(headers) + " |")
    out.append("| " + " | ".join(["---"] * len(headers)) + " |")

    max_r, _ = _data_bounds(ws, origin)
    for r in range(2, max_r + 1):
        row_vals = _row_anchor_cells(ws, r, header_cols, origin, skip)
        if not any(v.strip() for v in row_vals):
            continue
        out.append(f"<!--xl-row {r}-->| " + " | ".join(row_vals) + " |")
    out.append("")
    return out


def render_toc(ws, origin, skip) -> list[str]:
    out = ["## 目次", ""]
    out.extend(_render_doc_header(ws, origin, skip))
    out.append("<!--xl-sheet 目次-->")

    # TOC table header is at row 5: B(No), D(シート名), K(説明)
    cols = [2, 4, 11]
    col_letters = [get_column_letter(c) for c in cols]

    out.append(f"<!--xl-table cols={','.join(col_letters)}-->")
    out.append("| No | シート名 | 説明 |")
    out.append("| --- | --- | --- |")

    max_r, _ = _data_bounds(ws, origin)
    for r in range(6, max_r + 1):
        vals = _row_anchor_cells(ws, r, cols, origin, skip)
        if not any(v.strip() for v in vals):
            continue
        out.append(f"<!--xl-row {r}-->| " + " | ".join(vals) + " |")
    out.append("")
    return out


def render_screen_transition(ws, origin, skip) -> list[str]:
    out = ["## 画面遷移", ""]
    out.extend(_render_doc_header(ws, origin, skip))
    out.append("<!--xl-sheet 画面遷移-->")

    # Body text (the 'ACSMS-SCR-XXX: ... — 画面遷移' caption, plus any text
    # nodes around the embedded image).
    max_r, _ = _data_bounds(ws, origin)
    for r in range(4, max_r + 1):
        for c in range(1, ws.max_column + 1):
            if (r, c) in skip:
                continue
            v = ws.cell(r, c).value
            if v is None or str(v).strip() == "":
                continue
            ref = f"{get_column_letter(c)}{r}"
            out.append(_scalar_cell_line(ref, v))

    out.append("")
    out.append("> ※ 画面遷移図は Excel 内の図として埋め込まれています (画像はテンプレート側で保持)。")
    out.append("")
    return out


def render_screen_image(ws, origin, skip) -> list[str]:
    out = ["## 画面イメージ", ""]
    out.extend(_render_doc_header(ws, origin, skip))
    out.append("<!--xl-sheet 画面イメージ-->")
    out.extend(_render_screen_meta(ws, origin))

    # Any caption text after row 6
    max_r, _ = _data_bounds(ws, origin)
    for r in range(7, max_r + 1):
        for c in range(1, ws.max_column + 1):
            if (r, c) in skip:
                continue
            v = ws.cell(r, c).value
            if v is None or str(v).strip() == "":
                continue
            ref = f"{get_column_letter(c)}{r}"
            out.append(_scalar_cell_line(ref, v))

    out.append("")
    out.append("> ※ 画面イメージ画像は Excel 内に埋め込まれています (画像はテンプレート側で保持)。")
    out.append("")
    return out


# Column layout for 画面項目定義 (Excel template fixed columns —
# verified against header row 10 of the v1.2 template).
ITEMS_COLS = {
    "No":                  2,   # B
    "項目名":              3,   # C
    "項目ID":              6,   # F
    "項目タイプ":          9,   # I
    "入力/出力":          12,   # L
    "必須":               14,   # N
    "入力データ型":       15,   # O
    "最小桁数":           18,   # R
    "最大桁数":           20,   # T
    "文字揃え":           22,   # V
    "フォーマット":       24,   # X
    "テーブル名(論理名)": 28,   # AB
    "テーブル名(物理名)": 31,   # AE
    "カラム名(論理名)":   34,   # AH
    "カラム名(物理名)":   37,   # AK
    "表示条件":           41,   # AO
    "デフォルト値":       44,   # AR
    "備考":               49,   # AW
}


def render_screen_items(ws, origin, skip) -> list[str]:
    out = ["## 画面項目定義", ""]
    out.extend(_render_doc_header(ws, origin, skip))
    out.append("<!--xl-sheet 画面項目定義-->")
    out.extend(_render_screen_meta(ws, origin))

    headers = list(ITEMS_COLS.keys())
    cols = list(ITEMS_COLS.values())
    col_letters = [get_column_letter(c) for c in cols]

    max_r, _ = _data_bounds(ws, origin)

    out.append(f"<!--xl-table cols={','.join(col_letters)}-->")
    out.append("| " + " | ".join(headers) + " |")
    out.append("| " + " | ".join(["---"] * len(headers)) + " |")

    for r in range(11, max_r + 1):
        # Section header rows have a wide merge across columns B+
        if _section_merge_at(ws, r):
            section_name = _val(ws, r, 2, origin)
            if section_name and str(section_name).strip():
                out.append("")
                out.append(f"<!--xl-section row={r}-->### {_esc_scalar(section_name)}")
                out.append("")
                out.append(f"<!--xl-table cols={','.join(col_letters)}-->")
                out.append("| " + " | ".join(headers) + " |")
                out.append("| " + " | ".join(["---"] * len(headers)) + " |")
            continue

        vals = _row_anchor_cells(ws, r, cols, origin, skip)
        if not any(v.strip() for v in vals):
            continue
        out.append(f"<!--xl-row {r}-->| " + " | ".join(vals) + " |")

    out.append("")
    return out


def render_function_def(ws, origin, skip) -> list[str]:
    out = ["## 機能定義", ""]
    out.extend(_render_doc_header(ws, origin, skip))
    out.append("<!--xl-sheet 機能定義-->")
    out.extend(_render_screen_meta(ws, origin))

    # 機能定義 is mostly free-form text. Capture every non-empty origin cell
    # with its coordinate, group by row, render as a flat anchor list. This
    # is lossless and the template preserves layout.
    max_r, _ = _data_bounds(ws, origin)

    for r in range(8, max_r + 1):
        row_pairs = []
        for c in range(1, ws.max_column + 1):
            if (r, c) in skip:
                continue
            v = ws.cell(r, c).value
            if v is None or str(v).strip() == "":
                continue
            row_pairs.append((c, v))
        if not row_pairs:
            continue
        for c, v in row_pairs:
            ref = f"{get_column_letter(c)}{r}"
            out.append(_scalar_cell_line(ref, v))
    out.append("")
    return out


def render_messages(ws, origin, skip) -> list[str]:
    out = ["## メッセージ情報", ""]
    out.extend(_render_doc_header(ws, origin, skip))
    out.append("<!--xl-sheet メッセージ情報-->")
    out.extend(_render_screen_meta(ws, origin))

    # Header row at row 9: B(#)  C(メッセージコード)  G(メッセージ内容)
    cols = [2, 3, 7]
    col_letters = [get_column_letter(c) for c in cols]

    out.append(f"<!--xl-table cols={','.join(col_letters)}-->")
    out.append("| # | メッセージコード | メッセージ内容 |")
    out.append("| --- | --- | --- |")

    max_r, _ = _data_bounds(ws, origin)
    for r in range(10, max_r + 1):
        vals = _row_anchor_cells(ws, r, cols, origin, skip)
        if not any(v.strip() for v in vals):
            continue
        out.append(f"<!--xl-row {r}-->| " + " | ".join(vals) + " |")
    out.append("")
    return out


SHEET_RENDERERS = {
    "表紙": render_cover,
    "変更履歴": render_change_history,
    "目次": render_toc,
    "画面遷移": render_screen_transition,
    "画面イメージ": render_screen_image,
    "画面項目定義": render_screen_items,
    "機能定義": render_function_def,
    "メッセージ情報": render_messages,
}


def convert(xlsx_path: Path, md_path: Path) -> Path:
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)

    out = [
        f"# {xlsx_path.stem}",
        "",
        "<!--",
        "  This Markdown is a round-trip representation of the screen-design",
        "  Excel. Cell coordinates are embedded as HTML comments (<!--xl ...-->)",
        "  so `screen_md_to_excel.py` can write values back into the *exact* cells",
        "  of the original template, preserving all styles, merges, and images.",
        "  Edit cell values inline; do NOT edit anchor comments.",
        "",
        f"  Source: {xlsx_path.name}",
        "-->",
        "",
    ]

    # Iterate sheets in template order, falling back to workbook order.
    seen = set()
    for name in SHEET_ORDER:
        if name in wb.sheetnames:
            seen.add(name)
            ws = wb[name]
            origin, skip = _build_merge_map(ws)
            out.append("---")
            out.append("")
            out.extend(SHEET_RENDERERS[name](ws, origin, skip))

    for name in wb.sheetnames:
        if name in seen:
            continue
        ws = wb[name]
        origin, skip = _build_merge_map(ws)
        out.append("---")
        out.append("")
        out.append(f"## {name}")
        out.append("")
        out.append(f"<!--xl-sheet {name}-->")
        max_r, _ = _data_bounds(ws, origin)
        for r in range(1, max_r + 1):
            for c in range(1, ws.max_column + 1):
                if (r, c) in skip:
                    continue
                v = ws.cell(r, c).value
                if v is None or str(v).strip() == "":
                    continue
                ref = f"{get_column_letter(c)}{r}"
                out.append(_scalar_cell_line(ref, v))
        out.append("")

    md_path.write_text("\n".join(out), encoding="utf-8")
    return md_path


def main():
    if len(sys.argv) < 2:
        print(f"Usage: python {Path(sys.argv[0]).name} <input.xlsx> [output.md]")
        sys.exit(1)

    xlsx = Path(sys.argv[1])
    if not xlsx.exists():
        print(f"Error: not found: {xlsx}")
        sys.exit(1)

    if len(sys.argv) >= 3:
        md = Path(sys.argv[2])
    else:
        md = xlsx.parent / "screen-design.md"

    out = convert(xlsx, md)
    print(f"Wrote: {out}")


if __name__ == "__main__":
    main()