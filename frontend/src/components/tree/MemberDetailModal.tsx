"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Edit2, UserPlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TreeNode } from "@/lib/supabase-data"
import { useAuth } from "@/components/auth-provider"
import MemberForm from "./MemberForm"
import { deletePerson } from "@/app/actions/people"
import { toast } from "sonner"

interface MemberDetailModalProps {
    member: TreeNode | null
    isOpen: boolean
    onClose: () => void
    onAddRelative?: (parentId: string, type: 'child' | 'spouse') => void
    onEditSuccess?: () => void
    refreshData?: () => void
}

export default function MemberDetailModal({
    member,
    isOpen,
    onClose,
    onAddRelative,
    onEditSuccess,
    refreshData,
}: MemberDetailModalProps) {
    const { isAdmin, isMember } = useAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Prevent background scrolling
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
            setIsEditing(false) // Reset edit state when closed
        }
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isOpen])

    const handleDelete = async () => {
        if (!member || !isAdmin) return

        if (window.confirm("Bạn có chắc chắn muốn xóa thành viên này? Hành động này không thể hoàn tác.")) {
            setIsDeleting(true)
            try {
                await deletePerson(member.handle)
                if (refreshData) refreshData()
                toast.success("Đã xóa thành viên thành công")
                onClose()
            } catch (error) {
                console.error("Lỗi khi xóa:", error)
                toast.error("Có lỗi xảy ra khi xóa thành viên. Vui lòng thử lại.")
            } finally {
                setIsDeleting(false)
            }
        }
    }

    if (!isOpen || !member) return null

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
                        {!isEditing && (isAdmin || isMember) && (
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
                        {isEditing ? (
                            <div className="pt-8">
                                <h2 className="text-2xl font-serif font-bold text-stone-800 mb-6">
                                    Chỉnh sửa Thông tin
                                </h2>
                                <MemberForm
                                    initialData={member}
                                    onSuccess={() => {
                                        setIsEditing(false)
                                        if (onEditSuccess) onEditSuccess()
                                        if (refreshData) refreshData()
                                    }}
                                    onCancel={() => setIsEditing(false)}
                                />
                            </div>
                        ) : (
                            // View Mode
                            <div className="space-y-6 pt-4">
                                {/* Header Information */}
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-stone-800">
                                        {member.displayName}
                                    </h2>
                                    <p className="text-stone-500 mt-1">
                                        Đời thứ {member.generation} • {member.gender === 1 ? "Nam" : "Nữ"}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                        <p className="text-xs text-stone-500 mb-1 uppercase font-semibold tracking-wider">
                                            Năm Sinh
                                        </p>
                                        <p className="text-lg font-medium text-stone-800">
                                            {member.birthYear || "Chưa rõ"}
                                        </p>
                                    </div>

                                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                        <p className="text-xs text-stone-500 mb-1 uppercase font-semibold tracking-wider">
                                            Tình trạng
                                        </p>
                                        <p className="text-lg font-medium text-stone-800">
                                            {member.isLiving ? "Còn sống" : `Mất năm ${member.deathYear || 'chưa rõ'}`}
                                        </p>
                                    </div>
                                </div>

                                {/* Relational Actions */}
                                {(isAdmin || isMember) && onAddRelative && (
                                    <div className="pt-6 border-t border-stone-100 space-y-3">
                                        <h3 className="font-semibold text-stone-800">Quản lý Gia đình</h3>
                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                variant="outline"
                                                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                onClick={() => onAddRelative(member.handle, 'child')}
                                            >
                                                <UserPlus className="w-4 h-4 mr-2" />
                                                Thêm Con
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                onClick={() => onAddRelative(member.handle, 'spouse')}
                                            >
                                                <UserPlus className="w-4 h-4 mr-2" />
                                                Thêm Vợ/Chồng
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Delete Action (Admin Only) */}
                                {isAdmin && (
                                    <div className="pt-6 border-t border-rose-100">
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
