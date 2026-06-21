# Contract: Vault-Scoped Server Identity, Adoption & Edit-Server Port Fallback

The plugin exposes no public API. This contract fixes the persisted record schema and the adoption / fallback / reconciliation behavior so implementation and validation agree. It **extends** the feature-013 contract (`specs/013-terminate-marimo-on-exit/contracts/server-records.md`); only deltas are stated here.

## 1. Record schema delta

Each record gains a `vaultRoot` field:

```json
{
  "records": [
    { "pid": 12345, "port": 2718, "kind": "edit", "token": "...", "vaultRoot": "/abs/path/to/vault" }
  ]
}
```

- `vaultRoot` (non-empty string, **required**): canonical absolute path of the vault the server serves (its spawn `cwd`).
- **Validation**: a record missing or with an empty `vaultRoot` is invalid and MUST be dropped on load, exactly like the existing missing-`token` rule — never used to adopt or terminate a process.
- **Compatibility**: the record file remains per-vault and is stored inside the vault; adding a field is backward-compatible for *reading* (old records simply fail the new validation and are pruned).

## 2. Vault identity

- The `ServerManager` MUST compute its vault root **once** at construction as the canonical path of `adapter.getBasePath()` (`fs.realpathSync`, falling back to the raw base path if it throws).
- This value is used for: the spawn `cwd`, the `vaultRoot` written into every record, and the equality comparison in §3/§4.
- Comparison is **exact string equality** of canonical paths.

## 3. Adoption contract (`ensureEditServer`)

A pre-existing server found healthy on the **configured** port MUST be adopted **only** when a same-vault record confirms it:

```text
adoptable(port):
    records = store.load()
    r = first record where r.port == port AND r.kind == "edit"
                          AND r.vaultRoot == thisVaultRoot
    return r exists
           AND findPidsOnPort(port) includes r.pid
           AND serverAcceptsOurAuth(port, r.token)
```

- If `adoptable(port)` is true → adopt (in-memory `ManagedServer { process: null, port, ready: true }`).
- If a healthy server occupies the configured port but `adoptable(port)` is false (e.g., another vault sharing the same token, or a foreign server):
  - The plugin MUST NOT adopt it.
  - The plugin MUST NOT terminate it.
  - The plugin MUST proceed to the port-fallback (§5).
- The existing same-session fast path (`this.edit?.ready`) is unchanged and takes precedence.

## 4. Reconciliation contract delta (`reconcileOrphans`)

The per-record confirmation gains a **vault-root gate**, evaluated together with the existing three gates (alive PID, PID owns the port, server accepts the persisted token):

```text
ours = (r.vaultRoot == thisVaultRoot)
       AND isProcessAlive(r.pid)
       AND findPidsOnPort(r.port) includes r.pid
       AND confirmOurServer(r.port, r.token)
```

- Only when **all four** hold may the record's process be terminated (§3 of the 013 contract).
- A record whose `vaultRoot` does not match (e.g., the vault folder was moved/renamed) MUST be left untouched (no kill) and pruned from the store.

## 5. Edit-server port-fallback contract

- When the configured port is unavailable for adoption (occupied by a non-ours server) the edit server MUST select the **next bindable port** using the same allocation strategy as run servers: scan upward from the configured port, skipping ports already tracked in-session and ports the OS reports busy, bounded by `PORT_MAX`.
- The edit server MUST be spawned on the selected port, and `ManagedServer.port` MUST record the **actually-bound** port.
- If no bindable port is found within bounds, startup fails with the existing clear, user-facing notice (no silent blank view).

## 6. URL routing contract

- `editBaseUrl` MUST resolve to the **bound** edit-server port (`this.edit.port`) whenever an edit server is running; it MAY fall back to `settings.port` only when no edit server is active yet.
- `editFileUrl(path)` and `editHomeUrl()` inherit this base and therefore always target the bound port.
- The active access token continues to be appended to these URLs unchanged.

## 7. Requirement traceability

| Requirement | Section |
|-------------|---------|
| FR-001 / FR-001a | §1, §3 |
| FR-002 | §3, §4 |
| FR-003 | §5 |
| FR-004 | §6 |
| FR-005 | §1, §2 |
| FR-006 | §4 |
| FR-007 | §3 (same-session + reload-via-record), §4 |
| FR-008 | §5 (no-port-found notice) |
| FR-009 | Verified via quickstart; documented if observed (out of scope to fix) |
