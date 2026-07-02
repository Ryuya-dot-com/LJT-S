# LJT-S GAS Email Backend

This folder contains a Google Apps Script template for email delivery of LJT-S result CSV files.

The endpoint does not append rows to Google Sheets. It receives a completed session payload, generates a participant-safe CSV attachment, and sends it to the recipient email address entered in the LJT-S registration screen.

## Setup

1. Open `script.google.com` and create a new Apps Script project.
2. Paste `Code.gs` into the Apps Script editor.
3. Save, then run `doGet` once from the editor and grant permissions.
4. Deploy -> New deployment -> Web app.
5. Execute as: the team owner account.
6. Who has access: anyone.
7. Copy the Web app URL.
8. Paste the URL into `data/submission.js`:

```js
window.LJT_SHORT_SUBMISSION = {
  enabled: true,
  endpoint: 'https://script.google.com/macros/s/AKfycb.../exec',
  publicResearchCode: 'public',
  maxRetries: 5
};
```

## Current Deployment

```text
https://script.google.com/macros/s/AKfycbxy8waMOt07zhOb_2zxaRjeKWg0-FKAclL_JBE-GEfar4-L3v9wqvTTln-TkwR9DrIRyw/exec
```

## Behavior

- If the participant leaves the result recipient email blank, no email is sent.
- If an email address is entered, the endpoint sends one email with a sanitized CSV attachment.
- The attachment omits answer keys, target words, base IDs, IRT item parameters, original item IDs, and original audio filenames.
- The body includes participant ID, optional name/school/class codes, raw score, accuracy, TOEIC/CEFR placeholders, and completion time.
- A short-lived `CacheService` key suppresses duplicate emails for the same `session_id` and recipient list.

## Security Notes

The Web App URL must be callable by anonymous participants, so treat it as public. The current template does not write a Sheet, which avoids junk rows in a research workbook, but public email delivery can still consume MailApp quota if abused.

Optional hardening:

- Set `allowedRecipientDomains` in `Code.gs` to restrict delivery to school or institutional domains.
- Lower `maxRecipients` if only one teacher/researcher address should be allowed.
- Rotate the deployment URL if it is abused.

## Endpoint Check

Open the Web App URL directly before data collection. A healthy deployment returns:

```json
{"ok":true,"service":"LJT-S email delivery endpoint"}
```

Then run one complete test session with your own email address and confirm that the attached CSV arrives.
