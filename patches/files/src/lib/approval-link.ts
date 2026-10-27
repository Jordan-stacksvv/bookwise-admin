import { normalisePhone } from "@/lib/phone";

export function approvalUrl(token: string): string {
  return `${window.location.origin}/approve/${token}`;
}

const MAX_POLICY_CHARS = 600;

/** Message the teacher sends by hand over WhatsApp: policy text + the approval link. */
export function approvalMessage(opts: {
  token: string;
  kidName: string;
  parentName?: string;
  bookTitle: string;
  dueDate: string;
  policyText: string;
  fee: number;
  currency: string;
}): string {
  const due = new Date(opts.dueDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const policy =
    opts.policyText.length > MAX_POLICY_CHARS ? opts.policyText.slice(0, MAX_POLICY_CHARS).trimEnd() + "..." : opts.policyText;
  return [
    `Hello${opts.parentName ? " " + opts.parentName : ""},`,
    `${opts.kidName} would like to borrow "${opts.bookTitle}" from the Madina Central SDA Book Club (due ${due}).`,
    "",
    policy,
    "",
    `If a book is lost or damaged, the replacement cost is ${opts.currency} ${opts.fee}.`,
    "",
    `Please read the full policy and approve here: ${approvalUrl(opts.token)}`,
  ].join("\n");
}

export function whatsappLink(phone: string | undefined, text: string): string | null {
  const p = phone ? normalisePhone(phone) : null;
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : null;
}

/** Generic "share" link with no recipient (admin picks the chat). */
export function whatsappShare(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
