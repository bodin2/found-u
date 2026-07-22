import type { ContactInfo, ContactType } from "@/lib/types";
import { CONTACT_TYPES } from "@/lib/types";

/** Build a clickable href for a contact value when possible. */
export function getContactHref(contact: ContactInfo): string | null {
  const value = contact.value.trim();
  if (!value) return null;

  switch (contact.type as ContactType) {
    case "phone": {
      const digits = value.replace(/[^\d+]/g, "");
      return digits ? `tel:${digits}` : null;
    }
    case "email":
      return value.includes("@") ? `mailto:${value}` : null;
    case "line": {
      const id = value.replace(/^@/, "");
      return id ? `https://line.me/ti/p/~${encodeURIComponent(id)}` : null;
    }
    case "instagram": {
      const user = value.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
      return user ? `https://instagram.com/${encodeURIComponent(user.split(/[/?#]/)[0])}` : null;
    }
    case "facebook":
      if (/^https?:\/\//i.test(value)) return value;
      return `https://www.facebook.com/search/top?q=${encodeURIComponent(value)}`;
    default:
      return null;
  }
}

export function getContactTypeLabel(type: string): string {
  return CONTACT_TYPES.find((t) => t.value === type)?.label || type;
}
