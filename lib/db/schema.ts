import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

/**
 * === نماذج البيانات (Data Models) ===
 * جميع الأنواع والواجهات المستخدمة في قاعدة البيانات
 */

// ============== المنتجات ==============
export interface Product {
  id: string;
  code: string; // رمز المنتج/الباركود
  name: string;
  description?: string;
  purchasePrice: number; // سعر الشراء
  salePrice: number; // سعر البيع
  quantity: number; // الكمية الحالية
  minStock: number; // الحد الأدنى للمخزون
  category: string;
  image?: string; // Base64 أو URL
  unit: string; // الوحدة (قطع، كيلو، إلخ)
  barcode?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
  _deleted?: boolean; // للحذف المنطقي
}

// ============== العملاء ==============
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  balance: number; // الرصيد (موجب = دائن، سالب = مدين)
  type: 'retail' | 'wholesale'; // تجزئة أو جملة
  taxId?: string; // الرقم الضريبي
  lastPurchaseDate?: number;
  notes?: string;
  tags: string[]; // لتصنيف العملاء
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
  _deleted?: boolean;
}

// ============== الفواتير ==============
export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number; // خصم على المنتج
  total: number; // (quantity * unitPrice) - discount
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // رقم الفاتورة المتسلسل
  type: 'sale' | 'purchase'; // بيع أو شراء
  customerId?: string; // ID العميل (قد يكون null للزبون النقدي)
  customerName?: string; // اسم العميل أو "زبون نقدي"
  items: InvoiceItem[];
  subtotal: number; // الإجمالي قبل الضريبة
  taxRate: number; // معدل الضريبة (مثل 0.15 للـ 15%)
  taxAmount: number; // مبلغ الضريبة
  discountAmount: number; // خصم على كامل الفاتورة
  total: number; // الإجمالي النهائي
  paymentMethod: 'cash' | 'card' | 'check' | 'transfer' | 'credit';
  paymentStatus: 'paid' | 'pending' | 'partial';
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string;
  attachments?: string[]; // URLs أو base64
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
  _deleted?: boolean;
}

// ============== المصروفات ==============
export interface Expense {
  id: string;
  category: 'rent' | 'utilities' | 'salary' | 'transport' | 'supplies' | 'maintenance' | 'other';
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'check' | 'transfer';
  receiptNumber?: string;
  receiptImage?: string; // Base64 أو URL
  notes?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
  _deleted?: boolean;
}

// ============== حركات المخزون ==============
export interface InventoryMovement {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment'; // دخول أو خروج أو تعديل
  quantity: number;
  reason: 'purchase' | 'sale' | 'return' | 'damage' | 'adjustment' | 'transfer';
  referenceId?: string; // رقم الفاتورة أو الحركة الأصلية
  notes?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
  _deleted?: boolean;
}

// ============== قائمة انتظار المزامنة ==============
export interface SyncQueueItem {
  id: string;
  table: 'products' | 'customers' | 'invoices' | 'expenses' | 'inventory_movements';
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  recordId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  priority: 'low' | 'normal' | 'high';
}

// ============== تسجيل التدقيق ==============
export interface AuditLog {
  id: string;
  userId?: string;
  action: string; // مثل: CREATE_INVOICE, DELETE_PRODUCT
  table: string;
  recordId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
}

// ============== إعدادات التطبيق ==============
export interface AppSettings {
  id: string; // يجب أن يكون دائماً "settings"
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  taxRate: number; // معدل الضريبة الافتراضي
  currency: string; // SAR, USD, إلخ
  theme: 'light' | 'dark' | 'auto';
  language: 'ar' | 'en';
  syncEnabled: boolean;
  autoSyncInterval: number; // بالدقائق
  backupEnabled: boolean;
  backupInterval: number; // بالدقائق
  lastSyncTime?: number;
  lastBackupTime?: number;
  version: string;
}

// ============== فئات المستخدمين ==============
export interface UserRole {
  id: string;
  userId: string;
  role: 'admin' | 'accountant' | 'cashier' | 'manager';
  permissions: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * === فئة قاعدة البيانات الرئيسية ===
 * تعريف جميع الجداول والعلاقات
 */
export class HisabDB extends Dexie {
  // تعريف الجداول
  products!: Table<Product>;
  customers!: Table<Customer>;
  invoices!: Table<Invoice>;
  expenses!: Table<Expense>;
  inventory_movements!: Table<InventoryMovement>;
  sync_queue!: Table<SyncQueueItem>;
  audit_logs!: Table<AuditLog>;
  app_settings!: Table<AppSettings>;
  user_roles!: Table<UserRole>;

  constructor() {
    super('HisabAppDB');
    this.version(1).stores({
      // تعريف الفهارس لتحسين الأداء
      products: '++id, code, category, &code, syncStatus, updatedAt',
      customers: '++id, name, phone, syncStatus, updatedAt',
      invoices: '++id, invoiceNumber, customerId, type, createdAt, syncStatus, updatedAt',
      expenses: '++id, category, createdAt, syncStatus, updatedAt',
      inventory_movements: '++id, productId, type, reason, createdAt, syncStatus',
      sync_queue: '++id, table, recordId, priority, timestamp',
      audit_logs: '++id, userId, action, table, recordId, timestamp',
      app_settings: '&id',
      user_roles: '++id, userId, role',
    });
  }

  /**
   * تهيئة الإعدادات الافتراضية
   */
  async initializeSettings(): Promise<void> {
    const existingSettings = await this.app_settings.get('settings');
    
    if (!existingSettings) {
      await this.app_settings.add({
        id: 'settings',
        companyName: 'شركتي',
        taxRate: 0.15,
        currency: 'SAR',
        theme: 'light',
        language: 'ar',
        syncEnabled: true,
        autoSyncInterval: 5,
        backupEnabled: true,
        backupInterval: 60,
        version: '1.0.0',
      });
    }
  }

  /**
   * مسح قاعدة البيانات بالكامل (للتطوير فقط)
   */
  async clearAllTables(): Promise<void> {
    await Promise.all([
      this.products.clear(),
      this.customers.clear(),
      this.invoices.clear(),
      this.expenses.clear(),
      this.inventory_movements.clear(),
      this.sync_queue.clear(),
      this.audit_logs.clear(),
      this.user_roles.clear(),
    ]);
  }
}

/**
 * === إنشاء مثيل قاعدة البيانات ===
 */
export const db = new HisabDB();

/**
 * === دوال مساعدة عامة ===
 */

/**
 * توليد معرف فريد
 */
export const generateId = (): string => uuidv4();

/**
 * الحصول على الوقت الحالي بالميلي ثانية
 */
export const getCurrentTimestamp = (): number => Date.now();

/**
 * إضافة عنصر إلى قائمة انتظار المزامنة
 * @param table - اسم الجدول
 * @param operation - نوع العملية (CREATE, UPDATE, DELETE)
 * @param recordId - معرف السجل
 * @param data - بيانات السجل
 */
export async function addToSyncQueue(
  table: SyncQueueItem['table'],
  operation: SyncQueueItem['operation'],
  recordId: string,
  data: any,
  priority: SyncQueueItem['priority'] = 'normal'
): Promise<void> {
  try {
    const existingItem = await db.sync_queue
      .where('table')
      .equals(table)
      .and((item) => item.recordId === recordId && item.operation === operation)
      .first();

    if (existingItem) {
      // تحديث العنصر الموجود
      await db.sync_queue.update(existingItem.id, {
        data,
        timestamp: getCurrentTimestamp(),
        retryCount: 0,
      });
    } else {
      // إضافة عنصر جديد
      await db.sync_queue.add({
        id: generateId(),
        table,
        operation,
        recordId,
        data,
        timestamp: getCurrentTimestamp(),
        retryCount: 0,
        priority,
      });
    }
  } catch (error) {
    console.error('❌ خطأ في إضافة السجل إلى قائمة الانتظار:', error);
    throw error;
  }
}

/**
 * تسجيل عملية في سجل التدقيق
 * @param action - نوع العملية
 * @param table - اسم الجدول
 * @param recordId - معرف السجل
 * @param oldValue - القيمة القديمة (اختياري)
 * @param newValue - القيمة الجديدة (اختياري)
 */
export async function logAudit(
  action: string,
  table: string,
  recordId: string,
  oldValue?: any,
  newValue?: any
): Promise<void> {
  try {
    await db.audit_logs.add({
      id: generateId(),
      action,
      table,
      recordId,
      oldValue,
      newValue,
      timestamp: getCurrentTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
  } catch (error) {
    console.error('❌ خطأ في تسجيل التدقيق:', error);
  }
}
