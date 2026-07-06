import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fairway Stats HQ",
  description: "Multi-team golf performance tracking for high school programs."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
