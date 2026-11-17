import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { LogoMark } from "@/components/ui/LogoMark";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { btnGhost, input, label } from "@/components/admin/ui";
import { login } from "@/lib/admin/actions";
import { isAdmin } from "@/lib/admin/session";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center px-5 py-12">
      <LogoMark className="mb-10 h-14 w-auto self-start" />
      <h1 className="text-3xl font-bold tracking-[-0.04em]">Connexion</h1>
      <ActionForm action={login} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className={label}>Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required className={input} />
        </div>
        <div>
          <label htmlFor="password" className={label}>Mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
        </div>
        <SubmitButton>Se connecter</SubmitButton>
      </ActionForm>
      <Link href="/" className={`${btnGhost} mt-3`}>
        <ArrowLeftIcon className="size-5" aria-hidden />
        Retourner sur le site
      </Link>
    </main>
  );
}
