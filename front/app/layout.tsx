import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TEXT } from "@/constants/text";
import { Providers } from './providers';
// import { NavBar } from "../components";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: TEXT.metadata.title,
  description: TEXT.metadata.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={TEXT.metadata.lang}>
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {/* <NavBar /> */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
