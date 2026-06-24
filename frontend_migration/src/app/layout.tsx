import type { Metadata } from "next";
import { themeFontClassName } from "@/ui/theme/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "로디",
    template: "%s | 로디",
  },
  description: "노인·고령층을 위한 법률·복지 상담 서비스",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${themeFontClassName} h-full bg-background`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
