import type { Metadata } from 'next';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@astryxdesign/theme-neutral/fonts.css';
import './globals.css';
import { AdminShell } from '@/components/AdminShell';

export const metadata: Metadata = {
  title: 'CivicLaw Admin - Cổng Quản Trị Trợ Lý Pháp Lý AI',
  description: 'Cổng quản trị trung tâm CivicLaw AI - Giám sát Gateway, tra cứu kho luật 4.715 chunks, kiểm soát khoảng trống tri thức.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
