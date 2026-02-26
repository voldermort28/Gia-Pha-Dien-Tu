# Phase 03: Công cụ Tiện ích (Tìm Danh Xưng & Thống Kê)
Status: ⬜ Pending
Dependencies: None

## Objective
Mở rộng chức năng cho trang Sơ đồ Cây bằng cách bổ sung các Sidebar / Modal tiện ích để tính toán Cách xưng hô (Danh Xưng) giữa 2 người và xem Thống kê tổng quan dòng họ, tương tự các Sidebar công cụ có sẵn trong `giapha-os`.

## Requirements
### Functional
- [ ] Tính năng Tìm Danh Xưng (Kinship): Modal cho phép chọn Người A và Người B, tự động tính ra Người A gọi Người B là gì (Bác, Chú, Cậu, Dì, Cô, Thím...) dựa vào `generation` và quan hệ huyết thống.
- [ ] Tính năng Thống Kê (Stats): Modal hoặc Panel hiển thị Biểu đồ tròn/cột phân loại Nam/Nữ, Thành viên/Dâu Rể, Còn Sống/Đã Mất, và phân bổ Độ tuổi/Thế hệ.

### Non-Functional
- [ ] Thiết kế Modal/Panel phải tuân thủ layout Responsive, dễ bấm trên mobile.
- [ ] Không fetch API mới mà sử dụng lại state `treeData.people` đã load từ đầu để tăng phản hồi tức thì.

## Implementation Steps
1. [ ] Viết hàm tính toán Danh xưng `calculateKinship(personA, personB, treeData)` dựa theo logic phả hệ Việt Nam.
2. [ ] Thiết kế form chọn 2 người (Combobox có search) trong `KinshipModal.tsx`.
3. [ ] Cài đặt thư viện vẽ biểu đồ (`recharts` hoặc `chart.js`).
4. [ ] Thiết kế `StatsModal.tsx` tính toán và vẽ các biểu đồ dựa trên `treeData`.
5. [ ] Tích hợp 2 công cụ này vào Floating Action Button (hoặc Header Menu) trên trang `/tree`.

## Files to Create/Modify
- `src/lib/kinship.ts` (New)
- `src/components/tree/KinshipModal.tsx` (New)
- `src/components/tree/StatsModal.tsx` (New)
- `src/app/(main)/tree/tree-client.tsx` - Thêm nút gọi Modal.

---
Next Phase: phase-04-events.md
