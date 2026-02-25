"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X, Edit2, UserPlus, Trash2, ExternalLink, Users2 } from "lucide-react"
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
    onEditSuccess?: () => void
    refreshData?: () => void
    /** Start in add/edit mode directly */
    mode?: 'view' | 'add'
}

export default function MemberDetailModal({
    member,
    isOpen,
    onClose,
    onAddRelative,
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

    // Reset edit state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
            setIsEditing(mode === 'add')
        } else {
            document.body.style.overflow = "unset"
            setIsEditing(false)
            setRelationships({ parents: [], spouses: [], children: [] })
        }
        return () => { document.body.style.overflow = "unset" }
    }, [isOpen, mode])

    // Fetch relationships when viewing a member
    useEffect(() => {
        if (!member || !isOpen || mode === 'add') return
        fetchRelationships(member)
    }, [member?.handle, isOpen])

    async function fetchRelationships(m: TreeNode) {
        setLoadingRels(true)
        try {
            const parents: RelationPerson[] = []
            const spouses: RelationPerson[] = []
            const children: RelationPerson[] = []

            // 1. Get parent families → find father/mother
            if (m.parentFamilies && m.parentFamilies.length > 0) {
                const { data: parentFams } = await supabase
                    .from("families")
                    .select("father_handle, mother_handle")
                    .in("handle", m.parentFamilies)

                if (parentFams) {
                    const parentHandles = parentFams
                        .flatMap(f => [f.father_handle, f.mother_handle])
                        .filter((h): h is string => !!h && h !== m.handle)

                    if (parentHandles.length > 0) {
                        const { data: parentPeople } = await supabase
                            .from("people")
                            .select("handle, display_name, gender")
                            .in("handle", parentHandles)
                        if (parentPeople) {
                            parents.push(...parentPeople.map(p => ({
                                handle: p.handle,
                                displayName: p.display_name,
                                gender: p.gender,
                            })))
                        }
                    }
                }
            }

            // 2. Get own families → find spouse + children
            if (m.families && m.families.length > 0) {
                const { data: ownFams } = await supabase
                    .from("families")
                    .select("father_handle, mother_handle, children")
                    .in("handle", m.families)

                if (ownFams) {
                    // Spouse handles
                    const spouseHandles = ownFams
                        .map(f => m.gender === 1 ? f.mother_handle : f.father_handle)
                        .filter((h): h is string => !!h && h !== m.handle)

                    // Children handles
                    const childHandles = ownFams
                        .flatMap(f => (f.children as string[]) || [])
                        .filter((h): h is string => !!h)

                    const allHandles = [...new Set([...spouseHandles, ...childHandles])]

                    if (allHandles.length > 0) {
                        const { data: relPeople } = await supabase
                            .from("people")
                            .select("handle, display_name, gender")
                            .in("handle", allHandles)

                        if (relPeople) {
                            const personMap = new Map(relPeople.map(p => [p.handle, p]))

                            for (const sh of spouseHandles) {
                                const p = personMap.get(sh)
                                if (p) spouses.push({ handle: p.handle, displayName: p.display_name, gender: p.gender })
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
            }

            setRelationships({ parents, spouses, children })
        } catch (err) {
            console.error("Error fetching relationships:", err)
        } finally {
            setLoadingRels(false)
        }
    }

    const handleDelete = async () => {
        if (!member || !isAdmin) return
        if (window.confirm("Bạn có chắc chắn muốn xóa thành viên này?")) {
            setIsDeleting(true)
            try {
                const { error } = await supabase
                    .from("people")
                    .delete()
                    .eq("handle", member.handle)

                if (error) {
                    toast.error(error.message)
                    return
                }
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

    // Add mode without member
    const isAddMode = mode === 'add' && !member

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-sm">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 cursor-pointer"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Actions */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                        {!isEditing && !isAddMode && (isAdmin || isMember) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="bg-white/80 backdrop-blur-md rounded-full text-stone-700 hover:text-stone-900 border-stone-200"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Chỉnh sửa
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="bg-black/5 hover:bg-black/10 text-stone-700 rounded-full h-8 w-8"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="overflow-y-auto p-6 scrollbar-hide">
                        {(isEditing || isAddMode) ? (
                            /* ===== Edit / Add Mode ===== */
                            <div className="pt-8">
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
                                        if (isAddMode) {
                                            onClose()
                                        } else {
                                            setIsEditing(false)
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            /* ===== View Mode ===== */
                            <div className="space-y-6 pt-4">
                                {/* Header Information */}
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-stone-800">
                                        {member?.displayName}
                                    </h2>
                                    <p className="text-stone-500 mt-1">
                                        {member?.generation ? `Đời thứ ${member.generation} • ` : ""}
                                        {member?.gender === 1 ? "Nam" : "Nữ"}
                                    </p>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                        <p className="text-xs text-stone-500 mb-1 uppercase font-semibold tracking-wider">
                                            Năm Sinh
                                        </p>
                                        <p className="text-lg font-medium text-stone-800">
                                            {member?.birthYear || "Chưa rõ"}
                                        </p>
                                    </div>

                                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                        <p className="text-xs text-stone-500 mb-1 uppercase font-semibold tracking-wider">
                                            Tình trạng
                                        </p>
                                        <p className="text-lg font-medium text-stone-800">
                                            {member?.isLiving ? "Còn sống" : `Mất năm ${member?.deathYear || 'chưa rõ'}`}
                                        </p>
                                    </div>
                                </div>

                                {/* ===== RELATIONSHIPS SECTION ===== */}
                                {!loadingRels && (relationships.parents.length > 0 || relationships.spouses.length > 0 || relationships.children.length > 0) && (
                                    <div className="border-t border-stone-100 pt-6">
                                        <h3 className="font-semibold text-stone-800 flex items-center gap-2 mb-4">
                                            <Users2 className="w-4 h-4 text-stone-500" />
                                            Gia đình
                                        </h3>
                                        <div className="bg-stone-50 rounded-2xl border border-stone-100 p-4 space-y-4">
                                            {/* Parents */}
                                            {relationships.parents.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Bố / Mẹ</p>
                                                    <div className="space-y-2">
                                                        {relationships.parents.map(p => (
                                                            <RelationRow key={p.handle} person={p} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Spouses */}
                                            {relationships.spouses.length > 0 && (
                                                <div>
                                                    {relationships.parents.length > 0 && <div className="border-t border-stone-200 my-3" />}
                                                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Vợ / Chồng</p>
                                                    <div className="space-y-2">
                                                        {relationships.spouses.map(p => (
                                                            <RelationRow key={p.handle} person={p} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Children */}
                                            {relationships.children.length > 0 && (
                                                <div>
                                                    {(relationships.parents.length > 0 || relationships.spouses.length > 0) && <div className="border-t border-stone-200 my-3" />}
                                                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Con cái</p>
                                                    <div className="space-y-2">
                                                        {relationships.children.map(p => (
                                                            <RelationRow key={p.handle} person={p} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Add Relative Buttons */}
                                {(isAdmin || isMember) && member && (
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 border-dashed"
                                            onClick={() => onAddRelative ? onAddRelative(member.handle, 'child') : null}
                                        >
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            + Thêm Con
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 border-dashed"
                                            onClick={() => onAddRelative ? onAddRelative(member.handle, 'spouse') : null}
                                        >
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            + Thêm Vợ/Chồng
                                        </Button>
                                    </div>
                                )}

                                {/* View Detail Link */}
                                {member && (
                                    <div className="border-t border-stone-100 pt-4">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-center gap-2 rounded-xl text-stone-600 hover:text-stone-800 border-stone-200"
                                            onClick={() => {
                                                onClose()
                                                router.push(`/people/${member.handle}`)
                                            }}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Xem chi tiết
                                        </Button>
                                    </div>
                                )}

                                {/* Delete Action (Admin Only) */}
                                {isAdmin && member && (
                                    <div className="pt-2 border-t border-rose-100">
                                        <Button
                                            variant="ghost"
                                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 w-full justify-start"
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            {isDeleting ? "Đang xóa..." : "Xóa thành viên"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

/* ===== Helper Component ===== */
function RelationRow({ person }: { person: RelationPerson }) {
    const bgColor = person.gender === 1
        ? "bg-blue-500"
        : "bg-rose-400"

    return (
        <div className="flex items-center gap-3 py-1">
            <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {person.displayName.charAt(0)}
            </div>
            <span className="text-sm font-medium text-stone-700">{person.displayName}</span>
        </div>
    )
}
