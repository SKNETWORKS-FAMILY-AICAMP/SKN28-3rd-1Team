import { Jua, Noto_Sans_KR } from "next/font/google";

const headingFont = Jua({
  variable: "--font-jua",
  weight: "400",
  subsets: ["latin"],
});

const sansFont = Noto_Sans_KR({
  variable: "--font-noto-kr",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const themeFontClassName = `${headingFont.variable} ${sansFont.variable}`;
