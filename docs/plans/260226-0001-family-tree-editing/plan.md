# Plan: Tính năng Chỉnh sửa Thành viên & Gia phả (Role Admin/Manager)
Created: 2026-02-26 00:01
Status: 🟡 In Progress

## Overview
Xây dựng hệ thống form nhập liệu và xử lý logic cho phép Admin và những người có thẩm quyền quản lý trực tiếp thêm mới, sửa đổi thông tin của các thành viên (`people`) và cấu trúc gia đình (`families`) trên cây phả hệ.

## Tech Stack
- **Frontend:** Next.js Server Actions, React Hook Form, Zod (validation), shadcn/ui. (Giao diện Modal & Form học tập từ `giapha-os` với framer-motion, tách biệt thông tin Public/Private).
- **Backend:** Supabase (Bảng `people`, `families`, `profiles`), RLS Policies.
- **State Management:** Zustand, React Query (mutation).

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Thiết kế Data Model & RLS Policies | ✅ Complete | 100% |
| 02 | Backend API (Supabase RPC & Actions) | ✅ Complete | 100% |
| 03 | Frontend UI (Forms & Modals) | ⬜ Pending | 0% |
| 04 | Tích hợp (Integration & Tree Update) | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
