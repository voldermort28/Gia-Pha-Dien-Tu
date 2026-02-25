"use client"
import React, { useState } from "react"
import { updateUserRole } from "@/app/actions/users"
import { Loader2, Shield, User as UserIcon } from "lucide-react"

type ProfileUser = {
    id: string
    email: string
    display_name: string | null
    role: string
    created_at: string
}

interface UserListClientProps {
    initialUsers: ProfileUser[]
}

const ROLE_COLORS: Record<string, string> = {
    admin: "bg-red-100 text-red-800 border-red-200",
    manager: "bg-amber-100 text-amber-800 border-amber-200",
    viewer: "bg-stone-100 text-stone-800 border-stone-200",
}

const ROLE_LABELS: Record<string, string> = {
    admin: "Quản trị viên (Admin)",
    manager: "Quản lý (Manager)",
    viewer: "Người xem (Viewer)",
}

export default function UserListClient({ initialUsers }: UserListClientProps) {
    const [users, setUsers] = useState(initialUsers)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleRoleChange = async (userId: string, newRole: string) => {
        setLoadingId(userId)
        setError(null)

        try {
            await updateUserRole(userId, newRole as "admin" | "manager" | "member" | null)

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
        } catch (err: any) {
            setError(err.message || "Đã xảy ra lỗi khi cập nhật phân quyền.")
        } finally {
            setLoadingId(null)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            {error && (
                <div className="bg-rose-50 border-b border-rose-100 p-4 text-rose-600 text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-stone-50 border-b border-stone-100 text-stone-600 font-medium">
                        <tr>
                            <th className="px-6 py-4">Thành viên</th>
                            <th className="px-6 py-4">Phân quyền hiện tại</th>
                            <th className="px-6 py-4">Ngày tham gia</th>
                            <th className="px-6 py-4 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shrink-0">
                                            <UserIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-stone-800">
                                                {user.display_name || user.email.split("@")[0]}
                                            </div>
                                            <div className="text-stone-500 text-xs mt-0.5">{user.email}</div>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${ROLE_COLORS[user.role] || ROLE_COLORS.viewer}`}>
                                        {user.role === "admin" && <Shield className="w-3 h-3" />}
                                        {ROLE_LABELS[user.role] || user.role}
                                    </span>
                                </td>

                                <td className="px-6 py-4 text-stone-500">
                                    {new Date(user.created_at).toLocaleDateString("vi-VN")}
                                </td>

                                <td className="px-6 py-4 text-right">
                                    {loadingId === user.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-600" />
                                    ) : (
                                        <select
                                            value={user.role}
                                            disabled={user.role === 'admin'} // For safety, only manual DB change can demote admin for now
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            className="bg-white border border-stone-200 text-stone-700 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2"
                                        >
                                            <option value="admin" disabled>Quản trị viên (Admin)</option>
                                            <option value="manager">Quản lý (Manager)</option>
                                            <option value="viewer">Người xem (Viewer)</option>
                                        </select>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {users.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-stone-500">
                                    Chưa có thành viên nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
