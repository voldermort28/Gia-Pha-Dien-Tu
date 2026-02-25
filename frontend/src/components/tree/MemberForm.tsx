"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    AlertCircle,
    Briefcase,
    Image as ImageIcon,
    Loader2,
    Lock,
    MapPin,
    Phone,
    Settings2,
    User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import type { TreeNode } from "@/lib/supabase-data"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

interface MemberFormProps {
    initialData?: TreeNode
    onSuccess?: () => void
    onCancel?: () => void
}

export default function MemberForm({
    initialData,
    onSuccess,
    onCancel,
}: MemberFormProps) {
    const { isAdmin, isMember } = useAuth()

    const [loading, setLoading] = useState(false)

    // Basic Details
    const [handle, setHandle] = useState(initialData?.handle || "")
    const [displayName, setDisplayName] = useState(initialData?.displayName || "")
    const [gender, setGender] = useState<number>(initialData?.gender ?? 1) // 1: Male, 2: Female
    const [generation, setGeneration] = useState<number | "">(initialData?.generation ?? "")

    // Dates
    const [birthYear, setBirthYear] = useState<number | "">(initialData?.birthYear || "")
    const [deathYear, setDeathYear] = useState<number | "">(initialData?.deathYear || "")
    const [isLiving, setIsLiving] = useState<boolean>(initialData?.isLiving ?? true)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        if (!handle) {
            toast.error("Mã định danh (Handle) không được để trống")
            setLoading(false)
            return
        }

        if (!isLiving && birthYear !== "" && deathYear !== "" && deathYear < birthYear) {
            toast.error("Năm mất phải lớn hơn hoặc bằng năm sinh.")
            setLoading(false)
            return
        }

        try {
            const dbFields = {
                handle,
                display_name: displayName,
                gender,
                generation: generation === "" ? null : Number(generation),
                birth_year: birthYear === "" ? null : Number(birthYear),
                death_year: deathYear === "" ? null : Number(deathYear),
                is_living: isLiving,
                is_patrilineal: gender === 1,
                updated_at: new Date().toISOString(),
            }

            const { error } = await supabase
                .from("people")
                .upsert(dbFields)

            if (error) {
                toast.error(error.message || "Đã xảy ra lỗi khi lưu Dữ liệu.")
                return
            }

            toast.success(initialData ? "Đã cập nhật thông tin thành công" : "Đã thêm thành viên mới")
            if (onSuccess) onSuccess()
        } catch (err: any) {
            toast.error(err.message || "Đã xảy ra lỗi khi lưu Dữ liệu.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Thông tin Chung (Public) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                    <User className="w-5 h-5 text-stone-400" />
                    <h3 className="text-lg font-serif font-semibold text-stone-800">
                        Thông tin cơ bản
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label htmlFor="displayName">Họ và Tên</Label>
                        <Input
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="VD: Quảng Minh Huy"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="handle">Mã phả hệ (Handle)</Label>
                        <Input
                            id="handle"
                            value={handle}
                            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                            placeholder="VD: quang-minh-huy"
                            disabled={!!initialData} // Không cho thay đổi handle nếu đang edit
                            required
                        />
                        <p className="text-xs text-stone-500">Mã duy nhất, dùng để tạo đường dẫn.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Giới tính</Label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(Number(e.target.value))}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value={1}>Nam</option>
                            <option value={2}>Nữ</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="generation">Đời thứ</Label>
                        <Input
                            id="generation"
                            type="number"
                            value={generation}
                            onChange={(e) => setGeneration(e.target.value !== "" ? Number(e.target.value) : "")}
                            placeholder="VD: 5"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="birthYear">Năm sinh</Label>
                        <Input
                            id="birthYear"
                            type="number"
                            value={birthYear}
                            onChange={(e) => setBirthYear(e.target.value !== "" ? Number(e.target.value) : "")}
                            placeholder="VD: 1990"
                        />
                    </div>
                </div>

                {/* Trạng thái sống/mất */}
                <div className="py-2">
                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                        <div>
                            <Label className="text-stone-800">Đã qua đời</Label>
                            <p className="text-xs text-stone-500">Kích hoạt để nhập năm mất.</p>
                        </div>
                        <Switch
                            checked={!isLiving}
                            onCheckedChange={(checked) => setIsLiving(!checked)}
                        />
                    </div>

                    <AnimatePresence>
                        {!isLiving && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="deathYear">Năm mất (Âm lịch hoặc Dương lịch)</Label>
                                    <Input
                                        id="deathYear"
                                        type="number"
                                        value={deathYear}
                                        onChange={(e) => setDeathYear(e.target.value !== "" ? Number(e.target.value) : "")}
                                        placeholder="VD: 2024"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Thông tin Riêng tư (Admin/Manager only view) */}
            {(isAdmin || isMember) && (
                <motion.div
                    className="space-y-4 pt-4 border-t border-stone-100"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="flex items-center gap-2 pb-2">
                        <Lock className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
                            Chỉ Quản trị viên
                        </h3>
                    </div>
                    <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100/50 border-dashed">
                        <p className="text-sm text-amber-700/80 mb-3">
                            Khu vực thông tin bảo mật (Số điện thoại, Địa chỉ chi tiết) hiện chưa được bật do cấu trúc Database gốc. Chỉ có ở chức năng Admin.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-stone-100">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                    className="bg-white"
                >
                    Hủy bỏ
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-stone-800 hover:bg-stone-900 text-white min-w-[120px]"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : initialData ? (
                        "Lưu thay đổi"
                    ) : (
                        "Thêm thành viên"
                    )}
                </Button>
            </div>
        </form>
    )
}
