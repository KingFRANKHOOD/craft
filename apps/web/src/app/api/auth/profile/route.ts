import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { authService } from '@/services/auth.service';

const profileUpdateSchema = z.object({
    fullName: z.string().min(1).max(100).optional(),
    avatarUrl: z.string().url().optional(),
    email: z.string().email().optional(),
}).strict();

export const PATCH = withAuth(async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    if (Object.keys(parsed.data).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    try {
        const updated = await authService.updateProfile(user.id, parsed.data);
        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update profile' },
            { status: 500 }
        );
    }
});
