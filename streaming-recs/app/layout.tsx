import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Streaming Recs",
  description:
    "Personal cross-platform streaming recommendations from your own taste list.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
