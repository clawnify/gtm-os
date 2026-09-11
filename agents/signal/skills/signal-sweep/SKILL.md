---
name: signal-sweep
description: Sweep the ICP's signal sources, keep only signals still inside their freshness window, and open one Prospector run per signal group. Use on a schedule or when asked what is new.
---

# Signal sweep

1. Read the ICP from the CRM settings note (`GET /api/settings` in the CRM) or
   the chat. Write down the three signal types it implies.
2. For each type, open its sources and collect: company, domain, signal in one
   line, source URL, and **the date the event happened**.
   - A relative date ("2 weeks ago"), a bump date, or a "reposted" badge is not
     the event date. Open the item and find the original date.
   - No establishable date means drop it, however good the company looks.
3. Apply the freshness window for the type (AGENT.md, "How long a signal stays
   live"): job post 21 days, funding / office / market 8 weeks, site or stack
   change 30 days, review or forum post 30 days. Count from the event date.
   Anything outside its window is logged, never run.
4. Suppress: `GET /api/companies?search=<name>` in the CRM. An existing company
   with an open deal, or a note dated in the last 90 days, is skipped. Log
   "Signal seen: <one line>, <url>, <date>" on its timeline anyway.
5. Count signals per company across every type in this sweep. Two or more on the
   same company is a stack; those companies lead the report.
6. Open runs in Prospector, one per signal type:
   `POST /api/runs` `{ "icp": "<ICP text>. Signal: <type>, <window>. Companies: <name> (<source>, <date>); …" }`.
   Do not post leads. Do not change the run status.
7. Reply with: the stacked companies first (company, which signals, dates), then
   one line per run: run id, signal type, company count, and the two strongest
   examples with their dates. Say how many candidates you dropped for being
   outside their window, so the team can see whether a source is going stale.
