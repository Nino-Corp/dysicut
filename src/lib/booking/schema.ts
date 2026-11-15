import { z } from "zod";
import { normalizePhone } from "./phone.ts";

/** Corps de POST /api/booking. Validé côté serveur ; le formulaire client réutilise les mêmes règles. */
export const bookingRequestSchema = z.object({
  serviceId: z.string().min(1).max(40),
  start: z.iso.datetime(),
  firstName: z.string().trim().min(1, "Indique ton prénom").max(60),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = normalizePhone(v);
      if (!n) ctx.addIssue({ code: "custom", message: "Numéro de téléphone invalide" });
      return n ?? "";
    }),
  email: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.email("Email invalide").nullable()),
  consent: z.literal(true, { error: "Accepte l'utilisation de tes données pour continuer" }),
  /** Champ piège : un humain ne le voit pas. */
  website: z.string().max(200).optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
