import "./globals.css";

import type { ReactNode } from "react";

export const metadata = {
  title: "Captar Docs",
  description: "Runtime control for AI calls.",
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
