"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { UserRole } from "@/components/auth-provider"

export async function updateUserRole(userId: string, newRole: UserRole) {
    const supabase = await createClient()

    // Verify that the caller is an Admin
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Vui lòng đăng nhập.")
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    if (currentProfile?.role !== "admin") {
        throw new Error("Từ chối truy cập. Chỉ quản trị viên mới có quyền cập nhật phân quyền người dùng.")
    }

    // Prevent admin from downgrading themselves (optional safety check)
    if (user.id === userId && newRole !== "admin") {
        throw new Error("Quản trị viên không thể tự huỷ quyền của chính mình.")
    }

    // Update the user's role in the profiles table
    const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId)

    if (error) {
        console.error("Lỗi khi cập nhật quyền user:", error)
        throw new Error(error.message)
    }

    revalidatePath("/admin/users")
    return { success: true }
}
