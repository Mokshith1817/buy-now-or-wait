import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "కొనాలా? ఆగాలా? (Buy Now or Wait) - Vegetable Price Forecast",
  description:
    "Vegetable price forecast and purchase advice for ordinary families, homemakers, and students in simple Telugu and English.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="te">
      <body>
        <main className="app-container">{children}</main>
      </body>
    </html>
  );
}
