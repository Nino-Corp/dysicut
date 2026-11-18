import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  // Le D seul (icon.svg), carré, pour ne pas l'écraser.
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"), "utf8");
  const logo = `data:image/svg+xml;base64,${Buffer.from(svg.replace("@media (prefers-color-scheme:light){.d{fill:#0a0a0a}}", "")).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={128} height={128} alt="" style={{ transform: `translate(${128 * 0.036}px, ${-128 * 0.058}px)` }} />
      </div>
    ),
    size,
  );
}
