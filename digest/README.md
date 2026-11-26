# XKDG daily digest

Every morning (about 05:15 Vienna time) an email with the positive hours of **today and
the next 7 days**: the general scan and every purpose (Health, Career, Wealth,
Relationship, Journey, Speak, Legal), night hours included. It is computed with the
app's own scanner (`scan.js` loads `app-bazi.js` headless), in true solar time of the
recipient's city, with daylight saving handled day by day.

## Secrets (GitHub → repository → Settings → Secrets and variables → Actions)

| Secret | Value |
|---|---|
| `GMAIL_USER` | the Gmail address that sends the emails |
| `GMAIL_APP_PASSWORD` | a Gmail **app password** (Google account → Security → 2-Step Verification → App passwords) |
| `XKDG_DIGEST_RECIPIENTS` | the list of people, JSON (below) |

```json
[
  {"name": "Edu", "email": "someone@gmail.com", "birth_date": "1960-06-15", "birth_time": "10:00", "city": "Vienna", "lang": "en"}
]
```

- `city`: `Vienna` or `Tuoro`, or give `lat`, `lon`, `tz` (IANA zone, e.g. `Europe/London`) and `city_label`.
- `lang`: `en` (default), `it` or `fr`.
- `birth_time` optional (12:00 if missing). For a year-only person use `"jiazi": "庚子"` instead of `birth_date`.
- `"active": false` pauses one person without removing them.
- `houses` (optional): the Feng Shui placements of the person's houses. Do not write it by hand: in the app,
  **House Profiles → 📧 Daily email** builds the whole line of a person (birth data + houses: door fountains,
  bed sitting, desk facing) ready to paste. The email then adds, day by day, the dates the app's own Water /
  Bed / Desk scans find for each placement, with the detail at the end.
  The Vienna bedroom fountains (Fountain A, bed, 222°, by DAY; Fountain B, bedroom door, 227°, by NIGHT; both for the 266° facing) travel
  as `{"kind":"fountain","device":"vienna-letto"|"vienna-porta"}`: the email lists their ON → OFF times, computed
  with the assistant's own fountain plan.
- `shelly` (optional): the aquarium light plans to watch. The app's **📧 Daily email** button adds it (tick
  *warn about the aquarium light plans*) on a device where Shelly is configured. The email then says, at the top,
  until when each plan runs, and warns in red (subject starting with ⚠ 🐠) when a plan has ended, ends within a
  day and a half, is paused, or has missed switch-ons. The Worker token stays inside the secret, never in the logs.
  With `shelly`, the email also shows a **Switch ON / OFF** box: the real switch times of today and tomorrow of every
  device (aquariums and fountains), read from the plans stored in the Worker.
- **He Luo of the day** (Edu 25/11/2026): a box with the app's own He Luo reading of today (actor, action, outcome with
  the line texts, hours, background, notes). Only for the owner's line (the line whose `shelly` token reads the
  subscribers) or a line of the secret with `"heluo": "M"` / `"F"`; `"heluo": false` turns it off. Never for the lines
  the students send from the app. It needs `birth_time`.
  The box (26/11/2026): the three line texts as they are, then **Commento**, a short reading in plain words written
  every morning by the Assistant (xkdg-ai Worker, one request per reader; Italian for the owner, `"heluo_lang"` in the
  line changes it; English for a second reader, `"lang"` in their `heluo_for` entry changes it). If the Assistant does
  not answer, the short box below is used.
  The fallback box is SHORT (26/11/2026): who moves the day, what is done, how it ends, each with one comment in plain
  words, then Luck, hours and at most two warnings. `"heluo_full": true` in the line gives the long box (background,
  clashes, notes).
  A line with several addresses: the He Luo of the line goes to the FIRST address only. A second reader gets their own
  reading with `"heluo_for": { "second@address": { "name": "…", "birth_date": "YYYY-MM-DD", "birth_time": "HH:MM",
  "gender": "F" } }` in the line (optional `"sphere"`), and no He Luo box without it. The rest of the email is the same.
  Under the texts of actor, action and outcome there is the **comment** already written in the app for that line, in the
  sphere of life chosen in the He Luo window: the app sends the choice to the Worker (`?set_pref`, Worker of 25/11/2026 or
  later) and digest.js reads it (`?get_pref`). With an older Worker: `"sphere": "wealth"` in the line, else General.
- One object per person, separated by commas.

## Students subscribe by themselves (session 41)

In the app: House Profiles → ☰ → 📧 Daily email → ✉ Subscribe. The line goes to the xkdg-shelly Worker (v7,
`?digest_subscribe`, licence checked with xkdg-ai). Every morning digest.js reads them with `?digest_subscribers`,
using the Worker URL + token already in Edu's line (`shelly`) (env `XKDG_SUBS_URL` / `XKDG_SUBS_TOKEN` also accepted if added to the workflow).
The same email in the secret wins. Guide for students: `guides/daily-email.html`.

## Test now

GitHub → **Actions** → *Daily XKDG digest* → **Run workflow**.
The log shows only `recipient 1/2: 28 hours, sent` — never names, emails or birth data.
