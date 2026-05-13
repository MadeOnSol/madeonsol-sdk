#!/usr/bin/env bash
# preflight-publish.sh — abort publish unless what's about to ship is in git, tagged, and pushed.
#
# Wired into:
#   - npm: prepublishOnly script in each package.json
#   - PyPI: scripts/publish-python.sh wrapper around twine
#   - cargo: scripts/publish-rust.sh wrapper around cargo publish
#
# Aborts unless ALL hold for the package directory it runs in:
#   1. No uncommitted changes (modified or untracked) within the package dir
#   2. Git tag exists matching the manifest version
#        - leaf-package convention (cwd != repo root): "<leaf-dir>@<version>"
#        - root-package convention (cwd == repo root): "v<version>"
#   3. Local HEAD is on origin (not ahead, not diverged)
#
# Bypass for emergencies only:
#   PREFLIGHT_SKIP=1 npm publish    (logs the bypass loudly)

set -euo pipefail

PKG_DIR="$(pwd)"
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "❌ preflight: not inside a git repo ($PKG_DIR)" >&2
  exit 1
}

if [ "${PREFLIGHT_SKIP:-}" = "1" ]; then
  echo "⚠️  preflight: PREFLIGHT_SKIP=1 — bypassing all checks. Make sure you tag + push retroactively." >&2
  exit 0
fi

# ── Resolve manifest → name + version ───────────────────────────────────────
if [ -f Cargo.toml ]; then
  NAME=$(awk -F'"' '/^name *= *"/{print $2; exit}' Cargo.toml)
  VERSION=$(awk -F'"' '/^version *= *"/{print $2; exit}' Cargo.toml)
elif [ -f pyproject.toml ]; then
  NAME=$(awk -F'"' '/^name *= *"/{print $2; exit}' pyproject.toml)
  VERSION=$(awk -F'"' '/^version *= *"/{print $2; exit}' pyproject.toml)
elif [ -f package.json ]; then
  NAME=$(node -p "require('./package.json').name")
  VERSION=$(node -p "require('./package.json').version")
else
  echo "❌ preflight: no Cargo.toml / pyproject.toml / package.json in $PKG_DIR" >&2
  exit 1
fi

# ── 1. Clean working tree (within this package only) ────────────────────────
DIRTY=$(cd "$GIT_ROOT" && git status --porcelain -- "$PKG_DIR")
if [ -n "$DIRTY" ]; then
  echo "❌ preflight: $PKG_DIR has uncommitted or untracked files" >&2
  echo "$DIRTY" | sed 's/^/    /' >&2
  echo "    commit (or .gitignore) before publishing" >&2
  exit 1
fi

# ── 2. Tag exists for this version ──────────────────────────────────────────
if [ "$PKG_DIR" = "$GIT_ROOT" ]; then
  TAG="v${VERSION}"
else
  LEAF=$(basename "$PKG_DIR")
  TAG="${LEAF}@${VERSION}"
fi

if ! git rev-parse "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "❌ preflight: no git tag '$TAG' for $NAME@$VERSION" >&2
  echo "    create with: git tag $TAG && git push origin $TAG" >&2
  exit 1
fi

# Tag must point at HEAD (or an ancestor) — i.e. what we're about to publish must match the tagged tree.
TAG_COMMIT=$(git rev-parse "$TAG^{commit}")
if ! git merge-base --is-ancestor "$TAG_COMMIT" HEAD; then
  echo "❌ preflight: tag $TAG points to a commit that is not an ancestor of HEAD" >&2
  echo "    you may be on a different branch than the one this version was tagged on" >&2
  exit 1
fi

# ── 3. HEAD pushed to origin ────────────────────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git fetch origin --quiet 2>/dev/null || {
  echo "⚠️  preflight: could not fetch origin — skipping push check" >&2
  echo "✅ preflight: $NAME@$VERSION (tag $TAG) — clean + tagged (push state unverified)"
  exit 0
}

LOCAL_HEAD=$(git rev-parse HEAD)
REMOTE_REF="origin/$BRANCH"
if ! REMOTE_HEAD=$(git rev-parse "$REMOTE_REF" 2>/dev/null); then
  echo "❌ preflight: branch '$BRANCH' has no upstream '$REMOTE_REF'" >&2
  exit 1
fi

if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  if git merge-base --is-ancestor "$LOCAL_HEAD" "$REMOTE_HEAD"; then
    : # local behind origin — odd but harmless for publish (publish uses local files)
  else
    echo "❌ preflight: local HEAD not pushed to $REMOTE_REF" >&2
    echo "    push with: git push origin $BRANCH" >&2
    exit 1
  fi
fi

# Tag must also be on origin
if ! git ls-remote --exit-code --tags origin "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "❌ preflight: tag '$TAG' exists locally but not on origin" >&2
  echo "    push with: git push origin $TAG" >&2
  exit 1
fi

echo "✅ preflight: $NAME@$VERSION (tag $TAG) — clean, tagged, pushed"
