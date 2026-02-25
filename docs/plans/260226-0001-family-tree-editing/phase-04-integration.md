# Phase 04: Cập Nhật Client Logic & Tích Hợp Sơ Đồ
Status: ⬜ Pending
Dependencies: phase-03

## Objective
Hoàn thiện luồng dữ liệu từ Form (Modal) -> Server Action -> Database -> State -> UI (Tree & Directory).

## Requirements
### Functional
- [ ] Xử lý logic Re-fetch danh sách `people` khi edit xong 1 người.
- [ ] Đảm bảo thư viện React Flow (sơ đồ cây gia phả) cập nhật ngay lập tức nếu dữ liệu gia đình liên quan thay đổi.
- [ ] Thiết lập thông báo trạng thái Toast (Thành công / Thất bại).

## Implementation Steps
1. [ ] Wrap hàm mutation bằng React Query hoặc dùng `router.refresh()` của Next.js (App Router).
2. [ ] Test toàn bộ thao tác thêm mới người -> tạo family liên kết -> hiển thị trên tree.

---
