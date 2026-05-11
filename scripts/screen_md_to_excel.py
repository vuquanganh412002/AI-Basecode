"""
screen_md_to_excel.py — Convert screen-design Markdown back to Excel.

Reads MD produced by `screen_excel_to_md.py` (with embedded <!--xl ...-->
anchors), loads the original Excel as a **format template**, then overwrites
only the cell *values* indicated by the anchors. All styles, merged ranges,
column widths, row heights, embedded images and sheet order are preserved
byte-for-byte by openpyxl because we never re-create them.

Usage:
    python screen_md_to_excel.py <input.md> [output.xlsx]
                                 [--template <template.xlsx>]

Template resolution (when --template is omitted):
    1. Sibling .xlsx in the same directory whose name starts with the same
       prefix as the MD file's parent folder (e.g. ACSMS-SCR-004/...).
    2. The first .xlsx file in the same directory as the MD.
    3. Error.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import openpyxl
from openpyxl.utils import column_index_from_string


# ──────────────────────────────────────────────────────────────────────────────
# Anchor parsers
# ──────────────────────────────────────────────────────────────────────────────

# `<!--xl-sheet 画面項目定義-->`
RE_SHEET = re.compile(r"<!--\s*xl-sheet\s+(.+?)\s*-->")

# `<!--xl B5-->VALUE` (single-cell scalar write)
RE_CELL = re.compile(r"<!--\s*xl\s+([A-Z]+)(\d+)\s*-->(.*)$")

# `<!--xl-table cols=B,C,G,K,...-->`
RE_TABLE = re.compile(r"<!--\s*xl-table\s+cols=([A-Z,]+)\s*-->")

# `<!--xl-row 11-->| v1 | v2 | ... |`
RE_ROW = re.compile(r"<!--\s*xl-row\s+(\d+)\s*-->\s*(\|.*\|)\s*$")

# `<!--xl-section row=12-->### Section Name`  (information only, no write —
# section names live in the template's merged header cell and are already
# preserved by the template. We still read them to validate.)
RE_SECTION = re.compile(r"<!--\s*xl-section\s+row=(\d+)\s*-->")


def _decode_cell(s: str) -> str:
    """Reverse of _esc_cell in screen_excel_to_md.py."""
    if s is None:
        return ""
    return s.replace("\\|", "|").replace("<br>", "\n")


def _decode_scalar(s: str) -> str:
    if s is None:
        return ""
    return s.replace("<br>", "\n")


def _split_table_row(line: str) -> list[str]:
    """Split a markdown table row into cells. Respects '\\|' escape."""
    # Strip outer pipes
    inner = line.strip()
    if inner.startswith("|"):
        inner = inner[1:]
    if inner.endswith("|"):
        inner = inner[:-1]
    # Split on un-escaped pipes
    parts = []
    buf = []
    i = 0
    while i < len(inner):
        ch = inner[i]
        if ch == "\\" and i + 1 < len(inner) and inner[i + 1] == "|":
            buf.append("|")
            i += 2
            continue
        if ch == "|":
            parts.append("".join(buf).strip())
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    parts.append("".join(buf).strip())
    return parts


def _coerce(value: str):
    """Best-effort type coercion to match Excel storage.

    Prevents 'Number Stored as Text' warnings and round-trips back to the
    same .value openpyxl read on the forward pass.
    """
    s = _decode_cell(value) if "<br>" in (value or "") or "\\|" in (value or "") else value
    s = s.replace("<br>", "\n").replace("\\|", "|")
    if s == "":
        return None
    # Don't coerce strings that look like JA codes / IDs / dates with slashes.
    if re.fullmatch(r"-?\d+", s):
        try:
            return int(s)
        except ValueError:
            pass
    if re.fullmatch(r"-?\d+\.\d+", s):
        try:
            return float(s)
        except ValueError:
            pass
    return s


# ──────────────────────────────────────────────────────────────────────────────
# Core
# ──────────────────────────────────────────────────────────────────────────────

def _resolve_template(md_path: Path, override: Path | None) -> Path:
    if override is not None:
        if not override.exists():
            print(f"Error: template not found: {override}", file=sys.stderr)
            sys.exit(1)
        return override

    # Search same directory for any .xlsx that isn't the script-produced output
    candidates = sorted(md_path.parent.glob("*.xlsx"))
    # Filter out potential outputs (heuristic: prefer files mentioning 画面設計書)
    preferred = [p for p in candidates if "画面設計書" in p.name]
    if preferred:
        return preferred[0]
    if candidates:
        return candidates[0]

    print(
        f"Error: no template Excel found alongside {md_path.name}. "
        f"Pass --template <file.xlsx>.",
        file=sys.stderr,
    )
    sys.exit(1)


def _write_cell(ws, cell_ref: str, value):
    """Write into cell_ref, redirecting to the merge top-left if needed.

    openpyxl forbids writes into a non-top-left merged cell. We resolve to
    the merge origin so the user can keep MD anchors at the visual top-left
    of any block.

    The template's existing `number_format` is honored: cells formatted as
    text (`@`) or one-decimal (`0.0`) keep the value as a string so display
    matches the source. Otherwise the value passes through `_coerce` typing.
    """
    col_letters = "".join(ch for ch in cell_ref if ch.isalpha())
    row = int("".join(ch for ch in cell_ref if ch.isdigit()))
    col = column_index_from_string(col_letters)

    for mr in ws.merged_cells.ranges:
        if mr.min_row <= row <= mr.max_row and mr.min_col <= col <= mr.max_col:
            row, col = mr.min_row, mr.min_col
            break

    cell = ws.cell(row=row, column=col)
    fmt = (cell.number_format or "").strip()
    if fmt in ("@", "0.0") and isinstance(value, (int, float)):
        # Preserve display: text-formatted cells must stay as string;
        # `0.0`-formatted cells need an explicit float so XLSX doesn't
        # normalize "1.0" -> int 1 on save.
        if fmt == "@":
            value = str(value)
        else:  # "0.0"
            value = float(value)
    cell.value = value


def convert(md_path: Path, out_path: Path, template_path: Path) -> Path:
    wb = openpyxl.load_workbook(template_path)

    text = md_path.read_text(encoding="utf-8")
    lines = text.splitlines()

    cur_sheet: str | None = None
    cur_cols: list[int] | None = None  # column indices for the active table
    writes = 0
    skipped_no_sheet = 0
    skipped_no_table = 0

    for raw in lines:
        line = raw.rstrip("\n")

        m = RE_SHEET.search(line)
        if m:
            cur_sheet = m.group(1).strip()
            cur_cols = None
            if cur_sheet not in wb.sheetnames:
                print(
                    f"Warning: sheet '{cur_sheet}' not in template; skipping its anchors",
                    file=sys.stderr,
                )
            continue

        if cur_sheet is None or cur_sheet not in wb.sheetnames:
            # Outside any known sheet — skip.
            if RE_CELL.search(line) or RE_TABLE.search(line) or RE_ROW.search(line):
                skipped_no_sheet += 1
            continue

        ws = wb[cur_sheet]

        m = RE_TABLE.search(line)
        if m:
            letters = [s.strip() for s in m.group(1).split(",") if s.strip()]
            cur_cols = [column_index_from_string(L) for L in letters]
            continue

        m = RE_SECTION.search(line)
        if m:
            # Section row index is metadata only — header value sits in the
            # template's merged cell already. We do nothing.
            continue

        m = RE_ROW.search(line)
        if m:
            if not cur_cols:
                skipped_no_table += 1
                continue
            row_no = int(m.group(1))
            md_row = m.group(2)
            cells = _split_table_row(md_row)
            for col_idx, val in zip(cur_cols, cells):
                ref = f"{openpyxl.utils.get_column_letter(col_idx)}{row_no}"
                _write_cell(ws, ref, _coerce(val))
                writes += 1
            continue

        m = RE_CELL.match(line.lstrip())
        if m:
            col_letters, row_str, val_str = m.group(1), m.group(2), m.group(3)
            ref = f"{col_letters}{row_str}"
            _write_cell(ws, ref, _coerce(val_str))
            writes += 1
            continue

    wb.save(out_path)
    print(
        f"Wrote: {out_path}  ({writes} cells written; "
        f"skipped {skipped_no_sheet} pre-sheet, {skipped_no_table} pre-table)"
    )
    return out_path


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    ap.add_argument("md", type=Path, help="Input .md (round-trip format)")
    ap.add_argument(
        "output", type=Path, nargs="?",
        help="Output .xlsx (defaults to <md_dir>/<template_name>.out.xlsx)",
    )
    ap.add_argument(
        "--template", type=Path, default=None,
        help="Source Excel used as the format template "
             "(default: sibling .xlsx in the MD's directory)",
    )
    args = ap.parse_args()

    if not args.md.exists():
        print(f"Error: not found: {args.md}", file=sys.stderr)
        sys.exit(1)

    template = _resolve_template(args.md, args.template)

    if args.output is None:
        args.output = args.md.parent / f"{template.stem}.out.xlsx"

    convert(args.md, args.output, template)


if __name__ == "__main__":
    main()
