# Proxmox MCP Foundation Implementation Plan

> **For Hermes:** Use a dedicated Codex worktree session to implement this plan task-by-task. Keep every production behavior test-first and do not publish or submit to external directories.

**Goal:** Build a safe local stdio MCP server for selected Proxmox VE operations and establish the protected `dev` → `main` GitHub-Release-only delivery path.

**Architecture:** A TypeMCP-decorated server owns MCP argument schemas and delegates to a small Proxmox HTTP client. Configuration and destructive-operation gates are standalone modules so they can be tested without an MCP transport. The release pipeline packages `dist/` and production dependencies into a versioned GitHub Release archive, then verifies that archive in a clean directory before publishing it.

**Tech Stack:** Node.js 22, TypeScript (strict), `@theorvane/type-mcp`, `@modelcontextprotocol/sdk`, Zod, Vitest, Biome, tsup, GitHub Actions, GitHub Releases.

---

## Non-negotiable constraints

- Do not add `npm publish`, `publishConfig`, or npm registry installation instructions.
- Do not send Proxmox requests until input schema validation and applicable safety gates succeed.
- Never log or return `PROXMOX_TOKEN_SECRET`, `Authorization`, raw upstream response bodies, error stacks, or unfiltered request headers.
- The API token's Proxmox RBAC permissions remain authoritative; the `confirm` gate is additional client-side protection.
- Do not create GitHub Releases, upload assets, publish a ClawHub plugin, or submit directory listings as part of this issue. Only implement and verify the workflows/artifacts locally and through CI.

## Task 1: Bootstrap project contract and executable layout

**Objective:** Make the repository a strict, buildable TypeScript CLI package with documentation and local contributor guardrails.

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `tsconfig.type-tests.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `biome.json`
- Create: `.gitignore`
- Create: `AGENTS.md`
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `.env.example`
- Create: `src/index.ts`
- Create: `test/project-contract.test.ts`

**Step 1: Write failing project contract tests**

Assert package identity, private local-development status, Node 22 engine, strict compiler options, non-empty build/lint/typecheck/test/release-archive scripts, absence of npm publication scripts/configuration, and documented GitHub Release installation.

**Step 2: Run RED test**

Run: `npm test -- test/project-contract.test.ts`

Expected: FAIL because the package manifest and executable source do not yet exist.

**Step 3: Add the smallest strict project scaffold**

Use ESM. Define a `bin` command named `proxmox-mcp` pointing to `dist/index.js`; retain only release-archive distribution language in documentation. Add an executable entrypoint stub that writes no user-facing noise to stdout.

**Step 4: Run the focused test and project quality checks**

Run:

```bash
npm ci
npm test -- test/project-contract.test.ts
npm run lint
npm run typecheck
npm run build
```

Expected: all commands pass.

**Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.type-tests.json tsup.config.ts vitest.config.ts biome.json .gitignore AGENTS.md README.md CONTRIBUTING.md SECURITY.md .env.example src/index.ts test/project-contract.test.ts
git commit -m "build: bootstrap Proxmox MCP package"
```

## Task 2: Define configuration and secret-safe diagnostics

**Objective:** Parse and validate environment-only Proxmox configuration, with TLS verification enabled by default.

**Files:**
- Create: `src/config.ts`
- Create: `src/errors.ts`
- Create: `test/config.test.ts`
- Modify: `src/index.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/guides/configuration.md`

**Step 1: Write failing configuration tests**

Cover required `PROXMOX_BASE_URL`, `PROXMOX_TOKEN_ID`, and `PROXMOX_TOKEN_SECRET`; reject non-HTTPS base URLs and unsupported `PROXMOX_TLS_VERIFY=false`; and ensure thrown messages do not echo supplied secret values.

**Step 2: Run RED test**

Run: `npm test -- test/config.test.ts`

Expected: FAIL because the parser is missing.

**Step 3: Implement `loadProxmoxConfig(env)`**

Return an immutable configuration object. Normalize the base URL without a trailing slash. Throw a typed safe configuration error containing variable names but never values. TLS disabling is unsupported because Node's global fetch cannot safely alter certificate verification.

**Step 4: Run focused tests and typecheck**

Run:

```bash
npm test -- test/config.test.ts
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/config.ts src/errors.ts test/config.test.ts src/index.ts .env.example README.md docs/guides/configuration.md
git commit -m "feat: validate Proxmox runtime configuration"
```

## Task 3: Implement the Proxmox HTTP boundary

**Objective:** Provide one testable, secret-safe client for `/api2/json` GET/POST/PUT/DELETE requests.

**Files:**
- Create: `src/proxmox-client.ts`
- Create: `test/proxmox-client.test.ts`
- Modify: `src/errors.ts`

**Step 1: Write failing HTTP boundary tests**

Use a controlled `fetch` stub to prove:

- API paths are prefixed once with `/api2/json`;
- the client sets `Authorization: PVEAPIToken=<id>=<secret>` without exposing it in returned values;
- query parameters omit `undefined` and preserve explicit values;
- JSON envelopes return their `data` field;
- non-2xx, non-JSON, and network failures become safe operation-category errors with no raw body/secret/header disclosure.

**Step 2: Run RED test**

Run: `npm test -- test/proxmox-client.test.ts`

Expected: FAIL because the client is missing.

**Step 3: Implement minimal client methods**

Use injected `fetch` for testability. Return data only after validating the standard Proxmox JSON envelope. Support request body encoding required by the selected Proxmox endpoints. Do not add automatic retries.

**Step 4: Run focused test and lint**

Run:

```bash
npm test -- test/proxmox-client.test.ts
npm run lint
```

**Step 5: Commit**

```bash
git add src/proxmox-client.ts src/errors.ts test/proxmox-client.test.ts
git commit -m "feat: add safe Proxmox API client"
```

## Task 4: Add reusable destructive-operation policy

**Objective:** Fail closed before any Proxmox request for destructive QEMU/LXC actions missing explicit confirmation and target identity.

**Files:**
- Create: `src/safety.ts`
- Create: `test/safety.test.ts`
- Modify: `src/errors.ts`
- Modify: `docs/api/tool-contract.md`
- Modify: `docs/guides/safety.md`

**Step 1: Write failing policy tests**

Test each protected operation: QEMU delete, LXC delete, QEMU disk delete, and force stop. Assert missing or false `confirm`, missing node, and missing VMID return a stable safe error and never call an injected operation callback. Assert confirmed calls invoke that callback exactly once.

**Step 2: Run RED test**

Run: `npm test -- test/safety.test.ts`

Expected: FAIL because the guard is missing.

**Step 3: Implement `requireDestructiveConfirmation`**

Accept operation metadata plus `confirm`, `node`, and `vmid`. Permit no wildcard target syntax. Keep protected-operation labels centralized rather than duplicating conditionals across tools.

**Step 4: Run focused test and typecheck**

Run:

```bash
npm test -- test/safety.test.ts
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/safety.ts src/errors.ts test/safety.test.ts docs/api/tool-contract.md docs/guides/safety.md
git commit -m "feat: gate destructive Proxmox operations"
```

## Task 5: Define and compile TypeMCP inventory tools

**Objective:** Expose typed read-only cluster, node, storage, QEMU, LXC, and task-query MCP tools.

**Files:**
- Create: `src/proxmox-server.ts`
- Create: `src/types.ts`
- Create: `test/tool-compilation.test.ts`
- Create: `test/inventory-tools.test.ts`
- Modify: `src/index.ts`
- Modify: `docs/api/tool-contract.md`
- Modify: `README.md`

**Step 1: Write failing official-SDK integration tests**

Compile the TypeMCP server and use the official SDK `Client` with `InMemoryTransport`. Verify `tools/list` contains documented inventory names. Invoke one inventory tool and assert the precise Proxmox client route. Invoke it with invalid input and assert no client request occurs.

**Step 2: Run RED test**

Run: `npm test -- test/tool-compilation.test.ts test/inventory-tools.test.ts`

Expected: FAIL because the decorated server is absent.

**Step 3: Implement read-only tools**

Use explicit Zod schemas per tool. Keep methods small and delegate HTTP concerns to `ProxmoxClient`. Normalize raw object/array data to text content through TypeMCP's protocol-safe response path.

**Step 4: Run focused tests**

Run:

```bash
npm test -- test/tool-compilation.test.ts test/inventory-tools.test.ts
npm run lint
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/proxmox-server.ts src/types.ts src/index.ts test/tool-compilation.test.ts test/inventory-tools.test.ts docs/api/tool-contract.md README.md
git commit -m "feat: add Proxmox inventory MCP tools"
```

## Task 6: Add lifecycle and provisioning/configuration tools

**Objective:** Support QEMU/LXC lifecycle, creation, configuration update, and QEMU disk resize with normalized task receipts.

**Files:**
- Modify: `src/proxmox-server.ts`
- Create: `src/task-receipt.ts`
- Create: `test/lifecycle-tools.test.ts`
- Create: `test/provisioning-tools.test.ts`
- Modify: `docs/api/tool-contract.md`
- Modify: `README.md`

**Step 1: Write failing tool tests**

Prove QEMU/LXC start, shutdown, reboot, standard stop, create, and update call their intended exact routes with serializable payloads. Assert operations returning an UPID become a documented normalized task receipt. Cover QEMU disk resize parameters and task lookup.

**Step 2: Run RED tests**

Run: `npm test -- test/lifecycle-tools.test.ts test/provisioning-tools.test.ts`

Expected: FAIL because those tools do not exist.

**Step 3: Implement the selected safe mutation surface**

Do not add arbitrary API passthrough. Restrict schemas to fields explicitly supported by the tools and Proxmox endpoint documentation. Do not require `confirm` for these non-destructive first-release operations.

**Step 4: Run focused and full tool tests**

Run:

```bash
npm test -- test/lifecycle-tools.test.ts test/provisioning-tools.test.ts test/inventory-tools.test.ts
npm run lint
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/proxmox-server.ts src/task-receipt.ts test/lifecycle-tools.test.ts test/provisioning-tools.test.ts docs/api/tool-contract.md README.md
git commit -m "feat: add Proxmox lifecycle and provisioning tools"
```

## Task 7: Add protected destructive tool calls

**Objective:** Implement QEMU/LXC delete, unused QEMU disk delete, and force stop using the Task 4 guard before client invocation.

**Files:**
- Modify: `src/proxmox-server.ts`
- Create: `test/destructive-tools.test.ts`
- Modify: `docs/api/tool-contract.md`
- Modify: `docs/guides/safety.md`
- Modify: `README.md`

**Step 1: Write failing integration tests**

With a request-recording fake client, test each destructive tool through the official SDK transport. Verify calls without `confirm: true` return a safe MCP error and record zero requests. Verify confirmed requests use exact node/VMID route components and return normalized task receipts.

**Step 2: Run RED test**

Run: `npm test -- test/destructive-tools.test.ts`

Expected: FAIL because protected tools are missing.

**Step 3: Implement protected tools by composing the guard**

Never duplicate the confirmation logic. Keep force-stop distinct from standard stop. Document destructive semantics and non-recoverability in each tool description.

**Step 4: Run tool regression suite**

Run:

```bash
npm test -- test/destructive-tools.test.ts test/lifecycle-tools.test.ts test/provisioning-tools.test.ts
npm run lint
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/proxmox-server.ts test/destructive-tools.test.ts docs/api/tool-contract.md docs/guides/safety.md README.md
git commit -m "feat: add confirmed destructive Proxmox tools"
```

## Task 8: Build deterministic GitHub Release archives and verify them locally

**Objective:** Package a runnable local installation artifact without npm publication and prove its checksum/install/MCP behavior in a clean temporary directory.

**Files:**
- Create: `scripts/build-release-archive.mjs`
- Create: `scripts/verify-release-archive.mjs`
- Create: `test/release-archive-contract.test.ts`
- Modify: `package.json`
- Modify: `README.md`
- Create: `docs/guides/github-release-installation.md`
- Create: `registry/directory-listing.md`

**Step 1: Write failing archive-contract test**

Verify scripts produce a versioned `.tar.gz` and `.sha256` file; archive contents include `dist/`, production `node_modules/`, a launch script, LICENSE, installation guide, and no `.env`/credentials/source maps/test files. Assert the verification script checks checksums before launching an SDK client initialization and `tools/list` exchange.

**Step 2: Run RED test**

Run: `npm test -- test/release-archive-contract.test.ts`

Expected: FAIL because scripts are missing.

**Step 3: Implement build and verify scripts**

Build first, then create an archive in a clean staging directory. Install production dependencies with lockfile integrity. Use an artifact manifest with SHA-256. The verifier must unpack a release archive to a new temporary directory, compare checksum, start the executable over stdio, and complete MCP initialization/listing with fake safe environment values; no live Proxmox request is permitted.

**Step 4: Run archive checks**

Run:

```bash
npm run build
npm run release:archive
npm run verify:release-archive
npm test -- test/release-archive-contract.test.ts
```

**Step 5: Commit**

```bash
git add scripts/build-release-archive.mjs scripts/verify-release-archive.mjs test/release-archive-contract.test.ts package.json README.md docs/guides/github-release-installation.md registry/directory-listing.md
git commit -m "build: package verified GitHub Release archive"
```

## Task 9: Add repository governance, CI, and release-only workflow contracts

**Objective:** Make CI and release workflows enforce the `dev` integration / `main` release-only model without actually publishing.

**Files:**
- Create: `.github/workflows/verify.yml`
- Create: `.github/workflows/release-promotion.yml`
- Create: `.github/workflows/github-release.yml`
- Create: `.agents/scripts/validate_docs.mjs`
- Create: `.agents/scripts/validate_branch_governance.mjs`
- Create: `.agents/scripts/validate_release_workflow.mjs`
- Create: `test/workflow-contract.test.ts`
- Modify: `AGENTS.md`
- Modify: `CONTRIBUTING.md`
- Modify: `docs/guides/github-release-installation.md`

**Step 1: Write failing workflow-contract tests**

Assert:

- verify triggers on PRs and pushes to `dev`/`main`;
- all third-party action references are full immutable commit SHAs;
- `release-promotion` runs on PRs to `main` and accepts only head `dev`;
- GitHub Release workflow triggers only on `main` push, runs archive verification first, checks checkout SHA equals `GITHUB_SHA`, uploads only a versioned archive/checksum, and contains no `npm publish`/registry token;
- contributor instructions require Issue → issue-numbered branch from `dev` → PR to `dev` → review/CI → reviewed `dev` → `main` promotion.

**Step 2: Run RED test**

Run: `npm test -- test/workflow-contract.test.ts`

Expected: FAIL because workflow files and validators are missing.

**Step 3: Implement workflows and validators**

Use `contents: read` except for narrowly scoped GitHub Release asset upload. Release creation must be idempotent and refuse an existing tag that targets another SHA. Keep ClawHub/LobeHub/MCP Server Hub publication out of the workflow: generate only reviewable metadata and manual submission checklists.

**Step 4: Run governance checks**

Run:

```bash
npm test -- test/workflow-contract.test.ts
npm run validate:docs
npm run validate:governance
npm run validate:release
```

**Step 5: Commit**

```bash
git add .github/workflows .agents/scripts test/workflow-contract.test.ts AGENTS.md CONTRIBUTING.md docs/guides/github-release-installation.md
git commit -m "ci: enforce release-only main delivery"
```

## Task 10: Prepare registry-directory metadata and final quality gate

**Objective:** Provide truthful, version-neutral submission materials for ClawHub Plugins, MCP Server Hub, and LobeHub while leaving publication manual and deferred.

**Files:**
- Create: `plugins/openclaw-proxmox-mcp/README.md`
- Create: `plugins/openclaw-proxmox-mcp/openclaw.plugin.json`
- Create: `registry/lobehub-submission.md`
- Create: `registry/mcpserverhub-submission.md`
- Create: `registry/assets/README.md`
- Create: `test/directory-metadata-contract.test.ts`
- Modify: `README.md`
- Modify: `docs/guides/safety.md`

**Step 1: Write failing metadata tests**

Ensure no metadata claims npm availability, embeds real version numbers before release, includes secret values, uses a mutable branch URL, or says an unverified directory listing is published. Assert documentation includes GitHub Release checksum verification and destructive-operation warning.

**Step 2: Run RED test**

Run: `npm test -- test/directory-metadata-contract.test.ts`

Expected: FAIL because materials are missing.

**Step 3: Create minimal truthful listing material**

The ClawHub wrapper must describe its future behavior but not use unconfirmed ClawHub schema fields. Directory docs must be filled with verified facts at publishing time and include placeholders explicitly marked for release-manager completion. Do not automate a submission against unverified third-party APIs.

**Step 4: Run final local quality gate**

Run:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run release:archive
npm run verify:release-archive
npm run validate:docs
npm run validate:governance
npm run validate:release
npm audit --omit=dev --audit-level=high
git diff --check
git status --short --branch
```

Expected: all commands pass; `git status` contains only intended tracked changes.

**Step 5: Commit**

```bash
git add plugins registry test/directory-metadata-contract.test.ts README.md docs/guides/safety.md
git commit -m "docs: prepare MCP directory listing materials"
```

## PR delivery

1. Push `feat/1-proxmox-mcp-foundation` and open a PR into `dev`, linked to Issue #1.
2. Run CI and independently re-run the complete quality gate locally at the exact PR HEAD.
3. Obtain an independent review for that exact SHA. If findings arise, reproduce each with a failing regression test, commit a focused fix, rerun the full gate, and request re-review.
4. Do not merge, publish a GitHub Release, change live rulesets, or submit external directory listings without explicit authorization and current-head approval.
