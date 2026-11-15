"use client";

import { useEffect, useRef, useState } from "react";

/** Embed de profil TikTok, chargé seulement quand il approche du viewport (jamais bloquant). */
export function TikTokEmbed({ profileUrl }: { profileUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const handle = profileUrl.match(/tiktok\.com\/@([\w.]+)/)?.[1];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !handle) return;
    const s = document.createElement("script");
    s.src = "https://www.tiktok.com/embed.js";
    s.async = true;
    document.body.appendChild(s);
    return () => s.remove();
  }, [visible, handle]);

  return (
    <div ref={ref} className="min-h-24">
      {visible && handle ? (
        <blockquote className="tiktok-embed" cite={profileUrl} data-unique-id={handle} data-embed-type="creator" style={{ maxWidth: 780, minWidth: 288 }}>
          <section>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">@{handle} sur TikTok</a>
          </section>
        </blockquote>
      ) : (
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-[15px] text-fg-muted underline underline-offset-4">
          @{handle ?? "tiktok"} sur TikTok
        </a>
      )}
    </div>
  );
}
