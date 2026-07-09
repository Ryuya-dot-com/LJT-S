# LJT-S Online

Static browser implementation of the 40-item LJT-S fixed form.

## Current Entry Points

- Public participant mode: open the GitHub Pages root URL or `index.html`.
- Researcher setup: add `?research=1`.
- Researcher participant URL: generated URLs use `?take=1&research=1&rc=<code>`.

Published URL examples:

```text
Public participant page:
https://ryuya-dot-com.github.io/LJT-S/

Researcher setup page:
https://ryuya-dot-com.github.io/LJT-S/?research=1

Timed participant URL for researcher code lab2026:
https://ryuya-dot-com.github.io/LJT-S/?take=1&research=1&rc=lab2026&mode=timed

Untimed participant URL for researcher code lab2026:
https://ryuya-dot-com.github.io/LJT-S/?take=1&research=1&rc=lab2026&mode=untimed
```

Replace `lab2026` with the code used by your study protocol. Do not put email addresses or GAS endpoint URLs in participant links.

Participant-facing CSV/JSON downloads omit `correct_answer`, `target_word`, `base_id`, and IRT item parameters. They also replace encoded `item_id` / `audio_file` values with neutral sequence IDs. Email delivery uses the same participant-safe CSV. In all modes, item metadata and answer keys are still present in client-side files because this is a static app.

## Participant Experience

- English is the default participant UI; a Japanese toggle is available.
- Name is optional. The app generates an anonymous ID by default and normalizes it with `trim().toLowerCase()` for ordering and key mapping.
- School/group and class codes are optional.
- A result recipient email is optional. If entered, the app attempts to email a sanitized result CSV at completion, but email is supplemental and quota-limited.
- Participants see a plain-language information notice before starting.
- A sound-check screen plays a practice audio file and preloads all 44 audio files.
- Practice has 4 feedback trials. The main test has 40 trials.
- Responses are accepted only after audio playback ends. Early keypresses or button presses are ignored.
- Timed mode uses the configured response window after the audio ends.
- The result screen immediately shows raw score, accuracy, correct responses by item type, the TOEIC Listening reference range, and the CEFR reference band.
- TOEIC/CEFR reference values are withheld when fewer than all 40 main-test responses are valid; incomplete scores are not prorated.
- The result screen presents TOEIC/CEFR feedback as reference guidance only and directs participants to save the CSV as the reliable result copy.

## Researcher Workflow

1. Open `index.html?research=1` or the published URL with `?research=1`.
2. Choose timed or untimed administration. The default is untimed.
3. Keep the default constrained randomization unless the study has a specific reason to change it.
4. Generate the participant URL and distribute it.
5. Ask participants to enter the teacher/researcher result email address only if email delivery should be attempted.
6. At completion, the app attempts to email the sanitized result CSV and prominently offers CSV/JSON downloads. Treat the downloaded CSV as the primary collection artifact.

Email delivery through GAS is enabled in `data/submission.js`. CSV download remains the primary reliable copy. Full analysis metadata is available only from a local session started directly from researcher setup; participant-distributed `take=1` URLs and emailed CSV attachments are sanitized.

## Offline / Zip Use

Recommended offline package:

```text
dist/LJT-S-offline-20260710.zip
```

To run locally from the release zip:

1. Download `dist/LJT-S-offline-20260710.zip`.
2. Unzip it. This creates a folder named `LJT-S-offline-20260710/`.
3. Keep `START_HERE.html` beside the `audio/` folder.
4. Open `START_HERE.html` in Chrome or Edge.
5. At the final screen, save and collect the CSV.

The offline package contains one self-contained HTML file plus the 44 required `.m4a` files. Email submission is disabled in this package. Do not use GitHub's whole-repository download for routine offline administration.

The existing GitHub Pages URL and query parameters are unchanged. The offline package is a separate release artifact and does not replace or redirect the hosted page.

## Timing Defaults

- Default mode: untimed.
- Untimed condition: no forced response deadline; response time is still recorded.
- Appropriate items: 1600 ms response window.
- Inappropriate items: 2000 ms response window.

The response-window values apply only when timed mode is selected.

## Item Ordering

The app uses seeded constrained randomization:

- 20 appropriate and 20 inappropriate items are administered.
- The correct-answer sequence is constrained so that no more than two same-answer items occur consecutively by default.
- Repeated target words are spaced by at least eight main-test trials when feasible.
- The normalized participant ID, seed, final order, and order diagnostics are written to the result files.

The participant's actual Yes/No response sequence is not constrained.

`APP_VERSION` in `js/app.js` is part of the order seed. Do not change it during an active data-collection wave unless the team intentionally wants a new reproducible ordering namespace.

`CODE_VERSION` records implementation changes that should not alter ordering. Update `CODE_VERSION` when behavior changes but the fixed-form ordering namespace must remain stable.

## Data Handling

The app records:

- responses, correctness, response time, timeouts, and response modality;
- audio start/end timestamps, measured playback duration, audio errors, and retry count;
- focus loss / visibility-hidden events during audio playback and response windows, with timed-trial invalidation flags;
- user agent, viewport/screen size, pointer type, iframe status, and protocol in session JSON and CSV summary columns.

Sessions are saved to `localStorage` after each stage/trial using `ljts_partial_<participant_id>`. A completed result remains recoverable on that device for up to 24 hours so a blocked or missed download can be repeated. A saved session is shown explicitly as a resume/result panel; a previous ID is no longer silently reused without a saved session. The result screen provides a control to delete the current session and its queued submission data. Snapshots omit answer keys, target words, original item IDs, and original audio filenames. If storage is blocked, the app still runs, but resume and result-recovery protection are unavailable.

## GAS Email Delivery

The client can submit completion payloads to a Google Apps Script Web App as `text/plain` JSON. The Apps Script endpoint generates a participant-safe CSV attachment and emails it to the recipient address entered by the participant. Configure it in `data/submission.js`:

```js
window.LJT_SHORT_SUBMISSION = {
  enabled: true,
  endpoint: 'https://script.google.com/macros/s/AKfycbxy8waMOt07zhOb_2zxaRjeKWg0-FKAclL_JBE-GEfar4-L3v9wqvTTln-TkwR9DrIRyw/exec',
  publicResearchCode: 'public',
  maxRetries: 5
};
```

Submission can be disabled with `?submit=0`, but it cannot be enabled or redirected from the URL. Do not add endpoint URLs to participant links.

The currently deployed endpoint keeps operating until its Apps Script owner publishes a new version. The source template in `gas/Code.gs` now defaults to server-side research-code routing for the next deployment; configure its Script Properties before deployment. Updating the existing GAS deployment preserves the same `/exec` URL and does not change the GitHub Pages link. See `gas/README.md` and `docs/researcher-guide.md`.

The browser uses fire-and-forget `no-cors` submission for Apps Script compatibility. It cannot inspect the server response, so the UI reports only that email delivery was attempted. Items are removed from the local queue after a fetch attempt resolves; only network-level failures remain for retry. CSV download is therefore always shown and should be treated as the authoritative participant-side copy.

Apps Script / Gmail email delivery has a daily sending limit of 100 messages for this deployment context. During large administrations, result emails may not arrive even when participants enter an email address. The participant result screen warns about this limit and directs participants to save the CSV as the reliable copy.

No analytics or third-party tracking scripts are included.

## TOEIC / CEFR Conversion

`data/conversion.js` maps the LJT-S raw score to TOEIC Listening and CEFR reference ranges:

| LJT-S raw score | TOEIC Listening range | CEFR reference |
|---|---:|---|
| 0-20 | 60-105 | A1 |
| 21-22 | 110-185 | A2_lower |
| 23-25 | 190-270 | A2_upper |
| 26-29 | 275-330 | B1_lower |
| 30-32 | 335-395 | B1_upper |
| 33-35 | 400-440 | B2_lower |
| 36-37 | 445-485 | B2_upper |
| 38-40 | 490-495 | C1 |

The result screen, JSON payload, CSV export, and email summary store the TOEIC value as a range string such as `335-395`. These values are reference guides from LJT-S, not official TOEIC scores, official CEFR certification, or diagnostic classifications.

Conversion is performed only when all 40 main-test responses are valid for scoring. Audio errors, focus invalidation, abandonment, or other technical exclusions suppress TOEIC/CEFR output rather than converting or prorating a partial score.

Interpretation constraints:

- Do not describe the TOEIC/CEFR outputs as official scores, official CEFR levels, certification, or placement decisions.
- Do not use the TOEIC/CEFR outputs as the sole basis for class placement, pass/fail decisions, certification, admissions, employment screening, or other high-stakes decisions.
- Boundary scores should be interpreted cautiously because adjacent raw-score bands can produce different reference ranges.
- The intended use is research and educational feedback where the result is clearly framed as an approximate reference guide.

## Audio Assets

The app references mono AAC `.m4a` files generated from the WAV originals. Regenerate them with:

```bash
scripts/convert-audio.sh 80k
```

WAV masters are kept outside the published repository. The web and offline bundles contain only the 44 referenced `.m4a` files.

## QA and Release Helpers

Run the reproducible 500-ID randomization check:

```bash
scripts/randomization-check.js 500
```

Outputs are written to `qa/randomization_simulation_summary.json` and `qa/randomization_simulation_500.csv`.

Build and verify the single-HTML offline package:

```bash
scripts/build-offline-package.sh
scripts/verify-offline-package.sh +  dist/LJT-S-offline-20260710 +  dist/LJT-S-offline-20260710.zip
```

The current output is `dist/LJT-S-offline-20260710.zip`. The legacy web-layout archive can still be regenerated with `scripts/build-release-zip.sh` so its existing repository link remains valid.

## Files

- `index.html`: app entry point for GitHub Pages.
- `participant.html`: participant-only entry for offline/zip distribution.
- `data/items.js`: fixed 40-item item list and 4 practice items.
- `data/conversion.js`: TOEIC Listening / CEFR conversion hook.
- `data/submission.js`: GAS submission endpoint configuration.
- `audio/main/`: the 40 selected main-test audio files.
- `audio/practice/`: four practice audio files.
- `gas/`: Google Apps Script backend template.
- `docs/`: researcher and offline administration guides.
- `js/app.js`: setup, registration, presentation, scoring, persistence, and export logic.
- `assets/styles.css`: app styling.
- `scripts/convert-audio.sh`: WAV to `.m4a` conversion helper.
- `scripts/randomization-check.js`: reproducible constrained-randomization simulation.
- `scripts/build-offline-package.sh`: builds the local-only single-HTML package.
- `scripts/verify-offline-package.sh`: verifies package structure, embedded assets, and audio integrity.
- `scripts/build-release-zip.sh`: release zip builder.
