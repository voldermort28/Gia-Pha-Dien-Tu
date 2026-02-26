"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { checkAdminOrManager } from "./people"

export async function upsertFamily(familyData: any) {
    try {
        const supabase = await createClient()
        await checkAdminOrManager(supabase)

        const { error } = await supabase
            .from("families")
            .upsert({ ...familyData, updated_at: new Date().toISOString() })

        if (error) {
            console.error("Lỗi khi lưu thông tin gia đình:", error)
            return { success: false, error: error.message }
        }

        revalidatePath("/")
        return { success: true }
    } catch (err: any) {
        console.error("upsertFamily error:", err)
        return { success: false, error: err.message || "Đã xảy ra lỗi khi lưu." }
    }
}

export async function deleteFamily(handle: string) {
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
            return { success: false, error: "Chỉ có Admin mới có quyền xoá gia đình." }
        }

        // --- CASCADING CLEANUP: Remove references from people table ---
        // 1. Remove from parent_families (children of this family)
        const { data: peopleWithParentFam } = await supabase
            .from("people")
            .select("handle, parent_families")
            .contains("parent_families", [handle])

        if (peopleWithParentFam) {
            for (const p of peopleWithParentFam) {
                const newFams = p.parent_families.filter((fh: string) => fh !== handle)
                await supabase.from("people").update({ parent_families: newFams }).eq("handle", p.handle)
            }
        }

        // 2. Remove from families (parents of this family)
        const { data: peopleWithFam } = await supabase
            .from("people")
            .select("handle, families")
            .contains("families", [handle])

        if (peopleWithFam) {
            for (const p of peopleWithFam) {
                const newFams = p.families.filter((fh: string) => fh !== handle)
                await supabase.from("people").update({ families: newFams }).eq("handle", p.handle)
            }
        }
        // -----------------------------------------------------------------

        const { error } = await supabase
            .from("families")
            .delete()
            .eq("handle", handle)

        if (error) {
            console.error("Lỗi khi xóa gia đình:", error)
            return { success: false, error: error.message }
        }

        revalidatePath("/")
        return { success: true }
    } catch (err: any) {
        console.error("deleteFamily error:", err)
        return { success: false, error: err.message || "Đã xảy ra lỗi khi xóa." }
    }
}

export async function linkRelativeAction(memberHandle: string, relativeHandle: string, type: 'child' | 'spouse') {
    try {
        const supabase = await createClient()
        await checkAdminOrManager(supabase)

        // Fetch both people
        const { data: peopleData, error: peopleError } = await supabase
            .from("people")
            .select("*")
            .in("handle", [memberHandle, relativeHandle])

        if (peopleError || !peopleData || peopleData.length !== 2) {
            return { success: false, error: "Không tìm thấy thông tin thành viên dự định liên kết." }
        }

        const member = peopleData.find(p => p.handle === memberHandle)
        const relative = peopleData.find(p => p.handle === relativeHandle)

        if (!member || !relative) return { success: false, error: "Dữ liệu thành viên không hợp lệ." }

        if (type === 'spouse') {
            const isMemberMale = member.gender === 1
            const husbandId = isMemberMale ? member.handle : relative.handle
            const wifeId = isMemberMale ? relative.handle : member.handle

            // Check if family already exists (both parents defined)
            const { data: existingFam } = await supabase
                .from("families")
                .select("handle")
                .eq("father_handle", husbandId)
                .eq("mother_handle", wifeId)
                .maybeSingle()

            let familyHandle = existingFam?.handle

            if (!familyHandle) {
                // Look for an existing single-parent family to "complete"
                let singleFamQuery = supabase.from("families").select("handle")
                if (isMemberMale) {
                    singleFamQuery = singleFamQuery.eq("father_handle", husbandId).is("mother_handle", null)
                } else {
                    singleFamQuery = singleFamQuery.eq("mother_handle", wifeId).is("father_handle", null)
                }

                const { data: singleFam } = await singleFamQuery.maybeSingle()

                if (singleFam) {
                    // Complete the existing single-parent family
                    familyHandle = singleFam.handle
                    const { error: updateErr } = await supabase.from("families").update({
                        father_handle: husbandId,
                        mother_handle: wifeId
                    }).eq("handle", familyHandle)

                    if (updateErr) return { success: false, error: "Lỗi khi cập nhật gia đình: " + updateErr.message }
                } else {
                    // Create a brand new family
                    familyHandle = `F_${husbandId}_${wifeId}`
                    const { error: insertErr } = await supabase.from("families").insert({
                        handle: familyHandle,
                        father_handle: husbandId,
                        mother_handle: wifeId,
                        children: []
                    })
                    if (insertErr) return { success: false, error: "Lỗi khi tạo gia đình mới: " + insertErr.message }
                }
            }

            // Update families array for both
            const updatePersonFamilies = async (person: any) => {
                const currentFamilies = person.families || []
                if (!currentFamilies.includes(familyHandle)) {
                    await supabase.from("people").update({
                        families: [...currentFamilies, familyHandle]
                    }).eq("handle", person.handle)
                }
            }

            await updatePersonFamilies(member)
            await updatePersonFamilies(relative)

        } else if (type === 'child') {
            // member is Parent, relative is Child
            let familyHandle = member.families?.[0]

            if (!familyHandle) {
                // Create a single-parent family
                familyHandle = `F_single_${member.handle}`
                const isMale = member.gender === 1
                const { error: insertErr } = await supabase.from("families").insert({
                    handle: familyHandle,
                    father_handle: isMale ? member.handle : null,
                    mother_handle: isMale ? null : member.handle,
                    children: []
                })
                if (insertErr) return { success: false, error: "Lỗi khi tạo gia đình: " + insertErr.message }

                // Update parent's families array
                await supabase.from("people").update({
                    families: [familyHandle]
                }).eq("handle", member.handle)
            }

            // 1. Add child to family's children array
            const { data: famData } = await supabase
                .from("families")
                .select("children")
                .eq("handle", familyHandle)
                .single()

            const currentChildren = famData?.children || []
            if (!currentChildren.includes(relative.handle)) {
                await supabase.from("families").update({
                    children: [...currentChildren, relative.handle]
                }).eq("handle", familyHandle)
            }

            // 2. Add family to child's parent_families array
            const currentParentFamilies = relative.parent_families || []
            if (!currentParentFamilies.includes(familyHandle)) {
                await supabase.from("people").update({
                    parent_families: [...currentParentFamilies, familyHandle]
                }).eq("handle", relative.handle)
            }
        }

        revalidatePath("/")
        return { success: true }
    } catch (err: any) {
        console.error("linkRelativeAction error:", err)
        return { success: false, error: err.message || "Đã xảy ra lỗi khi liên kết." }
    }
}

