# Regression checks

Run all checks from the repository root:

```sh
./tests/run.sh
```

The suite fixes the following release contracts:

- TOEIC/CEFR guidance is available only after 40 scored main items.
- The established raw-score boundaries remain unchanged for a complete form.
- All 40 main and 4 practice items reference distinct, non-empty M4A assets.
- Browser and GAS CSV output neutralizes spreadsheet-formula prefixes.
- A zero condition score remains numeric zero in GAS result rows.
- The purpose-built offline ZIP is one self-contained HTML file plus two readmes
  and exactly the 44 referenced M4A files.
- The inlined CSS/JavaScript, readmes, and audio bytes match the current source
  tree, preventing a stale ZIP from being released after a safety fix.
- The compatibility `LJT-S-online-20260701.zip` remains usable at its existing
  path, contains its linked web assets, and ships the same 44 non-empty M4As
  with no WAV masters.
- Generated `take=1` links retain participant confirmation, completed snapshots
  remain recoverable for 24 hours, and explicit cleanup removes session data.

Inspect another candidate offline build without adding it to the test suite:

```sh
node tests/check-offline-package.js dist/LJT-S-offline-YYYYMMDD.zip
node tests/check-online-package.js dist/LJT-S-online-20260701.zip
```

The validator reads ZIP central-directory data using Node standard modules; it
does not require `unzip` or an npm dependency.

Run the optional real-browser smoke check when Chrome or Chromium is available:

```sh
node tests/browser-smoke.mjs
```

This check keeps the public and researcher entry routes intact, verifies the
generated participant URL contract, confirms that distributed `take=1` links
show the information-confirmation screen, completes all 4 practice and 40 main
trials with a deterministic test audio shim, and verifies the result/recovery
screen. Set `CHROME_BIN` when Chrome is installed outside the common macOS or
Linux locations.
