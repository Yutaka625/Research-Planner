import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "心sensor Research Planner",
  description: "表情特徴データを活用した研究計画のたたき台を生成します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
