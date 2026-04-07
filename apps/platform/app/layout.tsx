import "./globals.css";

import type { ReactNode } from "react";

export const metadata = {
  title: "Captar Platform",
  description: "Authenticated hook-connected control plane for Captar.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
