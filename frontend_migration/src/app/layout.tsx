import type { Metadata } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const jua = Jua({
  variable: "--font-jua",
  weight: "400",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "로디",
    template: "%s | 로디",
  },
  description: "노인·고령층을 위한 법률·복지 상담 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${jua.variable} ${notoSansKr.variable} h-full bg-background`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
