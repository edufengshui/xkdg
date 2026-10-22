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
- One object per person, separated by commas.

## Test now

GitHub → **Actions** → *Daily XKDG digest* → **Run workflow**.
The log shows only `recipient 1/2: 28 hours, sent` — never names, emails or birth data.
