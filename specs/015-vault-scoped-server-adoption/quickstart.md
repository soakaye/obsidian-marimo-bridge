# Quickstart & Validation: Vault-Scoped Server Adoption & Edit-Server Port Fallback

Validation guide proving the feature works end-to-end. See [contracts/server-identity.md](./contracts/server-identity.md) and [data-model.md](./data-model.md) for the precise rules.

## Prerequisites

- Obsidian Desktop with the marimo bridge plugin built from this branch.
- marimo installed (or a vault `.venv` with marimo).
- **Two** local vaults, **A** and **B**, both with the plugin enabled.
- A terminal for inspecting ports: `lsof -nP -iTCP:2718 -sTCP:LISTEN` (macOS/Linux) or `netstat -ano -p tcp | find "2718"` (Windows).

## Build / static checks

```bash
npm install
npm run build      # tsc type-check + esbuild bundle — MUST pass
npm run lint       # eslint — MUST pass
npm run test       # node:test suites — MUST pass (incl. new vault-scope/fallback cases)
```

## Scenario 1 — Cross-vault adoption is prevented (FR-001/FR-001a, SC-001/SC-004) — P1

1. Set the **same** custom access token in vault A and vault B settings (the dangerous configuration).
2. Open vault A; let its marimo editor start. Confirm it lists **vault A's** notebooks. Note the listening port (2718).
3. With vault A still open, open vault B in a second window and open the marimo editor / home.
4. **Expected**:
   - Vault B shows **vault B's** notebooks — never vault A's.
   - Vault B does **not** terminate vault A's server (2718 still held by A's PID — verify with `lsof`).

## Scenario 2 — Edit server falls back to a free port (FR-003/FR-004, SC-002) — P2

1. Continue from Scenario 1 (vault A holds 2718).
2. In vault B, confirm the editor becomes **ready** and notebooks/home/embeds load (not a blank "port in use" view).
3. **Expected**:
   - A second listening port (e.g., 2719) is bound by vault B's marimo (`lsof -nP -iTCP:2719 -sTCP:LISTEN`).
   - Every vault B edit URL (open notebook, marimo home, inline `mode: edit` embed) targets the bound fallback port and renders.

## Scenario 3 — Single-vault behavior unchanged (FR-007, SC-003)

1. Close vault B. With only vault A open, run the **"Restart marimo server"** command and reload the plugin (toggle off/on).
2. **Expected**: vault A reuses/reconciles only its **own** server; the editor returns on the configured port (2718) with vault A's notebooks; no duplicate orphan accumulates for the normal path.

## Scenario 4 — Reconciliation stays vault-scoped & conservative (FR-006)

1. Crash-simulate: force-quit vault A while its server runs (leaving a record on disk), then relaunch vault A.
2. **Expected**: vault A reconciles its own confirmed orphan (same `vaultRoot`); a fresh server comes up cleanly (no blank view — cf. memory "reconcile before view restore").
3. Manually edit a record's `vaultRoot` to a different path (or remove the field) and relaunch.
4. **Expected**: the record is treated as unconfirmable — **no process is killed**, the record is pruned, and a fresh server starts.

## Scenario 5 — Vault switch / close, residual-process observation (FR-009/SC-005) — P3 (verify + document)

1. Open vault A (server starts). Close vault A's window. Open vault B (with **no** marimo configured).
2. Inspect ports/processes after the switch:
   ```bash
   lsof -nP -iTCP:2718              # any sockets still in LISTEN / CLOSE_WAIT?
   pgrep -fa marimo                 # any marimo process still alive?
   ```
3. **Expected (in scope)**: vault B operates normally and does not adopt or interfere with any leftover from vault A.
4. **Verification duty (out of scope to fix)**: If a marimo **process** from vault A is still alive, or sockets linger in `CLOSE_WAIT`/`TIME_WAIT` beyond ~1–2 minutes, **record the observation in the project documentation** (e.g., `README` / docs "Known limitations") as the deferred "residual process" issue. Benign `TIME_WAIT` that the OS reclaims within ~1–2 minutes need not be documented.

## Pass criteria

- Build, lint, and tests pass.
- Scenarios 1–4 meet their Expected outcomes (zero cross-vault adoption, zero cross-vault kills, working fallback, unchanged single-vault behavior).
- Scenario 5 is performed and any residual-process/socket behavior is either confirmed absent or documented as a known limitation.
