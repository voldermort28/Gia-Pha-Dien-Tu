# Phase 04: Sự kiện & Ngày Giỗ
Status: ⬜ Pending
Dependencies: None

## Objective
Tạo phân hệ quản lý các Sự kiện của dòng họ (vd: Ngày giỗ tổ, Họp mặt năm mới) và tính năng tự động nhắc/tính Ngày Giỗ cho các thành viên đã mất, dựa trên dữ liệu `death_date` (Âm/Dương lịch) từ DB nhánh `giapha-os`.

## Requirements
### Functional
- [ ] Bảng điều khiển Liệt kê các Sự kiện sắp tới (Events Dashboard).
- [ ] Logic chuyển đổi ngày Dương Lịch (nêu có) sang Âm Lịch cho các Ngày Giỗ.
- [ ] Tính năng đánh dấu/lưu ngày Giỗ của một thành viên cụ thể.

### Non-Functional
- [ ] (Tuỳ chọn) Đóng gói lịch thành Modal riêng hoặc nhúng vào Footer của Sơ đồ Cây.

## Implementation Steps
1. [ ] Cập nhật Database Schema (nếu cần bổ sung bảng `events`).
2. [ ] Viết API truy vấn Sự kiện sắp diễn ra trong tháng/quý.
3. [ ] Viết hàm tính ngày giỗ (lấy ngày mất + lặp lại hàng năm theo Âm Lịch).
4. [ ] Xây dựng UI danh sách sự kiện trên màn hình chính hoặc màn hình Sơ đồ Cây.

## Files to Create/Modify
- `src/lib/lunar-calendar.ts` (Thư viện Date Âm lịch)
- `src/components/tree/EventsModal.tsx` (New)

---
Next Phase: N/A
