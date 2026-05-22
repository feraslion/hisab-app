'use client';
import { useEffect, useState } from 'react';
import { fullSync, isOnline } from '@/lib/sync/sync';
import { seedIfEmpty } from '@/lib/db/seed';

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    seedIfEmpty();
    setOnline(isOnline());
    const on = () => { setOnline(true); fullSync().catch(() => {}); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const id = setInterval(() => isOnline() && fullSync().catch(() => {}), 60000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <div className={`fixed top-2 left-2 z-50 rounded px-3 py-1 text-xs text-white ${online ? 'bg-green-600' : 'bg-gray-600'}`}>
        {online ? 'متصل' : 'غير متصل'}
      </div>
      {children}
    </>
  );
}
