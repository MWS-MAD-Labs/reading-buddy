#!/usr/bin/env bash

set -euo pipefail

# Sync local-only files across all git worktrees by symlinking them to a
# canonical source worktree.
#
# Default synced files:
#   - .env
#   - web/.env.local
#
# Optional dependency sharing:
#   --link-deps   Also symlink:
#                   - node_modules
#                   - web/node_modules
#
# Notes:
# - Secrets remain gitignored because this script only creates local symlinks.
# - Sharing node_modules is convenient but safest when worktrees are on the
#   same commit or at least the same lockfile/dependency graph.
#
# Usage:
#   ./scripts/sync-worktree-local-files.sh
#   ./scripts/sync-worktree-local-files.sh --link-deps
#   ./scripts/sync-worktree-local-files.sh --force
#   ./scripts/sync-worktree-local-files.sh --source /path/to/canonical/worktree
#   ./scripts/sync-worktree-local-files.sh --source . --link-deps --force

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

FORCE=0
LINK_DEPS=0
SOURCE_ROOT=""
DRY_RUN=0

usage() {
  cat <<'EOF'
Sync local-only files across all git worktrees.

Usage:
  ./scripts/sync-worktree-local-files.sh [options]

Options:
  --source PATH   Canonical worktree to link from. Defaults to current git root.
  --link-deps     Also symlink node_modules and web/node_modules.
  --force         Replace existing non-symlink files/directories in target worktrees.
  --dry-run       Print planned actions without changing anything.
  -h, --help      Show this help.

Examples:
  ./scripts/sync-worktree-local-files.sh
  ./scripts/sync-worktree-local-files.sh --link-deps
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

compare_lockfiles_hint() {
  local source_root="$1"
  local target_root="$2"

  local source_web_lock="${source_root}/web/package-lock.json"
  local target_web_lock="${target_root}/web/package-lock.json"

  if [ ! -f "$source_web_lock" ] || [ ! -f "$target_web_lock" ]; then
    return 0
  fi

  if ! cmp -s "$source_web_lock" "$target_web_lock"; then
    log_warn "Dependency lockfile differs for:"
    log_warn "  ${target_root}"
    log_warn "Sharing node_modules may be unsafe for this worktree."
  fi
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
      --link-deps)
        LINK_DEPS=1
        shift
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
  if [ "$LINK_DEPS" -eq 1 ]; then
    log_warn "Dependency sharing is enabled (--link-deps)"
  fi
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

    if [ "$LINK_DEPS" -eq 1 ]; then
      compare_lockfiles_hint "$SOURCE_ROOT" "$wt"
      replace_path_with_symlink "${SOURCE_ROOT}/node_modules" "${wt}/node_modules" "node_modules" || skipped=$((skipped + 1))
      replace_path_with_symlink "${SOURCE_ROOT}/web/node_modules" "${wt}/web/node_modules" "web/node_modules" || skipped=$((skipped + 1))
    fi

    linked=$((linked + 1))
    echo
  done <<EOF
$worktrees
EOF

  log_success "Done."
  echo "Worktrees discovered: ${count}"
  echo "Target worktrees processed: ${linked}"
  if [ "$LINK_DEPS" -eq 1 ]; then
    echo "Synced paths per target: .env, web/.env.local, node_modules, web/node_modules"
  else
    echo "Synced paths per target: .env, web/.env.local"
  fi

  if [ "$LINK_DEPS" -eq 1 ]; then
    echo
    log_warn "If a worktree changes dependencies or lockfiles, run npm install in that worktree instead of sharing node_modules."
  fi
}

main "$@"
