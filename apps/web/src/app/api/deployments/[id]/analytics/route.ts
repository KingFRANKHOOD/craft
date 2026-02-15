import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyticsService } from '@/services/analytics.service';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();

        // Authenticate user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user owns the deployment
        const { data: deployment } = await supabase
            .from('deployments')
            .select('user_id')
            .eq('id', params.id)
            .single();

        if (!deployment || deployment.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get query parameters
        const searchParams = req.nextUrl.searchParams;
        const metricType = searchParams.get('metricType') || undefined;
        const startDate = searchParams.get('startDate')
            ? new Date(searchParams.get('startDate')!)
            : undefined;
        const endDate = searchParams.get('endDate')
            ? new Date(searchParams.get('endDate')!)
            : undefined;

        // Get analytics
        const analytics = await analyticsService.getAnalytics(
            params.id,
            metricType,
            startDate,
            endDate
        );

        // Get summary
        const summary = await analyticsService.getAnalyticsSummary(params.id);

        return NextResponse.json({
            analytics,
            summary,
        });
    } catch (error: any) {
        console.error('Error getting analytics:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get analytics' },
            { status: 500 }
        );
    }
}
