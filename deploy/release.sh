#!/usr/bin/env bash
# Activates or rolls back a frontend release served by the API stack's Caddy. Installed as
# DEPLOY_PATH/frontend/release.sh; Caddy serves DEPLOY_PATH/frontend/current/dist and imports
# DEPLOY_PATH/frontend/current/frontend.caddy.
#
# Usage: release.sh activate <archive.tar.gz> <release-id>
#        release.sh rollback

set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$FRONTEND_DIR")"
RELEASES_DIR="$FRONTEND_DIR/releases"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

log() { printf '==> %s\n' "$*"; }

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  sed -n '6,7p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

link_target() { readlink "$FRONTEND_DIR/$1" 2>/dev/null || true; }

point() {
  local link=$1 target=$2
  ln -sfn "$target" "$FRONTEND_DIR/.$link.next"
  mv -T "$FRONTEND_DIR/.$link.next" "$FRONTEND_DIR/$link"
}

reload_caddy() {
  docker compose -f "$DEPLOY_DIR/compose.yml" exec -T caddy caddy reload --config /etc/caddy/Caddyfile
}

switch_to() {
  local target=$1 previous
  previous="$(link_target current)"
  point current "$target"
  if ! reload_caddy; then
    if [[ -n $previous ]]; then
      point current "$previous"
      reload_caddy || true
    fi
    fail "Caddy rejected the configuration of $target; the previous release stays active"
  fi
  [[ -z $previous || $previous == "$target" ]] || point previous "$previous"
  log "Serving $target"
}

carry_over_assets() {
  local release=$1 previous=$2 asset
  (cd "$release/dist/assets" && find . -type f | sort) >"$release/assets.txt"
  [[ -n $previous && -f $FRONTEND_DIR/$previous/assets.txt ]] || return 0
  while IFS= read -r asset; do
    [[ -e $release/dist/assets/$asset ]] || cp -p "$FRONTEND_DIR/$previous/dist/assets/$asset" "$release/dist/assets/$asset"
  done <"$FRONTEND_DIR/$previous/assets.txt"
}

prune_releases() {
  local current previous release
  current="$(basename "$(link_target current)")"
  previous="$(basename "$(link_target previous)")"
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r | tail -n "+$((KEEP_RELEASES + 1))" |
    while read -r release; do
      [[ $release == "$current" || $release == "$previous" ]] || rm -rf "${RELEASES_DIR:?}/$release"
    done
}

activate() {
  local archive=$1 id=$2 staging release
  [[ $id =~ ^[A-Za-z0-9._-]+$ ]] || fail 'the release id may contain only letters, digits, ".", "_", and "-"'
  [[ -s $archive ]] || fail "$archive does not exist or is empty"
  release="$RELEASES_DIR/$id"
  [[ ! -e $release ]] || fail "release $id already exists"

  staging="$RELEASES_DIR/.staging-$id"
  rm -rf "$staging"
  mkdir -p "$staging"
  tar -xzf "$archive" -C "$staging"
  [[ -f $staging/dist/index.html && -f $staging/frontend.caddy ]] ||
    fail 'the archive must contain dist/index.html and frontend.caddy'
  carry_over_assets "$staging" "$(link_target current)"
  mv "$staging" "$release"
  rm -f "$archive"

  switch_to "releases/$id"
  prune_releases
}

rollback() {
  local previous
  previous="$(link_target previous)"
  [[ -n $previous && -d $FRONTEND_DIR/$previous ]] || fail 'no previous release is available'
  switch_to "$previous"
}

mkdir -p "$RELEASES_DIR"
exec 9>"$FRONTEND_DIR/.release.lock"
flock -n 9 || fail 'another frontend release is running'

case "${1:-}" in
  activate)
    [[ $# -eq 3 ]] || usage
    activate "$2" "$3"
    ;;
  rollback)
    [[ $# -eq 1 ]] || usage
    rollback
    ;;
  *) usage ;;
esac
