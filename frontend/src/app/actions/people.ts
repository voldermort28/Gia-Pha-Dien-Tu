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
    const supabase = await createClient()
    await checkAdminOrManager(supabase)

    const { error } = await supabase
        .from("people")
        .upsert({ ...personData, updated_at: new Date().toISOString() })

    if (error) {
        console.error("Lỗi khi lưu thông tin thành viên:", error)
        throw new Error(error.message)
    }

    revalidatePath("/(main)/people/[handle]", "page")
    revalidatePath("/")
    return { success: true }
}

export async function deletePerson(handle: string) {
    const supabase = await createClient()

    // Custom check for delete: strictly admin
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Chưa đăng nhập.")

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    if (profile?.role !== "admin") {
        throw new Error("Chỉ có Admin mới có quyền xoá thành viên.")
    }

    const { error } = await supabase
        .from("people")
        .delete()
        .eq("handle", handle)

    if (error) {
        console.error("Lỗi khi xóa thành viên:", error)
        throw new Error(error.message)
    }

    revalidatePath("/")
    return { success: true }
}
