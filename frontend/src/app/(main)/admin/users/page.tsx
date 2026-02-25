import React from "react"
import { createClient } from "@/utils/supabase/server"
import { checkAdminOrManager } from "@/app/actions/people"
import { redirect } from "next/navigation"
import UserListClient from "./UserListClient"
import { AlertCircle, ShieldAlert } from "lucide-react"

export const metadata = {
    title: "Quản trị Người Dùng - Gia phả",
}

export default async function AdminUsersPage() {
    const supabase = await createClient()

    // 1. Verify Admin strictly
    let isAdmin = false
    try {
        const { profile } = await checkAdminOrManager(supabase)
        if (profile?.role === "admin") {
            isAdmin = true
        } else {
            // It's a manager trying to access admin
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
                    <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 mx-auto" />
                    <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">Truy cập bị từ chối</h2>
                    <p className="text-stone-600 max-w-md mx-auto">Chỉ Quản trị viên (Admin) mới có quyền truy cập trang Quản lý Người Dùng. Tài khoản của bạn là Quản lý (Manager).</p>
                </div>
            )
        }
    } catch (error) {
        redirect("/login")
    }

    // 2. Fetch all users from profiles table
    const { data: users, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        return (
            <div className="p-8 text-rose-600 bg-rose-50 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>Lỗi tải danh sách người dùng: {error.message}</p>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800">
                        Quản lý Người Dùng
                    </h1>
                    <p className="text-stone-500 mt-1">
                        Cấp quyền Quản lý (Manager) để thành viên có thể thêm, sửa thông tin gia phả.
                    </p>
                </div>
            </div>

            <UserListClient initialUsers={users || []} />
        </div>
    )
}

