# LJT-S Online Researcher Guide

## 1. Decide the Result Recipient Email

LJT-S follows the LexTALE-style workflow: an email address can be entered before the task, and the final screen also provides another opportunity to send the result.

Use the teacher or researcher email address that should receive the result CSV. Do not place email addresses in participant URLs.

## 2. Generate a Participant URL

1. Open the published page with `?research=1`.
2. Choose `Timed` or `Untimed`.
3. Enter a researcher code if your protocol uses one as a label.
4. Keep the default randomization constraints unless your protocol requires otherwise.
5. Click `Generate participant URL`.
6. Distribute the generated URL and tell participants which result recipient email address to enter.

A typical URL includes:

```text
?take=1&research=1&rc=lab2026&mode=timed&...
```

## 3. What Participants See

Participants complete:

- registration with anonymous ID by default;
- optional name, school/group code, class code, and result recipient email;
- consent/information confirmation when using public participant mode;
- sound check;
- 4 practice trials;
- 40 main-test trials;
- immediate raw score and accuracy;
- CSV download and, if an email address was entered, attempted result email delivery.

Early responses during audio playback are ignored. Responses are accepted after the audio ends.

## 4. Retrieve Results by Email

When the result recipient email is entered, the GAS endpoint sends a CSV attachment after completion. The attached CSV is participant-safe:

- answer keys are omitted;
- target words and item parameters are omitted;
- original item IDs and audio filenames are replaced with neutral sequence IDs;
- raw score, accuracy, timing condition, participant ID, and trial-level response data are retained.

Because Apps Script submission uses browser `no-cors`, the client cannot prove that the server accepted the email request. Treat the on-screen status as "email attempted"; CSV download is the operational safety copy.

If you need a local full-metadata CSV for development, start a session from `?research=1` using `Start on this device`. Participant-distributed `take=1` URLs and emailed CSV attachments are sanitized.

## 5. CSV Safety Copy

Participants can always download a CSV at completion. Use it when:

- school networks block `script.google.com`;
- the participant is offline;
- the Apps Script quota is exhausted;
- the recipient email address was mistyped;
- the browser blocks local storage or submission.

## 6. Offline Zip Administration

Use `participant.html` for offline/zip administration. The participant opens the file locally, completes the task, and saves the CSV. If a GAS endpoint is configured and the network is available, email delivery may still be attempted; CSV remains the authoritative fallback.

## 7. Endpoint Check

Before distributing URLs, open the GAS Web App URL in a browser. A healthy endpoint returns JSON containing:

```json
{"ok":true,"service":"LJT-S email delivery endpoint"}
```

Then run one full session with your own recipient email address and confirm that the attached CSV arrives.

## 8. Recommended Pilot Checks

Before data collection:

- run one timed and one untimed session yourself;
- confirm email delivery with the intended recipient address;
- open the attached CSV in Windows Excel to check Japanese text;
- confirm that the attached CSV does not include `correct_answer`, `target_word`, original item IDs, or original audio filenames;
- test one iPhone/iPad/Android device for audio unlock and playback.
