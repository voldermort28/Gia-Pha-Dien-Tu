# Phase 01: Cấu trúc Layout Responsive & Cây Gia Phả
Status: ✅ Complete
Dependencies: None

## Objective
Xây dựng khung Layout chuẩn tương thích tốt với các thiết bị di động (Responsive), tái cấu trúc AppBar, Sidebar Mobile (nếu cần) và tinh chỉnh thuật toán Zoom/Pan cho Sơ đồ Cây Phả hệ.

## Requirements
### Functional
- [x] Navbar hỗ trợ Mobile Menu (Hamburger icon).
- [x] Màn hình Sơ đồ Cây tự động ẩn / thu gọn các công cụ phụ trên Mobile để tối ưu diện tích.
- [x] Cây Gia phả khi zoom / kéo (pan) bằng cảm ứng ngón tay trên mobile phải mượt mà.

### Non-Functional
- [x] Tái sử dụng tối đa code cũ, không làm break luồng logic `tree-layout.ts`.
- [x] CSS phải sử dụng Tailwind classes với prefix `sm:`, `md:`, `lg:` để đảm bảo responsive.

## Implementation Steps
1. [x] Cập nhật `Navbar` component, thêm Mobile menu toggle.
2. [x] Sửa đổi container của trang `/tree` để full-width/height trên mobile, ẩn scrollbar trình duyệt.
3. [x] Tích hợp tính năng chạm đa điểm (multi-touch) cho `TransformWrapper` (thư viện react-zoom-pan-pinch đang dùng) nếu chưa được tối ưu.
4. [x] Viết lại `TreeNodeCard` để hiển thị thu gọn (compact mode) trên điện thoại (vd: font chữ nhỏ hơn, avatar nhỏ hơn).

## Files to Create/Modify
- `src/components/Navbar.tsx` - Responsive menu.
- `src/app/(main)/tree/page.tsx` - Container layout.
- `src/app/(main)/tree/tree-client.tsx` - Zoom/Pan config & Mobile toolbars.

## Notes
- Các modal đã được làm responsive ở Phase trước nên có thể bỏ qua.
- Trọng tâm nằm ở Tree container.
