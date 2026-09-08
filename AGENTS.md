# GTM OS workspace

This repo is a Clawnify **bundle**: a workspace that vendors five apps and one
agent so a team gets a working outbound desk in one install. Layout:

- `apps/<slug>/` — one folder per app, a vendored copy of its source at the
  commit recorded in `clawnify.lock`.
- `agents/<name>/` — the org's AI agents (AGENT.md, skills/, flows/).
- `docs/` — the bundle page material and the getting-started narrative.
- `clawnify.json` — the root manifest. `workspace.org` is `null` here because
  this repo is a template; it is bound to an org at install.

## Editing rules

- **Fix a member upstream, not here.** `apps/open-crm` is a copy of
  `clawnify/OpenCRM`. A generic improvement goes to the source repo; then
  re-vendor and bump the sha in `clawnify.lock`. Editing the copy forks it.
- **Bundle-level work belongs here:** `agents/sdr`, `docs/`, the root
  manifest, and any wiring between members.
- **Never commit `.env` files or `.clawnify/` folders.** Never echo tokens.
- Don't hand-edit generated files (`*.gen.*`, lockfiles) unless asked.
- This repo never knows about an org. Do not `clawnify link` or `clawnify org
  use` inside it.

## Installing today (until bundle install ships)

Bind a workspace to the target org, then deploy members one by one:

```bash
clawnify deploy apps/open-crm
clawnify deploy apps/open-prospector
clawnify deploy apps/open-dialer
clawnify deploy apps/open-newsletter
clawnify deploy apps/open-desk
clawnify deploy agents/sdr
```

Then read `docs/GETTING-STARTED.md` with the agent.

Docs: https://docs.clawnify.com/llms.txt
