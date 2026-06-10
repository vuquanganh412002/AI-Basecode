#!/usr/bin/env python3
"""
excel_to_md.py — Convert VTI-format Excel back to API design Markdown

Guarantees round-trip consistency with md_to_excel.py.
Column positions mirror md_to_excel.py exactly.

Usage:
    python3 excel_to_md.py <input.xlsx>
    python3 excel_to_md.py <input.xlsx> <output.md>
"""

import sys
import re
from datetime import datetime
from pathlib import Path

try:
    import openpyxl
    from openpyxl.utils import column_index_from_string as _col
except ImportError:
    print("ERROR: openpyxl is required.\n  pip install openpyxl")
    sys.exit(1)

# ──────────────────────────────────────────────────────────────────────────────
# Column layout — mirrors md_to_excel.py exactly
# ──────────────────────────────────────────────────────────────────────────────

# Meta header row-2 values (same for all content sheets)
HDR = [
    (_col("A"),  "system_name"),
    (_col("J"),  "document_name"),
    (_col("Q"),  "_sheet_name"),
    (_col("V"),  "created_date"),
    (_col("Z"),  "created_by"),
    (_col("AD"), "updated_date"),
    (_col("AH"), "updated_by"),
]

# Summary table
SUMM_LSC  = _col("B")   # label start col
SUMM_VSC  = _col("J")   # value start col
HTTP_CSC  = _col("J")   # HTTP code number
HTTP_TSC  = _col("N")   # HTTP code text

# Param table col starts
PARAM_NO    = _col("B")
PARAM_ID    = _col("C")
PARAM_TYPE  = _col("M")
PARAM_REP   = _col("Q")
PARAM_REQ   = _col("T")
PARAM_MIN   = _col("Y")
PARAM_MAX   = _col("AC")
PARAM_DESC  = _col("AF")

# Response table col starts
RESP_NO     = _col("B")
RESP_FID_T  = _col("C")   # top-level field_id
RESP_FID_N  = _col("D")   # nested field_id
RESP_TYPE   = _col("M")
RESP_REP    = _col("Q")
RESP_FMT    = _col("T")
RESP_NULL   = _col("Y")
RESP_DESC   = _col("AF")

# Changelog col starts
CH_NO    = _col("A")
CH_DATE  = _col("C")
CH_VER   = _col("H")
CH_AUTH  = _col("K")
CH_DESC  = _col("R")
CH_REV   = _col("W")
CH_APP   = _col("AB")

# Error col starts
ERR_NO   = _col("A")
ERR_TYPE = _col("C")
ERR_CODE = _col("J")
ERR_MSG  = _col("V")

# API list col starts
AL_NO    = _col("A")
AL_ID    = _col("C")
AL_NAME  = _col("J")
AL_DESC  = _col("S")
AL_URI   = _col("AD")

# Cover metadata box
COV_VAL  = _col("S")   # value col in metadata box rows 18-20
COV_ROWS = {
    "format_code":    18,
    "format_version": 19,
    "issue_date":     20,
}

FILL_HEADER_BLUE = "FFB4C6E7"
NON_API_SHEETS   = {"表紙", "変更履歴", "概要", "エラー一覧", "API一覧"}


# ──────────────────────────────────────────────────────────────────────────────
# Low-level helpers
# ──────────────────────────────────────────────────────────────────────────────

def _v(ws, row, col):
    """Return effective cell value as string (handles merged cells + dates)."""
    cell = ws.cell(row=row, column=col)
    val  = cell.value
    if val is None:
        for rng in ws.merged_cells.ranges:
            if rng.min_row <= row <= rng.max_row and rng.min_col <= col <= rng.max_col:
                val = ws.cell(row=rng.min_row, column=rng.min_col).value
                break
    if val is None:
        return ""
    if isinstance(val, datetime):
        return val.strftime("%Y/%m/%d")
    # Preserve "1.0" as "1.0" not "1" (openpyxl returns float for numeric cells)
    if isinstance(val, float) and val == int(val):
        return f"{val:.1f}"
    return str(val).strip()


def _raw(ws, row, col):
    """Return raw cell value (None if cell is not the merge top-left)."""
    return ws.cell(row=row, column=col).value


def _bold(ws, row, col):
    f = ws.cell(row=row, column=col).font
    return bool(f and f.bold)


def _has_left_border(ws, row, col):
    b = ws.cell(row=row, column=col).border
    return bool(b and b.left and b.left.style)


def _fill(ws, row, col):
    f = ws.cell(row=row, column=col).fill
    if f and f.fill_type == "solid" and f.fgColor:
        return f.fgColor.rgb
    return None


def _merge_end_row(ws, start_row, col):
    """Find the bottom row of a vertical merge at (start_row, col)."""
    for rng in ws.merged_cells.ranges:
        if rng.min_row == start_row and rng.min_col <= col <= rng.max_col:
            return rng.max_row
    return start_row


def _merge_end_col(ws, row, start_col):
    """Find the rightmost col of a horizontal merge at (row, start_col)."""
    for rng in ws.merged_cells.ranges:
        if rng.min_row == row and rng.max_row == row and rng.min_col == start_col:
            return rng.max_col
    return start_col


# ──────────────────────────────────────────────────────────────────────────────
# Meta header reader (rows 1-3, all content sheets)
# ──────────────────────────────────────────────────────────────────────────────

def read_meta(ws):
    """Read meta header values from row 2."""
    return {key: _v(ws, 2, sc) for sc, key in HDR}


# ──────────────────────────────────────────────────────────────────────────────
# Cover page
# ──────────────────────────────────────────────────────────────────────────────

def read_cover(wb, input_path):
    data = {}
    if "表紙" in wb.sheetnames:
        ws = wb["表紙"]
        for key, r in COV_ROWS.items():
            data[key] = _v(ws, r, COV_VAL)

    # Extract customer_name from filename: 【customer_name】VTIジャパン_...
    m = re.match(r"【(.+?)】", input_path.stem)
    data["customer_name"] = m.group(1) if m else "日本農業新聞様"
    return data


# ──────────────────────────────────────────────────────────────────────────────
# 変更履歴
# ──────────────────────────────────────────────────────────────────────────────

def read_changelog(wb):
    if "変更履歴" not in wb.sheetnames:
        return []
    ws  = wb["変更履歴"]
    rows = []
    r = 2
    while r <= ws.max_row:
        no = _v(ws, r, CH_NO)
        if not no:
            break
        rows.append({
            "no":          no,
            "date":        _v(ws, r, CH_DATE),
            "version":     _v(ws, r, CH_VER),
            "author":      _v(ws, r, CH_AUTH),
            "description": _v(ws, r, CH_DESC),
            "reviewer":    _v(ws, r, CH_REV),
            "approver":    _v(ws, r, CH_APP),
        })
        r += 1
    return rows


# ──────────────────────────────────────────────────────────────────────────────
# 概要
# ──────────────────────────────────────────────────────────────────────────────

def read_overview(wb):
    if "概要" not in wb.sheetnames:
        return [], [], []
    ws = wb["概要"]
    sys_lines     = []
    purpose_lines = []
    related       = []
    state         = None
    r = 5

    while r <= ws.max_row:
        b = _v(ws, r, _col("B"))

        if "システム概要" in b:
            state = "sys"; r += 1; continue
        elif "資料目的" in b:
            state = "purpose"; r += 1; continue
        elif "関連資料" in b:
            state = "related"; r += 1; continue

        if state == "sys":
            c = _v(ws, r, _col("C"))
            if c:
                sys_lines.append(c)

        elif state == "purpose":
            c = _v(ws, r, _col("C"))
            if c:
                purpose_lines.append(c)

        elif state == "related":
            no = _v(ws, r, _col("C"))
            if no == "No":          # skip header
                r += 1; continue
            if no and no.isdigit():
                related.append({
                    "code": _v(ws, r, _col("D")),
                    "name": _v(ws, r, _col("O")),
                })

        r += 1

    return sys_lines, purpose_lines, related


# ──────────────────────────────────────────────────────────────────────────────
# エラー一覧
# ──────────────────────────────────────────────────────────────────────────────

def read_errors(wb):
    if "エラー一覧" not in wb.sheetnames:
        return []
    ws = wb["エラー一覧"]
    errors = []
    r = 6   # rows 1-3: meta, 4: blank, 5: header, 6+: data
    while r <= ws.max_row:
        no = _v(ws, r, ERR_NO)
        if not no:
            break
        errors.append({
            "error_type":    _v(ws, r, ERR_TYPE),
            "error_code":    _v(ws, r, ERR_CODE),
            "error_message": _v(ws, r, ERR_MSG),
        })
        r += 1
    return errors


# ──────────────────────────────────────────────────────────────────────────────
# API detail sheet
# ──────────────────────────────────────────────────────────────────────────────

def read_api_detail(ws):
    max_row = ws.max_row

    # ── 1. Summary table ─────────────────────────────────────────────────────
    # Find first row with HEADER_BLUE fill in col B (start of summary table)
    summary    = {}
    http_codes = []
    r = 5

    while r <= max_row and _fill(ws, r, SUMM_LSC) != FILL_HEADER_BLUE:
        r += 1

    while r <= max_row and _fill(ws, r, SUMM_LSC) == FILL_HEADER_BLUE:
        label = _v(ws, r, SUMM_LSC)
        if not label:
            r += 1; continue

        if label == "HTTPレスポンスコード":
            end_row = _merge_end_row(ws, r, SUMM_LSC)
            for cr in range(r, end_row + 1):
                code = _v(ws, cr, HTTP_CSC)
                text = _v(ws, cr, HTTP_TSC)
                if code:
                    http_codes.append((code, text))
            r = end_row + 1
        else:
            # Restore \\n escape (md_to_excel replaces \\n → \n when writing)
            summary[label] = _v(ws, r, SUMM_VSC).replace('\n', '\\n')
            r += 1

    # ── 2. Request params ─────────────────────────────────────────────────────
    params = []
    while r <= max_row and _v(ws, r, PARAM_ID) != "パラメーターID":
        r += 1
    r += 1   # skip header row

    while r <= max_row:
        no = _v(ws, r, PARAM_NO)
        if not no:
            break
        params.append({
            "no":          no,
            "param_id":    _v(ws, r, PARAM_ID),
            "type":        _v(ws, r, PARAM_TYPE),
            "repeat":      _v(ws, r, PARAM_REP),
            "required":    _v(ws, r, PARAM_REQ),
            "min_len":     _v(ws, r, PARAM_MIN),
            "max_len":     _v(ws, r, PARAM_MAX),
            "description": _v(ws, r, PARAM_DESC),
        })
        r += 1

    # ── 3. Response fields ────────────────────────────────────────────────────
    resp_fields = []
    while r <= max_row and _v(ws, r, RESP_FID_T) != "項目ID":
        r += 1
    r += 1   # skip header row

    while r <= max_row:
        no = _v(ws, r, RESP_NO)
        if not no:
            break

        # Detect nested: raw col C is None (part of vertical merge), col D has value
        c_raw = _raw(ws, r, RESP_FID_T)
        d_val = _raw(ws, r, RESP_FID_N)
        if c_raw is None and d_val is not None:
            field_id = "→" + str(d_val).strip()
        else:
            field_id = _v(ws, r, RESP_FID_T)

        resp_fields.append({
            "no":          no,
            "field_id":    field_id,
            "type":        _v(ws, r, RESP_TYPE),
            "repeat":      _v(ws, r, RESP_REP),
            "format":      _v(ws, r, RESP_FMT),
            "nullable":    _v(ws, r, RESP_NULL),
            "description": _v(ws, r, RESP_DESC),
        })
        r += 1

    # ── Examples ─────────────────────────────────────────────────────────────
    request_example = ""
    response_success = ""
    response_errors  = []

    while r <= max_row:
        b = _v(ws, r, _col("B"))
        a = _v(ws, r, _col("A"))

        if "処理手順" in (a + b):
            break

        if not b:
            r += 1; continue

        # Example label: bold in col B, merge ends at col I (not AK)
        end_col = _merge_end_col(ws, r, _col("B"))
        if _bold(ws, r, _col("B")) and end_col <= _col("I"):
            label   = b
            r      += 1
            content = _v(ws, r, _col("C"))

            if label == "リクエスト":
                request_example = content
            elif label == "レスポンス（成功）":
                response_success = content
            elif "失敗" in label:
                m = re.search(r"失敗\s+(.+?)）", label)
                fail_label = m.group(1) if m else label
                response_errors.append((fail_label, content))

        r += 1

    # ── Steps (処理手順) ──────────────────────────────────────────────────────
    steps = []
    current = None

    # Skip to section title "4. 処理手順"
    while r <= max_row:
        if "処理手順" in (_v(ws, r, _col("A")) + _v(ws, r, _col("B"))):
            r += 1; break
        r += 1

    while r <= max_row:
        b = _v(ws, r, _col("B"))
        c = _v(ws, r, _col("C"))
        d = _v(ws, r, _col("D"))

        if not b and not c and not d:
            r += 1; continue

        if b and _bold(ws, r, _col("B")):
            # Step title
            if current:
                steps.append(current)
            current = {"title": b, "items": []}

        elif current:
            if _has_left_border(ws, r, _col("C")) and c:
                # Bordered code block
                current["items"].append({"type": "code", "text": c})
            elif c:
                # Regular bullet (indent 1) — raw col C has value
                if _raw(ws, r, _col("C")) is not None:
                    current["items"].append({"type": "text", "indent": 1, "text": c})
                elif d:
                    # Indent 2: col C is empty raw cell, col D has value
                    current["items"].append({"type": "text", "indent": 2, "text": d})
            elif _raw(ws, r, _col("C")) is None and d:
                # Indent 2: only col D has value
                current["items"].append({"type": "text", "indent": 2, "text": d})

        r += 1

    if current:
        steps.append(current)

    return {
        "api_id":             ws.title,
        "api_name":           summary.get("API名", ""),
        "summary_desc":       summary.get("概要", ""),
        "uri":                summary.get("URI", ""),
        "method":             summary.get("メソッド", ""),
        "request_body":       summary.get("リクエストボディー", ""),
        "request_params_str": summary.get("リクエストパラメーター", ""),
        "header":             summary.get("ヘッダ", ""),
        "http_codes":         http_codes,
        "params":             params,
        "response_fields":    resp_fields,
        "request_example":    request_example,
        "response_success":   response_success,
        "response_errors":    response_errors,
        "steps":              steps,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Markdown builder
# ──────────────────────────────────────────────────────────────────────────────

def build_md(wb, input_path):
    # Collect meta from a sheet that has the meta header (変更履歴 does NOT have it)
    meta = {}
    for sheet in ("概要", "エラー一覧", "API一覧"):
        if sheet in wb.sheetnames:
            meta = read_meta(wb[sheet])
            break

    cover = read_cover(wb, input_path)
    meta.update(cover)

    changelogs               = read_changelog(wb)
    sys_lines, purpose_lines, related = read_overview(wb)
    errors                   = read_errors(wb)

    # Extract screen_name / screen_id from resolved purpose line
    screen_name = meta.get("screen_name", "")
    screen_id   = meta.get("screen_id", "")
    for line in purpose_lines:
        m = re.search(r"「(.+?)（(.+?)）」", line)
        if m:
            screen_name = m.group(1)
            screen_id   = m.group(2)
            break

    # Extract screen number (e.g. "002" from "ACSMS-SCR-002") for API ID placeholder
    screen_number_match = re.search(r'(\d+)$', screen_id)
    screen_number = screen_number_match.group(1) if screen_number_match else ""

    # API detail sheets (all sheets not in the fixed set)
    apis = [
        read_api_detail(wb[s])
        for s in wb.sheetnames
        if s not in NON_API_SHEETS
    ]

    L = []   # output lines

    # ── Frontmatter ───────────────────────────────────────────────────────────
    L += [
        "---",
        f"customer_name: {meta.get('customer_name', '日本農業新聞様')}",
        f"system_name: {meta.get('system_name', '')}",
        f"document_name: {meta.get('document_name', '')}",
        f"screen_id: {screen_id}",
        f"screen_name: {screen_name}",
        f"format_code: {meta.get('format_code', '18-BM/PM/VTI')}",
        f'format_version: "{meta.get("format_version", "1.0")}"',
        f"issue_date: {meta.get('issue_date', '').replace('/', '-')}",
        f"created_date: {meta.get('created_date', '')}",
        f"created_by: {meta.get('created_by', '')}",
        f"updated_date: {meta.get('updated_date', '')}",
        f"updated_by: {meta.get('updated_by', '')}",
        "---", "",
    ]

    # ── 変更履歴 ──────────────────────────────────────────────────────────────
    issue_date_slash = meta.get('issue_date', '')          # yyyy/mm/dd from Excel
    issue_date_dash  = issue_date_slash.replace('/', '-')  # yyyy-mm-dd for matching
    L += ["## 変更履歴", "",
          "| No | 発行日 | 版数 | 担当者 | 変更内容 | 確認者 | 承認者 |",
          "|---|---|---|---|---|---|---|"]
    for ch in changelogs:
        # Restore {issue_date} placeholder when the changelog date matches issue_date
        ch_date = ch['date']
        if issue_date_slash and ch_date in (issue_date_slash, issue_date_dash):
            ch_date = '{issue_date}'
        L.append(f"| {ch['no']} | {ch_date} | {ch['version']} | {ch['author']} | {ch['description']} | {ch['reviewer']} | {ch['approver']} |")
    L.append("")

    # ── システム概要 ──────────────────────────────────────────────────────────
    L += ["## システム概要", ""]
    L += sys_lines
    L.append("")

    # ── 資料目的 (restore placeholders) ──────────────────────────────────────
    L += ["## 資料目的", ""]
    for line in purpose_lines:
        restored = line
        if screen_name:
            restored = restored.replace(screen_name, "{screen_name}")
        if screen_id:
            restored = restored.replace(screen_id, "{screen_id}")
        L.append(restored)
    L.append("")

    # ── 関連資料 ──────────────────────────────────────────────────────────────
    L += ["## 関連資料", "",
          "| No | 資料コード | 資料名 |",
          "|---|---|---|"]
    for rd in related:
        L.append(f"| {rd.get('no','')} | {rd.get('code','')} | {rd.get('name','')} |")
    L.append("")

    # ── エラー一覧 ────────────────────────────────────────────────────────────
    L += ["## エラー一覧", "",
          "| # | エラータイプ | エラーコード | エラーメッセージ |",
          "|---|---|---|---|"]
    for i, e in enumerate(errors, 1):
        L.append(f"| {i} | {e['error_type']} | {e['error_code']} | {e['error_message']} |")
    L.append("")

    # ── API sections ──────────────────────────────────────────────────────────
    for api in apis:
        # Restore {screen_number} placeholder in API ID
        # e.g. "ACSMS-API-002-001" → "ACSMS-API-{screen_number}-001"
        api_id_display = api['api_id']
        if screen_number:
            api_id_display = re.sub(
                r'(ACSMS-API-)' + re.escape(screen_number) + r'(-)',
                r'\1{screen_number}\2',
                api_id_display,
            )
        L += ["---", "", f"# API {api_id_display}", ""]

        # 概要
        http_str = ", ".join(f"{c}:{t}" for c, t in api["http_codes"])
        L += [
            "## 概要", "",
            "| 項目 | 内容 |", "|---|---|",
            f"| API名 | {api['api_name']} |",
            f"| 概要 | {api['summary_desc']} |",
            f"| URI | {api['uri']} |",
            f"| メソッド | {api['method']} |",
            f"| リクエストボディー | {api['request_body']} |",
            f"| リクエストパラメーター | {api['request_params_str']} |",
            f"| ヘッダ | {api['header']} |",
            f"| HTTPレスポンスコード | {http_str} |",
            "",
        ]

        # リクエストパラメータ
        L += [
            "## リクエストパラメータ", "",
            "| # | パラメーターID | タイプ | 繰り返し | 必須 | 最小長 | 最大長 | 説明 |",
            "|---|---|---|---|---|---|---|---|",
        ]
        for p in api["params"]:
            L.append(f"| {p['no']} | {p['param_id']} | {p['type']} | {p['repeat']} | {p['required']} | {p['min_len']} | {p['max_len']} | {p['description']} |")
        L.append("")

        # レスポンスデータ
        L += [
            "## レスポンスデータ", "",
            "| # | 項目ID | タイプ | 繰り返し | フォーマット | Nullable | 説明 |",
            "|---|---|---|---|---|---|---|",
        ]
        for f in api["response_fields"]:
            L.append(f"| {f['no']} | {f['field_id']} | {f['type']} | {f['repeat']} | {f['format']} | {f['nullable']} | {f['description']} |")
        L.append("")

        # リクエスト例
        if api["request_example"]:
            L += ["## リクエスト例", "", "```", api["request_example"], "```", ""]

        # レスポンス成功例
        if api["response_success"]:
            L += ["## レスポンス成功例", "", "```json", api["response_success"], "```", ""]

        # レスポンス失敗例
        if api["response_errors"]:
            L += ["## レスポンス失敗例", ""]
            for label, code in api["response_errors"]:
                L += [f"### {label}", "```json", code, "```", ""]

        # 処理手順
        L += ["## 処理手順", ""]
        for step in api["steps"]:
            L.append(f"### {step['title']}")
            for item in step["items"]:
                if item["type"] == "code":
                    L += ["```sql", item["text"], "```"]
                else:
                    prefix = "  - " if item.get("indent", 1) == 2 else "- "
                    L.append(f"{prefix}{item['text']}")
            L.append("")

    return "\n".join(L)


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Convert VTI Excel back to API design MD")
    parser.add_argument("input",  help="Input .xlsx file")
    parser.add_argument("output", nargs="?", help="Output .md file (optional)")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)

    print(f"Reading: {input_path.name} ...")
    wb = openpyxl.load_workbook(str(input_path), data_only=True)

    md = build_md(wb, input_path)

    output_path = Path(args.output) if args.output else input_path.with_suffix(".md")
    output_path.write_text(md, encoding="utf-8")
    print(f"✓  Saved: {output_path}")


if __name__ == "__main__":
    main()
