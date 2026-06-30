// Single source of truth for pricing tiers — shared between the public
// landing page and the registration flow's plan-selection step.
export type Plan = {
  key: string;
  name: string;
  price: string;
  priceNote: string;
  color: string;
  bg: string;
  border: string;
  badge?: string;
  features: string[];
  missing: string[];
};

export const PLANS: Plan[] = [
  {
    key: "starter",
    name: "חינם",
    price: "₪0",
    priceNote: "לתמיד",
    color: "var(--text-secondary)",
    bg: "var(--gray-bg)",
    border: "var(--border)",
    features: [
      "עד 6 עובדים",
      "סידור עבודה שבועי",
      "נוכחות ידנית",
      "בקשות חופשה והחלפות",
      "עוזר AI בסיסי",
    ],
    missing: ["AI אוטומטי לסידור", "חישוב טיפים", "דוחות וייצוא Excel", "התראות WhatsApp"],
  },
  {
    key: "plus",
    name: "Plus",
    price: "₪79",
    priceNote: "לחודש",
    color: "var(--text-secondary)",
    bg: "var(--gray-bg)",
    border: "var(--border)",
    features: [
      "עד 25 עובדים",
      "כל מה שבחינם +",
      "AI בונה סידור אוטומטית",
      "חישוב וחלוקת טיפים",
      "דוחות חודשיים + ייצוא Excel",
      "התראות WhatsApp לעובדים",
    ],
    missing: ["מולטי-סניף", "API"],
  },
  {
    key: "business",
    name: "Pro",
    price: "₪149",
    priceNote: "לחודש",
    color: "var(--blue)",
    bg: "var(--blue-light)",
    border: "var(--blue-border)",
    badge: "הכי משתלם",
    features: [
      "עובדים ללא הגבלה",
      "כל מה שב-Plus +",
      "מולטי-סניף",
      "דוחות מתקדמים",
      "API גישה",
      "תמיכה עדיפה",
    ],
    missing: [],
  },
];
