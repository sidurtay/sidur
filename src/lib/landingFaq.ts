// Canned Q&A for the public landing-page bot only — no LLM call, no cost,
// safe for anonymous visitors to poke at freely. Deliberately separate from
// `lib/faq.ts` (the in-app FAQ), which assumes an existing logged-in account;
// these questions are pre-purchase ones a visitor would actually ask.
export type LandingFaqItem = { q: string; a: string; keywords: string[] };

export const LANDING_FAQ: LandingFaqItem[] = [
  {
    q: "כמה זה עולה?",
    a: "יש תוכנית חינמית קבועה עד 10 עובדים (Starter, ₪0). מעבר לזה: Essential ב-₪149/חודש עד 20 עובדים, ו-Pro ב-₪299/חודש לעובדים ללא הגבלה ומולטי-סניף. אפשר לשדרג או לרדת בכל רגע, בלי התחייבות.",
    keywords: ["מחיר", "כמה עולה", "כמה זה עולה", "תשלום", "עלות"],
  },
  {
    q: "יש ניסיון חינם?",
    a: "כן — 14 יום ניסיון חינם על תוכנית Pro, בלי כרטיס אשראי. ותוכנית Starter נשארת חינמית לצמיתות עד 10 עובדים, גם בלי לבחור ניסיון.",
    keywords: ["ניסיון חינם", "טרייל", "לנסות בחינם", "כרטיס אשראי"],
  },
  {
    q: "איך העוזר החכם בונה סידור?",
    a: "מזינים את האילוצים והזמינות של הצוות (חד-פעמית, ואז ניתן לעדכן), וסיד מרכיב סידור שבועי שלם תוך שניות — כולל חלוקה הוגנת בין בוקר/ערב. את/ה רק בודק/ת ומאשר/ת, ואפשר לערוך ידנית כל תא לפני שמירה.",
    keywords: ["איך זה עובד", "עוזר חכם", "ai", "בונה סידור", "איך בונים סידור"],
  },
  {
    q: "העובדים צריכים להתקין אפליקציה?",
    a: "לא — הכל דרך הדפדפן בטלפון, בלי הורדה מהחנות. עובד מקבל הזמנה ונכנס עם מספר טלפון וסיסמה שנוצרת אוטומטית.",
    keywords: ["להתקין", "אפליקציה", "הורדה", "חנות אפליקציות"],
  },
  {
    q: "המידע שלנו מאובטח?",
    a: "כן. הנתונים מוצפנים ומאוחסנים ב-Supabase (תשתית מאובטחת בתקן SOC2), אנחנו לא מוכרים מידע לצדדים שלישיים, ואפשר לבקש מחיקת נתונים בכל שלב. פרטים מלאים במדיניות הפרטיות.",
    keywords: ["מאובטח", "אבטחה", "פרטיות", "מידע", "מוצפן"],
  },
  {
    q: "אפשר לנהל כמה סניפים?",
    a: "כן, בתוכנית Pro אפשר לנהל מספר סניפים תחת חשבון אחד ולעבור ביניהם בלחיצה — בלי להתנתק ולהתחבר מחדש.",
    keywords: ["כמה סניפים", "מולטי סניף", "כמה סעיפים", "רשת"],
  },
  {
    q: "איך העובדים מדווחים נוכחות?",
    a: "כניסה ויציאה ממשמרת בלחיצת כפתור בטלפון (טביעת אצבע דיגיטלית) — נכנס לאישור מנהל אם צריך, ומתעדכן בזמן אמת בדשבורד. יש גם אפשרות למיקום חי בזמן המשמרת (לפי בחירת המנהל, כבוי כברירת מחדל).",
    keywords: ["נוכחות", "כניסה ויציאה", "דיווח שעות", "מיקום", "gps"],
  },
  {
    q: "אפשר לבטל בכל שלב?",
    a: "כן, אין התחייבות לתקופה מינימלית — אפשר לעבור לתוכנית חינמית או לבטל לגמרי מתי שרוצים, ישירות מהגדרות החשבון.",
    keywords: ["לבטל", "ביטול", "התחייבות", "לרדת בתוכנית"],
  },
];

const SUPPORT_ANSWER = {
  q: "איך מדברים עם בנאדם אמיתי?",
  a: "כמובן — אפשר לכתוב לנו ישירות למייל sidur.support@gmail.com ונחזור אליך בהקדם.",
  keywords: ["תמיכה", "לדבר עם נציג", "בנאדם אמיתי", "עזרה", "צור קשר", "support"],
};

export const LANDING_FAQ_WITH_SUPPORT = [...LANDING_FAQ, SUPPORT_ANSWER];

// Simple substring/keyword scoring — deliberately not an LLM call: this
// widget is reachable by anonymous visitors, so it must never be able to
// spend AI credits, no matter how it's poked at.
export function matchLandingFaq(query: string): LandingFaqItem | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  let best: LandingFaqItem | null = null;
  let bestScore = 0;
  for (const item of LANDING_FAQ_WITH_SUPPORT) {
    for (const kw of item.keywords) {
      const kwLower = kw.toLowerCase();
      if (q.includes(kwLower) || kwLower.includes(q)) {
        const score = kwLower.length;
        if (score > bestScore) { bestScore = score; best = item; }
      }
    }
  }
  return best;
}
