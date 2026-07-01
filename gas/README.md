# LJT-S GAS Backend

This folder contains a Google Apps Script template for central Sheet collection.

## Setup

1. Create a Google Sheet owned by the research team.
2. Open Extensions -> Apps Script.
3. Paste `Code.gs` into the Apps Script editor.
4. Save, then run `doGet` once from the editor and grant permissions.
5. Deploy -> New deployment -> Web app.
6. Execute as: the team owner account.
7. Who has access: anyone.
8. Copy the Web app URL.
9. Paste the URL into `data/submission.js`:

```js
window.LJT_SHORT_SUBMISSION = {
  enabled: true,
  endpoint: 'https://script.google.com/macros/s/.../exec',
  publicResearchCode: 'public',
  maxRetries: 5
};
```

## Researcher Codes

The script creates a private `codes` tab on first use.

Required columns:

- `code`: short lowercase code used in participant URLs as `rc=code`.
- `email`: researcher email address.
- `active`: `TRUE` to enable the code.
- `notify_mode`: `immediate`, `none`, or a future digest mode.
- `notes`: free text.

Researcher URLs should include `?take=1&research=1&rc=<code>`. The client never stores researcher email addresses.

Unknown or inactive researcher codes are written with `researcher_code_status` set to `unknown` or `inactive`, logged in the `errors` tab, and excluded from email notification. This avoids silent client-side data loss under `no-cors` while still making code mistakes auditable. Use `public` only for the public default collection path.

## Sheet Tabs

- `sessions`: one row per completed session, including a compact summary and redacted `session_json` backup.
- `trials`: one row per practice/main trial.
- `codes`: private code-to-email lookup table.
- `errors`: malformed requests or script failures.

`doPost` is wrapped in `LockService.getScriptLock()` so header creation and row appends do not race during simultaneous sessions. Trial rows are appended in a single `setValues` batch. `session_id` is checked separately in `sessions` and `trials`; if one side is missing after a partial write, the next retry repairs the missing side instead of returning a false duplicate. Email notification runs after the lock is released.

## CORS Design

The browser submits JSON as `text/plain` with `fetch(..., { mode: 'no-cors' })`. This avoids CORS preflight and works with Apps Script Web Apps, but the browser cannot read the response. The app therefore treats submission as attempted/unconfirmed and always keeps CSV download available.

The `errors` tab does not store raw request bodies. It records redacted context such as `session_id`, `researcher_code`, app version, and payload keys.

Open the Web App URL directly before data collection. A healthy deployment returns:

```json
{"ok":true,"service":"LJT-S submission endpoint"}
```

## Participant Result Email

`allowParticipantEmailCopy` is `false` by default in `Code.gs`. Turn it on only after the team confirms the consent wording and acceptable-use policy, because public forms that send arbitrary emails can become an abuse vector.
