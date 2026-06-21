// Decorative per-person colors — purely for telling people apart in lists/avatars,
// not tied to brand colors. Cycled by index so new employees get a varied look.
export const AVATAR_PALETTE = [
  { color: "#E6F1FB", textColor: "#0C447C" },
  { color: "#FAECE7", textColor: "#712B13" },
  { color: "#E1F5EE", textColor: "#085041" },
  { color: "#EEEDFE", textColor: "#3C3489" },
  { color: "#F1EFE8", textColor: "#444441" },
  { color: "#FFE4F0", textColor: "#8B1A4A" },
  { color: "#E0F7FA", textColor: "#006064" },
  { color: "#FFF3CC", textColor: "#7A5800" },
];

export function paletteFor(index: number) {
  return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
}

export function initialsFor(name: string): string {
  return name.trim().split(" ").map(w => w[0]).join("").slice(0, 2);
}

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export function sinceLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return `${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
