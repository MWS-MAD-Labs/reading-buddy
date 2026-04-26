#!/usr/bin/env bash

set -euo pipefail

# Sync local-only files across all git worktrees by symlinking them to a
# canonical source worktree.
#
# Default synced files:
#   - .env
#   - web/.env.local
#
# Notes:
# - Secrets remain gitignored because this script only creates local symlinks.
# - Do not symlink node_modules into sibling worktrees. Next.js/Turbopack can
#   reject dependency symlinks that point outside the worktree root.
#
# Usage:
#   ./scripts/sync-worktree-local-files.sh
#   ./scripts/sync-worktree-local-files.sh --force
#   ./scripts/sync-worktree-local-files.sh --source /path/to/canonical/worktree

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

FORCE=0
SOURCE_ROOT=""
DRY_RUN=0

usage() {
  cat <<'EOF'
Sync local-only files across all git worktrees.

Usage:
  ./scripts/sync-worktree-local-files.sh [options]

Options:
  --source PATH   Canonical worktree to link from. Defaults to current git root.
  --force         Replace existing non-symlink files/directories in target worktrees.
  --dry-run       Print planned actions without changing anything.
  -h, --help      Show this help.

Examples:
  ./scripts/sync-worktree-local-files.sh
  ./scripts/sync-worktree-local-files.sh --source /Users/you/reading-buddy --force
EOF
}

log_info() {
  printf "${BLUE}%s${NC}\n" "$1"
}

log_success() {
  printf "${GREEN}%s${NC}\n" "$1"
}

log_warn() {
  printf "${YELLOW}%s${NC}\n" "$1"
}

log_error() {
  printf "${RED}%s${NC}\n" "$1" >&2
}

run_cmd() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '[dry-run] %s\n' "$*"
  else
    "$@"
  fi
}

absolute_path() {
  local path="$1"
  if [ -d "$path" ]; then
    (cd "$path" && pwd)
  else
    local dir
    dir="$(dirname "$path")"
    local base
    base="$(basename "$path")"
    (cd "$dir" && printf '%s/%s\n' "$(pwd)" "$base")
  fi
}

same_symlink_target() {
  local target="$1"
  local expected="$2"

  if [ ! -L "$target" ]; then
    return 1
  fi

  local actual
  actual="$(readlink "$target" || true)"

  [ "$actual" = "$expected" ]
}

replace_path_with_symlink() {
  local source_path="$1"
  local target_path="$2"
  local label="$3"

  if [ ! -e "$source_path" ] && [ ! -L "$source_path" ]; then
    log_warn "Skipping ${label}: source missing at ${source_path}"
    return 0
  fi

  local parent_dir
  parent_dir="$(dirname "$target_path")"
  run_cmd mkdir -p "$parent_dir"

  if same_symlink_target "$target_path" "$source_path"; then
    log_info "Already linked: ${target_path} -> ${source_path}"
    return 0
  fi

  if [ -e "$target_path" ] || [ -L "$target_path" ]; then
    if [ "$FORCE" -eq 0 ]; then
      log_warn "Skipping existing path (use --force to replace): ${target_path}"
      return 0
    fi

    run_cmd rm -rf "$target_path"
  fi

  run_cmd ln -s "$source_path" "$target_path"
  log_success "Linked ${label}: ${target_path} -> ${source_path}"
}

collect_worktrees() {
  git worktree list --porcelain | awk '
    BEGIN { RS=""; FS="\n" }
    {
      for (i = 1; i <= NF; i++) {
        if ($i ~ /^worktree /) {
          sub(/^worktree /, "", $i)
          print $i
        }
      }
    }
  '
}



main() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --source)
        if [ $# -lt 2 ]; then
          log_error "--source requires a path"
          exit 1
        fi
        SOURCE_ROOT="$2"
        shift 2
        ;;

      --force)
        FORCE=1
        shift
        ;;
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        echo
        usage
        exit 1
        ;;
    esac
  done

  if ! command -v git >/dev/null 2>&1; then
    log_error "git is required"
    exit 1
  fi

  local repo_root
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"

  if [ -z "$repo_root" ]; then
    log_error "Run this script from inside a git worktree"
    exit 1
  fi

  if [ -z "$SOURCE_ROOT" ]; then
    SOURCE_ROOT="$repo_root"
  else
    SOURCE_ROOT="$(absolute_path "$SOURCE_ROOT")"
  fi

  if [ ! -d "$SOURCE_ROOT/.git" ] && ! git -C "$SOURCE_ROOT" rev-parse --show-toplevel >/dev/null 2>&1; then
    log_error "Source is not a valid git worktree: ${SOURCE_ROOT}"
    exit 1
  fi

  local source_top
  source_top="$(git -C "$SOURCE_ROOT" rev-parse --show-toplevel)"

  if [ "$source_top" != "$SOURCE_ROOT" ]; then
    SOURCE_ROOT="$source_top"
  fi

  log_info "Canonical source worktree: ${SOURCE_ROOT}"
  if [ "$FORCE" -eq 1 ]; then
    log_warn "Existing paths will be replaced (--force)"
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    log_warn "Dry run mode enabled"
  fi
  echo

  local worktrees
  worktrees="$(collect_worktrees)"

  if [ -z "$worktrees" ]; then
    log_error "No worktrees found"
    exit 1
  fi

  local count=0
  local linked=0
  local skipped=0

  while IFS= read -r wt; do
    [ -n "$wt" ] || continue

    wt="$(absolute_path "$wt")"
    count=$((count + 1))

    log_info "Processing worktree: ${wt}"

    if [ "$wt" = "$SOURCE_ROOT" ]; then
      log_info "Skipping canonical source worktree"
      echo
      continue
    fi

    replace_path_with_symlink "${SOURCE_ROOT}/.env" "${wt}/.env" ".env" || skipped=$((skipped + 1))
    replace_path_with_symlink "${SOURCE_ROOT}/web/.env.local" "${wt}/web/.env.local" "web/.env.local" || skipped=$((skipped + 1))

    linked=$((linked + 1))
    echo
  done <<EOF
$worktrees
EOF

  log_success "Done."
  echo "Worktrees discovered: ${count}"
  echo "Target worktrees processed: ${linked}"
  echo "Synced paths per target: .env, web/.env.local"
  echo
  log_warn "Install dependencies inside each worktree separately when needed."
}

main "$@"
