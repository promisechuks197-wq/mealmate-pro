import { differenceInDays, parseISO } from "date-fns";

export function expiryStatus(date: string | null | undefined): "expired" | "soon" | "ok" | "none" {
  if (!date) return "none";
  const days = differenceInDays(parseISO(date), new Date());
  if (days < 0) return "expired";
  if (days <= 2) return "soon";
  return "ok";
}

export function normalize(name: string) {
  return name.trim().toLowerCase();
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}