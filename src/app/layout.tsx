import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const pixel = VT323({ variable: "--font-pixel", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "krillion leaderboard",
  description: "daily and overall krillion scores for the crew.",
};

// Make Clerk's own widgets (account menu, "manage account" window) match the site.
// Uses the same CSS variables as globals.css, so light/dark mode follow automatically.
const clerkAppearance = {
  variables: {
    colorPrimary: "var(--accent)",
    colorPrimaryForeground: "#ffffff",
    colorDanger: "var(--accent)",
    colorBackground: "var(--card)",
    colorForeground: "var(--foreground)",
    colorMuted: "var(--background)",
    colorMutedForeground: "var(--muted)",
    colorInput: "var(--background)",
    colorInputForeground: "var(--foreground)",
    colorNeutral: "var(--foreground)",
    colorBorder: "var(--line)",
    colorRing: "var(--accent)",
    colorModalBackdrop: "rgba(0, 0, 0, 0.6)",
    fontFamily: "var(--font-pixel), ui-monospace, monospace",
    fontSize: "18px",
    borderRadius: "0px",
  },
  elements: {
    cardBox: { border: "1px solid var(--line)", boxShadow: "none" },
    footer: { background: "var(--card)" },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" className={pixel.variable}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
