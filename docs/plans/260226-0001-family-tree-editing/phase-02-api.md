# Phase 02: Xây Dựng Server Actions & API Supabase
Status: ✅ Complete
Dependencies: phase-01

## Objective
Viết các function an toàn thao tác trực tiếp với dữ liệu `people` và `families` để phục vụ cho Client UI. Server Actions của Next.js sẽ giao tiếp với Supabase.

## Requirements
### Functional
- [ ] Hàm `upsertPerson(data)`: Tạo mới hoặc cập nhật thông tin thành viên.
- [ ] Hàm `upsertFamily(data)`: Tạo mới hoặc liên kết cha/mẹ/con cái.
- [ ] Hàm `deletePerson(handle)` và `deleteFamily(handle)` cùng logic xử lý khóa ngoại/xóa mồ côi (nếu cần thiết).
- [ ] Tích hợp revalidatePath() để UI Next.js update real-time khi DB thay đổi.

## Implementation Steps
1. [ ] Tạo file `frontend/src/app/actions/people.ts` chứa logic chỉnh sửa person.
2. [ ] Tạo file `frontend/src/app/actions/families.ts` chứa logic điều chỉnh liên kết phả hệ.

---
Next Phase: phase-03
