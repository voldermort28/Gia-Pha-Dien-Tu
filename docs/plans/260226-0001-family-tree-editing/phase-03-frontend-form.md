# Phase 03: Thiết Kế UI Chỉnh Sửa Dữ Liệu
Status: ✅ Completed
Dependencies: phase-02

## Objective
Tích hợp các form (với Shadcn Form/React-Hook-Form/Zod) lên Tree UI hoặc trang `/people` cho phép Admin bấm vào thêm, sửa node trực quan.

## Requirements
### Functional
- [x] **Thêm thành viên con/vợ/chồng**: Nút action tại mỗi thẻ Node trên sơ đồ `<TreeLayout/>` hoặc trang `/people/[handle]`.
- [x] **Modal hiển thị chi tiết (`MemberDetailModal`)**: Modal hiển thị tab/overview thông tin, kèm nút "Chỉnh sửa" cho Admin.
- [x] **Form Thêm/Sửa Thành Viên (`MemberForm`)**: Học theo thiết kế từ `giapha-os`:
    - Dùng `framer-motion` cho animation mượt mà.
    - Chia form thành 2 khối rõ rệt: **Thông tin chung** (Tên, Năm Sinh, Giới tính, Quê quán, Ảnh đại diện...) và **Thông tin riêng tư** (Khóa bảo mật: SDT, Nghề nghiệp, Nơi ở hiện tại - Chỉ hiển thị khung này cho Edit mode/Admin Role).
    - Có upload Ảnh đại diện trực quan.
    - Group các trường ngày tháng năm sinh/mất logic (khi check "Đã qua đời" mới hiện form nhập ngày mất).
- [x] **Trang Quản lý Người Dùng (`/dashboard/users`)**: 
    - Chỉ cho phép Admin truy cập.
    - Hiển thị danh sách users từ bảng `profiles`.
    - Cho phép Admin thay đổi `role` của các thành viên khác thành `manager` hoặc `viewer`.

## Implementation Steps
1. [x] Xây dựng Component `<MemberDetailModal />` (Thay thế/Nâng cấp UI xem chi tiết hiện tại).
2. [x] Xây dựng Component `<MemberForm />` (Form React Hook Form + Zod xịn xò như `giapha-os`).
3. [x] Tích hợp Sever Actions thêm/sửa vào form.
4. [x] Cập nhật File `frontend/src/app/(main)/people/[handle]/page.tsx` và `tree-client.tsx` để có mở Modal này nếu User Role == 'admin' | 'manager'.
5. [x] Tạo trang `/admin/users` (hoặc page tương đương) quản trị Users (Server Actions `updateUserRole`).

---
Next Phase: phase-04
