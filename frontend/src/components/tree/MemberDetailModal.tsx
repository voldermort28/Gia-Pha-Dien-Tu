"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { X, Edit2, UserPlus, Trash2, ExternalLink, CalendarDays, Hourglass, Info, Users, Phone, Briefcase, MapPin, Unlink } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TreeNode } from "@/lib/supabase-data"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import MemberForm from "./MemberForm"
import { toast } from "sonner"

interface RelationPerson {
    handle: string
    displayName: string
    gender: number
}

interface Relationships {
    parents: RelationPerson[]
    spouses: RelationPerson[]
    children: RelationPerson[]
}

interface MemberDetailModalProps {
    member: TreeNode | null
    isOpen: boolean
    onClose: () => void
    onAddRelative?: (parentId: string, type: 'child' | 'spouse') => void
    onUnlinkSuccess?: () => void
    onEditSuccess?: () => void
    refreshData?: () => void
    mode?: 'view' | 'add'
}

export default function MemberDetailModal({
    member,
    isOpen,
    onClose,
    onAddRelative,
    onUnlinkSuccess,
    onEditSuccess,
    refreshData,
    mode = 'view',
}: MemberDetailModalProps) {
    const router = useRouter()
    const { isAdmin, isMember } = useAuth()
    const [isEditing, setIsEditing] = useState(mode === 'add')
    const [isDeleting, setIsDeleting] = useState(false)
    const [relationships, setRelationships] = useState<Relationships>({ parents: [], spouses: [], children: [] })
    const [loadingRels, setLoadingRels] = useState(false)
    const [extraDetails, setExtraDetails] = useState<any>(null)

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
            setIsEditing(mode === 'add')
        } else {
            document.body.style.overflow = "unset"
            setIsEditing(false)
            setRelationships({ parents: [], spouses: [], children: [] })
            setExtraDetails(null)
        }
        return () => { document.body.style.overflow = "unset" }
    }, [isOpen, mode])

    useEffect(() => {
        if (!member || !isOpen || mode === 'add') return
        fetchRelationshipsAndExtra(member)
    }, [member?.handle, isOpen])

    async function fetchRelationshipsAndExtra(m: TreeNode) {
        setLoadingRels(true)
        try {
            // Fetch extra DB details (e.g., if there are any columns we don't have in TreeNode, like phone, etc.)
            // Assuming table might have phone, occupation, address, notes in the future.
            // If they don't exist in SQL, they will just be undefined.
            const { data: dbPerson } = await supabase
                .from('people')
                .select('*')
                .eq('handle', m.handle)
                .single();
            if (dbPerson) {
                setExtraDetails(dbPerson);
            }

            const parents: RelationPerson[] = []
            const spouses: RelationPerson[] = []
            const children: RelationPerson[] = []

            // Find parent families where the member is explicitly a child
            const { data: parentFams } = await supabase.from("families")
                .select("father_handle, mother_handle")
                .contains("children", [m.handle])

            if (parentFams && parentFams.length > 0) {
                const parentHandles = parentFams.flatMap(f => [f.father_handle, f.mother_handle]).filter((h): h is string => !!h && h !== m.handle)
                if (parentHandles.length > 0) {
                    const { data: parentPeople } = await supabase.from("people").select("handle, display_name, gender").in("handle", parentHandles)
                    if (parentPeople) parents.push(...parentPeople.map(p => ({ handle: p.handle, displayName: p.display_name, gender: p.gender })))
                }
            }

            // Find own families where the member is father or mother
            const { data: ownFams } = await supabase.from("families")
                .select("father_handle, mother_handle, children")
                .or(`father_handle.eq.${m.handle},mother_handle.eq.${m.handle}`)

            if (ownFams && ownFams.length > 0) {
                const spouseHandles = ownFams.map(f => f.father_handle === m.handle ? f.mother_handle : f.father_handle).filter((h): h is string => !!h && h !== m.handle)
                const childHandles = ownFams.flatMap(f => (f.children as string[]) || []).filter((h): h is string => !!h)
                const allHandles = [...new Set([...spouseHandles, ...childHandles])]
                if (allHandles.length > 0) {
                    const { data: relPeople } = await supabase.from("people").select("handle, display_name, gender").in("handle", allHandles)
                    if (relPeople) {
                        const personMap = new Map(relPeople.map(p => [p.handle, p]))
                        for (const sh of spouseHandles) {
                            const p = personMap.get(sh)
                            if (p && !spouses.find(s => s.handle === p.handle)) {
                                spouses.push({ handle: p.handle, displayName: p.display_name, gender: p.gender })
                            }
                        }
                        for (const ch of childHandles) {
                            const p = personMap.get(ch)
                            if (p && !children.find(c => c.handle === p.handle)) {
                                children.push({ handle: p.handle, displayName: p.display_name, gender: p.gender })
                            }
                        }
                    }
                }
            }
            setRelationships({ parents, spouses, children })
        } catch (err) {
            console.error("Error fetching relationships:", err)
        } finally {
            setLoadingRels(false)
        }
    }

    const handleUnlink = async (targetHandle: string, relType: 'parent' | 'spouse' | 'child') => {
        if (!member || !isAdmin) return
        if (!window.confirm("Bạn có chắc chắn muốn hủy liên kết với thành viên này? (Thành viên sẽ không bị xóa khỏi hệ thống)")) return
        setIsDeleting(true)
        try {
            const { data: mData } = await supabase.from("people").select("*").eq("handle", member.handle).single()
            const { data: tData } = await supabase.from("people").select("*").eq("handle", targetHandle).single()
            if (!mData || !tData) throw new Error("Không tìm thấy dữ liệu thành viên.")

            if (relType === 'parent') {
                const sharedFamilies = (mData.parent_families || []).filter((f: string) => (tData.families || []).includes(f))
                for (const fam of sharedFamilies) {
                    const { data: fData } = await supabase.from("families").select("*").eq("handle", fam).single()
                    if (fData && fData.children && fData.children.includes(member.handle)) {
                        const newChildren = fData.children.filter((c: string) => c !== member.handle)
                        await supabase.from("families").update({ children: newChildren }).eq("handle", fam)
                    }
                    const newParentFamilies = (mData.parent_families || []).filter((f: string) => f !== fam)
                    await supabase.from("people").update({ parent_families: newParentFamilies }).eq("handle", member.handle)
                }
            } else if (relType === 'child') {
                const sharedFamilies = (mData.families || []).filter((f: string) => (tData.parent_families || []).includes(f))
                for (const fam of sharedFamilies) {
                    const { data: fData } = await supabase.from("families").select("*").eq("handle", fam).single()
                    if (fData && fData.children && fData.children.includes(targetHandle)) {
                        const newChildren = fData.children.filter((c: string) => c !== targetHandle)
                        await supabase.from("families").update({ children: newChildren }).eq("handle", fam)
                    }
                    const newParentFamilies = (tData.parent_families || []).filter((f: string) => f !== fam)
                    await supabase.from("people").update({ parent_families: newParentFamilies }).eq("handle", targetHandle)
                }
            } else if (relType === 'spouse') {
                const sharedFamilies = (mData.families || []).filter((f: string) => (tData.families || []).includes(f))
                for (const fam of sharedFamilies) {
                    const { data: fData } = await supabase.from("families").select("*").eq("handle", fam).single()
                    if (fData) {
                        const updateData: any = {}
                        if (fData.father_handle === targetHandle) updateData.father_handle = null
                        if (fData.mother_handle === targetHandle) updateData.mother_handle = null
                        if (Object.keys(updateData).length > 0) {
                            await supabase.from("families").update(updateData).eq("handle", fam)
                        }
                    }
                    const newFamiliesT = (tData.families || []).filter((f: string) => f !== fam)
                    await supabase.from("people").update({ families: newFamiliesT }).eq("handle", targetHandle)
                }
            }
            toast.success("Đã hủy liên kết thành công")
            fetchRelationshipsAndExtra(member)
            if (refreshData) refreshData()
            if (onUnlinkSuccess) onUnlinkSuccess()
        } catch (error: any) {
            toast.error(error.message || "Có lỗi xảy ra khi hủy liên kết")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDelete = async () => {
        if (!member || !isAdmin) return
        if (window.confirm("Bạn có chắc chắn muốn xóa thành viên này?")) {
            setIsDeleting(true)
            try {
                const { error } = await supabase.from("people").delete().eq("handle", member.handle)
                if (error) { toast.error(error.message); return; }
                if (refreshData) refreshData()
                toast.success("Đã xóa thành viên thành công")
                onClose()
            } catch (error: any) {
                toast.error(error.message || "Có lỗi xảy ra khi xóa")
            } finally {
                setIsDeleting(false)
            }
        }
    }

    if (!isOpen) return null
    const isAddMode = mode === 'add' && !member

    // Age Calculation
    let age = null;
    let ageLabel = "Tuổi";
    if (member?.birthYear) {
        if (member.isLiving) {
            age = new Date().getFullYear() - member.birthYear;
            ageLabel = "Tuổi";
        } else if (member.deathYear) {
            age = member.deathYear - member.birthYear;
            ageLabel = age >= 60 ? "Hưởng thọ" : "Hưởng dương";
        }
    }

    // Avatar Colors based on gender
    const avBg = member?.gender === 1
        ? "bg-gradient-to-br from-sky-400 to-sky-700"
        : member?.gender === 0
            ? "bg-gradient-to-br from-rose-400 to-rose-700"
            : "bg-gradient-to-br from-stone-400 to-stone-600";

    const blurObj = member?.gender === 1 ? "bg-sky-300" : member?.gender === 0 ? "bg-rose-300" : "bg-stone-300";

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-sm">
                {!isEditing && !isAddMode && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 cursor-pointer" onClick={onClose} />
                )}

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Floating Header Actions - Now nicely styled above the cover */}
                    <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
                        {isEditing && !isAddMode && (
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-stone-100/80 backdrop-blur-md text-stone-700 rounded-full hover:bg-stone-200 font-semibold text-sm shadow-sm border border-stone-200/50 transition-colors"
                            >
                                <X className="size-4" />
                                <span>Hủy sửa</span>
                            </button>
                        )}
                        {!isEditing && !isAddMode && (isAdmin || isMember) && (
                            <>
                                {member && (
                                    <button
                                        onClick={() => { onClose(); router.push(`/people/${member.handle}`) }}
                                        className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-50/80 backdrop-blur-md text-blue-700 rounded-full hover:bg-blue-100 font-semibold text-sm shadow-sm border border-blue-200/50 transition-colors"
                                    >
                                        <ExternalLink className="size-4" />
                                        <span>Trang hồ sơ</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-amber-100/80 backdrop-blur-md text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                                >
                                    <Edit2 className="size-4" />
                                    <span>Chỉnh sửa</span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="size-10 flex items-center justify-center bg-stone-100/80 backdrop-blur-md text-stone-600 rounded-full hover:bg-stone-200 hover:text-stone-900 shadow-sm border border-stone-200/50 transition-colors"
                            aria-label="Đóng"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-50/50">
                        {(isEditing || isAddMode) ? (
                            /* ===== Edit / Add Mode ===== */
                            <div className="px-4 sm:px-8 py-8 pt-20">
                                <h2 className="text-2xl font-serif font-bold text-stone-800 mb-6">
                                    {member ? "Chỉnh sửa Thông tin" : "Thêm Thành viên mới"}
                                </h2>
                                <MemberForm
                                    initialData={member || undefined}
                                    onSuccess={() => {
                                        setIsEditing(false)
                                        if (onEditSuccess) onEditSuccess()
                                        if (refreshData) refreshData()
                                        if (isAddMode) onClose()
                                    }}
                                    onCancel={() => {
                                        if (isAddMode) onClose()
                                        else setIsEditing(false)
                                    }}
                                />
                            </div>
                        ) : (
                            /* ===== View Mode (Redesigned) ===== */
                            <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show">
                                {/* Header / Cover */}
                                <div className="h-28 sm:h-36 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 relative shrink-0">
                                    <div className={`absolute right-0 -top-20 w-64 h-64 rounded-full blur-[60px] opacity-40 ${blurObj}`} />
                                    <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full blur-[60px] opacity-20 bg-amber-200" />

                                    <motion.div variants={itemVariants} className="absolute -bottom-12 sm:-bottom-16 left-6 sm:left-8 z-10">
                                        <div className={`h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 sm:border-[6px] border-white flex items-center justify-center text-3xl sm:text-5xl font-bold text-white overflow-hidden shadow-xl shrink-0 ${avBg}`}>
                                            {member?.displayName?.charAt(0)}
                                        </div>
                                    </motion.div>
                                </div>

                                <div className="pt-16 sm:pt-20 px-6 sm:px-8 pb-8 relative z-10">
                                    {/* Name and Tags */}
                                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div>
                                            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 flex items-center gap-2 sm:gap-3 flex-wrap">
                                                {member?.displayName}

                                                {!member?.isLiving && (
                                                    <span className="text-[10px] sm:text-xs font-sans font-bold text-stone-500 border border-stone-200/80 bg-stone-100/50 rounded-md px-2 py-0.5 whitespace-nowrap uppercase tracking-wider shadow-sm">
                                                        Đã mất
                                                    </span>
                                                )}

                                                {member && !member.isPatrilineal && (
                                                    <span className={`text-[10px] sm:text-xs font-sans font-bold rounded-md px-2 py-0.5 whitespace-nowrap shadow-sm border uppercase tracking-wider ${member.gender === 0 ? "text-rose-700 bg-rose-50/50 border-rose-200/60" : "text-sky-700 bg-sky-50/50 border-sky-200/60"}`}>
                                                        {member.gender === 0 ? "Dâu" : "Rể"}
                                                    </span>
                                                )}

                                                {member?.generation != null && (
                                                    <span className="text-[10px] sm:text-xs font-sans font-bold rounded-md px-2 py-0.5 whitespace-nowrap shadow-sm border text-emerald-700 bg-emerald-50/60 border-emerald-200/60 uppercase tracking-wider">
                                                        Đời thứ {member.generation}
                                                    </span>
                                                )}
                                            </h1>

                                            {/* Stat Cards Layer */}
                                            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                                {/* Birth Card */}
                                                <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200/60 shadow-sm col-span-1 lg:col-span-2 hover:border-amber-200/60 transition-all">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                                                        <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Năm Sinh</h3>
                                                    </div>
                                                    <div className="space-y-1.5 pl-4 border-l-2 border-stone-100">
                                                        <p className="text-stone-800 font-semibold text-lg sm:text-xl">{member?.birthYear || "Chưa rõ"}</p>
                                                    </div>
                                                </motion.div>

                                                {/* Age Card */}
                                                {age !== null && (
                                                    <motion.div variants={itemVariants} className="bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-2xl p-4 border border-amber-200/50 shadow-sm relative overflow-hidden col-span-1 lg:col-span-2">
                                                        <div className="flex items-center gap-2 mb-1.5 relative z-10">
                                                            <span className={`size-2 rounded-full ${!member?.isLiving ? "bg-stone-400" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"}`}></span>
                                                            <p className="text-[11px] font-bold text-amber-800/60 uppercase tracking-widest">{ageLabel}</p>
                                                        </div>
                                                        <div className="pl-4 relative z-10">
                                                            <p className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-700 to-amber-900 tracking-tight">
                                                                {age} <span className="text-xs sm:text-sm font-bold text-amber-700/60 ml-1 uppercase tracking-wider">tuổi</span>
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* 2-Column Split */}
                                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

                                        {/* Main Content (Notes & Family) */}
                                        <div className="lg:col-span-2 space-y-8">

                                            {/* Notes / Memos */}
                                            {extraDetails?.note && (
                                                <motion.section variants={itemVariants}>
                                                    <h2 className="text-base sm:text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                                                        <Info className="size-5 text-amber-600" />
                                                        Ghi chú
                                                    </h2>
                                                    <div className="bg-white/80 backdrop-blur-sm p-5 sm:p-6 rounded-2xl border border-stone-200/60 shadow-sm">
                                                        <p className="text-stone-600 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                                                            {extraDetails.note}
                                                        </p>
                                                    </div>
                                                </motion.section>
                                            )}

                                            {/* Family Container */}
                                            <motion.section variants={itemVariants}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h2 className="text-base sm:text-lg font-bold text-stone-800 flex items-center gap-2">
                                                        <Users className="size-5 text-amber-600" />
                                                        Gia đình
                                                    </h2>
                                                    {isAdmin && member && (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-3 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 border-dashed rounded-full"
                                                                onClick={() => onAddRelative ? onAddRelative(member.handle, 'child') : null}
                                                            >
                                                                <UserPlus className="w-3.5 h-3.5 mr-1" /> Thêm con
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-3 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 border-dashed rounded-full"
                                                                onClick={() => onAddRelative ? onAddRelative(member.handle, 'spouse') : null}
                                                            >
                                                                <UserPlus className="w-3.5 h-3.5 mr-1" /> Thêm vợ/chồng
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-stone-200/60 shadow-sm relative z-0">
                                                    {loadingRels ? (
                                                        <div className="p-8 text-center text-stone-400">Đang tải biểu đồ gia đình...</div>
                                                    ) : (relationships.parents.length === 0 && relationships.spouses.length === 0 && relationships.children.length === 0) ? (
                                                        <div className="p-4 text-center text-stone-500 italic">Chưa có thông tin người thân.</div>
                                                    ) : (
                                                        <div className="space-y-6">
                                                            {relationships.parents.length > 0 && (
                                                                <div>
                                                                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">Bố / Mẹ</p>
                                                                    <div className="space-y-2">
                                                                        {relationships.parents.map(p => (
                                                                            <RelationRow key={p.handle} person={p} onUnlink={isAdmin ? () => handleUnlink(p.handle, 'parent') : undefined} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {relationships.spouses.length > 0 && (
                                                                <div>
                                                                    {relationships.parents.length > 0 && <div className="border-t border-stone-100 my-4" />}
                                                                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">Vợ / Chồng</p>
                                                                    <div className="space-y-2">
                                                                        {relationships.spouses.map(p => (
                                                                            <RelationRow key={p.handle} person={p} onUnlink={isAdmin ? () => handleUnlink(p.handle, 'spouse') : undefined} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {relationships.children.length > 0 && (
                                                                <div>
                                                                    {(relationships.parents.length > 0 || relationships.spouses.length > 0) && <div className="border-t border-stone-100 my-4" />}
                                                                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">Con cái</p>
                                                                    <div className="space-y-2">
                                                                        {relationships.children.map(p => (
                                                                            <RelationRow key={p.handle} person={p} onUnlink={isAdmin ? () => handleUnlink(p.handle, 'child') : undefined} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.section>

                                            {/* Delete Button (Danger Zone) */}
                                            {isAdmin && member && !isEditing && (
                                                <div className="pt-6">
                                                    <Button
                                                        variant="ghost"
                                                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 w-full justify-start rounded-xl"
                                                        onClick={handleDelete}
                                                        disabled={isDeleting}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        {isDeleting ? "Đang xóa..." : "Xóa vĩnh viễn thành viên này"}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Contact Sidebar */}
                                        <div className="space-y-6 lg:min-h-full">
                                            <motion.div variants={itemVariants} className="sticky top-6">
                                                {isAdmin || isMember ? (
                                                    <div className="bg-stone-50 p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-sm">
                                                        <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2 text-sm sm:text-base border-b border-stone-200/60 pb-3">
                                                            <span className="bg-amber-100/80 text-amber-700 p-1.5 rounded-lg border border-amber-200/50">🔒</span>
                                                            Thông tin liên hệ
                                                        </h3>
                                                        <dl className="space-y-4 text-sm sm:text-base">
                                                            <div>
                                                                <dt className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><Phone className="w-3.5 h-3.5" /> Số điện thoại</dt>
                                                                <dd className="text-stone-900 font-medium bg-white px-3 py-2.5 rounded-xl border border-stone-200/60 shadow-sm min-h-[44px] flex items-center">{extraDetails?.phone || <span className="text-stone-400 font-normal">Chưa cập nhật</span>}</dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><Briefcase className="w-3.5 h-3.5" /> Nghề nghiệp</dt>
                                                                <dd className="text-stone-900 font-medium bg-white px-3 py-2.5 rounded-xl border border-stone-200/60 shadow-sm min-h-[44px] flex items-center">{extraDetails?.job || <span className="text-stone-400 font-normal">Chưa cập nhật</span>}</dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><MapPin className="w-3.5 h-3.5" /> Nơi ở hiện tại</dt>
                                                                <dd className="text-stone-900 font-medium bg-white px-3 py-2.5 rounded-xl border border-stone-200/60 shadow-sm min-h-[44px] flex items-center">{extraDetails?.address || <span className="text-stone-400 font-normal">Chưa cập nhật</span>}</dd>
                                                            </div>
                                                        </dl>
                                                    </div>
                                                ) : (
                                                    <div className="bg-stone-50/50 p-6 rounded-2xl border border-stone-200 border-dashed flex flex-col items-center justify-center text-center gap-3 opacity-60">
                                                        <span className="text-3xl opacity-50">🔒</span>
                                                        <p className="text-sm font-medium text-stone-500">Thông tin liên hệ bảo mật<br />chỉ dành cho nội bộ họ tộc.</p>
                                                    </div>
                                                )}
                                            </motion.div>
                                        </div>

                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

function RelationRow({ person, onUnlink }: { person: RelationPerson, onUnlink?: () => void }) {
    const bgColor = person.gender === 1
        ? "bg-gradient-to-br from-sky-400 to-sky-600"
        : "bg-gradient-to-br from-rose-400 to-rose-600"

    return (
        <div className="flex items-center justify-between gap-3 p-3 bg-white border border-stone-100/80 rounded-2xl hover:border-amber-200/60 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-4">
                <div className={`size-11 rounded-full ${bgColor} flex items-center justify-center text-white font-bold shrink-0 shadow-sm border-[3px] border-white ring-1 ring-black/5`}>
                    {person.displayName.charAt(0)}
                </div>
                <div>
                    <span className="font-bold text-stone-800 leading-none block mb-1">{person.displayName}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">{person.gender === 1 ? 'Nam' : 'Nữ'}</span>
                </div>
            </div>
            {onUnlink && (
                <button
                    onClick={onUnlink}
                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors md:opacity-0 group-hover:opacity-100"
                    title="Hủy liên kết"
                >
                    <Unlink className="w-4 h-4" />
                </button>
            )}
        </div>
    )
}
