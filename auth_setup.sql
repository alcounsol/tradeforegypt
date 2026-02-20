-- =====================================================
-- Trade For Egypt - Authentication & Authorization Setup
-- نظام المصادقة والتفويض
-- =====================================================

-- 1. إنشاء نوع بيانات للأدوار (Roles)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'call_center', 'follow_up', 'sales', 'maintenance', 'reception', 'hr', 'finance');
    END IF;
END $$;

-- 2. إنشاء جدول ملفات تعريف المستخدمين
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'call_center',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. تفعيل حماية مستوى الصف (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;

-- 5. سياسات الوصول (Policies)
-- السماح للمستخدمين برؤية ملفاتهم الشخصية فقط
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = id);

-- السماح للمسؤولين (Admin) برؤية كل الملفات
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- السماح للمسؤولين بتحديث الملفات
CREATE POLICY "Admins can update all profiles" 
ON public.user_profiles FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- السماح للمسؤولين بحذف الملفات
CREATE POLICY "Admins can delete profiles" 
ON public.user_profiles FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 6. دالة (Function) لإنشاء ملف تعريف تلقائياً عند تسجيل مستخدم جديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'call_center');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger لتشغيل الدالة عند إنشاء مستخدم في auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. دالة للتحقق من دور المستخدم
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
DECLARE
    user_role_value user_role;
BEGIN
    SELECT role INTO user_role_value
    FROM public.user_profiles
    WHERE id = auth.uid();
    RETURN COALESCE(user_role_value, 'call_center');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);

-- 10. تحديث جداول العمليات لربطها بـ user_profiles
-- إضافة عمود user_id إلى جدول employees إذا لم يكن موجوداً
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- 11. إضافة سياسات RLS على جداول العمليات
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_receipts ENABLE ROW LEVEL SECURITY;

-- سياسات للموظفين في الكول سنتر: يرون فقط سجلاتهم الخاصة
DROP POLICY IF EXISTS "Call center can view own records" ON call_records;
CREATE POLICY "Call center can view own records" 
ON call_records FOR SELECT 
USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
    OR employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Call center can insert own records" ON call_records;
CREATE POLICY "Call center can insert own records" 
ON call_records FOR INSERT 
WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
    OR (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

-- سياسات مماثلة للمتابعات
DROP POLICY IF EXISTS "Follow up can view own records" ON follow_ups;
CREATE POLICY "Follow up can view own records" 
ON follow_ups FOR SELECT 
USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
    OR employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Follow up can insert own records" ON follow_ups;
CREATE POLICY "Follow up can insert own records" 
ON follow_ups FOR INSERT 
WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
    OR (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

-- سياسات مماثلة للمبيعات
DROP POLICY IF EXISTS "Sales can view own records" ON sales_activities;
CREATE POLICY "Sales can view own records" 
ON sales_activities FOR SELECT 
USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
    OR employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Sales can insert own records" ON sales_activities;
CREATE POLICY "Sales can insert own records" 
ON sales_activities FOR INSERT 
WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
    OR (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

-- سياسات مماثلة لاستقبال الأجهزة
DROP POLICY IF EXISTS "Reception can view own records" ON device_receipts;
CREATE POLICY "Reception can view own records" 
ON device_receipts FOR SELECT 
USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
    OR received_by = (SELECT id FROM employees WHERE user_id = auth.uid())
    OR delivered_by = (SELECT id FROM employees WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Reception can insert own records" ON device_receipts;
CREATE POLICY "Reception can insert own records" 
ON device_receipts FOR INSERT 
WITH CHECK (
    received_by = (SELECT id FROM employees WHERE user_id = auth.uid())
    OR (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

-- 12. السماح للمسؤول برؤية كل شيء
DROP POLICY IF EXISTS "Admin can view all call records" ON call_records;
CREATE POLICY "Admin can view all call records" 
ON call_records FOR ALL 
USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admin can view all follow ups" ON follow_ups;
CREATE POLICY "Admin can view all follow ups" 
ON follow_ups FOR ALL 
USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admin can view all sales" ON sales_activities;
CREATE POLICY "Admin can view all sales" 
ON sales_activities FOR ALL 
USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admin can view all devices" ON device_receipts;
CREATE POLICY "Admin can view all devices" 
ON device_receipts FOR ALL 
USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');
