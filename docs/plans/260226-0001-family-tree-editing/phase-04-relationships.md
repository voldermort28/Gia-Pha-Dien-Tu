# Phase 04: Relationship Management & Inline Creation
Status: 🟡 In Progress
Dependencies: Phase 03

## Objective
Cho phép người dùng quản lý trọn vẹn mối quan hệ gia đình ngay trong Modal chi tiết:
1. Xóa mối quan hệ (Bố/Mẹ, Vợ/Chồng, Con cái).
2. Tạo nhanh thành viên mới tinh khi bấm "Thêm Con" hoặc "Thêm Vợ/Chồng".

## Requirements
### Functional
- [x] Thêm nút ❌ (Xóa) cạnh tên người thân trong phần "Gia đình" của `MemberDetailModal` (chỉ hiện trong Edit Mode).
- [x] Xử lý logic Unlink (Xóa quan hệ) ở Client-side Supabase:
  - Nếu xóa Parent: Xóa family ID khỏi `parent_families` của Child.
  - Nếu xóa Child: Xóa Child ID khỏi `children` list của Family.
  - Nếu xóa Spouse: Cập nhật `father_handle` hoặc `mother_handle` thành null trong Family.
- [x] Tích hợp `MemberForm` (Rút gọn hoặc đầy đủ) vào Section "Tạo thành viên mới tinh" trong `RelativeFormModal`.
- [x] Khi tạo thành công, tự động lấy `handle` mới và chạy hàm `handleLinkExisting` để nối quan hệ ngay lập tức.
