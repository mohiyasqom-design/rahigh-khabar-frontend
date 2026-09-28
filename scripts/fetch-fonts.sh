#!/usr/bin/env bash
# Downloads the free (OFL) Shabnam webfonts into public/fonts. Peyda is licensed; add it manually.
set -euo pipefail
cd "$(dirname "$0")/../public/fonts"
base="https://cdn.jsdelivr.net/gh/rastikerdar/shabnam-font@v5.0.1/dist"
curl -fsSL "$base/Shabnam.woff2" -o Shabnam.woff2
curl -fsSL "$base/Shabnam-Bold.woff2" -o Shabnam-Bold.woff2
echo "Shabnam downloaded."
