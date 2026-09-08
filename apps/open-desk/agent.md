# OpenDesk — agent instructions

A holding pen for work you wrote that a person has to sign off on before it
goes out. Social posts, comments, articles, anything else.

## Division of labour

- **Never publish work that needs approval yourself.** Deposit it here and stop.
  A human runs review sessions and approves; approving is what sends it.
- **Never leave drafts in files.** A markdown file in a repo is invisible to the
  person who has to approve it. If a human decides whether it ships, it goes
  here instead.
- **Do not poll for a verdict.** Read decisions back at the start of your next
  run, not in a loop.
- **You own the writing; the desk owns the decision.** Do not soften a draft to
  make approval likelier — flag the doubt in `open_question` instead.

## The procedure

1. Write the draft to its final quality. This is the text that will ship, not a
   sketch to be fixed at review time.
2. Verify every factual claim at its primary source. List what you checked in
   `sources`, with URLs.
3. Cut anything you could not verify, and say so in `rationale`. A tempting
   claim you dropped is worth a sentence — the reviewer needs to know it was
   considered and why it lost.
4. If a decision is genuinely the human's — a judgement call, a risk, a choice
   between two defensible options — put it in `open_question`. It renders as a
   blocking banner. Do not bury it in `rationale`.
5. `POST /api/drafts`. One call per draft. Stop there.
6. On your next run, `GET /api/drafts?status=rejected` and read `review_note`.
   Rewrite against the reason given; do not resubmit the same text.

## Where it goes on approval

Set `destination` when another app publishes this medium, and the desk hands it
over the moment the human approves:

- `"openpost"` — social posts. Also set `destination_app_id` to the OpenPost app
  UUID, and put the target channels in `meta.channel_ids`. Add
  `meta.scheduled_at` (ISO-8601) to schedule instead of sending immediately.

Omit `destination` for work a person or an agent carries out by hand — a comment
that has to be pasted, an article whose CMS shape a skill has to build. Those are
approved without a send, which is a normal outcome, not a failure.

## Telling the desk what it is looking at

The preview only draws the right thing if the draft says what it is.

- A **post** with a `destination` gets its platform from the channel.
- A **comment** has no channel. Set `meta.platform` (`linkedin`, `reddit`,
  `twitter`); failing that the host of `meta.replying_to_url` is used.
- **Reddit** drafts should carry `meta.subreddit`, and `meta.reddit_username`
  if it differs from the reviewer's name. The title is a separate 300-character
  limit — put it in `title`, not at the top of `body`.

Comments preview as the reviewer, because that is who they go out as.

## Formatting

Write `body` as plain text. If a passage genuinely needs emphasis, leave it
plain and say so in `rationale` — the human applies styling in the composer,
where they can see what it does to the fold. Do not paste Mathematical
Alphanumeric ("bold") characters into `body` yourself: they break screen
readers, and a whole styled paragraph is almost always the wrong call.

Keep the shape of the post in mind: an early blank line costs most of the space
above LinkedIn's "…see more" fold, so the hook has to land in the first two
lines.

## Pages

- `/` — Desk: the review session, one draft at a time, keyboard-driven.
- `/history` — every decision, with rejection reasons and delivery failures.

## API anchors

Full shapes are in `/llms.txt` and `/api/openapi.json`. The one you write most:

```
POST /api/drafts
{
  "kind": "social_post",
  "title": "Human in the loop automation",
  "body": "<the post exactly as it should ship>",
  "author": "voice-writer",
  "rationale": "Why this, and what you cut.",
  "open_question": "A call only the human can make. Omit if there isn't one.",
  "sources": [{ "title": "arXiv:2609.01481", "url": "https://…", "note": "figures confirmed" }],
  "meta": { "target_keyword": "human in the loop automation", "channel_ids": [2] },
  "destination": "openpost",
  "destination_app_id": "<uuid>"
}
```

- `GET /api/drafts?status=rejected` — read verdicts back at the start of a run.
- `GET /api/drafts?status=pending` — check what is still queued before adding more.
- `PATCH /api/drafts/:id` — fix a pending draft you deposited. Rejected and
  approved drafts are immutable; write a new one.
- `DELETE /api/drafts/:id` — only for a row that should never have existed
  (duplicates you deposited by mistake). Never delete something a human
  rejected: the reason is the record of why.

## Reading failures

- `403` — the request carried no organization. Check how you are authenticating.
- `409` — already reviewed. Someone decided while you were writing; do not retry.
- A draft with `status: "approved"` and `delivery: "failed"` **did not go out.**
  `delivery_error` carries the destination's own words. The human sees it too, so
  do not silently resubmit — fix the cause first.
- `delivery: null` on an approved draft means there was no destination to send
  to. That is the expected result for manual work, not an error.

## Cost discipline

Every endpoint here is a database call — effectively free. The expensive part is
a human's attention: each draft you deposit costs a person a decision. Deposit
work you believe should ship, not options for them to choose between.
