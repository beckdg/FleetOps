#!/usr/bin/env bash
# Release packaging script for FleetOps (Unix).
# Creates a source release ZIP with full git history, excluding regenerable artifacts.

set -euo pipefail

SKIP_TESTS=false
SKIP_BUILD=false
OUTPUT_DIR="release"

usage() {
  echo "Usage: $0 [--skip-tests] [--skip-build] [--output-dir DIR]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests) SKIP_TESTS=true; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

log() { printf '==> %s\n' "$1"; }

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

log "Checking git working tree is clean"
if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  echo "Git working tree is not clean. Commit or stash changes before packaging." >&2
  exit 1
fi

VERSION="$(git describe --tags --always 2>/dev/null || git rev-parse --short HEAD)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
PACKAGE_NAME="fleetops-release-${VERSION}-${TIMESTAMP}"
STAGING_DIR="$(mktemp -d)"
RELEASE_DIR="$REPO_ROOT/$OUTPUT_DIR"
ZIP_PATH="$RELEASE_DIR/${PACKAGE_NAME}.zip"
CHECKSUM_PATH="${ZIP_PATH}.sha256"

mkdir -p "$RELEASE_DIR"

if [[ "$SKIP_BUILD" != true ]]; then
  log "Running monorepo build"
  pnpm build
fi

if [[ "$SKIP_TESTS" != true ]]; then
  log "Running unit tests"
  pnpm test
fi

log "Copying repository files (excluding regenerable artifacts)"
rsync -a \
  --exclude node_modules \
  --exclude dist \
  --exclude build \
  --exclude coverage \
  --exclude .turbo \
  --exclude .cache \
  --exclude release \
  --exclude .git \
  "$REPO_ROOT/" "$STAGING_DIR/"

log "Including .git directory"
rsync -a "$REPO_ROOT/.git/" "$STAGING_DIR/.git/"

log "Creating ZIP archive"
rm -f "$ZIP_PATH"
(
  cd "$STAGING_DIR"
  zip -r -q "$ZIP_PATH" .
)

log "Generating SHA256 checksum"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$ZIP_PATH" > "$CHECKSUM_PATH"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$ZIP_PATH" > "$CHECKSUM_PATH"
else
  echo "No sha256sum or shasum found" >&2
  exit 1
fi

rm -rf "$STAGING_DIR"

echo ""
echo "Release package created:"
echo "  ZIP:       $ZIP_PATH"
echo "  Checksum:  $CHECKSUM_PATH"
