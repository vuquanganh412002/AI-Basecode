---
name: sync-design-xlsx
description: Sync a customer screen-design Excel workbook (画面設計書 .xlsx) with the implemented code, applying the VTI review markup convention — everything VTI writes in red (#FF0000) and strikes out in dark orange (#E69138): a wrong fragment struck with the correction right after it, a wrong whole line struck with the correction on a fresh line beneath, additions in red, and a '{M/D} VTI追記' marker in column A of every touched row. Use when asked to update/re-check a 設計書 .xlsx against the code for a screen (ACSMS-SCR-XXX). Accepts an optional document kind, version, or explicit file path when the screen folder holds several workbooks.
disable-model-invocation: true
argument-hint: "ACSMS-SCR-XXX [画面設計書|API設計書|テスト仕様書] [vX.Y] | <path/to/file.xlsx>"
---

# Sync Customer Design Workbook With Code

## Description

The customer's `docs/design/ACSMS-SCR-XXX/*.xlsx` design documents are a
separate lineage from our internal `screen-design.md` and drift behind the
implementation. This skill diffs the workbook against the shipped code and
writes the corrections back **in place**, using the review markup convention the
customer expects, without disturbing anything else in the file.

The workbook is a customer deliverable — layout fidelity matters as much as
content. Most of this skill is about not breaking it.

---

## Arguments — which workbook gets edited

A screen folder holds three document kinds and often several versions of each
(`docs/design/ACSMS-SCR-022/` has seven `.xlsx` files; SCR-007 carries 画面設計書
at both v1.2 and v1.3). Editing the wrong one corrupts a deliverable that was
never meant to change, so the target is resolved explicitly and **never
guessed**.

```bash
python3 scripts/resolve_target.py <screen|path> [kind] [version] [--latest]
```

| Invocation | Resolves to |
|---|---|
| `/sync-design-xlsx ACSMS-SCR-005` | the only 画面設計書 in that folder |
| `/sync-design-xlsx ACSMS-SCR-022 v1.2` | 画面設計書 v1.2 |
| `/sync-design-xlsx ACSMS-SCR-007 画面設計書 v1.3` | that exact file |
| `/sync-design-xlsx ACSMS-SCR-022 API設計書 --latest` | highest API設計書 version |
| `/sync-design-xlsx docs/design/…/foo.xlsx` | verbatim — wins over every other token |

Rules the resolver enforces:

- **Kind defaults to 画面設計書** — the skill's purpose. Pass `API設計書` or
  `テスト仕様書` to override.
- Screen id accepts `ACSMS-SCR-022`, `SCR-022`, `022` or `22`.
- Version token accepts `v1.2` or `1.2`, and matches the file's `_v1.2` /
  `_V1.2` case-insensitively.
- **Ambiguity is an error, not a coin flip** — exit code 2 with the candidate
  list. Show that list to the user and ask which one; only pass `--latest` when
  they said "the latest version".
- Exit 1 when nothing matched, printing every file in the folder — usually means
  the screen has no workbook of that kind (SCR-020 has no 画面設計書 at all).
- An explicit path is the escape hatch for the filenames carrying typos or a
  stray space before `.xlsx` (SCR-012, SCR-017).

**State the resolved filename to the user before writing anything**, and repeat
it in the final report. When a folder held other versions, say which ones were
left untouched.

## Markup convention (MANDATORY)

**Colour says whether text came out or went in.** Black is the customer's own
untouched text. Everything this skill **writes** — corrections, additions,
renumbering, the column-A marker — is **red** (`ADDITION`, ARGB `FFFF0000`).
Text it **strikes out** that an earlier VTI pass had written is re-emitted in
**dark orange 1, `#E69138`** (`ACCENT`), so a reader scanning the sheet sees
red for what the document now says and struck orange for what it used to say.
Striking the customer's own black text leaves it black. Both constants live at
the top of `xlsx_markup.py` and can be overridden per run with
`configure(color='FF…', add_color='FF…')`; no helper hard-codes a colour.

**How much text is wrong decides the shape of the correction.** A fragment is
corrected in place so the surrounding sentence still reads; a whole line is
corrected on its own new line, because two full sentences run together on one
wrapped line are unreadable in a narrow merged column.

| Situation | Rendering | Helper |
|---|---|---|
| **Fragment** wrong inside a sentence | strike just that fragment, correction **immediately after it, same line**; the rest of the sentence stays black | `revise_part()` |
| **One whole line** of a multi-line cell wrong | strike that line, correction on a **fresh line directly beneath it**; the other lines stay black | `revise_line()` |
| **The cell's entire text** wrong (single-line cell) | strike it, correction on a **fresh line beneath** | `revise()` |
| **New paragraph** added to an existing cell | old stays black, new text on its **own line** | `add_line()` |
| Content **added** (new cell / new row) | whole content red | `set_accent()` |
| Clause tacked onto the end of a line | old stays black, addition **on the same line** | `append_accent()` |
| Mixed runs in one cell | explicit run list | `rich()` |
| **No. / sequence column** renumbered | new number red, **no strike, old number deleted** | `renumber()` |
| Every touched row | `'{M/D} VTI追記'` — small (6pt), red — in **column A** | `mark()` (auto) |

Pick by what the reader needs in order to follow the change:

```
revise_part   対象データを抽出する。~~rireki_no が最大のもの~~同日の全履歴を累計したもの を1件採用する。
revise_line   ~~2) 管理支店を選択する~~
              2) 管理支店を選択する（必須・複数選択可）      ← red, own line
```

Do not use `revise_part` to swap out most of a line — the struck and corrected halves
interleave into one long run of text nobody can diff by eye. Once the correction
is a sentence rather than a term, it belongs on its own line.

The No. column is the one exception to strike-through: a superseded sequence
number carries no information, so striking it only adds noise.

Correcting a cell an earlier revision already touched keeps that revision's
markup: its addition is struck **in the strike colour** (`accent_strike`)
rather than flattened to black, so the review history stays legible across
passes. Earlier passes wrote their additions in red (`FFFF0000` — the same red
this skill now writes) or, in 2026-08, dark cyan (`FF45818E`); both are listed
in `LEGACY_ACCENTS`, so when such a run is superseded it turns orange and
struck, and the replacement goes in red below it. Markup left in cells this
pass does not touch keeps whatever colour it already had.

**The 変更履歴 sheet takes no review markup at all.** It is a revision log, not
reviewed content — add a plain row cloned from the previous row's style
(`clone_row_style()`), and no `VTI追記` marker. Fill 担当者 / 確認者 / 承認者
from the project's convention (担当者 = the author, 確認者 / 承認者 = the
reviewer named on the earlier rows).

---

## The openpyxl hazards (read before writing any code)

These all cost real debugging time. Every one is handled by the scripts in
`scripts/`, but only if you use them.

### 1. `wb.save()` widens every column — ALWAYS run `restore_cols.py` after

openpyxl materialises a `ColumnDimension` (default width **13**) for every
column it touches and serialises them all. A sheet whose source `<cols>` had
five entries at width 4.0 comes back with dozens of entries at width 13, and it
also injects `style="115"` that the original never had. Visually the whole
document blows up.

There is no openpyxl-side fix — patch the XML instead:

```bash
python3 scripts/restore_cols.py ORIGINAL_BACKUP.xlsx TARGET.xlsx
```

Run it after **every** save, including saves made by `autofit_rows.py`. It
copies the original `<cols>` and `<sheetFormatPr>` blocks back in and rewrites
the zip, leaving all other entries byte-for-byte identical.

### 2. `load_workbook` without `rich_text=True` destroys existing markup

Always `load_workbook(path, rich_text=True)`. Without it, any rich text — the
customer's own, or markup from a previous pass — is flattened to plain text and
silently lost on save.

### 3. `insert_rows()` does not move merged ranges or row heights

Cell values shift; merges and heights stay put, so every merged block below the
insertion point ends up attached to the wrong row. Use `insert_rows_keep()`,
which snapshots merges first, shifts/expands them, then clones the template
row's style, height and merge spans onto the new rows.

Derive the template's merge spans from the **pre-unmerge snapshot** — reading
`ws.merged_cells` after unmerging returns nothing and the new rows get no
merges.

### 4. Excel never auto-fits a row containing merged cells

Body cells in these documents are merged spans with `wrap_text`, so a row whose
text grew keeps its old height and clips. Recompute explicitly with
`autofit_rows.autofit(ws, rows, floor)`.

Its line-count model must be **font-aware** (column-width units are expressed in
the workbook default font, so a 6pt marker fits far more per line than 9pt body
text) and **East-Asian-width aware** (full-width kana cost 2 units). Flatten
rich text to one string *before* splitting on `\n` — rounding each run up to a
whole line counts continuation runs as extra lines and inflates heights
absurdly.

### 5. Numeric cells: match the neighbouring rows' type

Under the General format `9.0` renders as `9`, so a float written next to string
`'9'` looks identical while sorting and comparing differently. Check
`type(ws.cell(r, c).value)` on an adjacent row and match it.

### 6. Column A is not always a margin

On some sheets (e.g. 変更履歴) column A *is* the No. column — stamping the
marker there corrupts the data. Inspect the header row before calling `mark()`.

### 7. What the round-trip loses regardless

Empty drawing shells and `xl/metadata`; `''` normalises to `None`. Embedded
images survive. Verify with `verify_xlsx.py` and confirm the media count.

---

## Workflow

### Step 1 — resolve the target, back up, then survey

```bash
TARGET=$(python3 scripts/resolve_target.py ACSMS-SCR-022 v1.2) || exit
cp "$TARGET" "$SCRATCH/ORIGINAL_BACKUP.xlsx"
```

If the resolver exits 2, stop and ask the user which candidate to use.

Never skip this: `restore_cols.py` and `verify_xlsx.py` both diff against it.

Dump the structure before editing — sheet names, header rows, merged ranges,
which column holds No., and any pre-existing rich text you must not clobber:

```python
wb = load_workbook(path, rich_text=True)
for ws in wb.worksheets:
    print(ws.title, ws.dimensions, sorted(str(m) for m in ws.merged_cells.ranges)[:20])
```

### Step 2 — read the implementation

Read the real behaviour, not our internal markdown, which may itself be stale:

- BE: `apps/backend/src/modules/<module>/` — controller (routes, `@Permissions`,
  throttle), service (DataScope, guards, audit logging, transaction shape), DTOs
  (accepted params, validation, limits), entity (columns, nullability).
- FE: `apps/frontend/src/views/<module>/*.vue`, the composables it uses, and the
  API wrapper at `src/api/<tag>/<tag>.ts` — which filters actually exist in the
  UI, column list, message literals, role-based enable/disable.
- Cross-check message literals project-wide with grep before "correcting" one;
  a doc/code mismatch is often the doc following an older convention.

### Step 3 — apply markup

```python
import sys; sys.path.insert(0, '.claude/skills/sync-design-xlsx/scripts')
from xlsx_markup import (configure, mark, revise, revise_part, revise_line,
                         add_line, set_accent, append_accent, rich, renumber,
                         insert_rows_keep, clone_row_style, read_runs, plain)

configure(mark='8/18 VTI追記', font='Meiryo', size=9)   # match the sheet's body font
                                       # colours: ACCENT strike / ADDITION red
wb = load_workbook(path, rich_text=True)
ws = wb['画面項目定義']

revise_part(ws, 17, 3, 'HH:ss', 'HH:mm')       # fragment — struck, correction inline
revise_line(ws, 22, 5, '未選択の場合', '必須選択。「全て」で全件出力')  # one line of many
revise(ws, 19, 3, 'ダウンロード日時')          # whole single-line cell → line below
add_line(ws, 23, 5, '紙版（購読種別=1）のみ対象。')   # new paragraph, own line
set_accent(ws, 21, 3, 'ダウンロード種別')      # pure addition (empty/new cell)
renumber(ws, 24, 2, 11)                        # No. column — coloured, no strike
insert_rows_keep(ws, 21, 2, template_row=20)   # merge/height-safe insert
wb.save(path)
```

`revise_part` / `revise_line` refuse to act when the search text is missing, or
matches more than one place and no `occurrence` / index was given — quietly
editing the wrong copy of a repeated phrase is worse than stopping. Use `plain(cell)`
to read a cell's flattened text when picking the fragment.

Work sheet by sheet. Insert rows **bottom-up** within a sheet so earlier
insertions don't shift the indices you computed for later ones.

### Step 4 — refit row heights

`revise()`, `revise_line()` and `add_line()` each add a line to the cell, so
every row they touched has to be in this list or its new text is clipped.

```python
from autofit_rows import autofit
autofit(ws, rows=[13, 14, 17, 21, 22], floor=28.5)   # floor = section body height
wb.save(path)
```

**Grow only** — take `max(current, computed)`. The customer has hand-sized rows
that the model would otherwise shrink, re-laying-out parts of the document this
sync never touched.

### Step 5 — restore column widths (never skip)

```bash
python3 scripts/restore_cols.py "$SCRATCH/ORIGINAL_BACKUP.xlsx" "<workbook>.xlsx"
```

### Step 6 — 変更履歴 row

Append a revision row: No (matching the neighbours' type), 発行日 (today),
版数 (bumped), 担当者, 変更内容 (summary per sheet), 確認者, 承認者. Clone the
previous row's style so it is black like the rest, and do **not** mark it.

### Step 7 — verify

```bash
python3 scripts/verify_xlsx.py "$SCRATCH/ORIGINAL_BACKUP.xlsx" "<workbook>.xlsx" --mark 'VTI追記'
```

Checks column widths against the original, zip integrity, embedded media
survival, duplicate merged ranges, and counts strike / revision-coloured runs
and marked rows. Must print `ALL CHECKS PASSED`.

It counts both the current colour and every entry in `LEGACY_ACCENTS`, so a
workbook still carrying red markup from an earlier pass verifies cleanly. Pass
`--color FFE69138` to count one colour only — useful for confirming a pass wrote
nothing in the old colour.

Pass the **full dated marker** (`--mark '8/18 VTI追記'`), not a loose substring.
The workbook accumulates markers from earlier revisions — SCR-022 already
carried nine rows tagged `6/29` and `5/25` — so filtering on `'VTI追記'` alone
inflates the count of what this pass actually touched. A row edited in an
earlier revision and again now legitimately holds both markers.

### Step 8 — report

Summarise per sheet what changed. Separately, and explicitly, list findings that
are **code gaps rather than doc gaps** — the user decides which side to fix:

- Capability present in BE but with no FE control (dead API parameter).
- Function referenced by the design but not wired up in the UI. Flag it before
  marking the spec 実装対象外.
- Message literals that differ from the project-wide convention.
- Whether the filename's version still matches the 版数 you just added.

---

## Rules

- Edit the workbook **in place** at its original path; the filename is the
  customer's contract. Note separately if it should be renamed for the new 版数.
- Never re-save through openpyxl without following it with `restore_cols.py`.
- Never delete or reformat content the sync did not touch. Pre-existing doc
  quirks (duplicate numbering, stray punctuation) get reported, not silently
  fixed — the customer's review diff should contain only real corrections.
- Preserve pre-existing rich text in cells you are not changing.
- Keep every backup in the scratchpad, one per pass
  (`BEFORE_<step>.xlsx`), so any step can be rolled back independently.
- When doc and code disagree, the code is the source of truth for behaviour —
  but confirm the code is not itself the bug before writing the doc to match it.

---

## Files

| Path | Purpose |
|---|---|
| `scripts/resolve_target.py` | Resolves screen id + kind + version (or an explicit path) to one workbook; refuses to guess when ambiguous |
| `scripts/xlsx_markup.py` | The `ACCENT` (strike) / `ADDITION` (red) colour constants plus the markup helpers: `configure`, `mark`, `revise_part`, `revise_line`, `revise`, `add_line`, `set_accent`, `append_accent`, `rich`, `renumber`, `insert_rows_keep`, `clone_row_style`, `read_runs`, `plain` |
| `scripts/restore_cols.py` | Restores original `<cols>`/`<sheetFormatPr>` after any openpyxl save — **run after every save** |
| `scripts/autofit_rows.py` | Font- and East-Asian-width-aware row-height recomputation for merged, wrapped cells |
| `scripts/verify_xlsx.py` | Post-edit integrity + markup report; diffs against the original backup |

Requires `openpyxl >= 3.1` (`CellRichText` / `rich_text=True` support).
