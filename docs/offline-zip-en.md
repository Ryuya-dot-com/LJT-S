# LJT-S Offline Zip Instructions

## Audience

These instructions are for researchers who need to run LJT-S on desktop computers without relying on a network connection.

## Before Testing

1. Unzip the release package.
2. Use `participant.html` for participant administration.
3. Prepare headphones or earphones.
4. Prefer Chrome or Edge when available.

## Participant Steps

1. Double-click `participant.html`.
2. Confirm the anonymous ID and enter school/class codes if requested.
3. Read the information screen and continue to the sound check.
4. Complete 4 practice trials and 40 main-test trials.
5. Save the CSV on the final screen.
6. If network access is available and a result recipient email was entered, email delivery is also attempted.
7. Submit the CSV according to the researcher's instructions.

## Researcher Collection

- CSV filenames include anonymous ID, timing condition, and timestamp.
- If a real name is entered, CSV/JSON files contain personal information. Store them according to the approved protocol.
- Public participant CSV files omit answer keys, target words, and IRT parameters.
- Researcher-mode CSV files retain analysis metadata.

## Notes

- Offline administration does not guarantee email delivery.
- If network access is available and `data/submission.js` contains a GAS URL, result CSV email delivery may also be attempted.
- Always collect the CSV.
