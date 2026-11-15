---
name: release-money-manager-mcp
description: Cut and publish a release of the money-manager-mcp npm package from main — version check/bump, build+lint gates, npm publish, post-publish registry verification, git tag, and a GitHub release with notes and the registry tarball as a hash-verified asset. Use when the user asks to release, ship, publish, or cut a new version (e.g. "release what's on main", "publish 2.1.0", "cut a release", "publish to npm", "tag a release") after feature branches have been merged. Not for everyday merges or PRs.
---

# Releasing Money Manager MCP

Cut a release of this package from `main`. There are no release branches and
no release PR: feature branches merge normally, and this skill runs afterward,
on demand, to publish what has accumulated since the last tag. Run it only
when the user asks for a release — never automatically after a merge.

It touches two public surfaces — the **npm registry** and a **public GitHub
release** — so every outward-facing step is approval-gated.

## Non-negotiable rules

1. **Run from `main`, synced and clean.** Never from a feature branch. If the
   working tree is dirty or `main` is behind origin, stop and resolve that first.
2. **Never republish or overwrite.** A version already on the npm registry is
   immutable. If the version is already published and tagged, the release
   already happened — stop (see Phase 1, state C). Never use `npm publish --force`.
3. **Every outward-facing action is approval-gated.** Pushing to `main`,
   `npm publish`, pushing the tag, and creating the GitHub release each wait
   for explicit user approval with the exact content shown first.
4. **The release asset is the registry tarball, hash-verified.** Download it
   from the registry — never `npm pack` — and prove it byte-matches the
   published package via the sha512 integrity check (Phase 5).
5. **npm auth is interactive.** `npm login` and publish OTP flows need the
   user's browser. Detect auth failure early (`npm whoami`) and hand off;
   don't try to drive it yourself.
6. **If publish succeeded but a later step failed, never re-publish.** Resume
   from the failed step (tag / GitHub release / asset upload).

## Phase 0 — Sync and survey

```bash
git checkout main && git pull
git status                       # must be clean
```

Collect the full release picture (read-only):

| What                          | How                                            |
| ----------------------------- | ---------------------------------------------- |
| Version in the repo           | `package.json` `version`                        |
| Latest published version      | `npm view money-manager-mcp version dist-tags`  |
| Latest tag (local + remote)   | `git tag -l 'v*'`, `git ls-remote --tags origin`|
| Commits since last tag        | `git log --oneline <lastTag>..HEAD`             |
| npm auth                      | `npm whoami`                                    |
| Existing GitHub releases      | `gh release list`                               |

## Phase 1 — Version decision

Compare `package.json` against the registry and the tags. Exactly three
states are possible:

| State                                                                                    | Meaning                                          | Action                                                                                                                              |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **A.** version ≠ published, no matching `v*` tag                                          | Bumped in a merged PR, not yet released          | Proceed                                                                                                                             |
| **B.** version == published, tag missing                                                  | Not bumped (or bumps were forgotten)             | Propose a semver bump from the commit log — breaking → major, `feat` → minor, `fix`/`chore` → patch — and confirm the target with the user |
| **C.** version == published **and** matching tag exists (and/or a GitHub release for it)  | Already released                                 | Stop. Report what exists; do not publish or retag                                                                                    |

For state B, do the bump on `main` directly (this is the one legitimate
direct-to-main commit in this flow):

```bash
npm version X.Y.Z --no-git-tag-version    # updates package.json + package-lock.json
git add package.json package-lock.json
git commit -m "chore(release): vX.Y.Z"
```

Show the commit to the user and get approval **before pushing to `main`**.

## Phase 2 — Gates

On updated `main`, with dependencies from the lockfile:

```bash
npm ci && npm run build && npm run lint
```

All three must pass clean — this repo has no CI; these commands ARE the
checks. A red gate stops the release; fix forward or abort. Never publish
from a red build.

## Phase 3 — Draft release notes (approval gate)

Build the draft from the actual commit history — `git log <lastTag>..main` is
the source of truth, not memory of the conversation:

- **Highlights** — user-facing changes grouped by theme (features, fixes,
  security, docs), written for package consumers, not for reviewers.
- **Breaking changes** — its own section if commits indicate any (removed
  deps, raised Node floor, changed tool behavior).
- **Install** — the `npx money-manager-mcp@latest ...` snippet.
- **Changelog link** — `https://github.com/shahlaukik/money-manager-mcp/compare/<lastTag>...vX.Y.Z`.

Present the version, the commit range, and the full notes text. Wait for
approval and apply any edits before touching anything public. (If the user
also wants a README "What's new" section, fold it into this approval —
otherwise docs polish belongs in the feature branches, per AGENTS.md.)

## Phase 4 — Publish to npm (approval gate)

Confirm `npm whoami` first. On 401: hand off — the user runs `npm login`
(browser flow, possibly OTP) and says when done. If the account enforces 2FA
on publish, the user either supplies the OTP or runs `npm publish` themselves.

With approval and auth confirmed:

```bash
npm publish
```

## Phase 5 — Verify the publish

Before creating any git artifacts, prove the package is correctly live:

```bash
npm view money-manager-mcp version dist-tags     # version + latest → X.Y.Z
curl -sL -o /tmp/money-manager-mcp-X.Y.Z.tgz \
  https://registry.npmjs.org/money-manager-mcp/-/money-manager-mcp-X.Y.Z.tgz
tar -tzf /tmp/money-manager-mcp-X.Y.Z.tgz        # dist/ complete, README/LICENSE present
tar -xzOf /tmp/money-manager-mcp-X.Y.Z.tgz package/dist/index.js | head -1
# must print: #!/usr/bin/env node
openssl dgst -sha512 -binary /tmp/money-manager-mcp-X.Y.Z.tgz | base64
# must equal `npm view money-manager-mcp dist.integrity` (strip the sha512- prefix)
```

Keep the downloaded tarball — it becomes the release asset in Phase 6.
Anything off here: stop and report; do not proceed to tag/release.

## Phase 6 — Tag and GitHub release (approval gate)

Push the tag explicitly **before** creating the release — on this repo,
`gh release create --target <sha>` has failed with HTTP 422
(`Release.target_commitish is invalid`); `--verify-tag` after an explicit
push is the reliable path:

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag \
  --title "vX.Y.Z — <one-line summary>" \
  --notes-file <approved-notes.md> \
  /tmp/money-manager-mcp-X.Y.Z.tgz#money-manager-mcp-X.Y.Z.tgz
```

The `#name` suffix keeps the asset filename clean. If the release is created
but the asset upload fails, retry with `gh release upload vX.Y.Z <tarball>` —
never delete and recreate a public release without asking.

## Phase 7 — Final verification and report

```bash
gh release view vX.Y.Z    # tag, title, asset, draft=false, prerelease=false
```

Report to the user: released version, commit range, npm URL
(`https://www.npmjs.com/package/money-manager-mcp`), GitHub release URL, and
each verification result (dist-tag, tarball hash, shebang, release state).
