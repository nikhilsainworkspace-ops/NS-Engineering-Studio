# Custom Forms — incremental feature guide

This update adds a separate, general-purpose form builder to Civil At Hand. It does not change existing Contacts, contact categories, existing /join/<token> public intake links, public pages, projects or other workspace records.

## What is included

- Dashboard → Public pages & forms → Custom forms, plus the quick-add shortcut.
- Build forms from short/long text, email, telephone, number, date, dropdown, single-choice, multiple-choice and confirmation checkbox questions.
- Edit question labels, types, required status, hints and choices. Forms support up to 50 questions with server-side validation.
- Create separate shareable URLs at /forms/<token> and optionally expire them after 1, 7, 30, 90 or 365 days.
- Pause/reactivate a form; paused or expired forms reject further submissions.
- View submissions in the admin UI and export up to 5,000 recent submissions to CSV.
- Every response belongs to the dedicated CustomFormResponse collection and a single form ID. Answers are never copied into Contact, Contact.details, the existing contact-intake workflow or other business records.
- Responses keep a snapshot of the questions used when submitted, so reviewing old responses still works after the form is edited.

## Privacy and security

Admin endpoints use the existing MongoDB-backed isAdmin() session check and no-store response handling. Public links use cryptographically random bearer tokens, responses are never publicly listed, submission requests have size limits and rate limiting, and public forms use a honeypot field. CSV cells beginning with spreadsheet formula characters are neutralized.

Deleting a custom form permanently deletes its responses too; the UI asks for confirmation first. Keep backups before removing forms.

Backups now use format version 6 and include custom form definitions and their response data, but intentionally omit the public token. On restore, custom forms are restored **inactive** with freshly generated share tokens. Review the forms, reactivate those you need and share the new URLs; old custom links are deliberately not restored. Versions 3, 4 and 5 are still accepted.

## Apply

Apply the source changes on top of your existing checkout; do not replace the project directory. Review the code, then run:

- npm run typecheck
- npm test
- npm run test:integration
- npm run lint
- npm run build

The automated unit tests added in tests/custom-forms.test.ts cover field-key uniqueness, invalid form definitions, required fields, email formats, choice validation and dropping unexpected answer keys.

## Files added

- app/api/custom-forms/route.ts
- app/api/custom-forms/[id]/route.ts
- app/api/custom-forms/[id]/responses/route.ts
- app/api/custom-forms/[id]/responses/export/route.ts
- app/api/custom-public/[token]/route.ts
- app/forms/[token]/page.tsx
- components/custom-forms-panel.tsx
- components/custom-forms-panel.module.css
- components/custom-public-form.tsx
- components/custom-public-form.module.css
- lib/custom-forms.ts
- models/CustomForm.ts
- models/CustomFormResponse.ts
- tests/custom-forms.test.ts

## Existing files updated

- components/dashboard.tsx — navigation entry, quick-add shortcut and isolated panel.
- lib/workspace-backup.ts — export only custom form content, excluding public bearer tokens.
- lib/backup-restore.ts — recognize backup version 6 and restore forms inactive with fresh tokens.
- models/CustomFormResponse.ts — persist a question snapshot with each response.
