import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Vercel envoie `Authorization: Bearer $CRON_SECRET`. Sans secret configuré, les routes cron restent fermées. */
export const cronAuthorized = (req: Request): boolean => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
};
