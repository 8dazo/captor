import type { ReactNode } from "react";

export const metadata = {
  title: "Captar Control Plane",
  description: "Local control-plane dashboard for Captar sessions, policies, and events.",
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
