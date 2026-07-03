// Per-device dashboard section ordering. Each user can arrange their dashboard
// cards to taste; the order is remembered in localStorage (same pattern the
// rest of the app uses for per-user prefs). The attendance/clock-in card is
// never part of this list — it stays pinned at the top, outside the reorder.

export function loadOrder(key: string, defaultIds: string[]): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (Array.isArray(saved)) {
      // Keep the saved order for ids that still exist, then append any new
      // sections that were added since (so a future new card isn't lost).
      const kept = saved.filter((id: string) => defaultIds.includes(id));
      const added = defaultIds.filter(id => !kept.includes(id));
      return [...kept, ...added];
    }
  } catch {}
  return defaultIds;
}

export function saveOrder(key: string, order: string[]) {
  try { localStorage.setItem(key, JSON.stringify(order)); } catch {}
}

// Swap a section with its nearest neighbor in the given direction, skipping
// over any sections not currently visible (so "up" always lands on the card
// the user actually sees above it, never on a hidden/empty one).
export function moveSection(order: string[], id: string, dir: -1 | 1, visible: string[]): string[] {
  const i = order.indexOf(id);
  if (i < 0) return order;
  let j = i + dir;
  while (j >= 0 && j < order.length && !visible.includes(order[j])) j += dir;
  if (j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
