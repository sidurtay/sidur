# Sidur — App Store / Google Play submission kit

Reference doc for the actual store listings. Everything here is free to prepare now;
the only paid steps are the Apple Developer account ($99/yr) and Google Play
Console ($25 one-time) — do those once payment is unblocked.

## 1. App identity

- **Name:** Sidur
- **Subtitle (iOS) / Short description (Google, ≤80 chars):** ניהול סידור עבודה ועובדים בלחיצה
- **Bundle ID:** app.sidur.il
- **Category:** Business / Productivity
- **Support email:** sidur.support@gmail.com (already wired into Terms/Privacy pages)
- **Support URL:** https://sidurr.vercel.app (until a custom domain exists)
- **Marketing URL (optional):** same

## 2. Store description (Hebrew, primary locale)

**Promotional text (iOS, ≤170 chars, editable without a new build):**
> תחילת חודש חדש: מסלול חינם ל-10 עובדים, בלי כרטיס אשראי. AI בונה לך סידור עבודה שלם תוך שניות.

**Full description:**
```
Sidur — ניהול סידור עבודה ועובדים חכם לכל עסק

מנהלים עסק עם עובדים? Sidur בונה לך סידור עבודה שלם תוך שניות עם AI,
עוקב אחרי נוכחות בזמן אמת, ומחלק טיפים אוטומטית — הכל מהטלפון.

✦ AI בונה סידור עבודה — מזין את האילוצים פעם אחת, הסידור מוכן תוך שניות
📅 סידור עבודה שבועי — גרירה, החלפות, ואישורים במקום אחד
⏱️ נוכחות בזמן אמת — כניסה ויציאה דרך טביעת אצבע, QR, או ידני
💸 חלוקת טיפים הוגנת — חישוב אוטומטי לפי שעות עבודה בפועל
📊 דוחות מוכנים לשכר — ייצוא ל-Excel בלחיצה אחת
🏢 מולטי-סניף — נהלו כמה סניפים מחשבון אחד
🔔 התראות Push — עדכונים לעובדים גם כשהאפליקציה סגורה

מתאים לכל עסק עם עובדים: בתי קפה ומסעדות, סלוני יופי, חדרי כושר,
חנויות, מכולות, שירותי ניקיון, ועוד.

מתחילים בחינם עד 10 עובדים, בלי כרטיס אשראי.
```

**Keywords (iOS, ≤100 chars comma-separated):**
```
סידור עבודה,ניהול עובדים,נוכחות,משמרות,שכר,טיפים,מסעדה,עובדים,לוח משמרות
```

## 3. Screenshots needed

Capture at these breakpoints (use the preview tool's `preview_resize`):
- iPhone 6.7" (1290×2796) — required for iOS
- iPhone 6.5" (1284×2778) — required for older device support
- Android phone (1080×1920 or actual device)

Suggested 5 screens: landing/pricing → register flow → dashboard →
schedule builder → tips distribution.

## 4. Apple "App Privacy" questionnaire

Based on an actual scan of the codebase (auth, employees, schedule, tips, push, webauthn):

| Data type | Collected? | Linked to user? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Name | Yes | Yes | No | App functionality (account, roster) |
| Phone number | Yes | Yes | No | App functionality (login identifier) |
| Email address | Yes (optional) | Yes | No | App functionality (credential delivery) |
| Password | Yes (hashed) | Yes | No | Authentication |
| Financial info (hourly wage, tips) | Yes | Yes | No | App functionality (payroll/tips) |
| User content (schedules, messages, constraints) | Yes | Yes | No | App functionality |
| Identifiers (WebAuthn public key, push subscription) | Yes | Yes | No | App functionality (passkey login, notifications) |
| Precise location | No | — | — | — |
| Photos/camera | No | — | — | — |
| Contacts | No | — | — | — |
| Browsing/search history | No | — | — | — |
| Usage data / analytics | No (no analytics SDK in the codebase) | — | — | — |
| Health/fitness | No | — | — | — |

**"Data Used to Track You": None** — no advertising SDK, no cross-app/cross-site
tracking, no analytics vendor. Answer "No" to the tracking question.

Third-party processors to disclose (already listed in `/privacy`):
Supabase (database hosting), Vercel (app hosting), Google/Gmail (transactional
email delivery), Anthropic (AI schedule-assistant feature).

## 5. Google Play "Data Safety" form

Same underlying facts as above, mapped to Google's categories:

- **Personal info:** Name, Email, Phone number → collected, shared: no, purpose: App functionality
- **Financial info:** collected (wage/tips), shared: no, purpose: App functionality
- **App activity:** (in-app messages/schedules) collected, shared: no, purpose: App functionality
- **Device or other IDs:** (push subscription) collected, shared: no, purpose: App functionality
- **Data encrypted in transit:** Yes (HTTPS/TLS via Vercel + Supabase)
- **Users can request data deletion:** Yes — support email already published in `/privacy`
- **Data collection is required for the app to function:** Yes (name/phone/password needed for login)

## 6. Age rating questionnaire

No user-generated public content, no violence/gambling/mature themes,
no unrestricted web access, no chat with strangers (internal team-only
messaging). Should qualify for the lowest age tier (4+ / Everyone) on
both stores.

## 7. What's still blocked on payment

- Apple Developer Program enrollment ($99/year) — required to create the
  App Store Connect listing, generate signing certificates, and submit for review
- Google Play Console registration ($25 one-time) — required to create the
  Play Console listing and submit
- TestFlight / internal testing tracks (free once enrolled, but enrollment costs money)
- Actual device/simulator build + submission (needs Xcode + Apple account for iOS)
