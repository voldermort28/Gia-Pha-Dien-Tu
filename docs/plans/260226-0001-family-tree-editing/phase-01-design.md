# Phase 01: Thiết kế & Cấu hình Phân quyền (RLS)
Status: ✅ Complete
Dependencies: None

## Objective
Thiết lập các chính sách bảo mật tầng Row Level Security (RLS) của Supabase để đảm bảo chỉ Admin (và Manager - nếu có) mới có quyền `INSERT`, `UPDATE`, `DELETE` trên bảng `people` và `families`.

## Requirements
### Functional
- [ ] Xác định Role "Manager" (hiện tại schema chỉ có 'admin', 'viewer'). Có thể mở rộng profile role hoặc tạo group quản lý.
- [ ] Viết RLS policy cho bảng `people`: Admin có toàn quyền.
- [ ] Viết RLS policy cho bảng `families`: Admin có toàn quyền.

### Non-Functional
- [ ] Security: Chặn hoàn toàn quyền ghi từ viewer hoặc guest (anon).

## Implementation Steps
1. [ ] Cập nhật bảng `profiles` nếu cần thêm role `manager`.
2. [ ] Áp dụng các Policy (Sẽ được viết thành file script sql).

## Files to Create/Modify
- `frontend/supabase/admin-rls-setup.sql` - Script tạo chính sách bảo mật.

---
Next Phase: phase-02-api
