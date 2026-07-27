# Scripts - Usage Guide

Conversion scripts between Excel (VTI format) and Markdown for the agri-ai project.

## Prerequisites

### 1. Install Python 3

**macOS:**
```bash
brew install python3
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install python3 python3-pip
```

**Windows:**

Download and install from [python.org](https://www.python.org/downloads/). Check "Add Python to PATH" during installation.

### 2. Install dependencies via pip

```bash
pip install openpyxl
```

---

## Scripts

### 1. API Design: Excel <-> Markdown

#### `api_excel_to_md.py` — Excel -> Markdown

Convert VTI-format API design Excel to Markdown.

```bash
python3 api_excel_to_md.py <input.xlsx>
python3 api_excel_to_md.py <input.xlsx> <output.md>
```

- If output is not specified, the `.md` file is created in the same directory as the input.

#### `api_md_to_excel.py` — Markdown -> Excel

Convert API design Markdown back to VTI-format Excel.

```bash
python3 api_md_to_excel.py <input.md>
python3 api_md_to_excel.py <input.md> <output.xlsx>
python3 api_md_to_excel.py <input.md> --author "Tran Duc Tuyen"
```

- If output is not specified, the `.xlsx` file is created in the same directory as the input.
- `--author` option: specify the author name displayed in the Excel file.

---

### 2. Database Design: Excel <-> Markdown

#### `db_excel_to_md.py` — Excel -> Markdown

Convert VTI-format database design Excel to Markdown.

```bash
python3 db_excel_to_md.py <input.xlsx>
python3 db_excel_to_md.py <input.xlsx> <output.md>
```

- If output is not specified, the file is saved as `database-design.md` in the same directory.

#### `db_md_to_excel.py` — Markdown -> Excel

Convert database design Markdown back to VTI-format Excel.

```bash
python3 db_md_to_excel.py <input.md>
python3 db_md_to_excel.py <input.md> --author "Tran Duc Tuyen"
```

- Output filename follows VTI pattern: `【{customer}】VTIジャパン_{system}_{document}_V{version}.xlsx`
- `--author` option: specify the author name displayed in the Excel file.

---

### 3. Requirement: Excel -> Markdown

#### `req_excel_to_md.py` — Excel -> Markdown

Read requirement Excel files and generate a separate `.md` file per sheet.

```bash
python3 req_excel_to_md.py <input.xlsx>
python3 req_excel_to_md.py <input.xlsx> -o ./output
python3 req_excel_to_md.py ./data/*.xlsx -o ./docs/modules
```

- Supports multiple input files (glob patterns).
- `-o` option: specify output directory (defaults to the same directory as input).
- Output structure:
  ```
  output_dir/
    excel-filename/
      sheet-name.md
  ```

---

### 4. Screen Design: Excel -> Markdown

#### `screen_excel_to_md.py` — Excel -> Markdown

Convert screen design Excel to Markdown. Handles merged cells to avoid duplicate content.

```bash
python3 screen_excel_to_md.py <input.xlsx>
python3 screen_excel_to_md.py <input.xlsx> <output_dir>
```

- If output_dir is not specified, files are created in the same directory as the Excel file.

---

## Examples

```bash
# Convert API design from Excel to Markdown
python3 scripts/api_excel_to_md.py docs/design/ACSMS-SCR-001/api-design.xlsx

# Convert API design from Markdown back to Excel
python3 scripts/api_md_to_excel.py docs/design/ACSMS-SCR-001/api-design.md --author "Tran Duc Tuyen"

# Convert DB design from Excel to Markdown
python3 scripts/db_excel_to_md.py docs/database/database-design.xlsx

# Convert DB design from Markdown back to Excel
python3 scripts/db_md_to_excel.py docs/database/database-design.md --author "Tran Duc Tuyen"

# Convert all requirement Excel files to Markdown
python3 scripts/req_excel_to_md.py docs/requirements/*.xlsx -o docs/requirements/md

# Convert screen design Excel to Markdown
python3 scripts/screen_excel_to_md.py "docs/design/ACSMS-SCR-001/【日本農業新聞様】VTIジャパン_クラウド版購読者管理システム_画面設計書_ログイン画面_v1.1.xlsx"
```

## Notes

- All scripts require Python 3 and the `openpyxl` library.
- The `*_excel_to_md.py` and `*_md_to_excel.py` pairs guarantee round-trip consistency (no data loss when converting back and forth).
- Excel files follow the VTI template format (游ゴシック font, blue headers).
