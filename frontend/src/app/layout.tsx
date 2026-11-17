import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"], // 300: dashboard headline numerals only
});

export const metadata: Metadata = {
  title: "The Intelligence Layer for Google Ads · DigitalMantra",
  description:
    "An intelligence layer for Google Ads from DigitalMantra. Three specialised agents report on performance, diagnose causes and surface what needs attention.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
