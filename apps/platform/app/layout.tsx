import type { ReactNode } from "react";

export const metadata = {
  title: "Captar Platform Stub",
  description: "Thin ingest and local event inspection for Captar v1.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: '"SF Pro Text", "Segoe UI", sans-serif',
          background: "#0e1726",
          color: "#f3f4f6",
        }}
      >
        {children}
      </body>
    </html>
  );
}
