import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileNav from "@/components/layout/MobileNav";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Nightshift | The Kinetic Observer",
  description:
    "Autonomous AI customer discovery engine. Configure, sleep, wake up to insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface font-body transition-colors duration-300">
        <ThemeProvider>
          <Sidebar />
          <MobileHeader />
          <main className="lg:ml-64 min-h-screen pb-24 lg:pb-12">
            {children}
          </main>
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
