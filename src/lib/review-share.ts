export function reviewUrl(token: string): string {
  return `${window.location.origin}/review/${token}`;
}

/** "Ama Kofi Mensah" -> "Ama M."  (same rule as the server uses for the public page) */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "A reader";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function reviewShareText(o: { bookTitle: string; kidName: string; summary: string; token: string }): string {
  const excerpt = o.summary.length > 220 ? o.summary.slice(0, 220).trimEnd() + "..." : o.summary;
  return [
    `\u{1F4D6} "${o.bookTitle}" - a review by ${shortName(o.kidName)}`,
    "",
    `"${excerpt}"`,
    "",
    `Read it here: ${reviewUrl(o.token)}`,
    "- Madina Central SDA Book Club",
  ].join("\n");
}

export const whatsappText = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
