"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Plus, UserPlus, X, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { TreeNode } from "@/lib/supabase-data"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import MemberForm from "./MemberForm"

interface RelativeFormModalProps {
    member: TreeNode | null
    relativeType: 'child' | 'spouse' | null
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    allPeople: TreeNode[] // For searching existing people
}

export default function RelativeFormModal({
    member,
    relativeType,
    isOpen,
    onClose,
    onSuccess,
    allPeople
}: RelativeFormModalProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [isCreatingNew, setIsCreatingNew] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen || !member || !relativeType) return null

    const handleLinkExisting = async (existingMember: TreeNode) => {
        setIsSubmitting(true)
        try {
            const { data: peopleData, error: peopleError } = await supabase
                .from("people")
                .select("*")
                .or(`handle.eq.${member.handle},handle.eq.${existingMember.handle}`)

            if (peopleError || !peopleData || peopleData.length !== 2) {
                throw new Error("Không tìm thấy thông tin thành viên dự định liên kết.")
            }

            const m = peopleData.find(p => p.handle === member.handle)
            const relative = peopleData.find(p => p.handle === existingMember.handle)

            if (!m || !relative) throw new Error("Dữ liệu thành viên không hợp lệ.")

            if (relativeType === 'spouse') {
                const isMemberMale = m.gender === 1
                const husbandId = isMemberMale ? m.handle : relative.handle
                const wifeId = isMemberMale ? relative.handle : m.handle

                const { data: existingFam } = await supabase
                    .from("families")
                    .select("handle")
                    .eq("father_handle", husbandId)
                    .eq("mother_handle", wifeId)
                    .maybeSingle()

                let familyHandle = existingFam?.handle

                if (!familyHandle) {
                    familyHandle = `F_${husbandId}_${wifeId}`
                    const { error: insertErr } = await supabase.from("families").insert({
                        handle: familyHandle,
                        father_handle: husbandId,
                        mother_handle: wifeId,
                        children: []
                    })
                    if (insertErr) throw new Error("Lỗi khi tạo gia đình mới: " + insertErr.message)
                }

                const updatePersonFamilies = async (person: any) => {
                    const currentFamilies = person.families || []
                    if (!currentFamilies.includes(familyHandle)) {
                        const { error } = await supabase.from("people").update({
                            families: [...currentFamilies, familyHandle]
                        }).eq("handle", person.handle)
                        if (error) throw new Error(error.message)
                    }
                }

                await updatePersonFamilies(m)
                await updatePersonFamilies(relative)

            } else if (relativeType === 'child') {
                let familyHandle = m.families?.[0]

                if (!familyHandle) {
                    familyHandle = `F_single_${m.handle}`
                    const isMale = m.gender === 1
                    const { error: insertErr } = await supabase.from("families").insert({
                        handle: familyHandle,
                        father_handle: isMale ? m.handle : null,
                        mother_handle: isMale ? null : m.handle,
                        children: []
                    })
                    if (insertErr) throw new Error("Lỗi khi tạo gia đình: " + insertErr.message)

                    const { error: upErr } = await supabase.from("people").update({
                        families: [familyHandle]
                    }).eq("handle", m.handle)
                    if (upErr) throw new Error(upErr.message)
                }

                const { data: famData } = await supabase
                    .from("families")
                    .select("children")
                    .eq("handle", familyHandle)
                    .single()

                const currentChildren = famData?.children || []
                if (!currentChildren.includes(relative.handle)) {
                    const { error: fupErr } = await supabase.from("families").update({
                        children: [...currentChildren, relative.handle]
                    }).eq("handle", familyHandle)
                    if (fupErr) throw new Error(fupErr.message)
                }

                const currentParentFamilies = relative.parent_families || []
                if (!currentParentFamilies.includes(familyHandle)) {
                    const { error: pupErr } = await supabase.from("people").update({
                        parent_families: [...currentParentFamilies, familyHandle]
                    }).eq("handle", relative.handle)
                    if (pupErr) throw new Error(pupErr.message)
                }
            }

            toast.success(`Đã thêm ${existingMember.displayName} làm ${relativeType === 'child' ? 'con' : 'vợ/chồng'} của ${member.displayName}!`)
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || "Có lỗi xảy ra khi liên kết thành viên.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Filter people that are NOT the current member, and optionally filter by gender for spouses
    const searchResults = allPeople.filter(p => {
        if (p.handle === member.handle) return false
        if (searchQuery.length < 2) return false

        const terms = searchQuery.toLowerCase().split(' ')
        const name = p.displayName.toLowerCase()
        const handle = p.handle.toLowerCase()

        return terms.every(t => name.includes(t) || handle.includes(t))
    }).slice(0, 5) // Limit to 5 results for UI neatness

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <h2 className="text-xl font-serif font-bold text-slate-800">
                                Thêm {relativeType === 'child' ? 'con' : 'vợ/chồng'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Cho thành viên: <span className="font-semibold text-slate-700">{member.displayName}</span>
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        {isCreatingNew ? (
                            <div className="space-y-4">
                                <button
                                    onClick={() => setIsCreatingNew(false)}
                                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 -ml-2 rounded-md transition-colors w-fit"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Quay lại tìm kiếm
                                </button>

                                {/* Inline creation form */}
                                <div className="mt-4 border-t border-slate-100 pt-4">
                                    <MemberForm
                                        initialData={{
                                            ...member, // just for some defaults but we'll clear it mostly
                                            handle: `M_${Date.now()}`,
                                            displayName: "",
                                            gender: relativeType === 'spouse' ? (member.gender === 1 ? 2 : 1) : 1, // opposite gender for spouse default
                                            generation: member.generation ? (relativeType === 'child' ? member.generation + 1 : member.generation) : "",
                                            birthYear: undefined as any,
                                            deathYear: undefined as any,
                                            isLiving: true,
                                            isPrivacyFiltered: false,
                                            isPatrilineal: relativeType === 'child' ? true : false,
                                        } as any}
                                        onSuccess={(newHandle: string) => {
                                            const handleSuccess = async () => {
                                                // The MemberForm now saves the new person to DB.
                                                // We just need to link them.
                                                // Wait a tiny bit for DB replication if any
                                                await new Promise(r => setTimeout(r, 500));

                                                // Construct a fake tree node to pass to handleLinkExisting
                                                const newFakeNode: TreeNode = {
                                                    handle: newHandle || `M_${Date.now()}`,
                                                    displayName: "Thành viên mới",
                                                    gender: 1,
                                                    generation: (member.generation || 0) + (relativeType === 'child' ? 1 : 0),
                                                    isLiving: true,
                                                    isPatrilineal: true,
                                                    isPrivacyFiltered: false,
                                                    families: [],
                                                    parentFamilies: [],
                                                };
                                                // Actually, the handleLinkExisting fetches from DB anyway, so it just needs the handle!
                                                await handleLinkExisting(newFakeNode);
                                            };
                                            handleSuccess();
                                        }}
                                        onCancel={() => setIsCreatingNew(false)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Search Section */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-700">
                                        1. Tìm thành viên đã có trên cây
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="Nhập tên hoặc mã ID (tối thiểu 2 ký tự)..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 bg-slate-50"
                                        />
                                    </div>

                                    {/* Search Results */}
                                    {searchQuery.length >= 2 && (
                                        <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                            {searchResults.length > 0 ? (
                                                <div className="divide-y divide-slate-100">
                                                    {searchResults.map(p => (
                                                        <div key={p.handle} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-800">{p.displayName}</p>
                                                                <p className="text-xs text-slate-500">
                                                                    ID: {p.handle} {p.birthYear ? `· Sinh ${p.birthYear}` : ''}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 py-0 px-3 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                                                                onClick={() => handleLinkExisting(p)}
                                                                disabled={isSubmitting}
                                                            >
                                                                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Chọn"}
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-4 text-center text-sm text-slate-500">
                                                    Không tìm thấy thành viên nào phù hợp.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="relative py-3">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-slate-400">Hoặc</span>
                                    </div>
                                </div>

                                {/* Create New Section */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-700">
                                        2. Tạo thành viên mới tinh
                                    </label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full flex items-center justify-center gap-2 h-12 border-dashed border-2 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                        onClick={() => setIsCreatingNew(true)}
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Nhập thông tin người mới
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
