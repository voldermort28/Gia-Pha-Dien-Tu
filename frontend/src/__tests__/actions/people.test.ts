/**
 * Tests for people.ts server actions
 * Tests: checkAdminOrManager, upsertPerson, deletePerson
 */

// --- Mock Setup ---

// Mock next/cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}))

// Mock supabase client
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

// Build chainable supabase mock
function buildChain() {
    const chain: any = {
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        upsert: mockUpsert,
    }
    // Make each method return the chain for fluent API
    Object.keys(chain).forEach(key => {
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

// --- Import after mocks ---
import { checkAdminOrManager, upsertPerson, deletePerson } from '@/app/actions/people'

// --- Helpers ---
function resetAllMocks() {
    jest.clearAllMocks()
    buildChain()
}

// =============================================
// TEST SUITES
// =============================================

describe('checkAdminOrManager', () => {
    beforeEach(resetAllMocks)

    it('should throw if user is not logged in', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } })

        await expect(checkAdminOrManager(mockSupabase)).rejects.toThrow(
            'Vui lòng đăng nhập'
        )
    })

    it('should throw if user role is not admin or manager', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

        // Mock profiles query chain
        const chain = buildChain()
        chain.single.mockResolvedValue({ data: { role: 'member' } })

        await expect(checkAdminOrManager(mockSupabase)).rejects.toThrow(
            'Từ chối truy cập'
        )
    })

    it('should pass for admin users', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

        const chain = buildChain()
        chain.single.mockResolvedValue({ data: { role: 'admin' } })

        const result = await checkAdminOrManager(mockSupabase)
        expect(result.user).toEqual({ id: 'admin-1' })
        expect(result.profile).toEqual({ role: 'admin' })
    })

    it('should pass for manager users', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'mgr-1' } } })

        const chain = buildChain()
        chain.single.mockResolvedValue({ data: { role: 'manager' } })

        const result = await checkAdminOrManager(mockSupabase)
        expect(result.user).toEqual({ id: 'mgr-1' })
        expect(result.profile).toEqual({ role: 'manager' })
    })
})

describe('upsertPerson', () => {
    beforeEach(resetAllMocks)

    it('should upsert person data successfully', async () => {
        // Mock auth check
        mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
        const chain = buildChain()
        // Auth check - profiles query
        chain.single.mockResolvedValueOnce({ data: { role: 'admin' } })
        // Upsert operation
        chain.upsert.mockResolvedValue({ error: null })

        const personData = {
            handle: 'person_1',
            display_name: 'Nguyễn Văn A',
            gender: 1,
        }

        const result = await upsertPerson(personData)
        expect(result).toEqual({ success: true })
    })

    it('should throw when upsert fails', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
        const chain = buildChain()
        chain.single.mockResolvedValueOnce({ data: { role: 'admin' } })
        chain.upsert.mockResolvedValue({ error: { message: 'DB error' } })

        await expect(upsertPerson({ handle: 'test' })).rejects.toThrow('DB error')
    })

    it('should reject non-admin/manager users', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'viewer-1' } } })
        const chain = buildChain()
        chain.single.mockResolvedValue({ data: { role: 'member' } })

        await expect(upsertPerson({ handle: 'test' })).rejects.toThrow('Từ chối truy cập')
    })
})

describe('deletePerson', () => {
    beforeEach(resetAllMocks)

    it('should delete person successfully as admin', async () => {
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
            if (table === 'people') {
                return {
                    delete: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ error: null }),
                    }),
                }
            }
            return buildChain()
        })

        const result = await deletePerson('person_handle_1')
        expect(result).toEqual({ success: true })
    })

    it('should throw if user is not logged in', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } })

        await expect(deletePerson('person_1')).rejects.toThrow('Chưa đăng nhập')
    })

    it('should reject non-admin users (manager cannot delete)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'mgr-1' } } })
        const chain = buildChain()
        chain.single.mockResolvedValueOnce({ data: { role: 'manager' } })

        await expect(deletePerson('person_1')).rejects.toThrow('Chỉ có Admin')
    })

    it('should throw when delete operation fails', async () => {
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
            if (table === 'people') {
                return {
                    delete: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ error: { message: 'FK constraint' } }),
                    }),
                }
            }
            return buildChain()
        })

        await expect(deletePerson('person_1')).rejects.toThrow('FK constraint')
    })
})
