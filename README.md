# 🌿 Our wedding — Hotel Vršatec, 16 Oct 2026

A static Vue 3 site for our wedding. No build step — everything runs from a CDN.
Style: BOHO + Tatra/Vršatec nature + subtle HP references ("Always", the Lily & Severus tree).

> The website content is intentionally kept in **Slovak** (it's for Slovak-speaking guests).
> Everything code-related — docs, comments, logs, dev notes — is in English.

## ✨ What's included

| Section | Feature |
|---|---|
| **Intro (hero)** | Names, date, animated mountains in the background, **live countdown** to the wedding |
| **Venue** | Info about Hotel Vršatec, mountain + castle-ruins illustration, links: hotel website, **Waze**, **Google Maps** |
| **Our story** | Configurable chapters with photos (How we met, Our travels, Merlin, Always) |
| **Accommodation** | Cards with info, price and a link |
| **RSVP** | Name, e-mail, number of adults/children, vegan/vegetarian/gluten-free, allergies, accommodation, message |
| **Gifts** | Configurable list with a **QR generator** (EPC QR — SEPA, works in all SK/EU banking apps) |
| **Easter egg: HP quiz "Always"** | Mini quiz that reveals a secret message |
| **Easter egg: Hidden Merlin** | 3× scattered across the page — click to discover a fun fact 🐕 |

## 🚀 Running locally

**Option A — double-click (simplest):** just double-click `index.html`.
The HTML contains an inline fallback config, so the page works even without a server.
After editing `config.json`, run `node sync-config.js` to refresh the fallback.

**Option B — local server (recommended for development):** no sync needed, `config.json` is loaded live via fetch:

```bash
# Python:
python -m http.server 8080

# or Node:
npx serve

# or VS Code: "Live Server" extension → click "Go Live"
```

Then open `http://localhost:8080`.

## ⚙️ Configuration (most important!)

**Everything you might need to change lives in `config.json`.** No editing of HTML/CSS/JS required.

### 1. Names, hashtag

```json
"couple": {
  "bride": "Petra",
  "groom": "Patrik",
  "hashtag": "#PetraAPatrik2026"
}
```

### Invitation colors
#88562A
#382711
#2D1E0C
#7B8C7C
#783727
#7B3820

### 2. Date and time

```json
"wedding": {
  "date": "2026-10-16T15:00:00",
  "dateDisplay": "16. október 2026",
  "timeDisplay": "15:00",
  ...
}
```

The `date` field must be in ISO format — it's used for the countdown.

### 3. Venue, Waze, maps

For Waze/Google Maps, just keep the existing URLs or replace them with the exact address.

### 4. Story + photos

In `config.json`, `story.chapters` has 4 chapters. You set the path to each photo in the `image` field.

**Drop photos into `assets/photos/`** (recommended format: JPG 4:5, at least 800 px wide). If a photo is missing, an emoji placeholder is shown — the page won't break.

### 5. RSVP — where responses go

Currently `rsvp.endpoint` is empty, so after submitting the form:
1. Copies the filled-in data to the clipboard
2. Opens the mail client with pre-filled text

**Better options (pick one):**

**A) Formspree (simplest, free):**
- Sign up at formspree.io, create a form, get an endpoint URL
- Add it to `config.json`: `"endpoint": "https://formspree.io/f/yourcode"`

**B) Web3Forms (alternative, also free):**
- web3forms.com → access key
- `"endpoint": "https://api.web3forms.com/submit"` + an `access_key` field in the payload

**C) Google Apps Script:**
- Google Sheet → Extensions → Apps Script → `doPost(e)` handler → Deploy as Web App "Anyone" → URL into the config

### 6. Gifts and QR payments

In `gifts.payment`, fill in the **IBAN** and **beneficiary name**:

```json
"gifts": {
  "payment": {
    "iban": "SK12 3456 7890 1234 5678 9012",
    "beneficiaryName": "Petra Svikruhová",
    "bic": "",
    "currency": "EUR"
  },
  ...
}
```

**Individual gifts** in `gifts.items`:

```json
{
  "id": 1,
  "title": "Na dvere",
  "description": "...",
  "amount": 50,
  "variableSymbol": "1001",
  "icon": "🚪",
  "customAmount": false
}
```

To add another gift = just copy one and change `id`, `variableSymbol`, `title`...

**QR format:** EPC069-12 (SEPA Credit Transfer) — the European standard. Works with VÚB, Tatra Banka, SLSP, mBank, ČSOB and basically all SK/EU banking apps. The variable symbol is carried as part of the unstructured reference (`/VS1234 optional message`).

### 7. Quiz / easter egg

In `easterEgg.quiz.questions` you can add/edit questions. Each has `q` (text), `options` (2-4 answers) and `correct` (index of the correct one, 0-based).

## 🎮 Easter eggs

- **Hidden Merlin** (3×): faintly translucent icons 🐕 🐾 🌙 in the corners of sections. Click = fun fact + counter. Find all three for a reward.
- **HP quiz "Always"**: the last section, thematically tied to the invitations (Lily & Severus, "Always").

## 🌐 Deployment (GitHub Pages)

This is a 100% static site with no build step, so GitHub Pages serves it directly from the repo.

1. Push this repo to GitHub (default branch e.g. `main`).
2. Repo → **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Pick the branch (`main`) and folder **`/ (root)`**, then **Save**.
5. Wait ~1 minute — the site goes live at `https://<username>.github.io/<repo>/`.

Notes:
- `config.json` is loaded via `fetch` from the same origin, so it works on Pages out of the box.
- A `.nojekyll` file is included so GitHub Pages serves all files as-is (no Jekyll processing).
- Other hosts work too: Netlify (drag-and-drop the folder) or Vercel (git or drag-and-drop), both free.

## 📂 Project structure

```
weddingweb/
├── index.html              # Main HTML
├── config.json             # ⭐ All configuration (names, date, gifts…)
├── sync-config.js          # Syncs the inline config in HTML with config.json
├── css/styles.css          # All styles
├── js/app.js               # Vue 3 application
├── assets/photos/          # Photos (story-1.jpg, merlin.jpg, …)
├── .nojekyll               # Tells GitHub Pages to skip Jekyll
├── .gitignore
└── README.md
```

## 💡 Ideas worth adding

Things that could be added as needed:

- **Day schedule / timeline** — from the ceremony through the toast, dinner, first dance, etc.
- **Venue map** (embedded Google Maps iframe) right in the Venue section.
- **Dress code** — a section with color suggestions (e.g. "muted earthy tones, avoid white").
- **Witnesses / wedding party** — photos and short bios of bridesmaids/witnesses.
- **Contact** — phone number for the day-of coordinator in case of need.
- **Post-wedding gallery** — after the big day, upload photos for guests to see.
- **Song list** — guests can suggest songs (via RSVP or an extra form).
- **Kids' corner** — info for parents with children.
- **Transport** — whether there's a shuttle bus from the station, parking...
- **Live stream link** — for those who can't make it.
- **Guestbook** — a virtual version where guests can leave a message.
- **Multi-language** — in case Czech/English guests come (currently SK only).

Let me know which of these make sense and I'll add them.

## 🔧 Development notes

- No `npm install` needed — Vue 3 and qrcode-generator are pulled from a CDN.
- The site is 100% static and optimized for speed (font preloading, minimal CSS).
- Responsive down to mobile (tested 360px+).
- No `localStorage` — no tracking cookies, no GDPR banner needed.

## ❤️ Always.
