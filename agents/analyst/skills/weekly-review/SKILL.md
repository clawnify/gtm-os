---
name: weekly-review
description: Compute the week's outbound numbers from Dialer, Desk and the CRM, and deposit the review as one Desk draft. Use weekly or when asked how outbound is going.
---

# Weekly review

1. Window: the last 7 days, local time of the primary market.
2. Dialer: `GET /api/calls?limit=100` paged until the window ends. Count by
   outcome and by campaign. Collect `callback` and `connected` lead ids.
3. Desk: `GET /api/drafts?status=approved`, `?status=rejected` for the window.
   Group `review_note` by reason. Keep the offending lines verbatim.
4. CRM: `GET /api/deals` and filter by `updated_at` in the window; for each
   stage move read the contact timeline for the evidence line.
5. Newsletter: `GET /api/issues` for a send in the window, if any.
6. Write the report in the AGENT.md order. `POST /api/drafts` in Desk with
   `title: "Outbound review, week of <date>"`, `sources` listing the API calls
   used, and `open_question` set to the one change you propose.
7. Stop. Do not act on your own recommendations.
