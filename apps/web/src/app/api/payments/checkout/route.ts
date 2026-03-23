import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { paymentService } from '@/services/payment.service';

export const POST = withAuth(async (req: NextRequest, { user }) => {
    const { priceId } = await req.json();

    if (!priceId) {
        return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    try {
        const session = await paymentService.createCheckoutSession(user.id, priceId);
        return NextResponse.json(session);
    } catch (error: any) {
        console.error('Error creating checkout session:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session' },
            { status: 500 }
        );
    }
});
