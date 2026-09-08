# GTM OS

**Prospect, call, nurture, approve. One install.**

Four connected apps today (Desk joins when published) and one SDR agent for a small B2B team that sells with
outbound. The agent finds heat and loads the queue. A person always sends the
email and always makes the call.

An open-source bundle provided by [Clawnify.com](https://clawnify.com).

[![Deploy to Clawnify](https://app.clawnify.com/deploy-button.svg)](https://app.clawnify.com/deploy?repo=clawnify/gtm-os)

## Why teams use GTM OS

Outbound breaks in the gaps between tools: the list lives in one place, the
calls in another, the follow-ups in a third, and the person who has to approve
the message sees it last. Every hand-off is a paste. GTM OS puts the whole
loop in one workspace with one agent working across it.

## The loop

1. **Source.** You describe an ICP in Prospector. The SDR agent researches the
   live web, posts named people with evidence and a source URL, and the app
   resolves emails and phones through your own provider keys.
2. **File.** Verified leads land in the CRM as contacts and companies, with the
   evidence line on the timeline. Deal stages are yours to name.
3. **Draft.** For each contact the agent writes the first touch and a talk
   track, and deposits them in Desk. Nothing leaves the workspace until a
   person approves it.
4. **Call.** Approved leads move into a Dialer campaign with an eight-second
   card: who, why now, three things to say, last touch. You click Call. The
   agent never dials.
5. **Nurture.** Contacts who said "not now" go into a Newsletter audience with
   recorded consent. Issues are drafted by AI and sent from your domain.
6. **Learn.** Outcomes flow back to the CRM. The agent reads them before its
   next run and rewrites what got rejected.

## What's in the box

| App | Who uses it | Key screens |
|---|---|---|
| **CRM** | Founder, sales | Companies, contacts, deals pipeline, activity timeline, custom fields |
| **Prospector** | Sales, the agent | ICP runs, leads table with provider attribution, waterfall settings, credit ledger |
| **Dialer** | Sales | Campaign dialer, leads with call history, owned caller IDs, outcomes |
| **Newsletter** | Marketing | Issue composer with AI drafts, audiences with double opt-in, send log |
| **Desk** | Whoever approves | One-draft-at-a-time review session, history with rejection reasons |
| **SDR agent** | Everyone, via chat | Sources, files, drafts, builds the call queue. Never sends, never calls |
| **Signal agent** (optional) | Sales | Watches job boards and news for your ICP's buying signals, opens a Prospector run per signal |
| **Analyst agent** (optional) | Founder | Weekly review of outcomes as a Desk draft: what booked, what got rejected, keep and kill |

## One agent on every plan, more when you grow

The SDR is required and is hired at install; it works on the smallest paid
plan. Signal and Analyst are optional: they show up in your sidebar as "not
hired yet" and hiring them is one click once your plan has room.

## Who it's for

Teams of two to twenty selling something worth a conversation: B2B software,
services, agencies, anything with a named buyer. If your outbound is one
person and a spreadsheet, this replaces the spreadsheet. If it is a sales team
on a suite that costs per seat, this is the same loop on apps you own.

## Connect

- **Twilio** for calling (account SID and auth token; numbers you own become
  caller IDs)
- **Resend** for newsletter sending, from a domain you have verified
- **Email finder keys** you already pay for (Hunter, Findymail, Apollo and
  others) for enrichment, at vendor cost
- **Gmail, Google Calendar, Slack** through your Clawnify connections, for
  emailing a contact, booking a meeting, and the deal-won alert

## Demo data

CRM and Newsletter open with sample records so the shape is visible on first
open. Prospector, Dialer and Desk start empty: the first ICP run, the first
import and the first draft fill them. The getting-started chat offers to
replace the samples with your own list.

## Install

Click the button above, pick the workspace, answer four questions. Until
bundle install ships, members deploy one at a time from their own repos;
see `AGENTS.md`.

## Members

Members are referenced by repo, never copied here. Each keeps its own button,
its own verification pin, and its own update path; installing GTM OS into an
org that already runs one of them reuses it.

| Member | Repo | Wired at install |
|---|---|---|
| CRM | [clawnify/OpenCRM](https://github.com/clawnify/OpenCRM) | |
| Prospector | [clawnify/OpenProspector](https://github.com/clawnify/OpenProspector) | |
| Dialer | [clawnify/OpenDialer](https://github.com/clawnify/OpenDialer) | `PROSPECTOR_APP_ID` → "Import from Prospector" |
| Newsletter | [clawnify/OpenNewsletter](https://github.com/clawnify/OpenNewsletter) | `CRM_APP_ID` → "Import from CRM" |
| Desk | clawnify/OpenDesk, joins the bundle once it is published | |
| SDR, Signal, Analyst | this repo, `agents/` | SDR required; Signal and Analyst optional |

## License

MIT, as each member.
