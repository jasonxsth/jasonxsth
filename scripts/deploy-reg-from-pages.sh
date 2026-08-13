#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_URL="${RENDART_SOURCE_URL:-https://jasonxsth.github.io/jasonxsth}"
DOCROOT="${RENDART_DOCROOT:-$HOME/www/rendart.ru}"
DEPLOY_ROOT="${RENDART_DEPLOY_ROOT:-$HOME/deploy}"
LOCK_DIR="$DEPLOY_ROOT/.rendart-deploy.lock"
STAGE=""

mkdir -p "$DEPLOY_ROOT"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "RENDART deploy is already running"
  exit 0
fi

cleanup() {
  if [[ -n "$STAGE" && -d "$STAGE" ]]; then
    rm -rf "$STAGE"
  fi
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT

STAGE="$(mktemp -d "$DEPLOY_ROOT/rendart-stage.XXXXXX")"

download_tree() {
  local path="$1"

  wget \
    --quiet \
    --no-cache \
    --recursive \
    --level=10 \
    --no-parent \
    --no-host-directories \
    --cut-dirs=1 \
    --page-requisites \
    --directory-prefix="$STAGE" \
    "$SOURCE_URL/$path"
}

download_tree ""
download_tree "admin/"
download_tree "consent/"
download_tree "thanks/"

mkdir -p "$STAGE/content"
wget --quiet --no-cache --output-document="$STAGE/404.html" "$SOURCE_URL/404.html"
wget --quiet --no-cache --output-document="$STAGE/favicon.ico" "$SOURCE_URL/favicon.ico"
wget --quiet --no-cache --output-document="$STAGE/robots.txt" "$SOURCE_URL/robots.txt"
wget --quiet --no-cache --output-document="$STAGE/sitemap.xml" "$SOURCE_URL/sitemap.xml"
wget --quiet --no-cache --output-document="$STAGE/content/site.json" "$SOURCE_URL/content/site.json"

rm -rf "$STAGE/client" "$STAGE/server" "$STAGE/.nojekyll"
find "$STAGE" -type f -name '*.1' -delete
while IFS= read -r -d '' file; do
  case "$(basename "$file")" in
    *\?*) rm -f "$file" ;;
  esac
done < <(find "$STAGE" -type f -print0)

required=(
  index.html
  404.html
  about/index.html
  admin/index.html
  b2b/index.html
  consent/index.html
  contacts/index.html
  designers/index.html
  portfolio/index.html
  privacy/index.html
  thanks/index.html
  content/site.json
  robots.txt
  sitemap.xml
)

for file in "${required[@]}"; do
  if [[ ! -s "$STAGE/$file" ]]; then
    echo "Missing deployment file: $file" >&2
    exit 1
  fi
done

index_count="$(find "$STAGE" -type f -name index.html | wc -l | tr -d '[:space:]')"
if [[ "$index_count" != "16" ]]; then
  echo "Expected 16 generated pages, received $index_count" >&2
  exit 1
fi

if ! grep -Fq '<link rel="canonical" href="https://rendart.ru/' "$STAGE/index.html"; then
  echo "Production canonical URL is missing" >&2
  exit 1
fi

if grep -R -Fq 'jasonxsth.github.io/jasonxsth' "$STAGE"; then
  echo "Legacy GitHub Pages URL found in deployment artifact" >&2
  exit 1
fi

if ! find "$STAGE/assets" -type f -name 'site-*.css' -print -quit | grep -q .; then
  echo "Compiled site stylesheet is missing" >&2
  exit 1
fi

if ! find "$STAGE/assets" -type f -name 'site-*.js' -print -quit | grep -q .; then
  echo "Compiled site script is missing" >&2
  exit 1
fi

if [[ ! -d "$DOCROOT" ]]; then
  echo "Document root does not exist: $DOCROOT" >&2
  exit 1
fi

rsync \
  --archive \
  --delete-delay \
  --exclude='.well-known/' \
  --exclude='.htaccess' \
  --exclude='api/' \
  "$STAGE/" "$DOCROOT/"

echo "RENDART deployed successfully from $SOURCE_URL"
