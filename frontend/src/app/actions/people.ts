"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function checkAdminOrManager(supabase: any) {
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Vui lòng đăng nhập để thực hiện chức năng này.")
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    if (profile?.role !== "admin" && profile?.role !== "manager") {
        throw new Error("Từ chối truy cập. Chỉ quản trị viên mới có quyền này.")
    }

    return { user, profile }
}

export async function upsertPerson(personData: any) {
    try {
        const supabase = await createClient()
        await checkAdminOrManager(supabase)

        const { error } = await supabase
            .from("people")
            .upsert({ ...personData, updated_at: new Date().toISOString() })

        if (error) {
            console.error("Lỗi khi lưu thông tin thành viên:", error)
            return { success: false, error: error.message }
        }

        revalidatePath("/(main)/people/[handle]", "page")
        revalidatePath("/")
        return { success: true }
    } catch (err: any) {
        console.error("upsertPerson error:", err)
        return { success: false, error: err.message || "Đã xảy ra lỗi khi lưu." }
    }
}

export async function deletePerson(handle: string) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) return { success: false, error: "Chưa đăng nhập." }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        if (profile?.role !== "admin") {
            return { success: false, error: "Chỉ có Admin mới có quyền xoá thành viên." }
        }

        const { error } = await supabase
            .from("people")
            .delete()
            .eq("handle", handle)

        if (error) {
            console.error("Lỗi khi xóa thành viên:", error)
            return { success: false, error: error.message }
        }

        revalidatePath("/")
        return { success: true }
    } catch (err: any) {
        console.error("deletePerson error:", err)
        return { success: false, error: err.message || "Đã xảy ra lỗi khi xóa." }
    }
}

