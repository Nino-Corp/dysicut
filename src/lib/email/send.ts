import "server-only";
import { Resend } from "resend";

type Attachment = { filename: string; content: string; contentType?: string };

export type Mail = { to: string; subject: string; html: string; text: string; attachments?: Attachment[] };

let resend: Resend | null = null;

/**
 * Envoie un email via Resend. Ne lève jamais : un email raté ne doit pas faire échouer une réservation.
 * Retourne true si Resend a accepté le message. Sans RESEND_API_KEY, log seulement (développement).
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    console.warn(`[email] RESEND_API_KEY / RESEND_FROM absents : email "${mail.subject}" non envoyé`);
    return false;
  }
  try {
    resend ??= new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content, "utf8"), contentType: a.contentType })),
    });
    if (error) {
      console.error("[email] refusé par Resend :", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] échec d'envoi :", e instanceof Error ? e.message : e);
    return false;
  }
}
