# GTM OS workspace

This repo is a Clawnify **bundle**: a list of five app repos and three agents
that together make a working outbound desk. Apps are **referenced by repo**
and never copied here; each keeps its own verification pin and update path.
Layout:

- `clawnify.json` — the root manifest: `bundle.apps[]` by repo, `bundle.agents[]`
  by path with a `required` flag, `deploy.prompts`. `workspace.org` is `null`
  because this repo is a template; it is bound to an org at install.
- `agents/<name>/` — the bundle's agents (AGENT.md, skills/, flows/).
- `apps/<slug>/` — each member as a git submodule pinned at its verified
  commit. Read-only here: install ignores these folders, and member changes
  go upstream to the member repo.
- `docs/` — the getting-started narrative.

## Editing rules

- **Fix a member upstream.** There is no copy of OpenCRM here to edit. A
  generic improvement is a PR to `clawnify/OpenCRM`; re-verification advances
  the pin every install uses. Bundle-specific behaviour in a member is gated
  on the env var this bundle sets (e.g. `CRM_APP_ID`), never a fork.
- **Bundle-level work belongs here:** `agents/*`, `docs/`, the root manifest.
- **Never commit `.env` files or `.clawnify/` folders.** Never echo tokens.
- This repo never knows about an org. Do not `clawnify link` or `clawnify org
  use` inside it.

## Installing today (until bundle install ships)

Inside a workspace bound to the target org, deploy each member from its repo,
then the agents from this repo:

```bash
clawnify deploy --from clawnify/OpenCRM
clawnify deploy --from clawnify/OpenProspector
clawnify deploy --from clawnify/OpenDialer
clawnify deploy --from clawnify/OpenNewsletter
clawnify deploy agents/sdr                       # required
clawnify deploy agents/signal agents/analyst     # optional, plan permitting
```

Then set `PROSPECTOR_APP_ID` on the Dialer and `CRM_APP_ID` on the Newsletter
from the dashboard until the installer does it.

Then read `docs/GETTING-STARTED.md` with the agent.

Docs: https://docs.clawnify.com/llms.txt
