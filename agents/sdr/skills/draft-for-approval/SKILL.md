---
name: draft-for-approval
description: Write a first-touch email and an eight-second call card for a CRM contact and deposit both in Desk. Use after leads are filed, or when a person asks for outreach copy.
---

# Draft for approval

For each contact:

1. Read the CRM contact, its company, and the timeline. Read the evidence line.
2. Write the **first-touch email** to final quality. First line is about them
   and cites the signal with its source and age. One ask, one sentence.
   Language of their website.
3. Write the **call card** as plain text, five lines:

   ```
   <Company> · <City> · <Title of person>
   Signal: <what, where, how long ago>
   Say: <three things, one line each>
   Don't: <what not to pitch>
   Ask: <the one next step>
   ```

4. Verify every factual claim at its primary source; list them in `sources`.
   Cut what you could not verify and say so in `rationale`.
5. A judgement call goes in `open_question`, not buried in `rationale`.
6. `POST /api/drafts` once per draft. Set `meta.contact_id` and
   `meta.company_id` from the CRM so approval can be traced back. Omit
   `destination`: a person sends the email from the CRM and reads the card in
   Dialer.
7. Stop. Read decisions at the start of the next run, never in a loop.
