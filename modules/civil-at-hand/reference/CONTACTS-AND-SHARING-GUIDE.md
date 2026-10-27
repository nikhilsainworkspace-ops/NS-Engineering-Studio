# Contacts, Team Directory, Google Contacts Import and Shared Databases

This guide documents the contact and sharing additions in this incremental patch. It is written for the existing Civil At Hand project; merge these files into the existing repository rather than deploying this guide as a standalone application.

## 1. Contact panel: what each field is for

Open **Contact Database → Add contact**. Fields are grouped by purpose so a contact can be saved without filling irrelevant fields:

- **Name:** First name and surname are saved separately as well as a combined display name. Only a name and at least one phone number or email address are required.
- **Company and role:** Company / organization and job title help distinguish an individual from the business they work for.
- **Phone numbers:** The primary phone has a label (`Mobile`, `Work`, `Home`, `Main`, or `Other`). Additional phone rows can each have their own label. Use the WhatsApp action only for a number that supports WhatsApp.
- **Email addresses:** The primary email has a label (`Work`, `Home`, or `Other`); extra addresses are labelled separately.
- **Birthday and location:** Birthday uses `YYYY-MM-DD`. City and state are useful for searching and building a location-specific shared list.
- **Team member:** Toggle this on for your own staff/team directory, then enter role and department. This is a CRM flag only—it does not create a login or give that person dashboard access.
- **Category, details and tags:** Choose the contact type (supplier, contractor, client, etc.). Category-specific fields remain available. Use tags for quick grouping, e.g. `Trusted`, `Architect`, `Client`, `North Region`.
- **Status and follow-up:** Status tracks the relationship; follow-up date puts the contact in the follow-up queue.
- **Sharing permission:** Record whether the contact may be shared with clients. A contact explicitly marked **No** is never included in a shared database.
- **Private notes and history:** These are internal admin data. They are not exported into shared public-link snapshots.

All contact fields are stored server-side in the configured MongoDB database. A successful save uses the contacts API; the browser form is not the database of record. Refresh after saving to confirm that the server returns the new values.

## 2. Google Contacts CSV import

1. In Google Contacts, use **Export** and choose Google CSV. Google changes its interface occasionally, so labels may vary slightly.
2. Open Civil At Hand, go to Contact Database, choose **Import**, and select the downloaded `.csv` file.
3. Review the import results. Start with 2–5 test contacts before importing the whole address book.
4. Check the new records for first/last name, primary and additional phones, primary and additional emails, labels, company, job title, birthday, notes and tags.

The importer recognizes common Google column names, including:

- `Given Name`, `Family Name` / `Surname`
- `Organization 1 - Name`, `Organization 1 - Title`
- `Phone 1 - Label`, `Phone 1 - Value`, `Phone 2 - Label`, `Phone 2 - Value` (and up to 30 exported slots)
- `E-mail 1 - Label`, `E-mail 1 - Value`, `E-mail 2 - Label`, `E-mail 2 - Value` (and up to 30 exported slots)
- `Birthday`, `Notes`, `Group Membership`, `City`, `Region`

Google CSV usually has no civil-work **Category** column. Those contacts are imported as **General contact** by default; edit a contact later to select a more specific category. Every row needs a name and at least one phone number or email. Duplicate phone numbers are compared using the final 10 digits where possible; emails are compared without case. Rows matching an existing primary or additional phone/email are skipped instead of making an unwanted duplicate.

For spreadsheets made by another app, download the Civil At Hand template and use its column headers. Upload limit is 4 MB and 1,000 data rows. Old `.xls` files must be converted to `.xlsx` or `.csv` first.

## 3. Shared database link: what happens when you click Create

A shared database is a **frozen snapshot**, not a live query into your current contact records. When an admin creates a share:

1. The admin-only API checks the session and validates the chosen records and settings.
2. The server loads the selected Contacts or Rates from MongoDB.
3. It builds a new snapshot containing only the allowed fields that were checked in the form. Private contact notes, internal interaction history, relationship status, ratings and follow-up dates are not included. Tags are included only when explicitly selected.
4. The snapshot, selected column list, expiry and link rules are saved into MongoDB in the `DataRoom` collection.
5. A random link token is created. A passcode may be returned once at creation; the database stores only the passcode hash, not the plain passcode.
6. The created share appears in **Shared Databases**. Copy the URL and passcode separately, or use the WhatsApp message helper. Use **Test link** to open the public URL in a separate tab.

Editing a contact after creating a share does not change the existing snapshot. Create a fresh link for updated data. That makes it possible to distinguish what was shared at a given time. A user who can view information can still copy or photograph it; passcodes, expiry, masks, watermarks and access logs discourage misuse but cannot prevent all copying.

### Shared database troubleshooting

- **Create is disabled / zero records:** select at least one record or filter that leaves a record, choose at least one field, and set an expiry. Recheck category, status, place, “Only contacts with a phone number”, “Avoid” and consent filters.
- **All selected contacts disappear:** contacts explicitly marked “No” are always excluded. When “Only contacts who explicitly agreed” is checked, only `Yes` records are included. Unchecked, records with no recorded consent can be included; only do this when you have permission and a lawful basis.
- **Create request returns an error:** confirm `MONGODB_URI` points to the intended database, check Vercel function logs, and verify database network access. A database write failure should be treated as a failed share; do not send a URL unless the creation response succeeded and the room appears in the list.
- **The link opens a not-available page:** check that the URL was copied completely and that the room is not paused, expired, locked from repeated wrong passcodes, exhausted by its open limit, or awaiting payment activation.
- **The page opens on the wrong domain:** open the admin portal through your intended canonical HTTPS domain and create a new link there. The create endpoint uses the request's origin for the share URL. Existing URLs do not rewrite themselves when a domain variable changes. `NEXT_PUBLIC_SITE_URL` is a fallback for deployments where the request origin cannot be used as expected.
- **A contact's alternate phone/email is missing:** open the share settings and select **Additional phone numbers** and/or **Additional email addresses** explicitly. Preview mode masks primary and additional email/phone fields. The browser table cannot show a field that was not selected in the saved snapshot.
- **A new contact isn't in an old link:** this is expected because share links freeze data at creation. Create another link after confirming the contact is saved in MongoDB.

## 4. Post-update acceptance checklist

Use dummy records first, then inspect the real records you intend to keep:

- [ ] Create a contact with first/surname, company, job title, two labelled phone numbers, two labelled email addresses, birthday, tags, and a note. Save and refresh; confirm all values remain.
- [ ] Edit the contact and change one alternate phone/email label. Save, refresh and confirm only the intended record changed.
- [ ] Add a contact as a team member. Confirm it appears in the Team directory and that this flag did not create a sign-in account.
- [ ] Import a small Google Contacts CSV containing `Phone 1 - Label/Value`, `Phone 2 - Label/Value`, and `E-mail 1 - Label/Value`. Confirm labels and alternate values map correctly.
- [ ] Try importing the same CSV again; existing contacts should be reported as duplicates/skipped, not copied again.
- [ ] Select a dummy contact and create a share with phone, additional phones, email and additional emails selected. Check the Data Room appears in Shared Databases after refresh.
- [ ] Use **Test link**; check the public link displays only the selected fields. Enable Preview mode and confirm phone/email values are masked.
- [ ] Change the source contact and confirm the existing share is unchanged; create a new link and confirm that one contains the updated data.
- [ ] Confirm a contact with share consent `No` cannot be included even when the other consent filter is disabled.
- [ ] Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`; push only after the checks pass in the project environment.

## 5. Data safety

Do not place admin passwords, authenticator setup keys, API secrets or payment-card data in contact notes. Contact notes and private notes are different: contact notes are part of the CRM record, whereas the separate Private Notes panel is an admin-only notebook. Neither type of note is automatically exposed through shared database links. Exports and JSON backups are sensitive copies of the data and should not be left on a shared computer.
