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

- Japanese is the default participant UI; an EN toggle is available.
- Name is optional. The app generates an anonymous ID by default and normalizes it with `trim().toLowerCase()` for ordering and key mapping.
- School/group and class codes are optional.
- A result recipient email is optional. If entered, a sanitized result CSV is emailed at completion.
- Participants see a plain-language information notice before starting.
- A sound-check screen plays a practice audio file and preloads all 44 audio files.
- Practice has 4 feedback trials. The main test has 40 trials.
- Responses are accepted only after audio playback ends. Early keypresses or button presses are ignored.
- Timed mode uses the configured response window after the audio ends.
- The result screen immediately shows raw score, accuracy, and placeholders for TOEIC Listening prediction and CEFR reference level.

## Researcher Workflow

1. Open `index.html?research=1` or the published URL with `?research=1`.
2. Choose timed or untimed administration. The default is untimed.
3. Keep the default constrained randomization unless the study has a specific reason to change it.
4. Generate the participant URL and distribute it.
5. Ask participants to enter the teacher/researcher result email address if email delivery should be used.
6. At completion, the app attempts to email the sanitized result CSV and still offers CSV/JSON downloads as safety copies.

Email delivery through GAS is enabled in `data/submission.js`. CSV download remains the safety copy. Full analysis metadata is available only from a local session started directly from researcher setup; participant-distributed `take=1` URLs and emailed CSV attachments are sanitized.

## Offline / Zip Use

Recommended offline package:

```text
dist/LJT-S-online-20260701.zip
```

To run locally from the release zip:

1. Download `dist/LJT-S-online-20260701.zip`.
2. Unzip it. This creates a folder named `LJT-S-online-20260701/`.
3. Keep the folder structure intact. Do not move `participant.html` away from the `audio/`, `data/`, `js/`, and `assets/` folders.
4. Open `LJT-S-online-20260701/participant.html` in Chrome or Edge for participant administration.
5. At the final screen, save and collect the CSV.

If you download the whole repository from GitHub with `Code -> Download ZIP`, unzip the repository package and open `participant.html` in the repository root. The purpose-built offline package above is smaller and avoids extra development files.

For offline administration, email delivery is not guaranteed. Treat the downloaded CSV as the required data file.

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

Partial sessions are saved to `localStorage` after each stage/trial using `ljts_partial_<participant_id>`. Reloading the page prefills the most recent participant ID and shows a resume panel for that ID. Partial snapshots omit answer keys, target words, original item IDs, and original audio filenames; the app reconstructs analysis rows from its fixed item table after resume. If storage is blocked, the app still runs, but resume protection is unavailable.

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

Researcher codes are passed as `rc=<code>` in participant URLs only as labels written into result files. Email delivery is controlled by the recipient email field, not by a Google Sheet lookup. See `gas/README.md` and `docs/researcher-guide.md`.

The browser uses fire-and-forget `no-cors` submission for Apps Script compatibility. It cannot inspect the server response, so the UI reports only that email delivery was attempted. Items are removed from the local queue after a fetch attempt resolves; only network-level failures remain for retry. CSV download is therefore always shown.

No analytics or third-party tracking scripts are included.

## TOEIC / CEFR Conversion

`data/conversion.js` contains the conversion hook. TOEIC Listening coefficients are intentionally `null` until the team receives the regression equation. Until then:

- TOEIC Listening prediction displays `準備中` / `Coming soon`;
- CEFR displays an unavailable message;
- the result screen still includes the CEFR disclaimer required by the roadmap.

When coefficients are ready, update only `TOEIC_LISTENING_COEFFICIENTS` in `data/conversion.js`.

## Audio Assets

The app references mono AAC `.m4a` files generated from the WAV originals. Regenerate them with:

```bash
scripts/convert-audio.sh 80k
```

The WAV originals are currently left in `audio/` for traceability. Before publishing a lean GitHub Pages release, move the WAV masters to Dropbox/OSF and keep only `.m4a` files in the web bundle.

## QA and Release Helpers

Run the reproducible 500-ID randomization check:

```bash
scripts/randomization-check.js 500
```

Outputs are written to `qa/randomization_simulation_summary.json` and `qa/randomization_simulation_500.csv`.

Build an offline/web release zip without WAV masters:

```bash
scripts/build-release-zip.sh
```

The current output is `dist/LJT-S-online-20260701.zip`.

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
- `scripts/build-release-zip.sh`: release zip builder.
