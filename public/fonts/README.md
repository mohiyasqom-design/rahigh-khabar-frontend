# Editor fonts (self-hosted)

Place these woff2 files here (referenced by `app/globals.css`):

- `Shabnam.woff2`, `Shabnam-Bold.woff2` — Shabnam v5.0.1, SIL OFL 1.1 (free, commercial use OK).
  Run `bash scripts/fetch-fonts.sh` to download them.
- `Peyda-Regular.woff2`, `Peyda-Bold.woff2` — **WARNING:** Peyda is published by fontiran.com and
  requires a purchased license (it is NOT OFL). Buy it, or swap to a free face such as *Estedad* (OFL):
  change the `@font-face` + `--font-peyda` in globals.css (token names can stay the same).

A missing file never breaks the build; the browser falls back to Vazirmatn.
