import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SIZES = [192, 512];

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const px = Number((await params).size);
  if (!SIZES.includes(px)) return new Response("Not found", { status: 404 });
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"), "utf8");
  const logo = `data:image/svg+xml;base64,${Buffer.from(svg.replace("@media (prefers-color-scheme:light){.d{fill:#0a0a0a}}", "")).toString("base64")}`;
  // Le D occupe 60 % : reste dans la zone sûre des icônes maskable.
  const inner = Math.round(px * 0.6);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={inner} height={inner} alt="" />
      </div>
    ),
    { width: px, height: px, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
