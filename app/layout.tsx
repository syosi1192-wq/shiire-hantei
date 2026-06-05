import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "仕入れ判定サポート",
  description: "メルカリ転売の仕入れ判定を素早く行うためのサポートツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-black text-stone-900 min-h-screen">{children}</body>
    </html>
  );
}
