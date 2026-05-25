import type { Metadata } from "next";
import { ReduxProvider } from "@/store/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Run-to-Own | Gamified Strava Fitness",
  description: "Every run expands your kingdom. Blaze paths, conquer tiles, and build your empire.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
