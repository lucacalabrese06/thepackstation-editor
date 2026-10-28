# Pack Station editor

A private web app for changing **thepackstation.co.uk** without touching code: machines, page wording, business details and logo, FAQs, stock, menus, colours, fonts and sizes. Built with [Astro](https://astro.build) and hosted on Cloudflare Pages, with the same folder structure as `thepackstation-site`.

How to use it day to day is in the website repo's `EDITING.md`. This file is for setting it up.

## How it works

```
Your friend ──► Cloudflare Access ──► editor.thepackstation.co.uk ──► GitHub (thepackstation-site)
               (email code)          (Sign in with GitHub)             saves to development
                                                                        Publish = merge into master
```

1. **Cloudflare Access** stops anyone not on your email list before the editor loads.
2. **Sign in with GitHub** proves who they are. The editor only lets in people who can write to the website repository (and, if you set it, only usernames listed in `src/settings/editor.ts`).
3. **Saving** checks the change with the same rules as the website's build (`src/lib/validate.ts`), then commits it to `development` under the person's own name. Cloudflare rebuilds the preview site.
4. **Publish** opens a pull request from `development` to `master` and merges it, once the website's build check has passed. Cloudflare rebuilds the live site.

## Where things live

| Path | What it is |
| --- | --- |
| `src/settings/editor.ts` | Which repository and branches to edit, preview and live addresses, who's allowed in |
| `src/settings/types.ts` | Shape of the website's settings files (copy of the site's) |
| `src/lib/validate.ts` | Settings checks. **Identical copy of the site's**: keep them in step |
| `src/lib/github.ts` | Every GitHub call: read, save, upload, pending changes, build check, publish |
| `src/lib/session.ts` | Encrypted sign-in cookie |
| `src/lib/wording.ts` | Friendly labels for every piece of page wording |
| `src/middleware.ts` | Sends anyone not signed in to the sign-in page; security headers |
| `src/pages/` | One file per screen; `api/` holds sign-in, save, upload and publish |
| `src/scripts/` | Browser code shared by the screens: saving, image resizing, list editing, previews |
| `src/styles/global.css` | All styles |
| `tests/` | Tests for sign-in, GitHub calls and settings checks (`npm test`) |

## Setup (once)

### 1. Create the GitHub App

GitHub → **Settings → Developer settings → GitHub Apps → New GitHub App**

| Field | Value |
| --- | --- |
| Name | Pack Station Editor |
| Homepage URL | `https://editor.thepackstation.co.uk` |
| Callback URL | `https://editor.thepackstation.co.uk/api/callback` |
| Expire user authorization tokens | On |
| Request user authorization during installation | Off |
| Webhook → Active | Off |
| Repository permissions | Contents: **Read and write** · Pull requests: **Read and write** · Checks: **Read-only** |
| Where can this app be installed? | Only on this account |

Create it, then:
- Copy the **Client ID**.
- **Generate a new client secret** and copy it.
- **Install App** → *Only select repositories* → `thepackstation-site`.

Anyone who uses the editor needs write access to `thepackstation-site` (Settings → Collaborators).

### 2. Protect the live branch

In `thepackstation-site` → **Settings → Branches → Add rule** for `master`:
- Require a pull request before merging, with **0 required approvals** (the editor merges for you).
- Require status checks to pass: **build**.

This means nothing can go live unless the website's build check passed.

### 3. Deploy on Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git** → `thepackstation-editor`

- Framework preset: Astro
- Build command: `npm run build`
- Output directory: `dist`
- Variables: `NODE_VERSION` = `22`
- Secrets (Settings → Variables and Secrets, mark as encrypted):
  - `GITHUB_CLIENT_ID`: from step 1
  - `GITHUB_CLIENT_SECRET`: from step 1
  - `SESSION_SECRET`: 32+ random characters (for example run `openssl rand -base64 48`)
- Custom domain: `editor.thepackstation.co.uk`

### 4. Lock it with Cloudflare Access

**Zero Trust → Access → Applications → Add an application → Self-hosted**

- Domains: `editor.thepackstation.co.uk` **and** `thepackstation-editor.pages.dev` (plus `*.thepackstation-editor.pages.dev`) so the Cloudflare address can't be used to get round it.
- Policy: **Allow**, Include → Emails → your address and your friend's.
- Login method: One-time PIN (email code).

Also lock the **website's preview site** (the `thepackstation-site-dev` Worker, built from `development`): add a second Access application for `dev.thepackstation.co.uk` with the same email list. In that Worker's **Settings → Domains & Routes**, turn off the `workers.dev` address (or add it to the same Access application) so it can't be used to get round the lock.

### 5. Check the addresses

In `src/settings/editor.ts`, `previewUrl` must match the website's preview address: `https://dev.thepackstation.co.uk` (the `thepackstation-site-dev` Worker). `liveUrl` is `https://thepackstation.co.uk` (the `thepackstation` Worker, built from `master`).

## Run it locally

```
npm install
cp .dev.vars.example .dev.vars   # fill in a GitHub App's details
npm run build && npm run preview
```

For local sign-in, add `http://localhost:8788/api/callback` as a second callback URL on the GitHub App.

## Tests

`npm test` runs the sign-in, GitHub and settings-check tests. The GitHub Action runs them and the build on every push.
