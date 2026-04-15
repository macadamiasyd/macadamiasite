import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Macadamia — Website & Software Development, Sydney",
  description:
    "Independent web and software development studio based in Sydney. Fifteen years of building for architects, designers, creative agencies, and more.",
  openGraph: {
    title: "Macadamia — Website & Software Development, Sydney",
    description:
      "Independent web and software development studio based in Sydney.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
