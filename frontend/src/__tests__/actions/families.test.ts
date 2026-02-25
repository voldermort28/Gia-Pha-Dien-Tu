/**
 * Tests for families.ts server actions
 * Tests: upsertFamily, deleteFamily, linkRelativeAction
 */

// --- Mock Setup ---
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}))

const mockSingle = jest.fn()
const mockMaybeSingle = jest.fn()
const mockEq = jest.fn()
const mockIn = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockUpsert = jest.fn()
const mockFrom = jest.fn()
const mockGetUser = jest.fn()

function buildChain() {
    const chain: any = {
        select: jest.fn(),
        eq: jest.fn(),
        in: jest.fn(),
        single: jest.fn(),
        maybeSingle: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
    }
    // Each method returns the chain
    Object.keys(chain).forEach(key => {
        const original = chain[key]
        chain[key] = jest.fn().mockReturnValue(chain)
    })
    mockFrom.mockReturnValue(chain)
    return chain
}

const mockSupabase = {
    from: mockFrom,
    auth: { getUser: mockGetUser },
}

jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

import { upsertFamily, deleteFamily, linkRelativeAction } from '@/app/actions/families'

function resetAllMocks() {
    jest.clearAllMocks()
    buildChain()
}

// =============================================
// upsertFamily
// =============================================

describe('upsertFamily', () => {
    beforeEach(resetAllMocks)

    it('should upsert family data successfully', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
        const chain = buildChain()
        chain.single.mockResolvedValueOnce({ data: { role: 'admin' } })
        chain.upsert.mockResolvedValue({ error: null })

        const familyData = {
            handle: 'F_1',
            father_handle: 'P_father',
            mother_handle: 'P_mother',
            children: ['P_child1'],
        }

        const result = await upsertFamily(familyData)
        expect(result).toEqual({ success: true })
    })

    it('should throw on upsert failure', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
        const chain = buildChain()
        chain.single.mockResolvedValueOnce({ data: { role: 'admin' } })
        chain.upsert.mockResolvedValue({ error: { message: 'Duplicate handle' } })

        await expect(upsertFamily({ handle: 'F_dup' })).rejects.toThrow('Duplicate handle')
    })

    it('should reject non-admin/manager users', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'viewer-1' } } })
        const chain = buildChain()
        chain.single.mockResolvedValue({ data: { role: 'member' } })

        await expect(upsertFamily({ handle: 'F_1' })).rejects.toThrow('Từ chối truy cập')
    })
})

// =============================================
// deleteFamily
// =============================================

describe('deleteFamily', () => {
    beforeEach(resetAllMocks)

    it('should delete family successfully as admin', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

        mockFrom.mockImplementation((table: string) => {
            if (table === 'profiles') {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
                        }),
                    }),
                }
            }
            if (table === 'families') {
                return {
                    delete: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ error: null }),
                    }),
                }
            }
            return buildChain()
        })

        const result = await deleteFamily('F_1')
        expect(result).toEqual({ success: true })
    })

    it('should reject non-admin users', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'mgr-1' } } })
        const chain = buildChain()
        chain.single.mockResolvedValueOnce({ data: { role: 'manager' } })

        await expect(deleteFamily('F_1')).rejects.toThrow('Chỉ có Admin')
    })

    it('should throw if not logged in', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } })

        await expect(deleteFamily('F_1')).rejects.toThrow('Chưa đăng nhập')
    })
})

// =============================================
// linkRelativeAction
// =============================================

describe('linkRelativeAction', () => {
    beforeEach(resetAllMocks)

    describe('input validation', () => {
        it('should throw if people not found', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
            const chain = buildChain()
            chain.single.mockResolvedValueOnce({ data: { role: 'admin' } })
            // People query returns empty
            chain.in.mockReturnValue(chain)
            chain.select.mockReturnValue(chain)
            // Override the final resolution - simulating no data
            mockFrom.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockResolvedValue({ data: [], error: null }),
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
                        maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                    }),
                }),
            })

            await expect(
                linkRelativeAction('P_1', 'P_2', 'spouse')
            ).rejects.toThrow('Không tìm thấy')
        })
    })

    describe('spouse linking', () => {
        it('should create new family when linking spouse (male member)', async () => {
            // Setup: admin auth
            mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

            const memberMale = {
                handle: 'P_male',
                gender: 1,
                families: [],
                display_name: 'Ông A',
            }
            const relativeFemale = {
                handle: 'P_female',
                gender: 2,
                families: [],
                display_name: 'Bà B',
            }

            let callCount = 0
            mockFrom.mockImplementation((table: string) => {
                if (table === 'profiles') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
                            }),
                        }),
                    }
                }
                if (table === 'people') {
                    callCount++
                    if (callCount === 1) {
                        // Fetch both people
                        return {
                            select: jest.fn().mockReturnValue({
                                in: jest.fn().mockResolvedValue({
                                    data: [memberMale, relativeFemale],
                                    error: null,
                                }),
                            }),
                        }
                    }
                    // Update calls
                    return {
                        update: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    }
                }
                if (table === 'families') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                                eq: jest.fn().mockReturnValue({
                                    maybeSingle: jest.fn().mockResolvedValue({ data: null }),
                                }),
                            }),
                        }),
                        insert: jest.fn().mockResolvedValue({ error: null }),
                    }
                }
                return buildChain()
            })

            const result = await linkRelativeAction('P_male', 'P_female', 'spouse')
            expect(result).toEqual({ success: true })
        })
    })

    describe('child linking', () => {
        it('should add child to existing family', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

            const parentMember = {
                handle: 'P_parent',
                gender: 1,
                families: ['F_existing'],
                display_name: 'Ông Cha',
            }
            const childRelative = {
                handle: 'P_child',
                gender: 2,
                families: [],
                parent_families: [],
                display_name: 'Con Gái',
            }

            let peopleCallCount = 0
            let familiesCallCount = 0
            mockFrom.mockImplementation((table: string) => {
                if (table === 'profiles') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
                            }),
                        }),
                    }
                }
                if (table === 'people') {
                    peopleCallCount++
                    if (peopleCallCount === 1) {
                        return {
                            select: jest.fn().mockReturnValue({
                                in: jest.fn().mockResolvedValue({
                                    data: [parentMember, childRelative],
                                    error: null,
                                }),
                            }),
                        }
                    }
                    // Update child's parent_families
                    return {
                        update: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    }
                }
                if (table === 'families') {
                    familiesCallCount++
                    if (familiesCallCount === 1) {
                        // Fetch existing family children
                        return {
                            select: jest.fn().mockReturnValue({
                                eq: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: { children: ['P_existing_child'] },
                                    }),
                                }),
                            }),
                        }
                    }
                    // Update family children
                    return {
                        update: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    }
                }
                return buildChain()
            })

            const result = await linkRelativeAction('P_parent', 'P_child', 'child')
            expect(result).toEqual({ success: true })
        })

        it('should create single-parent family if parent has none', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

            const singleParent = {
                handle: 'P_single_mom',
                gender: 2,  // female
                families: [],  // no family yet
                display_name: 'Mẹ Đơn',
            }
            const child = {
                handle: 'P_new_child',
                gender: 1,
                families: [],
                parent_families: [],
                display_name: 'Bé Trai',
            }

            let peopleCallCount = 0
            let familiesCallCount = 0
            mockFrom.mockImplementation((table: string) => {
                if (table === 'profiles') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
                            }),
                        }),
                    }
                }
                if (table === 'people') {
                    peopleCallCount++
                    if (peopleCallCount === 1) {
                        return {
                            select: jest.fn().mockReturnValue({
                                in: jest.fn().mockResolvedValue({
                                    data: [singleParent, child],
                                    error: null,
                                }),
                            }),
                        }
                    }
                    return {
                        update: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    }
                }
                if (table === 'families') {
                    familiesCallCount++
                    if (familiesCallCount === 1) {
                        // Insert new single-parent family
                        return {
                            insert: jest.fn().mockResolvedValue({ error: null }),
                            select: jest.fn().mockReturnValue({
                                eq: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: { children: [] },
                                    }),
                                }),
                            }),
                        }
                    }
                    // Fetch or update
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: { children: [] },
                                }),
                            }),
                        }),
                        update: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    }
                }
                return buildChain()
            })

            const result = await linkRelativeAction('P_single_mom', 'P_new_child', 'child')
            expect(result).toEqual({ success: true })
        })
    })
})
