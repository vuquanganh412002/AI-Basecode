#!/usr/bin/env python3
"""
styled_xlsx_md.py — Lossless round-trip converter between a styled XLSX
workbook and a Markdown file (HTML-table flavour).

Unlike the domain-specific converters in this folder (api/db/req/screen/
testcase), this one is GENERIC and preserves per-cell presentation so that
``xlsx -> md -> xlsx`` (and back) keeps:

  * value + value type (str / int / float / bool / datetime)
  * bold, italic
  * font color, font name, font size
  * cell background fill color
  * cell borders (per side: style + color)
  * horizontal / vertical alignment + wrap_text
  * number format
  * sheet title, freeze panes, column widths, merged ranges

The Markdown stores each sheet as one ``<table>``. The visible CSS in each
cell's ``style=""`` is for human/Markdown-preview rendering only; the
authoritative data for reconstruction lives in ``data-*`` attributes, which
the reverse parser reads (it never parses the CSS). Cells equal to the
workbook default emit a bare ``<td></td>``.

Usage:
    python3 styled_xlsx_md.py to-md   <input.xlsx> [output.md]
    python3 styled_xlsx_md.py to-xlsx <input.md>   [output.xlsx]

Defaults: output is written next to the input with the swapped extension.
"""

from __future__ import annotations

import json
import sys
from datetime import date, datetime
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path

try:
    import openpyxl
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter, column_index_from_string
except ImportError:
    sys.stderr.write("ERROR: openpyxl is required.\n  pip install openpyxl\n")
    sys.exit(1)

# ── Workbook default baseline. A cell matching this emits no style data. ──────
DEFAULT_FONT_NAME = "Calibri"
DEFAULT_FONT_SIZE = 11.0
DEFAULT_FONT_COLOR = "FF000000"  # black (openpyxl's untouched-cell colour)

SIDES = ("left", "right", "top", "bottom")
_SIDE_ATTR = {"left": "bl", "right": "br", "top": "bt", "bottom": "bb"}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
def _argb(color) -> str | None:
    """Return an 8-char ARGB string for an openpyxl Color, or None.

    Theme / indexed colours (no concrete rgb) return None so they fall back
    to the default on reload rather than being mangled.
    """
    if color is None:
        return None
    rgb = getattr(color, "rgb", None)
    if isinstance(rgb, str) and len(rgb) == 8:
        return rgb.upper()
    return None


def _css_color(argb: str) -> str:
    """ARGB -> CSS colour. Drops a fully-opaque alpha, keeps it as rgba()."""
    a, rgb = argb[:2], argb[2:]
    if a.upper() == "FF":
        return "#" + rgb.lower()
    alpha = int(a, 16) / 255
    r, g, b = (int(rgb[i : i + 2], 16) for i in (0, 2, 4))
    return f"rgba({r},{g},{b},{alpha:.3f})"


# ──────────────────────────────────────────────────────────────────────────────
# XLSX -> Markdown
# ──────────────────────────────────────────────────────────────────────────────
def cell_to_td(cell) -> str:
    data: dict[str, str] = {}      # authoritative data-* attrs
    css: list[str] = []            # visual-only CSS

    font = cell.font
    if font.bold:
        data["b"] = "1"
        css.append("font-weight:bold")
    if font.italic:
        data["i"] = "1"
        css.append("font-style:italic")

    fc = _argb(font.color)
    if fc and fc != DEFAULT_FONT_COLOR:
        data["fc"] = fc
        css.append(f"color:{_css_color(fc)}")
    if font.name and font.name != DEFAULT_FONT_NAME:
        data["fn"] = font.name
        css.append(f"font-family:'{font.name}'")
    if font.sz and float(font.sz) != DEFAULT_FONT_SIZE:
        data["fs"] = _num(font.sz)
        css.append(f"font-size:{_num(font.sz)}pt")

    fill = cell.fill
    if fill is not None and fill.patternType == "solid":
        fl = _argb(fill.fgColor)
        if fl:
            data["fl"] = fl
            css.append(f"background-color:{_css_color(fl)}")

    border = cell.border
    for side in SIDES:
        s = getattr(border, side)
        if s is not None and s.style:
            bc = _argb(s.color) or "FF000000"
            data[_SIDE_ATTR[side]] = f"{s.style}|{bc}"
    if any(_SIDE_ATTR[s] in data for s in SIDES):
        css.append("border:1px solid #cbd5e1")

    al = cell.alignment
    if al.horizontal:
        data["ha"] = al.horizontal
        css.append(f"text-align:{al.horizontal}")
    if al.vertical:
        data["va"] = al.vertical
        css.append(f"vertical-align:{al.vertical}")
    if al.wrap_text:
        data["w"] = "1"
        css.append("white-space:pre-wrap")
    else:
        css.append("white-space:nowrap")

    if cell.number_format and cell.number_format != "General":
        data["nf"] = cell.number_format

    # value + type
    v = cell.value
    text = ""
    if v is None:
        pass
    elif isinstance(v, bool):
        data["t"] = "b"
        text = "true" if v else "false"
    elif isinstance(v, int):
        data["t"] = "n"
        text = str(v)
    elif isinstance(v, float):
        data["t"] = "n"
        text = repr(v)
    elif isinstance(v, datetime):
        data["t"] = "d"
        text = v.isoformat()
    elif isinstance(v, date):
        data["t"] = "dd"
        text = v.isoformat()
    else:
        text = str(v)

    attrs = "".join(f' data-{k}="{escape(str(val), quote=True)}"' for k, val in data.items())
    style = f' style="{";".join(css)}"' if css else ""
    return f"<td{style}{attrs}>{escape(text)}</td>"


def _num(x) -> str:
    f = float(x)
    return str(int(f)) if f.is_integer() else str(f)


def sheet_to_md(ws) -> str:
    min_row, max_row = ws.min_row or 1, ws.max_row or 1
    min_col, max_col = ws.min_column or 1, ws.max_column or 1

    widths = {}
    for letter, dim in ws.column_dimensions.items():
        if dim.width is not None:
            widths[letter] = round(dim.width, 4)
    heights = {}
    for idx, dim in ws.row_dimensions.items():
        if dim.height is not None:
            heights[str(idx)] = round(dim.height, 4)

    meta = {
        "sheet": ws.title,
        "min_row": min_row,
        "max_row": max_row,
        "min_col": min_col,
        "max_col": max_col,
        "freeze_panes": ws.freeze_panes,
        "column_widths": widths,
        "row_heights": heights,
        "merged_cells": [str(r) for r in ws.merged_cells.ranges],
    }

    lines = [
        f"<!--XLSX-META {json.dumps(meta, ensure_ascii=False)} -->",
        "",
        '<table border="1" cellspacing="0" cellpadding="3" '
        'style="border-collapse:collapse;font-family:Calibri,sans-serif">',
    ]
    for r in range(min_row, max_row + 1):
        lines.append("<tr>")
        for c in range(min_col, max_col + 1):
            lines.append(cell_to_td(ws.cell(row=r, column=c)))
        lines.append("</tr>")
    lines.append("</table>")
    return "\n".join(lines)


def to_md(xlsx_path: Path, md_path: Path) -> None:
    wb = openpyxl.load_workbook(xlsx_path, data_only=False)
    parts = [
        f"# {xlsx_path.stem}",
        "",
        f"<!-- Generated from `{xlsx_path.name}` by styled_xlsx_md.py — "
        "lossless XLSX⇄MD round-trip.",
        "     The data-* attributes are authoritative; CSS in style=\"\" is "
        "for preview rendering only. -->",
        "",
    ]
    for ws in wb.worksheets:
        parts.append(sheet_to_md(ws))
        parts.append("")
    md_path.write_text("\n".join(parts), encoding="utf-8")
    print(f"Wrote {md_path}")


# ──────────────────────────────────────────────────────────────────────────────
# Markdown -> XLSX
# ──────────────────────────────────────────────────────────────────────────────
class _SheetParser(HTMLParser):
    """Parse the <table> for one sheet into rows of (data dict, text)."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[tuple[dict, str]]] = []
        self._cur_row: list[tuple[dict, str]] | None = None
        self._cur_attrs: dict | None = None
        self._buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._cur_row = []
        elif tag == "td" and self._cur_row is not None:
            d = {}
            for k, v in attrs:
                if k and k.startswith("data-"):
                    d[k[5:]] = v
            self._cur_attrs = d
            self._buf = []

    def handle_data(self, data):
        if self._cur_attrs is not None:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag == "td" and self._cur_attrs is not None:
            self._cur_row.append((self._cur_attrs, "".join(self._buf)))
            self._cur_attrs = None
            self._buf = []
        elif tag == "tr" and self._cur_row is not None:
            self.rows.append(self._cur_row)
            self._cur_row = None


def _split_sheets(md_text: str) -> list[tuple[dict, str]]:
    """Return list of (meta, table_html) per sheet."""
    out = []
    marker = "<!--XLSX-META "
    idx = 0
    while True:
        m = md_text.find(marker, idx)
        if m < 0:
            break
        end = md_text.find("-->", m)
        meta = json.loads(md_text[m + len(marker) : end].strip())
        tstart = md_text.find("<table", end)
        tend = md_text.find("</table>", tstart)
        table_html = md_text[tstart : tend + len("</table>")]
        out.append((meta, table_html))
        idx = tend
    return out


def _apply_cell(cell, data: dict, text: str) -> None:
    # value
    t = data.get("t")
    if t is None:
        cell.value = unescape(text) if text != "" else None
    elif t == "b":
        cell.value = text.strip().lower() == "true"
    elif t == "n":
        s = text.strip()
        cell.value = int(s) if s.lstrip("-").isdigit() else float(s)
    elif t == "d":
        cell.value = datetime.fromisoformat(text.strip())
    elif t == "dd":
        cell.value = date.fromisoformat(text.strip())
    else:
        cell.value = unescape(text)

    # font
    fkw = {"name": DEFAULT_FONT_NAME, "size": DEFAULT_FONT_SIZE}
    if data.get("b") == "1":
        fkw["bold"] = True
    if data.get("i") == "1":
        fkw["italic"] = True
    if "fc" in data:
        fkw["color"] = data["fc"]
    if "fn" in data:
        fkw["name"] = data["fn"]
    if "fs" in data:
        fkw["size"] = float(data["fs"])
    cell.font = Font(**fkw)

    # fill
    if "fl" in data:
        cell.fill = PatternFill(fill_type="solid", fgColor=data["fl"])

    # border
    side_kw = {}
    for side in SIDES:
        raw = data.get(_SIDE_ATTR[side])
        if raw:
            style, color = raw.split("|", 1)
            side_kw[side] = Side(style=style, color=color)
    if side_kw:
        cell.border = Border(**side_kw)

    # alignment
    akw = {}
    if "ha" in data:
        akw["horizontal"] = data["ha"]
    if "va" in data:
        akw["vertical"] = data["va"]
    if data.get("w") == "1":
        akw["wrap_text"] = True
    if akw:
        cell.alignment = Alignment(**akw)

    # number format
    if "nf" in data:
        cell.number_format = data["nf"]


def to_xlsx(md_path: Path, xlsx_path: Path) -> None:
    md_text = md_path.read_text(encoding="utf-8")
    sheets = _split_sheets(md_text)
    if not sheets:
        sys.stderr.write("ERROR: no <!--XLSX-META ...--> blocks found in markdown.\n")
        sys.exit(1)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    for meta, table_html in sheets:
        ws = wb.create_sheet(title=meta["sheet"])
        parser = _SheetParser()
        parser.feed(table_html)

        min_row, min_col = meta["min_row"], meta["min_col"]
        for ri, row in enumerate(parser.rows):
            for ci, (data, text) in enumerate(row):
                cell = ws.cell(row=min_row + ri, column=min_col + ci)
                _apply_cell(cell, data, text)

        for letter, w in meta.get("column_widths", {}).items():
            ws.column_dimensions[letter].width = w
        for idx, h in meta.get("row_heights", {}).items():
            ws.row_dimensions[int(idx)].height = h
        for rng in meta.get("merged_cells", []):
            ws.merge_cells(rng)
        if meta.get("freeze_panes"):
            ws.freeze_panes = meta["freeze_panes"]

    wb.save(xlsx_path)
    print(f"Wrote {xlsx_path}")


# ──────────────────────────────────────────────────────────────────────────────
def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] not in ("to-md", "to-xlsx"):
        sys.stderr.write(__doc__)
        return 2
    mode, inp = argv[1], Path(argv[2])
    if not inp.exists():
        sys.stderr.write(f"ERROR: input not found: {inp}\n")
        return 1
    if mode == "to-md":
        out = Path(argv[3]) if len(argv) > 3 else inp.with_suffix(".md")
        to_md(inp, out)
    else:
        out = Path(argv[3]) if len(argv) > 3 else inp.with_suffix(".xlsx")
        to_xlsx(inp, out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
