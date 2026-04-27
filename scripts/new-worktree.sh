#!/usr/bin/env bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SOURCE_ROOT=""
BASE_DIR=""
WORKTREE_PATH=""
FROM_REF="HEAD"
FORCE=0
INSTALL_WEB_DEPS=1

usage() {
  cat <<'EOF'
Create and bootstrap a new git worktree for Reading Buddy.

Usage:
  ./scripts/new-worktree.sh [options] <branch-name>

Options:
  --source PATH      Canonical source worktree. Defaults to current git root.
  --base-dir PATH    Base directory for generated worktree paths.
                     Default: <repo-parent>/worktrees/<repo-name>
  --path PATH        Exact worktree path to create.
  --from REF         Base ref for new branches. Default: HEAD
  --force            Replace existing .env / web/.env.local in target worktree.
  --no-install       Skip npm install in the new worktree's web/ directory.
  -h, --help         Show this help.

Examples:
  ./scripts/new-worktree.sh my-feature
  ./scripts/new-worktree.sh --from staging native-pdf-viewer
  ./scripts/new-worktree.sh --path ../worktrees/reading-buddy/my-branch/reading-buddy my-branch
  ./scripts/new-worktree.sh --no-install docs-update
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

absolute_path() {
  local path="$1"

  if [ -d "$path" ]; then
    (cd "$path" && pwd)
    return
  fi

  local dir
  dir="$(dirname "$path")"
  local base
  base="$(basename "$path")"

  mkdir -p "$dir"
  (cd "$dir" && printf '%s/%s\n' "$(pwd)" "$base")
}

slugify_branch() {
  printf '%s' "$1" | tr '/[:space:]' '--' | tr -cd '[:alnum:]._-'
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

link_file() {
  local source_path="$1"
  local target_path="$2"
  local label="$3"

  if [ ! -e "$source_path" ] && [ ! -L "$source_path" ]; then
    log_warn "Skipping ${label}: source missing at ${source_path}"
    return 0
  fi

  mkdir -p "$(dirname "$target_path")"

  if same_symlink_target "$target_path" "$source_path"; then
    log_info "Already linked: ${target_path} -> ${source_path}"
    return 0
  fi

  if [ -e "$target_path" ] || [ -L "$target_path" ]; then
    if [ "$FORCE" -eq 0 ]; then
      log_warn "Skipping existing ${label} (use --force to replace): ${target_path}"
      return 0
    fi

    rm -rf "$target_path"
  fi

  ln -s "$source_path" "$target_path"
  log_success "Linked ${label}: ${target_path} -> ${source_path}"
}

local_branch_exists() {
  git show-ref --verify --quiet "refs/heads/$1"
}

remote_branch_exists() {
  git show-ref --verify --quiet "refs/remotes/origin/$1"
}

create_worktree() {
  local branch_name="$1"
  local target_path="$2"

  if local_branch_exists "$branch_name"; then
    log_info "Using existing local branch: ${branch_name}"
    git worktree add "$target_path" "$branch_name"
    return
  fi

  if remote_branch_exists "$branch_name"; then
    log_info "Creating local tracking branch from origin/${branch_name}"
    git worktree add -b "$branch_name" "$target_path" "origin/$branch_name"
    return
  fi

  log_info "Creating new branch ${branch_name} from ${FROM_REF}"
  git worktree add -b "$branch_name" "$target_path" "$FROM_REF"
}

main() {
  local branch_name=""

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
      --base-dir)
        if [ $# -lt 2 ]; then
          log_error "--base-dir requires a path"
          exit 1
        fi
        BASE_DIR="$2"
        shift 2
        ;;
      --path)
        if [ $# -lt 2 ]; then
          log_error "--path requires a path"
          exit 1
        fi
        WORKTREE_PATH="$2"
        shift 2
        ;;
      --from)
        if [ $# -lt 2 ]; then
          log_error "--from requires a ref"
          exit 1
        fi
        FROM_REF="$2"
        shift 2
        ;;
      --force)
        FORCE=1
        shift
        ;;
      --no-install)
        INSTALL_WEB_DEPS=0
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      --*)
        log_error "Unknown option: $1"
        echo
        usage
        exit 1
        ;;
      *)
        if [ -n "$branch_name" ]; then
          log_error "Only one branch name may be provided"
          echo
          usage
          exit 1
        fi
        branch_name="$1"
        shift
        ;;
    esac
  done

  if [ -z "$branch_name" ]; then
    usage
    exit 1
  fi

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

  local source_top
  source_top="$(git -C "$SOURCE_ROOT" rev-parse --show-toplevel 2>/dev/null || true)"
  if [ -z "$source_top" ]; then
    log_error "Source is not a valid git worktree: ${SOURCE_ROOT}"
    exit 1
  fi
  SOURCE_ROOT="$source_top"

  local repo_name
  repo_name="$(basename "$SOURCE_ROOT")"

  if [ -z "$BASE_DIR" ]; then
    BASE_DIR="$(dirname "$SOURCE_ROOT")/worktrees/${repo_name}"
  else
    BASE_DIR="$(absolute_path "$BASE_DIR")"
  fi

  if [ -z "$WORKTREE_PATH" ]; then
    local branch_slug
    branch_slug="$(slugify_branch "$branch_name")"
    WORKTREE_PATH="${BASE_DIR}/${branch_slug}/${repo_name}"
  else
    WORKTREE_PATH="$(absolute_path "$WORKTREE_PATH")"
  fi

  if [ -e "$WORKTREE_PATH" ]; then
    log_error "Target path already exists: ${WORKTREE_PATH}"
    exit 1
  fi

  if ! git rev-parse --verify "$FROM_REF" >/dev/null 2>&1 && ! git rev-parse --verify "origin/$FROM_REF" >/dev/null 2>&1; then
    log_error "Base ref not found: ${FROM_REF}"
    exit 1
  fi

  log_info "Source worktree: ${SOURCE_ROOT}"
  log_info "Branch: ${branch_name}"
  log_info "Target path: ${WORKTREE_PATH}"
  if [ "$INSTALL_WEB_DEPS" -eq 1 ]; then
    log_info "Bootstrap: env links + web npm install"
  else
    log_info "Bootstrap: env links only"
  fi
  echo

  mkdir -p "$(dirname "$WORKTREE_PATH")"
  create_worktree "$branch_name" "$WORKTREE_PATH"

  link_file "${SOURCE_ROOT}/.env" "${WORKTREE_PATH}/.env" ".env"
  link_file "${SOURCE_ROOT}/web/.env.local" "${WORKTREE_PATH}/web/.env.local" "web/.env.local"

  if [ "$INSTALL_WEB_DEPS" -eq 1 ]; then
    if [ -f "${WORKTREE_PATH}/web/package.json" ]; then
      log_info "Installing web dependencies..."
      npm --prefix "${WORKTREE_PATH}/web" install
      log_success "Installed web dependencies"
    else
      log_warn "Skipping npm install: ${WORKTREE_PATH}/web/package.json not found"
    fi
  fi

  echo
  log_success "Worktree is ready"
  echo "Path:   ${WORKTREE_PATH}"
  echo "Branch: ${branch_name}"
  echo
  echo "Next steps:"
  echo "  cd ${WORKTREE_PATH}"
  echo "  npm run dev"
}

main "$@"
