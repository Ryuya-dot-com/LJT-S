# LJT-S Online Researcher Guide

## 1. Create a Researcher Code

Ask the project owner to add a row to the private `codes` sheet:

| code | email | active | notify_mode | notes |
|---|---|---|---|---|
| lab2026 | researcher@example.ac.jp | TRUE | immediate | Example lab |

Use short lowercase ASCII codes. Do not put email addresses in participant URLs.

## 2. Generate a Participant URL

1. Open the published page with `?research=1`.
2. Choose `Timed` or `Untimed`.
3. Enter your researcher code in `Researcher code`.
4. Keep the default randomization constraints unless your protocol requires otherwise.
5. Click `Generate participant URL`.
6. Distribute the generated URL.

A typical URL includes:

```text
?take=1&research=1&rc=lab2026&mode=timed&...
```

## 3. What Participants See

Participants complete:

- registration with anonymous ID by default;
- consent/information confirmation when using public participant mode;
- sound check;
- 4 practice trials;
- 40 main-test trials;
- immediate raw score and accuracy.

Early responses during audio playback are ignored. Responses are accepted after the audio ends.

## 4. Retrieve Your Data from the Sheet

In the central Google Sheet:

- Use the `sessions` tab for one row per completed session.
- Use the `trials` tab for trial-level data.
- Filter the `researcher_code` column to your code.
- Join participant-level and trial-level rows by `session_id`.

The `sessions` tab includes a full `session_json` backup for each completion.

## 5. CSV Safety Copy

Participants can always download a CSV at completion. Use it when:

- school networks block `script.google.com`;
- the participant is offline;
- the endpoint quota is exhausted;
- the browser blocks local storage or submission.

Participant-facing CSV and JSON downloads omit answer keys and item parameters, and replace encoded item/audio IDs with neutral sequence IDs. The GAS payload and Sheet rows keep analysis metadata for the research team.

Because Apps Script submission uses browser `no-cors`, the client cannot prove that the server accepted a row. Treat the on-screen status as "submission attempted"; the CSV is the operational safety copy unless you confirm the row in the Sheet.

If you need a local full-metadata CSV for development, start a session from `?research=1` using `Start on this device`. Participant-distributed `take=1` URLs always download sanitized CSV/JSON.

## 6. Offline Zip Administration

Use `participant.html` for offline/zip administration. The participant opens the file locally, completes the task, and sends the CSV back to the researcher. If a GAS endpoint is configured and the network is available, automatic submission may still be attempted; CSV remains the authoritative fallback.

## 7. Endpoint Check

Before distributing URLs, open the GAS Web App URL in a browser. A healthy endpoint returns JSON containing:

```json
{"ok":true,"service":"LJT-S submission endpoint"}
```

Then run one full session and confirm both `sessions` and `trials` rows appear with your `researcher_code`.

Rows with an unknown or inactive `rc` are still written, but `researcher_code_status` is set to `unknown` or `inactive` and no email notification is sent. Check this column during pilots to catch mistyped URLs.

## 8. Recommended Pilot Checks

Before data collection:

- run one timed and one untimed session yourself;
- confirm the `sessions` and `trials` rows appear;
- confirm immediate email notification if `notify_mode=immediate`;
- open a participant CSV in Windows Excel to check Japanese text;
- test one iPhone/iPad/Android device for audio unlock and playback.
