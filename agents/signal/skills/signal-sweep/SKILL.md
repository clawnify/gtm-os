---
name: signal-sweep
description: Sweep the ICP's signal sources for the last 7 days and open one Prospector run per signal group. Use on a schedule or when asked what is new.
---

# Signal sweep

1. Read the ICP from the CRM settings note (`GET /api/settings` in the CRM) or
   the chat. Write down the three signal types it implies.
2. For each type, open its sources and collect: company, domain, signal in one
   line, source URL, date. Seven days back, no further.
3. Suppress: `GET /api/companies?search=<name>` in the CRM. An existing company
   with an open deal, or a note dated in the last 90 days, is skipped. Log
   "Signal seen: <one line>, <url>, <date>" on its timeline anyway.
4. Open runs in Prospector, one per signal type:
   `POST /api/runs` `{ "icp": "<ICP text>. Signal: <type>, last 7 days. Companies: <name> (<source>, <date>); …" }`.
   Do not post leads. Do not change the run status.
5. Reply with one line per run: run id, signal type, company count, and the
   two strongest examples with their dates.
