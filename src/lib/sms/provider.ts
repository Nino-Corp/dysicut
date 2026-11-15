import "server-only";

/**
 * SMS : architecture prête, NON ACTIVÉE au lancement (décision : zéro frais au départ).
 *
 * Pour l'activer plus tard :
 *  1. écrire une classe qui implémente SmsProvider (ex. BrevoSmsProvider, expéditeur « Dysicut »),
 *  2. la renvoyer dans getSmsProvider() quand SMS_PROVIDER=brevo (+ clé API en variable d'environnement),
 *  3. le cron /api/cron/reminders enverra alors le rappel SMS et renseignera sms_reminder_sent_at.
 */
export type SmsResult = { ok: boolean; error?: string };

export interface SmsProvider {
  readonly name: string;
  /** false = le cron ne tente aucun envoi. */
  readonly enabled: boolean;
  send(to: string, body: string): Promise<SmsResult>;
}

class DisabledSmsProvider implements SmsProvider {
  readonly name = "disabled";
  readonly enabled = false;
  async send(): Promise<SmsResult> {
    return { ok: false, error: "SMS désactivés" };
  }
}

export function getSmsProvider(): SmsProvider {
  return new DisabledSmsProvider();
}
