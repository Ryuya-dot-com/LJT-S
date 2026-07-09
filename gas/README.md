# LJT-S GAS Email Backend

This folder contains the Google Apps Script (GAS) backend that turns a completed LJT-S session payload into a participant-safe CSV attachment and sends it by email. It does not append rows to Google Sheets.

The default configuration is **fail-closed**: a research code must be registered on the server and is resolved to one or more server-controlled recipient addresses. An address supplied by the browser is not trusted as the delivery destination in this mode.

## Important: existing GitHub Pages deployment

Changing `gas/Code.gs` in Git does not change the currently deployed Apps Script. The existing GitHub Pages URL and its configured GAS `/exec` URL continue to work until an Apps Script owner explicitly publishes a new version.

To keep the same GAS endpoint when updating production, use **Deploy -> Manage deployments -> Edit** on the existing Web app and select **New version**. Do not create a separate deployment unless you also intend to update `data/submission.js`. Updating the existing deployment preserves its `/exec` URL, so the published GitHub Pages link does not need to change.

Configure recipient routing and test it **before** updating the production deployment. The safe default rejects delivery when its server-side recipient map is absent or the research code is unknown.

## Recipient routing modes

Set `CONFIG.recipientMode` in `Code.gs` to one of the following values:

| Mode | Behavior | Security status |
| --- | --- | --- |
| `research-code` | Resolves the payload's research code using a server-side Script Property; ignores the browser-supplied address as a destination. | Default and recommended |
| `research-code-or-legacy` | Uses a registered mapping when found, otherwise sends to the browser-supplied address. | Temporary migration only; the fallback remains public email relay behavior |
| `legacy-participant-email` | Sends to the address supplied by the browser, matching the previous behavior. | Compatibility only; not recommended for a public endpoint |

### Configure the safe `research-code` mode

1. In the Apps Script project, open **Project Settings -> Script Properties**.
2. Add a property named `LJTS_RESEARCH_RECIPIENTS`.
3. Store a JSON object whose keys are research codes and whose values are either one address or an array of up to `CONFIG.maxRecipients` addresses. For example:

```json
{
  "public": ["results@example.edu"],
  "thesis_2026": ["supervisor@example.edu", "student@example.edu"]
}
```

Research codes may contain lowercase letters, numbers, `_`, and `-`, with a maximum length of 40 characters. Map keys are normalized to lowercase. Recipient addresses are kept in Script Properties rather than committed to this public repository.

The normal public LJT-S page currently uses the research code `public`. Register `public` before publishing the safe backend if email collection should continue on that page. A managed study URL using `?rc=thesis_2026` must have a matching `thesis_2026` entry.

In the current Pages client, a submission is queued only after the result-email field contains a syntactically valid address. In `research-code` mode that browser value is only the client-side submission trigger; GAS sends to the registered address for the code. Until the client UI is updated to describe this distinction, use a registered collection address in that field for managed administrations and verify the behavior with participants' instructions.

If the property is missing, invalid JSON, contains an invalid address, or has no entry for the submitted code, GAS returns `ok: false` and sends nothing. Because the Pages client posts with `no-cors`, it cannot read that response and may still display that sending was attempted. The locally downloaded CSV therefore remains the primary reliable copy.

## Migration without changing the Pages link

Recommended migration:

1. Leave the current GAS deployment active while preparing the new code.
2. Add `LJTS_RESEARCH_RECIPIENTS` and include every active research code, including `public` if applicable.
3. Paste the new `Code.gs` into the same Apps Script project.
4. Run the tests in the final section with a non-production research code.
5. Edit the **existing** Web app deployment and publish a new version. Its `/exec` URL remains unchanged.
6. Open the `/exec` URL and confirm that `recipient_mode` is `research-code`.
7. Complete one Pages test session and confirm the CSV reaches only the registered address.

If preserving the previous arbitrary-recipient behavior is temporarily essential, explicitly change:

```js
recipientMode: 'legacy-participant-email'
```

before publishing. This keeps the previous payload contract, but the endpoint remains usable by anyone who knows the public URL to send mail to arbitrary addresses and consume the Apps Script account's quota. `allowedRecipientDomains` and a lower `maxRecipients` reduce the exposure but do not make a public relay safe. Record this as a temporary exception and migrate to `research-code` as soon as the collection workflow allows it.

`research-code-or-legacy` is available for a staged migration, but an attacker can deliberately submit an unknown code and reach its legacy fallback. Treat it as equivalent to legacy mode from a security perspective.

To roll back, edit the same deployment and select its previous known-good code version. No GitHub Pages URL change is required.

## New project setup

1. Open `script.google.com` and create an Apps Script project.
2. Paste `Code.gs` into the editor.
3. Configure `LJTS_RESEARCH_RECIPIENTS` as described above.
4. Save, then run `doGet` once from the editor and grant permissions.
5. Choose **Deploy -> New deployment -> Web app**.
6. Set **Execute as** to the team owner account.
7. Set **Who has access** to **Anyone**.
8. Copy the Web app URL into `data/submission.js`:

```js
window.LJT_SHORT_SUBMISSION = {
  enabled: true,
  endpoint: 'https://script.google.com/macros/s/AKfycb.../exec',
  publicResearchCode: 'public',
  maxRetries: 5
};
```

## Current deployment

```text
https://script.google.com/macros/s/AKfycbxy8waMOt07zhOb_2zxaRjeKWg0-FKAclL_JBE-GEfar4-L3v9wqvTTln-TkwR9DrIRyw/exec
```

The URL is a public endpoint, not a secret. Do not rely on obscurity of the deployment URL as an access control.

## Validation and CSV safety

Before invoking `MailApp`, the backend now enforces limits on:

- total request characters;
- session ID and individual string lengths;
- object fields, array entries, nesting depth, and total JSON values;
- practice, main-trial, and combined row counts; and
- the result-email field and registered recipient count.

The defaults accept the current fixed LJT-S form while rejecting unexpectedly large payloads. If the instrument length is deliberately expanded, update the related limits in `CONFIG` and test with a real completed session before deployment.

CSV cells supplied as strings are prefixed with an apostrophe when they could be interpreted by spreadsheet software as formulas (for example, values beginning with `=`, `+`, `-`, or `@`, including after whitespace). JSON numbers remain numeric. The attachment also omits answer keys, target words, base IDs, IRT item parameters, original item IDs, and original audio filenames.

Summary values use null/undefined checks rather than truthiness, so valid zero scores such as `appropriate_score: 0` and `inappropriate_score: 0` remain `0` in the email attachment.

## Operational behavior and remaining risks

- A short-lived `CacheService` key suppresses duplicate emails for the same `session_id` and resolved recipient list.
- `allowedRecipientDomains` is applied after either routing method resolves recipients. An empty list permits all domains.
- Email delivery remains subject to the Apps Script/Gmail account's daily quota. For this deployment context, plan around 100 messages per day unless the owning account's documented quota is different.
- Research codes appear in participant URLs and are routing identifiers, not passwords. Server-side mapping prevents arbitrary destination selection, but it does not fully prevent someone from repeatedly targeting a known code to consume quota. Monitor usage and rotate the deployment or add stronger authenticated/rate-limited infrastructure for larger or higher-risk studies.
- CSV download remains the primary reliable copy; email is a convenience channel.

## Endpoint and end-to-end checks

Open the Web app URL directly after deployment. A healthy safe-mode deployment returns:

```json
{
  "ok": true,
  "service": "LJT-S email delivery endpoint",
  "recipient_mode": "research-code"
}
```

Then test all of the following before data collection:

1. Complete a session with a registered research code and confirm that its mapped recipient receives the attachment.
2. Submit an unknown research code and confirm that no email is sent.
3. Confirm that changing the browser-supplied result address does not change the destination in `research-code` mode.
4. Open the attachment in the intended spreadsheet software and confirm that zero condition scores display as `0`.
5. Confirm that a participant ID such as `=1+1` is stored as text rather than evaluated as a formula.
6. Re-open the GitHub Pages URL and confirm that the test still starts and downloads its local CSV normally.
