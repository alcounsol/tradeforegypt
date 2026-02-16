-- =====================================================
-- Trade For Egypt - Database Migration
-- تعديل قاعدة البيانات لدعم النظام الجديد
-- =====================================================

-- 1. تعديل جدول الموظفين - إضافة أعمدة جديدة
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'general';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. تعديل جدول العملاء - إضافة أعمدة جديدة
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'individual' CHECK (customer_type IN ('individual', 'company'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'maintenance' CHECK (request_type IN ('maintenance', 'supply', 'both'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS device_brand TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fault_description TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS supply_details TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'follow_up', 'device_received', 'in_repair', 'completed', 'delivered'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_call_center_employee INTEGER REFERENCES employees(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_follow_up_employee INTEGER REFERENCES employees(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_sales_employee INTEGER REFERENCES employees(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'call_center';

-- 3. إنشاء جدول سجلات المكالمات (الكول سنتر)
CREATE TABLE IF NOT EXISTS call_records (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id),
  call_type TEXT DEFAULT 'incoming' CHECK (call_type IN ('incoming', 'outgoing')),
  call_purpose TEXT DEFAULT 'registration' CHECK (call_purpose IN ('registration', 'follow_up', 'sales', 'complaint', 'inquiry')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  customer_type TEXT DEFAULT 'individual' CHECK (customer_type IN ('individual', 'company')),
  request_type TEXT DEFAULT 'maintenance' CHECK (request_type IN ('maintenance', 'supply', 'both')),
  device_brand TEXT,
  device_name TEXT,
  device_type TEXT,
  fault_description TEXT,
  supply_details TEXT,
  notes TEXT,
  call_outcome TEXT,
  call_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. إنشاء جدول المتابعات
CREATE TABLE IF NOT EXISTS follow_ups (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id),
  follow_up_type TEXT DEFAULT 'call' CHECK (follow_up_type IN ('call', 'visit', 'message')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'no_answer', 'rescheduled', 'device_sent')),
  notes TEXT,
  result TEXT,
  next_follow_up_date DATE,
  follow_up_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. إنشاء جدول عمليات السيلز
CREATE TABLE IF NOT EXISTS sales_activities (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id),
  activity_type TEXT DEFAULT 'call' CHECK (activity_type IN ('call', 'visit', 'presentation', 'offer')),
  service_offered TEXT CHECK (service_offered IN ('maintenance', 'supply', 'sales', 'exchange')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'interested', 'negotiating', 'closed_won', 'closed_lost')),
  offered_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  result TEXT,
  next_action_date DATE,
  activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. إنشاء جدول الحوافز
CREATE TABLE IF NOT EXISTS incentives (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  incentive_type TEXT NOT NULL CHECK (incentive_type IN ('customer_visit', 'data_entry', 'device_pickup', 'sales_commission', 'bonus')),
  amount NUMERIC(12,2) NOT NULL,
  reference_id INTEGER,
  reference_type TEXT,
  description TEXT,
  incentive_date DATE DEFAULT CURRENT_DATE,
  period_month INTEGER,
  period_year INTEGER,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. إنشاء جدول استلام الأجهزة
CREATE TABLE IF NOT EXISTS device_receipts (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  received_by INTEGER REFERENCES employees(id),
  delivered_by INTEGER REFERENCES employees(id),
  device_brand TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT,
  device_model TEXT,
  serial_number TEXT,
  condition_notes TEXT,
  fault_description TEXT,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'in_diagnosis', 'in_repair', 'repaired', 'delivered_to_customer', 'returned')),
  receipt_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. إنشاء جدول قطع الغيار المستخدمة للعملاء
CREATE TABLE IF NOT EXISTS service_parts (
  id SERIAL PRIMARY KEY,
  service_record_id INTEGER REFERENCES service_records(id) ON DELETE CASCADE,
  device_receipt_id INTEGER REFERENCES device_receipts(id),
  inventory_item_id INTEGER REFERENCES inventory_items(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(12,2),
  total_cost NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_call_records_employee ON call_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_call_records_customer ON call_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_records_date ON call_records(call_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_employee ON follow_ups(employee_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_sales_activities_employee ON sales_activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_customer ON sales_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_incentives_employee ON incentives(employee_id);
CREATE INDEX IF NOT EXISTS idx_incentives_date ON incentives(incentive_date);
CREATE INDEX IF NOT EXISTS idx_device_receipts_customer ON device_receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_device_receipts_status ON device_receipts(status);
CREATE INDEX IF NOT EXISTS idx_service_parts_inventory ON service_parts(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- 10. تفعيل RLS (Row Level Security) على الجداول الجديدة
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_parts ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الوصول العامة
CREATE POLICY "Allow all for call_records" ON call_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for follow_ups" ON follow_ups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for sales_activities" ON sales_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for incentives" ON incentives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for device_receipts" ON device_receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service_parts" ON service_parts FOR ALL USING (true) WITH CHECK (true);

-- 11. دالة لخصم المخزون تلقائياً عند استخدام قطعة غيار
CREATE OR REPLACE FUNCTION deduct_inventory_on_service_part()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory_items 
  SET current_stock = current_stock - NEW.quantity 
  WHERE id = NEW.inventory_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger لخصم المخزون
DROP TRIGGER IF EXISTS trigger_deduct_inventory ON service_parts;
CREATE TRIGGER trigger_deduct_inventory
  AFTER INSERT ON service_parts
  FOR EACH ROW
  EXECUTE FUNCTION deduct_inventory_on_service_part();

-- 12. دالة لإضافة المخزون تلقائياً عند إضافة مشتريات
CREATE OR REPLACE FUNCTION add_inventory_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory_items 
  SET current_stock = current_stock + NEW.quantity 
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger لإضافة المخزون
DROP TRIGGER IF EXISTS trigger_add_inventory ON purchases;
CREATE TRIGGER trigger_add_inventory
  AFTER INSERT ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION add_inventory_on_purchase();
