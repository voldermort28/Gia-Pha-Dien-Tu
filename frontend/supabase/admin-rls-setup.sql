-- ============================================================
-- 🌳 Gia Phả Điện Tử — Admin RLS Setup (Phase 1)
-- ============================================================
-- Mục đích: Cập nhật Row Level Security (RLS) cho phép 'admin' và 'manager'
-- thực hiện các thao tác Thêm, Sửa, Xóa trên cây phả hệ (bảng people & families).

BEGIN;

-- 1. Cập nhật Constraint của Role trong bảng Profiles để hỗ trợ 'manager' (Nếu cần)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'viewer'));

-- 2. Cập nhật Constraint của Role trong bảng Invite Links để hỗ trợ 'manager' (Nếu cần)
ALTER TABLE public.invite_links DROP CONSTRAINT IF EXISTS invite_links_role_check;
ALTER TABLE public.invite_links ADD CONSTRAINT invite_links_role_check CHECK (role IN ('admin', 'manager', 'viewer'));


-- ============================================================
-- CHÍNH SÁCH RLS CHO BẢNG PEOPLE
-- ============================================================

-- Xóa các policy cũ liên quan đến thao tác ghi (nếu có)
DROP POLICY IF EXISTS "authenticated can update people" ON public.people;
DROP POLICY IF EXISTS "authenticated can insert people" ON public.people;
DROP POLICY IF EXISTS "admin can delete people" ON public.people;

-- Chính sách mới: Chỉ Admin và Manager được INSERT
CREATE POLICY "admin_manager_insert_people"
ON public.people
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Chính sách mới: Chỉ Admin và Manager được UPDATE
CREATE POLICY "admin_manager_update_people"
ON public.people
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Chính sách mới: Chỉ Admin được phép DELETE (Bảo vệ dữ liệu nghiêm ngặt)
CREATE POLICY "admin_delete_people"
ON public.people
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================================
-- CHÍNH SÁCH RLS CHO BẢNG FAMILIES
-- ============================================================

-- Xóa các policy cũ liên quan đến thao tác ghi (nếu có)
DROP POLICY IF EXISTS "authenticated can update families" ON public.families;
DROP POLICY IF EXISTS "authenticated can insert families" ON public.families;
DROP POLICY IF EXISTS "admin can delete families" ON public.families;

-- Chính sách mới: Chỉ Admin và Manager được INSERT Family
CREATE POLICY "admin_manager_insert_families"
ON public.families
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Chính sách mới: Chỉ Admin và Manager được UPDATE Family
CREATE POLICY "admin_manager_update_families"
ON public.families
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Chính sách mới: Chỉ Admin được phép DELETE Family
CREATE POLICY "admin_delete_families"
ON public.families
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);


COMMIT;
-- ============================================================
-- END SCRIPT
-- ============================================================
