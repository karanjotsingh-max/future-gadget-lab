import type { Metadata } from "next";
import { VT323, Share_Tech_Mono, Orbitron } from "next/font/google";
import Link from "next/link";
import WorldLineMeter from "@/components/WorldLineMeter";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  variable: "--font-vt323",
  subsets: ["latin"],
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  variable: "--font-share-tech-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Future Gadget Lab",
  description:
    "A Steins;Gate themed AI lab. D-Mail timeline simulator, Amadeus chatbot, and Lab Radio. El Psy Kongroo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${vt323.variable} ${shareTechMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-(--color-bg) text-(--color-text-cold)">
        <header className="border-b border-(--color-border) bg-(--color-panel)/50 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="group flex items-baseline gap-3"
              aria-label="Future Gadget Lab home"
            >
              <span
                className="phosphor-green text-lg tracking-[0.2em]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                FUTURE GADGET LAB
              </span>
              <span className="hidden text-[10px] tracking-[0.3em] text-(--color-text-muted) sm:inline">
                / EST. 201X
              </span>
            </Link>
            <WorldLineMeter />
          </div>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="border-t border-(--color-border) bg-(--color-panel)/30">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-[11px] tracking-[0.2em] text-(--color-text-muted)">
            <span>EL PSY KONGROO</span>
            <span className="phosphor-green">{">"} READING_STEINER : ONLINE</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
