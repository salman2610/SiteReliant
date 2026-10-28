import type { Metadata } from 'next';
import Link from 'next/link';
import { DashboardShell } from '../components/DashboardShell';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'SiteReliant · Website Operations Platform for Agencies',
  description: 'Detect, Diagnose, and Verify. Multi-tenant website monitoring SaaS for web agencies.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DashboardShell>
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}
