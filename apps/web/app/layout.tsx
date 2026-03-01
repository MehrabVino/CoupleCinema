import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoupleCinema",
  description: "Watch videos together with synced playback, chat, and live calls."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

