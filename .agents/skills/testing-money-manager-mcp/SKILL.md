---
name: testing-money-manager-mcp
description: Full end-to-end verification of the Money Manager MCP server against the live upstream API — exercises all 18 tools with throwaway data, then verifies cleanup restored the original state. Use after changing server code (tools, schemas, HTTP client, config) and before merging. Read-only for the user's real data; all mutations happen on test assets that are deleted afterward.
---

# Testing Money Manager MCP end-to-end

Verify every tool of this MCP server against the live Money Manager "PC
Manager" web server. The server under test is the local build of this repo
(`npm run build` → `dist/`), already added to the client as a stdio MCP server
(e.g. `money-manager-dev`). Confirm the exact server name from the connected
tools before starting (`mcp__<server-name>__<tool-name>`).

There is no test runner and no CI. This live protocol IS the verification.

## Tool coverage checklist (all 18 — the final report must account for each)

| #   | Tool                        | Where exercised                             |
| --- | --------------------------- | ------------------------------------------- |
| 1   | `init_get_data`             | Phase 0 (first call — baseline context) + 1 |
| 2   | `transaction_list`          | Phase 0/1, id discovery in Phases 4–5       |
| 3   | `transaction_create`        | Phase 4                                     |
| 4   | `transaction_update`        | Phase 4                                     |
| 5   | `transaction_delete`        | Phase 4 (bulk), Phase 5                     |
| 6   | `summary_get_period`        | Phase 1                                     |
| 7   | `summary_export_excel`      | Phase 2 (both `.xls` and `.xlsx` paths)     |
| 8   | `asset_list`                | Phase 0/1, discovery in Phases 3–5, Phase 7 |
| 9   | `asset_create`              | Phases 3–4                                  |
| 10  | `asset_update`              | Phase 3                                     |
| 11  | `asset_delete`              | Phases 3 and 5                              |
| 12  | `card_list`                 | Phase 0 (drives card-test decision), 1, 6   |
| 13  | `card_create`               | Phase 6 (consent-gated, default: run)       |
| 14  | `card_update`               | Phase 6 (consent-gated, test card only)     |
| 15  | `transfer_create`           | Phase 5                                     |
| 16  | `transfer_update`           | Phase 5                                     |
| 17  | `dashboard_get_overview`    | Phase 1                                     |
| 18  | `dashboard_get_asset_chart` | Phase 1                                     |

`card_create`/`card_update` are consent-gated (Phase 6 — ask the user,
recommended default: proceed). A user-declined skip with reason satisfies
the checklist; a silent omission does not.

## Non-negotiable safety contract

The upstream server holds the user's real financial data. Absolute rules:

1. **Never modify or delete existing data.** Transactions, accounts, and cards
   that existed before the run are untouchable — no updates, no deletes, no
   transactions on real assets, no renames of real cards.
2. **All mutations happen on throwaway assets you create** for the run, named
   with the prefix `MCP-TEST-` (group `Others`, initial balance `0`).
3. **Capture a baseline before the first mutation** and prove full restoration
   at the end (exact `totalBalance` match, artifact-free lists).
4. **`card_create` is a permanent artifact.** The upstream API has no
   card-delete endpoint, so a created card can never be removed
   programmatically — only manually in the app. Rules:
   - Never `card_update` or otherwise touch a pre-existing (real) card —
     that violates rule 1. Card tests run only on a dedicated `MCP-TEST-`
     card.
   - **Ask the user for consent before any card mutation** (Phase 6). The
     recommended default is to PROCEED: the test card can be deleted
     manually in the Money Manager app afterward. Only skip if the user
     explicitly declines.
   - Reuse before creating: if a leftover `MCP-TEST-` card from an earlier
     run already exists, reuse it for `card_update` instead of creating
     yet another one.
5. **On unexpected failure mid-run: stop mutating, run the cleanup pass, then
   report.** Never leave the run in a half-mutated state.
6. **Rebuild before testing, restart before trusting.** After any `src/`
   change: `npm run build && npm run lint` must pass, and the user must
   restart the MCP client — the stdio process caches `dist/` at startup.
   Verify freshness by checking that a recently changed tool description or
   behavior is visible before running mutations.

## Phase 0 — Baseline

Record (needed for final verification):

- `init_get_data`: `mbid`, one income category `mcid` (e.g. Salary), one
  expense category `mcid` (e.g. Food), the `assetGroupId` of the `Others`
  group, payment-type names.
- `asset_list`: exact `totalBalance`, group/asset count.
- `card_list`: number of cards (drives the card-test decision above).
- `transaction_list` for a range known to contain data (use the init
  `initStartDate`/`initEndDate`): transaction `count`.

## Phase 1 — Read-only sweep (must all succeed)

`init_get_data`, `transaction_list` (full range + once with an `assetId`
filter), `summary_get_period`, `asset_list`, `card_list`,
`dashboard_get_overview`, `dashboard_get_asset_chart` (use a real asset id
from the baseline).

## Phase 2 — Export

`summary_export_excel` twice into the repo working directory: once with a
`.xls` path, once with a `.xlsx` path (must auto-correct to `.xls` and say so
in the message). Verify both files exist and are non-empty, then **delete both
files** and confirm `git status` stays clean.

## Phase 3 — Asset lifecycle

`asset_create` (Others group, balance 0, `MCP-TEST-` name) → `asset_list` to
discover the new id (creates do NOT return it) → `asset_update` (rename +
non-zero balance) → verify via `asset_list` → `asset_delete` → verify the
asset is gone and `totalBalance` equals the baseline again.

## Phase 4 — Transaction lifecycle

Create two throwaway assets (A and B) as in Phase 3. On A:

1. `transaction_create` — one expense, one income, distinctive `mbContent`
   (e.g. `MCP TEST TXN`). Discover each id via `transaction_list` filtered by
   `assetId` A + the date used.
2. `transaction_update` — change amount/category/content on the first;
   re-list to verify all three changed and the id is stable.
3. `transaction_delete` with BOTH ids in one call (bulk `:id1:id2` format);
   verify the asset shows `count: 0`.

## Phase 5 — Transfer lifecycle

1. `transfer_create` A → B, small amount, distinctive content. It appears as
   TWO rows: Transfer-Out (inOutCode `3`, negative) on A and Transfer-In
   (inOutCode `4`, positive) on B. Find both ids via `transaction_list` per
   asset.
2. `transfer_update` using the Transfer-Out row's id, with a changed amount.
   Expect the response to warn that the server created a NEW transfer with a
   NEW id — the old id is now invalid (this is correct behavior, not a bug).
3. Re-list on A and B, confirm the new amount and capture the NEW ids, then
   `transaction_delete` both sides of the NEW transfer. Verify both assets
   show `count: 0`, then `asset_delete` A and B.

## Phase 6 — Card tests (consent-gated; default: run them)

Ask the user before mutating anything here, presenting the trade-off and the
options, e.g.:

> `card_create` leaves a permanent test card — the upstream API has no
> card-delete endpoint, so it can only be removed manually in the Money
> Manager app after the run. Proceed with the card_create/card_update tests?
> (Recommended: yes — I'll give you the exact card name to delete manually.)

Default/recommended option: **proceed**. Only mark these tools SKIPPED
(reason: user declined) if the user explicitly chooses to skip.

If proceeding:

1. If a leftover `MCP-TEST-` card exists from an earlier run (`card_list`),
   REUSE it: `card_update` (rename) → verify via `card_list`. Do not create
   another card.
2. Otherwise `card_create` exactly ONE test card — distinctive `MCP-TEST-`
   name, linked to a throwaway test asset from Phase 4/5 (recreate one if
   needed, and delete it again in this phase's cleanup) — then `card_list`
   to discover the new id, `card_update` (rename), verify via `card_list`.
3. Record the card's name + id in the report's manual-deletion list.

## Phase 7 — Final verification & report

- `asset_list`: `totalBalance` **exactly** equals the Phase-0 baseline; no
  `MCP-TEST-` assets remain.
- `card_list`: card count matches the Phase-6 outcome (baseline if declined,
  baseline + 1 if a test card was created, unchanged if a leftover test card
  was reused).
- `transaction_list` on the baseline range: count matches baseline.
- `git status`: clean (no leftover export files).

Report a table: tool → PASS/FAIL/SKIPPED (+ reason for skips), then any
artifacts left on the server (expected: at most one test card), the balance
delta (expected: 0), and any failures with their exact error messages.

## Upstream quirks (expected behavior, not bugs)

- Create calls return `{success, message}` only — never an id. Always discover
  ids via the matching `_list` tool immediately after creating.
- `transfer_update` creates a new transfer with a new id; the old id dies.
- `transaction_list` can hang on ranges with zero transactions — test with
  ranges that contain data.
- Excel export returns HTML-based `.xls`; `.xlsx` paths are auto-corrected
  with a warning in the message.
- `payType` is echoed back as the asset's display name regardless of what was
  sent.
- Responses are JavaScript object literals / XML, not JSON — that is the HTTP
  client's job to normalize; handlers see clean objects.
