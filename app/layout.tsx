import './globals.css';
import SyncProvider from '@/components/SyncProvider';
import Link from 'next/link';

export const metadata = {
  title: 'HisabApp',
  description: 'تطبيق محاسبة Offline'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <SyncProvider>
          <nav className="flex gap-4 bg-white px-4 py-3 shadow-sm">
            <Link href="/" className="font-bold">الرئيسية</Link>
            <Link href="/products">المنتجات</Link>
            <Link href="/customers">العملاء</Link>
            <Link href="/invoices/create">فاتورة جديدة</Link>
            <Link href="/invoices">الفواتير</Link>
          </nav>
          <div className="mx-auto max-w-6xl">{children}</div>
        </SyncProvider>
      </body>
    </html>
  );
}
