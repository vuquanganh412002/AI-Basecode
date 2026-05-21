"""
Excel to Markdown converter for screen design documents.
Handles merged cells to avoid duplicate content.

Usage:
  python screen_excel_to_md.py <input.xlsx>

Output: screen-design.md in the same folder as the Excel file.
"""

import sys
import os
from pathlib import Path

import openpyxl
from openpyxl.utils import get_column_letter


def load_workbook(filepath: str) -> openpyxl.Workbook:
    return openpyxl.load_workbook(filepath, data_only=True)


def build_merge_map(ws) -> dict:
    """
    Build a map of (row, col) -> value for merged cells.
    For every cell in a merged range, map it to the top-left cell's value.
    Returns a set of cells that are NOT the top-left of their merge range
    (i.e., cells that should be skipped to avoid duplicates).
    """
    merge_origins = {}  # (row, col) -> value from top-left
    skip_cells = set()

    for merge_range in ws.merged_cells.ranges:
        min_row, min_col = merge_range.min_row, merge_range.min_col
        max_row, max_col = merge_range.max_row, merge_range.max_col
        origin_value = ws.cell(row=min_row, column=min_col).value

        for r in range(min_row, max_row + 1):
            for c in range(min_col, max_col + 1):
                merge_origins[(r, c)] = origin_value
                if (r, c) != (min_row, min_col):
                    skip_cells.add((r, c))

    return merge_origins, skip_cells


def get_cell_value(ws, row, col, merge_origins):
    """Get cell value, resolving merged cells."""
    if (row, col) in merge_origins:
        return merge_origins[(row, col)]
    return ws.cell(row=row, column=col).value


def find_data_bounds(ws, merge_origins):
    """Find the actual last row/col with data (ignore empty trailing rows)."""
    max_row = 0
    max_col = 0
    for r in range(1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            val = get_cell_value(ws, r, c, merge_origins)
            if val is not None and str(val).strip():
                max_row = max(max_row, r)
                max_col = max(max_col, c)
    return max_row, max_col


def convert_header(ws, merge_origins) -> list[str]:
    """Convert the standard header rows (rows 1-3) to markdown."""
    lines = []

    # Row 1-3: Document header (common across sheets)
    header_fields = {}
    for c in range(1, ws.max_column + 1):
        for r in range(1, 4):
            val = get_cell_value(ws, r, c, merge_origins)
            if val is not None and str(val).strip():
                header_fields.setdefault(r, []).append(str(val).strip())

    if 1 in header_fields:
        # Deduplicate while preserving order
        seen = set()
        unique = []
        for v in header_fields[1]:
            if v not in seen:
                seen.add(v)
                unique.append(v)
        if unique:
            lines.append(f'| {" | ".join(unique)} |')

    if 2 in header_fields:
        seen = set()
        unique = []
        for v in header_fields[2]:
            if v not in seen:
                seen.add(v)
                unique.append(v)
        if unique:
            if lines:
                lines.append(f'| {" | ".join(["---"] * len(unique))} |')
            lines.append(f'| {" | ".join(unique)} |')

    return lines


def convert_cover_sheet(ws, merge_origins, skip_cells) -> str:
    """Convert 表紙 (cover) sheet."""
    lines = ['## 表紙\n']

    vals = {}
    for r in range(1, min(ws.max_row, 30) + 1):
        for c in range(1, ws.max_column + 1):
            if (r, c) in skip_cells:
                continue
            val = ws.cell(row=r, column=c).value
            if val is not None and str(val).strip():
                vals.setdefault(r, []).append(str(val).strip())

    for r in sorted(vals.keys()):
        row_vals = vals[r]
        if len(row_vals) == 1:
            lines.append(f'**{row_vals[0]}**\n')
        elif len(row_vals) == 2:
            lines.append(f'| {row_vals[0]} | {row_vals[1]} |')
        else:
            lines.append(f'| {" | ".join(row_vals)} |')

    return '\n'.join(lines)


def convert_change_history(ws, merge_origins, skip_cells) -> str:
    """Convert 変更履歴 (change history) sheet."""
    lines = ['## 変更履歴\n']

    # Read header row
    headers = []
    for c in range(1, ws.max_column + 1):
        val = get_cell_value(ws, 1, c, merge_origins)
        if val is not None and str(val).strip() and (1, c) not in skip_cells:
            headers.append(str(val).strip())

    if headers:
        lines.append(f'| {" | ".join(headers)} |')
        lines.append(f'| {" | ".join(["---"] * len(headers))} |')

    # Read data rows
    for r in range(2, min(ws.max_row, 20) + 1):
        row_data = []
        has_data = False
        for c in range(1, ws.max_column + 1):
            if (1, c) in skip_cells:
                continue
            val = get_cell_value(ws, r, c, merge_origins)
            if (r, c) in skip_cells:
                continue
            cell_str = str(val).strip().replace('\n', '<br>') if val is not None else ''
            row_data.append(cell_str)
            if cell_str:
                has_data = True

        if has_data and row_data:
            lines.append(f'| {" | ".join(row_data)} |')

    return '\n'.join(lines)


def convert_toc(ws, merge_origins, skip_cells) -> str:
    """Convert 目次 (table of contents) sheet."""
    lines = ['## 目次\n']

    doc_header = convert_header(ws, merge_origins)
    if doc_header:
        lines.extend(doc_header)
        lines.append('')

    # Row 5+: TOC table
    lines.append('| No. | シート名 | 説明 |')
    lines.append('| --- | --- | --- |')

    for r in range(6, min(ws.max_row, 20) + 1):
        no = get_cell_value(ws, r, 2, merge_origins)  # B
        name = get_cell_value(ws, r, 4, merge_origins)  # D
        desc = get_cell_value(ws, r, 11, merge_origins)  # K

        if no is None and name is None:
            continue

        no_str = str(no) if no is not None else ''
        name_str = str(name).strip() if name is not None else ''
        desc_str = str(desc).strip() if desc is not None else ''
        lines.append(f'| {no_str} | {name_str} | {desc_str} |')

    return '\n'.join(lines)


def convert_screen_transition(ws, merge_origins, skip_cells) -> str:
    """Convert 画面遷移 (screen transition) sheet."""
    lines = ['## 画面遷移\n']

    doc_header = convert_header(ws, merge_origins)
    if doc_header:
        lines.extend(doc_header)
        lines.append('')

    # Check for any additional content (images are not extractable)
    has_extra = False
    for r in range(4, min(ws.max_row, 50) + 1):
        for c in range(1, ws.max_column + 1):
            val = get_cell_value(ws, r, c, merge_origins)
            if val is not None and str(val).strip() and (r, c) not in skip_cells:
                if not has_extra:
                    lines.append('')
                    has_extra = True
                lines.append(str(val).strip())

    if not has_extra:
        lines.append('> ※ 画面遷移図はExcelファイル内の図を参照してください。')

    return '\n'.join(lines)


def convert_screen_image(ws, merge_origins, skip_cells) -> str:
    """Convert 画面イメージ (screen image) sheet."""
    lines = ['## 画面イメージ\n']

    doc_header = convert_header(ws, merge_origins)
    if doc_header:
        lines.extend(doc_header)
        lines.append('')

    # Screen ID and name (rows 5-6)
    screen_id = get_cell_value(ws, 5, 10, merge_origins)  # J5
    screen_name = get_cell_value(ws, 6, 10, merge_origins)  # J6
    summary = get_cell_value(ws, 5, 22, merge_origins)  # V5

    lines.append(f'| 画面ID | {screen_id or ""} | 概要 | {summary or ""} |')
    lines.append(f'| 画面名 | {screen_name or ""} | | |')
    lines.append('')

    # Additional content after row 7
    for r in range(7, min(ws.max_row, 50) + 1):
        for c in range(1, ws.max_column + 1):
            val = get_cell_value(ws, r, c, merge_origins)
            if val is not None and str(val).strip() and (r, c) not in skip_cells:
                lines.append(str(val).strip())

    lines.append('')
    lines.append('> ※ 画面イメージはExcelファイル内の画像を参照してください。')

    return '\n'.join(lines)


def convert_screen_items(ws, merge_origins, skip_cells) -> str:
    """Convert 画面項目定義 (screen item definitions) sheet."""
    lines = ['## 画面項目定義\n']

    doc_header = convert_header(ws, merge_origins)
    if doc_header:
        lines.extend(doc_header)
        lines.append('')

    # Screen info (rows 5-6)
    screen_id = get_cell_value(ws, 5, 10, merge_origins)
    screen_name = get_cell_value(ws, 6, 10, merge_origins)
    summary = get_cell_value(ws, 5, 22, merge_origins)

    lines.append(f'| 画面ID | {screen_id or ""} | 概要 | {summary or ""} |')
    lines.append(f'| 画面名 | {screen_name or ""} | | |')
    lines.append('')

    # Auto-detect column positions from header row 9 (template layout
    # is consistent across SCRs but col indexes shift if columns change)
    header_aliases = {
        'No.': 'No.', '項目名': '項目名', '項目ID': '項目ID',
        '項目タイプ': '項目タイプ', '入力/出力': '入力/出力',
        '必須': '必須', '入力データ型': '入力データ型',
        '最小桁数': '最小桁数', '最大桁数': '最大桁数', '実桁数': '実桁数',
        '文字揃え': '文字揃え', 'フォーマット': 'フォーマット',
        'テーブル名（論理名）': 'テーブル名（論理名）',
        'テーブル名（物理名）': 'テーブル名（物理名）',
        'カラム名（論理名）': 'カラム名（論理名）',
        'カラム名（物理名）': 'カラム名（物理名）',
        '表示条件': '表示条件', 'デフォルト値': 'デフォルト値', '備考': '備考',
    }
    # Header cells span multiple columns (merged). Keep only the
    # left-most column per header — the merge origin holds the value,
    # the rest are in skip_cells and would clobber the row dict back
    # to empty when iterated.
    col_map = []
    seen_headers = set()
    for c in range(1, ws.max_column + 1):
        v = get_cell_value(ws, 9, c, merge_origins)
        if v is None:
            continue
        key = str(v).strip()
        if key in header_aliases and key not in seen_headers:
            col_map.append((c, header_aliases[key]))
            seen_headers.add(key)

    # Fallback to legacy fixed layout if header row is empty/unreadable
    if not col_map:
        col_map = [
            (2, 'No.'), (3, '項目名'), (6, '項目ID'), (9, '項目タイプ'),
            (12, '入力/出力'), (14, '必須'), (15, '入力データ型'),
            (18, '最小桁数'), (20, '最大桁数'), (22, '文字揃え'),
            (24, 'フォーマット'), (28, 'テーブル名（論理名）'),
            (31, 'テーブル名（物理名）'), (34, 'カラム名（論理名）'),
            (37, 'カラム名（物理名）'), (41, '表示条件'),
            (44, 'デフォルト値'), (49, '備考'),
        ]

    # Find data rows
    max_data_row, _ = find_data_bounds(ws, merge_origins)

    # Process section by section. Start at row 10 to catch the first
    # section header (the template puts it immediately after the
    # column-header row 9).
    current_section = None
    section_items = []

    for r in range(10, max_data_row + 1):
        # Check if this is a section header (merged across full row)
        b_val = get_cell_value(ws, r, 2, merge_origins)

        # Check if row is a section header by checking merge range
        is_section = False
        for merge_range in ws.merged_cells.ranges:
            if merge_range.min_row == r and merge_range.min_col == 2:
                # Wide merge = section header
                if merge_range.max_col > 40:
                    is_section = True
                    break

        if is_section:
            # Output previous section
            if current_section and section_items:
                lines.extend(format_items_section(current_section, section_items, col_map))

            current_section = str(b_val).strip() if b_val else ''
            section_items = []
            continue

        # Regular data row
        row_data = {}
        has_data = False
        for col_idx, header in col_map:
            val = get_cell_value(ws, r, col_idx, merge_origins)
            if (r, col_idx) in skip_cells:
                val = None
            cell_str = str(val).strip() if val is not None else ''
            row_data[header] = cell_str
            if cell_str and header != 'No.':
                has_data = True

        if has_data:
            section_items.append(row_data)

    # Output last section
    if current_section and section_items:
        lines.extend(format_items_section(current_section, section_items, col_map))

    return '\n'.join(lines)


def format_items_section(section_name: str, items: list, col_map: list) -> list[str]:
    """Format a section of screen items as markdown table."""
    lines = [f'### {section_name}\n']

    # Determine which columns have data
    active_cols = []
    for _, header in col_map:
        for item in items:
            if item.get(header, '').strip():
                active_cols.append(header)
                break

    if not active_cols:
        return lines

    lines.append(f'| {" | ".join(active_cols)} |')
    lines.append(f'| {" | ".join(["---"] * len(active_cols))} |')

    for item in items:
        row = [item.get(h, '').replace('|', '\\|').replace('\n', '<br>') for h in active_cols]
        lines.append(f'| {" | ".join(row)} |')

    lines.append('')
    return lines


def convert_function_def(ws, merge_origins, skip_cells) -> str:
    """Convert 機能定義 (function definitions) sheet."""
    lines = ['## 機能定義\n']

    doc_header = convert_header(ws, merge_origins)
    if doc_header:
        lines.extend(doc_header)
        lines.append('')

    # Screen info
    screen_id = get_cell_value(ws, 5, 10, merge_origins)
    screen_name = get_cell_value(ws, 6, 10, merge_origins)
    summary = get_cell_value(ws, 5, 22, merge_origins)

    lines.append(f'| 画面ID | {screen_id or ""} | 概要 | {summary or ""} |')
    lines.append(f'| 画面名 | {screen_name or ""} | | |')
    lines.append('')

    max_data_row, _ = find_data_bounds(ws, merge_origins)

    # Section A: 機能一覧 (Function List)
    in_section_a = False
    in_section_b = False

    for r in range(9, max_data_row + 1):
        b_val = get_cell_value(ws, r, 2, merge_origins)
        c_val = get_cell_value(ws, r, 3, merge_origins)
        d_val = get_cell_value(ws, r, 4, merge_origins)

        b_str = str(b_val).strip() if b_val is not None else ''
        c_str = str(c_val).strip() if c_val is not None else ''
        d_str = str(d_val).strip() if d_val is not None else ''

        # Check for wide merged section headers
        is_wide_merge = False
        for merge_range in ws.merged_cells.ranges:
            if merge_range.min_row == r and merge_range.min_col == 2:
                if merge_range.max_col > 30:
                    is_wide_merge = True
                    break

        if is_wide_merge and b_str:
            if 'A.' in b_str or '機能一覧' in b_str:
                in_section_a = True
                in_section_b = False
                lines.append(f'### {b_str}\n')

                # Table header from next row
                h_row = r + 1
                headers = []
                h_cols = [(2, '#'), (3, '機能'), (8, '項目'), (11, 'イベント'), (14, '説明')]
                for ci, hname in h_cols:
                    val = get_cell_value(ws, h_row, ci, merge_origins)
                    headers.append(str(val).strip() if val else hname)

                lines.append(f'| {" | ".join(headers)} |')
                lines.append(f'| {" | ".join(["---"] * len(headers))} |')
                continue

            elif 'B.' in b_str or '機能詳細' in b_str:
                in_section_a = False
                in_section_b = True
                lines.append(f'\n### {b_str}\n')
                continue
            else:
                lines.append(f'\n### {b_str}\n')
                continue

        if in_section_a:
            # Skip the header row (row 10)
            if r == 10:
                continue
            # Data rows
            no = get_cell_value(ws, r, 2, merge_origins)
            func = get_cell_value(ws, r, 3, merge_origins)
            item = get_cell_value(ws, r, 8, merge_origins)
            event = get_cell_value(ws, r, 11, merge_origins)
            desc = get_cell_value(ws, r, 14, merge_origins)

            if (r, 2) in skip_cells:
                no = None
            if (r, 3) in skip_cells:
                func = None

            vals = [no, func, item, event, desc]
            has_any = any(v is not None and str(v).strip() for v in vals)
            if has_any:
                row_strs = [
                    str(v).strip().replace('|', '\\|').replace('\n', '<br>') if v is not None else ''
                    for v in vals
                ]
                lines.append(f'| {" | ".join(row_strs)} |')

        elif in_section_b:
            # Detailed function descriptions
            if not b_str and not d_str:
                continue

            # Check if it's a main item (e.g., "1", "2") or sub-item (e.g., "1.1", "1.2")
            if b_str and '.' not in b_str and d_str:
                # Main function header
                lines.append(f'\n#### {b_str}. {d_str}\n')
            elif b_str and '.' in b_str and d_str:
                # Sub-step
                d_clean = d_str.lstrip()
                lines.append(f'- **{b_str}** {d_clean}')
            elif d_str:
                d_clean = d_str.lstrip()
                lines.append(f'  - {d_clean}')

    return '\n'.join(lines)


def convert_messages(ws, merge_origins, skip_cells) -> str:
    """Convert メッセージ情報 (message definitions) sheet."""
    lines = ['## メッセージ情報\n']

    doc_header = convert_header(ws, merge_origins)
    if doc_header:
        lines.extend(doc_header)
        lines.append('')

    # Screen info
    screen_id = get_cell_value(ws, 5, 10, merge_origins)
    screen_name = get_cell_value(ws, 6, 10, merge_origins)
    summary = get_cell_value(ws, 5, 22, merge_origins)

    lines.append(f'| 画面ID | {screen_id or ""} | 概要 | {summary or ""} |')
    lines.append(f'| 画面名 | {screen_name or ""} | | |')
    lines.append('')

    # Message table header (row 9)
    lines.append('| # | メッセージコード | メッセージ内容 |')
    lines.append('| --- | --- | --- |')

    max_data_row, _ = find_data_bounds(ws, merge_origins)

    for r in range(10, max_data_row + 1):
        no = get_cell_value(ws, r, 2, merge_origins)  # B
        code = get_cell_value(ws, r, 3, merge_origins)  # C
        msg = get_cell_value(ws, r, 7, merge_origins)   # G

        if (r, 2) in skip_cells:
            no = None
        if (r, 3) in skip_cells:
            code = None
        if (r, 7) in skip_cells:
            msg = None

        if no is None and code is None and msg is None:
            continue

        no_str = str(no) if no is not None else ''
        code_str = str(code).strip() if code is not None else ''
        msg_str = str(msg).strip().replace('|', '\\|') if msg is not None else ''
        lines.append(f'| {no_str} | {code_str} | {msg_str} |')

    return '\n'.join(lines)


def convert_workbook(filepath: str) -> str:
    """Convert entire workbook to markdown.

    Output: <excel_dir>/screen-design.md (same folder as the Excel file).
    """
    wb = load_workbook(filepath)
    filename = Path(filepath).stem

    all_sections = []
    all_sections.append(f'# {filename}\n')

    sheet_converters = {
        '表紙': convert_cover_sheet,
        '変更履歴': convert_change_history,
        '目次': convert_toc,
        '画面遷移': convert_screen_transition,
        '画面イメージ': convert_screen_image,
        '画面項目定義': convert_screen_items,
        '機能定義': convert_function_def,
        'メッセージ情報': convert_messages,
    }

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        merge_origins, skip_cells = build_merge_map(ws)

        if sheet_name in sheet_converters:
            section = sheet_converters[sheet_name](ws, merge_origins, skip_cells)
        else:
            section = f'## {sheet_name}\n\n> ※ このシートは自動変換に対応していません。'

        all_sections.append(section)

    md_content = '\n\n---\n\n'.join(all_sections)

    # Output to same directory as the Excel file
    output_dir = Path(filepath).parent
    output_path = output_dir / 'screen-design.md'

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md_content)

    return str(output_path)


def main():
    if len(sys.argv) < 2:
        print(f'Usage: python {sys.argv[0]} <input.xlsx>')
        print('  Output: screen-design.md in the same folder as the Excel file.')
        sys.exit(1)

    input_file = sys.argv[1]

    if not os.path.exists(input_file):
        print(f'Error: File not found: {input_file}')
        sys.exit(1)

    output_path = convert_workbook(input_file)
    print(f'Converted: {output_path}')


if __name__ == '__main__':
    main()
