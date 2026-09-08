---
name: load-the-call-queue
description: Move approved leads into a Dialer campaign with the call card as notes. Use when Desk shows approved drafts, or when a person asks to prepare calls.
---

# Load the call queue

1. `GET /api/drafts?status=approved` in Desk. For each with a `meta.contact_id`
   not yet imported into Dialer:
2. Read the contact's phone from the CRM. Normalise to E.164 or national
   format with a `country` column. Skip rows with no phone and say so.
3. `POST /api/leads/import` in Dialer with the CSV. Put the call card in
   `notes`. Read `rejected` and `errors[]` back to the person; never drop rows
   silently.
4. `POST /api/campaigns` named after the ICP run and the date, or extend the
   existing one for the same run.
5. If `/api/settings` says `configured: false`, stop and tell the person which
   Twilio variables are missing.
6. Tell the person: "Campaign ready: open /dialer?campaign=<id>. N leads,
   calling window <local hours> for <market>."
7. Log a note on each CRM contact: "Queued for call, campaign <name>."
