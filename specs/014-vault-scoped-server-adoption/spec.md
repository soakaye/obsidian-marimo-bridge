# Feature Specification: Vault-Scoped Server Adoption & Edit-Server Port Fallback

**Feature Branch**: `014-vault-scoped-server-adoption`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "「vault ルートを adoption/records 同一性に追加」＋「edit サーバーの空きポートフォールバック」の仕様とします。残存プロセスの問題は保留とします。動作確認後その様な現象が発生する様ならドキュメントに記載してください"

## Clarifications

### Session 2026-06-21

- Q: How should the plugin confirm the vault identity of a running server it did not spawn (e.g., one found on the configured port after a reload)? → A: Record-based only — a running server is treated as "this vault's" only when its PID/port matches a crash-recovery record (which carries the vault root). Any healthy server on the configured port that is not in the records is NOT adopted; the edit server falls back to a free port instead. The plugin does not query a running server for its working directory.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Two vaults open at once never cross-wire notebooks (Priority: P1)

A user has two Obsidian vaults that both use the marimo bridge. They open vault A (its marimo editor starts and shows vault A's notebooks), then open vault B in a second window while vault A is still running. Vault B must show **vault B's own notebooks**, never vault A's.

**Why this priority**: This is the dangerous correctness failure. Today, when both vaults share the same configured access token, the second vault silently adopts the first vault's already-running server because server identity is "port + token" only. The adopting vault then displays a *different* vault's files, and edits land in the wrong vault. Data confusion is the highest-severity outcome and must be eliminated first.

**Independent Test**: Configure the same access token in two vaults, start vault A, then start vault B with vault A still running, and confirm vault B's editor lists vault B's notebooks (not vault A's). Fully testable on its own and directly delivers the core safety guarantee.

**Acceptance Scenarios**:

1. **Given** vault A's marimo server is running on the shared configured port and vault B uses the same access token, **When** vault B starts its editor, **Then** vault B does NOT adopt vault A's server and instead serves vault B's own notebooks.
2. **Given** the configured port is free, **When** a vault starts and later restarts within the same session, **Then** it still adopts only a server rooted at its own vault (the existing same-vault reuse behavior is preserved).
3. **Given** a server is running on the configured port that belongs to neither this vault nor this plugin, **When** the editor starts, **Then** the plugin does not adopt that server.

---

### User Story 2 - Second vault starts successfully instead of failing on a busy port (Priority: P2)

With vault A's marimo server already holding the configured port, the user opens vault B. Vault B should start its own marimo editor and become usable, rather than showing a blank view with a "port in use" error.

**Why this priority**: Builds directly on User Story 1. Once vault B refuses to adopt vault A's server (P1), the configured port is occupied by a foreign server, and today that makes vault B fail to start. Falling back to a free port restores a working editor. It is P2 because it improves availability/UX on top of the P1 safety fix, and is only meaningful once adoption is correctly scoped.

**Independent Test**: Occupy the configured port with another vault's (or any foreign) marimo/HTTP server, start a second vault, and confirm the second vault's editor becomes ready on a different port and loads its notebooks.

**Acceptance Scenarios**:

1. **Given** the configured port is occupied by a server this vault must not adopt, **When** the editor starts, **Then** the plugin selects the next available free port and starts its own edit server there.
2. **Given** the edit server fell back to an alternate port, **When** the user opens notebooks, embeds, or the marimo home page in that vault, **Then** all of them target the alternate port and load correctly.
3. **Given** no alternate free port can be found within the searched range, **When** startup is attempted, **Then** the plugin surfaces a clear, actionable message rather than silently leaving a blank view.

---

### User Story 3 - Closing a vault and switching to a vault without marimo (Priority: P3)

A user closes vault A (or switches away from it) and opens vault B, which does not have marimo configured. The switch should be clean: vault B behaves normally, and any servers vault A spawned are torn down on close as they are today.

**Why this priority**: This is the existing teardown path and a verification target rather than a behavior change. It matters for confirming the new scoping/fallback logic does not regress normal shutdown, and for capturing any residual-process/socket observations (see Out of Scope and FR-009). P3 because it is primarily validation and documentation, not new functionality.

**Independent Test**: Open vault A, let its server start, close vault A, open vault B (no marimo). Confirm vault B starts cleanly and observe whether any of vault A's server sockets/processes linger.

**Acceptance Scenarios**:

1. **Given** vault A spawned a marimo server, **When** vault A's window closes, **Then** the server it spawned is signaled for termination (unchanged from current behavior).
2. **Given** vault A is closed and vault B without marimo is opened, **When** vault B finishes loading, **Then** vault B operates normally and does not adopt or interfere with any leftover from vault A.

---

### Edge Cases

- **Recycled port on a free configured port**: The configured port is free and a brand-new same-vault server is spawned there. Same-vault reuse and crash-recovery reconciliation must still work and must not be broken by the new vault-identity check.
- **Legacy records without vault identity**: Crash-recovery records written by a previous plugin version do not carry a vault root. These must be handled conservatively — never used to kill or adopt a server that cannot be positively confirmed as belonging to this vault.
- **Same vault opened from two paths** (e.g., symlink vs. real path): The vault-root comparison must treat the same on-disk location consistently so a vault still reuses its own server.
- **Fallback port also becomes busy** between selection and bind: Selecting a free port then losing the race must fail clearly, not hang or blank.
- **Custom vs. session token interaction**: The vault-root check must hold regardless of whether the active token is a user-configured token (shared across vaults) or a per-session random token.
- **Healthy same-vault server missing from records** (records file deleted, or a marimo server the user started manually for this vault): Under the record-based confirmation (FR-001), it is NOT adopted, so the plugin falls back to a free port and spawns a second server for the same vault. This duplicate-spawn is the accepted tradeoff of record-based confirmation; it is safe (no wrong-vault data) but may leave the unrecognized server running.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plugin MUST treat a marimo server as "ours to adopt" only when it can positively confirm the server belongs to **this vault**, in addition to the existing requirement that the server accepts this plugin's active token. Vault confirmation is **record-based**: the running server's PID/port MUST match a crash-recovery record whose stored vault root equals the current vault. The plugin MUST NOT query a running server for its working directory.
- **FR-001a**: A healthy server occupying the configured port that does NOT match a same-vault crash-recovery record MUST NOT be adopted, even if it accepts the active token (e.g., another vault sharing the same configured token). The edit server MUST fall back to a free port (FR-003) instead.
- **FR-002**: When the configured port is occupied by a server that fails the vault-and-token identity check, the plugin MUST NOT adopt it and MUST NOT terminate it.
- **FR-003**: When the configured port is unavailable for adoption, the edit server MUST fall back to the next available free port and start its own server there, mirroring the existing free-port selection behavior used for run servers.
- **FR-004**: All edit-server-derived URLs (notebook open, marimo home, inline embeds in this vault) MUST use the actually-bound port, whether it is the configured port or a fallback port.
- **FR-005**: Crash-recovery records for servers the plugin spawns MUST include the vault identity, so next-launch reconciliation only terminates leftover servers belonging to the same vault.
- **FR-006**: Reconciliation MUST NOT terminate a server unless it can positively confirm the server belongs to this vault (vault identity match) in addition to the existing alive/port/token confirmations; any record that cannot be positively confirmed MUST be left untouched.
- **FR-007**: Existing same-vault behavior MUST be preserved: a vault still adopts a healthy server it previously started on the configured port (confirmed via its same-vault crash-recovery record, including across a reload where the in-memory handle was lost), and still reconciles its own orphaned servers after a crash.
- **FR-008**: When no usable port can be found for the edit server, the plugin MUST surface a clear, actionable message to the user (consistent with how port/startup failures are reported today) rather than leaving a blank view with no explanation.
- **FR-009**: After implementation, the behavior MUST be verified for the vault-switch / vault-close scenarios. If residual marimo processes or lingering CLOSE/CLOSE_WAIT sockets from a closed vault are observed during verification, that behavior MUST be recorded in the project documentation (known limitation), since terminating such residual processes is explicitly out of scope for this feature.

### Key Entities *(include if feature involves data)*

- **Managed server identity**: The set of attributes used to decide whether a running server may be adopted or reconciled. Extended from {port, token, kind} to additionally include the **vault root** it serves.
- **Crash-recovery record**: The persisted, per-vault entry describing a spawned server (process id, port, kind, token). Extended to also carry the **vault identity** so reconciliation is vault-scoped.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With two vaults sharing the same access token and both open, the second vault displays its own notebooks in 100% of trials (zero cross-vault adoption).
- **SC-002**: With the configured port already held by another vault's server, the second vault's editor becomes usable on a fallback port in 100% of trials (no blank-view failure for the busy-port case).
- **SC-003**: Single-vault behavior is unchanged: same-session reuse, restart, and post-crash reconciliation of a vault's own server continue to succeed in 100% of trials.
- **SC-004**: A vault never terminates a marimo server that belongs to a different vault during startup or reconciliation (zero cross-vault kills).
- **SC-005**: The vault-switch / vault-close behavior is verified and, if residual processes or lingering sockets occur, they are documented as a known limitation before the feature is considered complete.

## Assumptions

- Each open vault runs in its own Obsidian window / renderer process with its own plugin instance and server manager; two vaults can therefore be running simultaneously and contend for the same configured port.
- A vault's working directory (vault root absolute path) is a reliable identifier for "which vault a server serves," because the plugin launches marimo with the vault root as the working directory.
- The free-port fallback reuses the same port-search bounds and free-port probing already used for run servers; no new configuration option is introduced.
- Terminating residual/orphaned processes left by a *closed* vault (the previously discussed "問題②") is explicitly **out of scope** here; it is deferred. This feature only prevents cross-vault adoption and avoids busy-port startup failures, and documents residual behavior if observed.
- Vault identity of a running server is confirmed **record-based only** (resolved in Clarifications, Session 2026-06-21): a same-vault crash-recovery record matching the server's PID/port. No authenticated working-directory query is made. The accepted consequence is that a same-vault server missing from the records is not adopted and a duplicate may be spawned (see Edge Cases).
