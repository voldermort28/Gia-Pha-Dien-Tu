import { NextRequest, NextResponse } from 'next/server';

/**
 * Tree overrides API - stores family/person overrides in Supabase
 * instead of the filesystem (which doesn't work on Vercel serverless).
 *
 * For now, overrides are stored client-side or not at all since
 * the main data comes from Supabase directly. This API returns
 * empty defaults safely.
 */

interface Overrides {
    families: Record<string, { children: string[] }>;
    persons: Record<string, { isLiving?: boolean }>;
}

const EMPTY_OVERRIDES: Overrides = { families: {}, persons: {} };

/** GET — return current overrides (empty - data lives in Supabase) */
export async function GET() {
    return NextResponse.json(EMPTY_OVERRIDES);
}

/** POST — accept overrides (no-op on Vercel, data goes to Supabase directly) */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // On Vercel we can't write to filesystem.
        // Return the body back as acknowledgment.
        return NextResponse.json({
            families: body.families || {},
            persons: body.persons || {},
        });
    } catch {
        return NextResponse.json(EMPTY_OVERRIDES);
    }
}

/** DELETE — reset all overrides */
export async function DELETE() {
    return NextResponse.json(EMPTY_OVERRIDES);
}
