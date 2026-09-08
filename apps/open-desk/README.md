# OpenDesk

**An approval desk for work written by AI agents.**

An open-source app template provided by [Clawnify.com](https://clawnify.com).

Agents write. A person decides. OpenDesk is the place in between — a queue your
agents deposit finished work into, and a review session you clear one keystroke
at a time. When you approve something, it goes to whichever app publishes it.

It exists because agent output kept ending up in markdown files nobody opened.
A draft in a repo is invisible to the person who has to approve it.

## What it's for

Any workflow where an agent produces work that must not ship unreviewed:

- Social posts and comments drafted overnight, approved in a five-minute session
- Blog articles and long-form drafts that need a human read before publishing
- Outreach copy, replies, anything where the byline is yours and the risk is real

The queue is deliberately **kind-agnostic**. A social post, a comment and an
article are all "text a person has to read and decide about", so `kind` is a
plain string — adding a new type of work costs nothing and needs no migration.

## Desk mode

The review surface is a burn-down, not a feed. The work sits centre stage on its
own ground, everything about it sits in the right rail, and the whole session
runs from the keyboard:

| Key | Action |
|-----|--------|
| `A` | Approve — and send, if the draft has a destination |
| `R` | Reject, with a reason |
| `E` | Edit before approving |
| `C` | Copy the body to the clipboard |
| `J` / `K` | Next / previous |

The rail carries the context you need to decide in seconds, because you weren't
in the session that wrote it:

- **The draft**, editable in place — the preview updates as you type
- **Needs your call** — a decision the agent couldn't make alone, flagged as
  blocking rather than buried in a note
- **Why this** — the agent's reasoning, including what it cut and why
- **Sources** — what the claims rest on, as links you can open

## See it before you send it

A social post renders as the platform will actually draw it — right column
width, right font, right line height, against your real connected account.

**The fold is measured, not estimated.** Where LinkedIn cuts a post behind
"…see more" is a *line* count at its exact content width, so counting characters
is wrong for any post with unusual glyph widths or an early paragraph break
(which silently costs you most of the fold). OpenDesk lays the text out in the
platform's own metrics and binary-searches for the longest prefix that still
fits, reserving room for the "…see more" affordance itself. It tells you how
many characters fall below the fold.

Posts, comments and Reddit threads are different objects, drawn differently and
folded differently — a LinkedIn comment is not a small LinkedIn post. Each gets
its own replica, chosen from the draft's `kind` and platform.

**Only the LinkedIn post metrics are verified so far.** Everything else renders
structurally correct but its fold position is marked `approximate` in the
interface until someone measures it against the real thing. Verifying one is a
change to the numbers in `specs.ts` and nothing else.

### Formatting on platforms that have none

LinkedIn posts are plain text; there is no markup to send. The composer's
**bold, italic, underline, strikethrough and list** buttons do what every tool
in this space does — substitute Mathematical Alphanumeric Symbols that happen to
be drawn styled.

Two consequences worth knowing, both handled here:

- **Screen readers cope badly** with these characters, often reading them out
  letter by letter. Use them on a word, not a paragraph. The composer says so.
- **They live outside the Basic Multilingual Plane**, so each is two UTF-16
  units and `"𝗮".length === 2`. A naive character counter double-counts the
  moment you bold anything. OpenDesk counts codepoints, so a 427-character post
  reads as 427 after bolding, not 429.

## Approve means it goes out

OpenDesk owns no publishing machinery of its own. Each medium already has an app
that knows how to post to it, so approving hands the work over and records the
receipt.

The destination travels with the draft, declared by the agent that deposited it,
so the app needs no per-deployment configuration:

```jsonc
{
  "kind": "social_post",
  "body": "…",
  "destination": "openpost",
  "destination_app_id": "<uuid>",
  "meta": { "channel_ids": [2] }
}
```

Omit `destination` for work a person carries out by hand. Those are approved
without a send, which is a normal outcome and reads as one.

**A failed send never reads as a clean approve.** The review decision and the
delivery outcome are separate fields, so a post that was approved but rejected by
the platform shows as *Send failed*, with the platform's own words attached.

## Rejection is a message, not a delete

A rejection carries a required reason, and the agent reads it back on its next
run. That reason is the whole point — it's how the next draft is better than the
one you turned down.

## Quickstart

```bash
pnpm install
pnpm dev
```

UI on `:5173`, API on `:8787`. The database schema is applied on startup.

## Deposit a draft

```bash
curl -X POST https://<your-app>/api/drafts \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "kind": "social_post",
    "title": "Human in the loop automation",
    "body": "The post, exactly as it should ship.",
    "author": "voice-writer",
    "rationale": "What this argues, and what I cut for lack of a primary source.",
    "open_question": "Publish as written, or soften the claim in line 3?",
    "sources": [{ "title": "arXiv:2609.01481", "url": "https://arxiv.org/abs/2609.01481" }]
  }'
```

Agents discover the full API from `/llms.txt` and `/api/openapi.json`, generated
from the live routes. `agent.md` carries the judgment those can't express.

## API

| Method | Path | |
|---|---|---|
| `POST` | `/api/drafts` | Deposit a draft |
| `GET` | `/api/drafts` | List — filter by `status`, `kind`, `search`; paginated |
| `GET` | `/api/drafts/:id` | Read one |
| `PATCH` | `/api/drafts/:id` | Edit a pending draft |
| `POST` | `/api/drafts/:id/approve` | Approve, and send to the destination |
| `POST` | `/api/drafts/:id/reject` | Reject, with a reason |
| `GET` | `/api/stats` | Queue counts |

## Tech

React, Hono API, SQLite database, Tailwind. Deploys to
[Clawnify](https://clawnify.com).

## License

MIT
