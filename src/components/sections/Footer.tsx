import { site } from "@/config/site";

export function Footer() {
  return (
    <footer id="contact" className="border-t border-line px-5 py-10 pb-28 text-sm text-fg-muted nav:px-14 nav:pb-10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 nav:flex-row nav:justify-between">
        <span>{site.name} · {site.city}</span>
        <a href={site.social.instagramUrl} className="hover:text-fg">Instagram · @{site.social.instagramHandle}</a>
      </div>
    </footer>
  );
}
