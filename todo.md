# ✅ TODO

Everything that still needs filling in before going live. Most of it is just editing
`config.json` — no code changes needed. Paths below refer to fields in `config.json`.

> After editing `config.json`, if you also use the double-click (`file://`) flow,
> run `node sync-config.js` to refresh the inline fallback in `index.html`.

## 📸 Photos

Drop these into `assets/photos/` (JPG, 4:5 portrait, ≥ 800 px wide). Missing photos
fall back to an emoji placeholder, so the page won't break.

- [ ] `story-1.jpg` — How we met
- [ ] `story-2.jpg` — Our travels
- [ ] `merlin.jpg` — Merlin (our dog)
- [x] `always.jpg` — already added

## ✍️ Content (`config.json`)

- [ ] `story.chapters[0].text` — still placeholder text ("Doplňte váš príbeh…"). Write how/when you met.
- [ ] `couple.hashtag` — currently `#Svadba2026`. Personalize it (e.g. `#PetraAPatrik2026`).
- [ ] Re-read the other story chapters and venue/accommodation text and tweak if needed.

## 📨 Submissions — where RSVP + Merlin reward go

Both run through the shared `submissions` block in `config.json`.

- [ ] `submissions.email` — set the recipient address for the `mailto:` fallback
      (used while no endpoint is wired up). Empty = mail draft has no recipient.
- [ ] `submissions.endpoint` is empty. Until set, submissions only copy a summary
      to the clipboard and open a `mailto:` draft. Pick one and paste the URL:
  - Formspree (simplest, free): `https://formspree.io/f/<yourcode>`
  - Web3Forms (free): `https://api.web3forms.com/submit` (+ `access_key` in payload)
  - Google Apps Script: deploy a `doPost(e)` web app and use its URL
      (payloads carry a `type`: `"rsvp"` or `"merlin-reward"`).
- [ ] Send a test RSVP after wiring it up and confirm it arrives.

## 🚌 Transport

- [ ] `transport.bus.stops[*].time` — all times are `—`. Fill in departure times per stop.
- [ ] `transport.bus.returnNote` — add the return-trip time.
- [ ] `transport.bus.description` — currently says times come "in August"; update once known.
- [ ] Remove the internal `transport.todo` field once all the above are done
      (it shows as a "Dev note" on the page while present).

## 🎵 Songs / Spotify

- [ ] `songs.spotifyUrl` — link to the playlist (Spotify → Share → Copy link).
- [ ] `songs.spotifyEmbedUrl` — embed URL (Spotify → Share → Embed playlist).
      Until set, the section shows a "playlist coming soon" placeholder.

## 🚀 Deployment (GitHub Pages)

- [X] Create the GitHub repo and push this project (default branch `main`).
- [X] Repo → Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)` → Save.
- [X] Open the live URL `https://<username>.github.io/<repo>/` and click through every section.
- [X] (Optional) Add a custom domain in Settings → Pages.

## 🔎 Pre-launch check

- [ ] Countdown shows the correct time to 16 Oct 2026, 15:00.
- [ ] All nav links scroll to the right sections on mobile and desktop.
- [ ] RSVP submit works end-to-end.
- [ ] No "Dev note" hints remain visible (means all config is filled in).
- [ ] Test on a phone (layout is tuned for 360px+).

## 💡 Optional / nice-to-have (from README)

- [ ] Day schedule / timeline
- [ ] Embedded venue map (Google Maps iframe)
- [ ] Dress code section
- [ ] Witnesses / wedding party bios
- [ ] Day-of coordinator contact
- [ ] Post-wedding photo gallery
- [ ] Guest song suggestions form
- [ ] Kids' corner info
- [ ] Live stream link
- [ ] Guestbook
- [ ] Multi-language (CS/EN) if non-Slovak guests attend
