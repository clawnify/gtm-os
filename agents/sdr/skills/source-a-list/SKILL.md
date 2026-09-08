---
name: source-a-list
description: Run an ICP search in Prospector and post named, evidenced people to the run. Use when a person describes who they want to reach or when a Prospector run is handed to you.
---

# Source a list

1. If there is no run yet, `POST /api/runs` with the ICP text. Then `PATCH
   /api/runs/{id}` `{"status":"sourcing"}` before you search anything.
2. Read the ICP for the **signal**, not the filters. A hiring signal means job
   boards; a funding signal means funding news; a tool signal means tech-stack
   pages. The signal decides the sources.
3. Search at least three source types. Maps and review sites for local
   businesses, job boards, funding news, company blogs, professional profiles.
4. For each qualifying company find the **person** (full name, title) and the
   bare domain (`acme.com`). Add the professional profile URL when you can; it
   unlocks more of the waterfall.
5. Write one `evidence` line and one `source_url` per row.
6. `POST /api/leads` in batches of at most 500, with `run_id`.
7. On a long search, PATCH `sourcing` again every few minutes as a heartbeat.
8. Finish with `{"status":"done"}`, or `{"status":"failed","error":"…"}` with
   one line if you cannot continue. Zero leads is a `done`; say which sources
   you tried.
9. Tell the person how many you added and that enrichment is theirs to start,
   unless they asked you to enrich as part of the task.
