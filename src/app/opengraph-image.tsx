import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/config/site";

export const alt = `${site.name}, barber à ${site.city}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const svg = await readFile(join(process.cwd(), "public/brand/logo.svg"));
  const logo = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#f5f5f7" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={420} height={420} alt="" />
        <div style={{ display: "flex", width: 160, height: 4, marginTop: 8 }}>
          <div style={{ flex: 1, background: "#D62839" }} />
          <div style={{ flex: 1, background: "#f5f5f7" }} />
          <div style={{ flex: 1, background: "#1F4E9C" }} />
        </div>
        <div style={{ marginTop: 28, fontSize: 34, color: "#86868b", letterSpacing: 2 }}>{`${site.city} · sur rendez-vous`}</div>
      </div>
    ),
    size,
  );
}
