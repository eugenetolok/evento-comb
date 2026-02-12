import React from 'react';
import { siteConfig } from '@/config/site';
import { Navbar } from '@/components/navbar';
import "@/styles/globals.css";
import { AppProvider } from './context';

export const metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

function RootLayout({ children }: any) {
  return (
    <AppProvider>
      <div className="relative flex flex-col h-screen">
        <Navbar />
        <main className="container mx-auto max-w-7xl pt-5 px-3 flex-grow">
          {children}
        </main>
        <footer className="w-full flex items-center justify-center py-3">
        </footer>
      </div>
    </AppProvider>
  );
}

export default RootLayout;
