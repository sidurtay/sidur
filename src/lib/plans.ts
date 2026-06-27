// Single source of truth for pricing tiers — shared between the public
// landing page (so pricing is visible before anyone starts registering,
// unlike the Israeli competitors' "contact us" model) and the registration
// flow's plan-selection step.
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
    name: "Sidur Starter",
    price: "חינם",
    priceNote: "לתמיד",
    color: "var(--text-secondary)",
    bg: "var(--gray-bg)",
    border: "var(--border)",
    features: [
      "עד 10 עובדים",
      "סידור עבודה",
      "נוכחות ידנית",
      "צ'אט פנימי",
    ],
    missing: ["AI לסידור", "חישוב טיפים", "דוחות מתקדמים"],
  },
  {
    key: "plus",
    name: "Sidur Plus",
    price: "₪99",
    priceNote: "לחודש",
    color: "var(--text-secondary)",
    bg: "var(--gray-bg)",
    border: "var(--border)",
    features: [
      "עד 20 עובדים",
      "כל יכולות ה-Starter",
      "AI לבניית סידור",
      "חישוב טיפים",
      "דוחות חודשיים",
    ],
    missing: ["מולטי-סניף"],
  },
  {
    key: "business",
    name: "Sidur Business",
    price: "₪199",
    priceNote: "לחודש",
    color: "var(--blue)",
    bg: "var(--blue-light)",
    border: "var(--blue-border)",
    badge: "הכי פופולרי",
    features: [
      "עובדים ללא הגבלה",
      "כל יכולות ה-Plus",
      "מולטי-סניף",
      "API גישה",
      "תמיכה עדיפה",
    ],
    missing: [],
  },
];
