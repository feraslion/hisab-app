'use client';

import React, { FC, useEffect } from 'react';
import { useOfflineSync, SyncEvent } from '@/hooks/useOfflineSync';
import toast from 'react-hot-toast';

/**
 * === مكون عرض حالة المزامنة ===
 * يعرض شريط الحالة مع التقدم والأخطاء
 */

interface SyncStatusProps {
  /**
   * موضع العنصر على الشاشة
   */
  position?: 'top' | 'bottom';

  /**
   * إظهار التفاصيل الكاملة
   */
  showDetails?: boolean;

  /**
   * دالة تُستدعى عند اكتمال المزامنة
   */
  onSyncComplete?: () => void;

  /**
   * دالة تُستدعى عند حدوث خطأ
   */
  onSyncError?: (error: string) => void;
}

const SyncStatus: FC<SyncStatusProps> = ({
  position = 'bottom',
  showDetails = true,
  onSyncComplete,
  onSyncError,
}) => {
  const { syncState, isOnline, performSync } = useOfflineSync({
    onSync: (event: SyncEvent) => {
      switch (event.type) {
        case 'start':
          console.log('🔄 بدأت المزامنة...');
          break;

        case 'progress':
          console.log(`📊 تقدم المزامنة: ${event.state.progress}%`);
          break;

        case 'complete':
          toast.success(
            `✅ اكتملت المزامنة: ${event.state.totalSynced} عملية نجحت${
              event.state.totalFailed > 0 ? `, ${event.state.totalFailed} فشلت` : ''
            }`,
            { duration: 4000 }
          );
          onSyncComplete?.();
          break;

        case 'error':
          toast.error(`❌ خطأ في المزامنة: ${event.state.lastError}`, {
            duration: 4000,
          });
          onSyncError?.(event.state.lastError || 'خطأ غير معروف');
          break;

        case 'conflict':
          toast.error('⚠️ تم اكتشاف تضارب في البيانات تم حله تلقائياً', {
            duration: 4000,
          });
          break;
      }
    },
  });

  // رسالة الحالة
  const getStatusMessage = (): string => {
    if (!isOnline) {
      return '📵 غير متصل بالإنترنت';
    }
    if (syncState.isSyncing) {
      return `🔄 جاري المزامنة... (${syncState.progress}%)`;
    }
    if (syncState.totalQueued > 0) {
      return `⏳ بانتظار المزامنة: ${syncState.totalQueued} عملية`;
    }
    return `✅ متزامن (آخر تحديث: ${syncState.lastSyncTime ? new Date(syncState.lastSyncTime).toLocaleString('ar-SA') : 'لم يتم'})`;
  };

  // لون الخلفية حسب الحالة
  const getBackgroundColor = (): string => {
    if (!isOnline) {
      return 'bg-red-100 border-red-300';
    }
    if (syncState.isSyncing) {
      return 'bg-blue-100 border-blue-300';
    }
    if (syncState.lastError) {
      return 'bg-orange-100 border-orange-300';
    }
    return 'bg-green-100 border-green-300';
  };

  // لون النص حسب الحالة
  const getTextColor = (): string => {
    if (!isOnline) {
      return 'text-red-800';
    }
    if (syncState.isSyncing) {
      return 'text-blue-800';
    }
    if (syncState.lastError) {
      return 'text-orange-800';
    }
    return 'text-green-800';
  };

  return (
    <div
      className={`fixed ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 z-50`}
    >
      <div
        className={`${getBackgroundColor()} border-b ${getTextColor()} px-4 py-3 transition-all duration-300`}
      >
        <div className="max-w-6xl mx-auto">
          {/* الصف الأول: الرسالة الرئيسية */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              {/* أيقونة الحالة */}
              <div className="flex-shrink-0">
                {!isOnline ? (
                  <span className="text-xl">📵</span>
                ) : syncState.isSyncing ? (
                  <span className="text-xl animate-spin">🔄</span>
                ) : syncState.lastError ? (
                  <span className="text-xl">⚠️</span>
                ) : (
                  <span className="text-xl">✅</span>
                )}
              </div>

              {/* الرسالة */}
              <span className="font-semibold text-sm md:text-base">
                {getStatusMessage()}
              </span>

              {/* عدد العمليات المعلقة */}
              {syncState.totalQueued > 0 && (
                <span className="ml-auto bg-white bg-opacity-50 px-2 py-1 rounded text-xs font-mono">
                  {syncState.totalQueued} معلق
                </span>
              )}
            </div>

            {/* زر المزامنة اليدوية */}
            {!isOnline ? null : !syncState.isSyncing ? (
              <button
                onClick={performSync}
                className="ml-4 px-3 py-1 bg-white bg-opacity-70 hover:bg-opacity-100 rounded text-xs font-semibold transition-all"
                title="مزامنة الآن"
              >
                🔄 مزامنة
              </button>
            ) : null}
          </div>

          {/* الصف الثاني: شريط التقدم */}
          {syncState.isSyncing && (
            <div className="mb-2">
              <div className="w-full bg-white bg-opacity-30 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    !isOnline ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${syncState.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* الصف الثالث: التفاصيل (اختياري) */}
          {showDetails && (syncState.totalSynced > 0 || syncState.totalFailed > 0) && (
            <div className="text-xs opacity-75 mt-2">
              <div className="grid grid-cols-3 gap-4">
                {syncState.totalSynced > 0 && (
                  <div>
                    ✅ نجح: <span className="font-mono">{syncState.totalSynced}</span>
                  </div>
                )}
                {syncState.totalFailed > 0 && (
                  <div>
                    ❌ فشل: <span className="font-mono">{syncState.totalFailed}</span>
                  </div>
                )}
                {syncState.totalQueued > 0 && (
                  <div>
                    ⏳ معلق: <span className="font-mono">{syncState.totalQueued}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* رسالة الخطأ */}
          {syncState.lastError && (
            <div className="mt-2 text-xs bg-white bg-opacity-30 p-2 rounded">
              {syncState.lastError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncStatus;
