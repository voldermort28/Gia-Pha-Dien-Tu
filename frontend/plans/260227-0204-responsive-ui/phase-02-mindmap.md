# Phase 02: Tích hợp Sơ đồ Tư duy (React Flow Mindmap)
Status: ⬜ Pending
Dependencies: phase-01

## Objective
Thêm tuỳ chọn xem Gia phả dưới dạng Mindmap (Mạng nhện/Rễ cây) sử dụng thư viện `reactflow` tương tự `giapha-os`, giúp quan sát tổng thể các mối quan hệ đa chiều dễ dàng hơn so với dạng Cây dọc truyền thống.

## Requirements
### Functional
- [ ] Thêm Toggle/Tab để chuyển đổi giữa biểu đồ "Cây Gia Phả" và "Sơ đồ Tư duy".
- [ ] Render các thành viên dòng họ thành các Node (Custom Node) của React Flow.
- [ ] Render các mối quan hệ Vợ/Chồng, Cha/Con thành các Edge (đường nối) với màu sắc/nét đứt phân biệt.
- [ ] Hỗ trợ mini-map (bản đồ thu nhỏ) góc dưới màn hình.

### Non-Functional
- [ ] Mindmap phải tái sử dụng cấu trúc DB trung tâm (`people`, `families`).
- [ ] Hiệu năng tốt cho dòng họ có > 500 thành viên (tối ưu render).

## Implementation Steps
1. [ ] Install package `reactflow` (nếu chưa có).
2. [ ] Viết hàm mapper `treeDataToFlowNodesAndEdges(treeData)` để chuyển data sang định dạng React Flow.
3. [ ] Tạo custom node component `MemberFlowNode.tsx` có giao diện tương đồng thẻ bài.
4. [ ] Khởi tạo màn hình `MindmapView` và ghép vào trang `/tree`.

## Files to Create/Modify
- `src/components/tree/MindmapView.tsx` (New)
- `src/components/tree/MemberFlowNode.tsx` (New)
- `src/app/(main)/tree/page.tsx` - Layout switch.
- `package.json` - dependencies.

---
Next Phase: phase-03-features.md
