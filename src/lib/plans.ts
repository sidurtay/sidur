export type Plan = {
  key: string;
  name: string;
  monthlyPrice: number;   // NIS per month (monthly billing)
  annualPrice: number;    // NIS per month (annual billing, ~20% off)
  priceLabel: string;     // display label for free tier
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
    name: "Starter",
    monthlyPrice: 0,
    annualPrice: 0,
    priceLabel: "₪0",
    priceNote: "לתמיד",
    color: "var(--text-secondary)",
    bg: "var(--gray-bg)",
    border: "var(--border)",
    features: [
      "עד 10 עובדים",
      "סידור עבודה שבועי",
      "נוכחות ידנית",
      "בקשות חופשה והחלפות",
      "עוזר AI בסיסי",
    ],
    missing: [
      "התראות push לעובדים",
      "AI בונה סידור אוטומטית",
      "חישוב וחלוקת טיפים",
      "דוחות וייצוא Excel",
      "מולטי-סניף",
    ],
  },
  {
    key: "plus",
    name: "Essential",
    monthlyPrice: 149,
    annualPrice: 119,
    priceLabel: "₪149",
    priceNote: "לחודש",
    color: "var(--text-secondary)",
    bg: "var(--gray-bg)",
    border: "var(--border)",
    features: [
      "עד 20 עובדים",
      "כל מה שב-Starter +",
      "התראות push לעובדים",
      "AI בונה סידור אוטומטית",
      "חישוב וחלוקת טיפים",
      "דוחות חודשיים + ייצוא Excel",
    ],
    missing: [
      "מולטי-סניף",
      "דוחות עלות עבודה",
      "API גישה",
    ],
  },
  {
    key: "business",
    name: "Pro",
    monthlyPrice: 299,
    annualPrice: 239,
    priceLabel: "₪299",
    priceNote: "לחודש",
    color: "var(--blue)",
    bg: "var(--blue-light)",
    border: "var(--blue-border)",
    badge: "הכי פופולרי",
    features: [
      "עובדים ללא הגבלה",
      "כל מה שב-Essential +",
      "מולטי-סניף ללא הגבלה",
      "דוחות עלות עבודה",
      "API גישה",
      "תמיכה עדיפה",
    ],
    missing: [],
  },
];
