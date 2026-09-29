import type { Metadata } from "next";
import { Oswald } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "NexoManga",
  description: "Lee, publica y traduce manga, manhwa y comics.",
};

const oswald = Oswald({
  variable: "--font-oswald",
  display: "swap",
  subsets: ["latin"],
});

// marco de toda la app: tipografía Oswald y los avisos (toasts)
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${oswald.className} antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
