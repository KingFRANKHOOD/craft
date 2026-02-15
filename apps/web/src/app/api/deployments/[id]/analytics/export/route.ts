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
            .select('user_id, name')
            .eq('id', params.id)
            .single();

        if (!deployment || deployment.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get query parameters
        const searchParams = req.nextUrl.searchParams;
        const startDate = searchParams.get('startDate')
            ? new Date(searchParams.get('startDate')!)
            : undefined;
        const endDate = searchParams.get('endDate')
            ? new Date(searchParams.get('endDate')!)
            : undefined;

        // Export analytics as CSV
        const csv = await analyticsService.exportAnalytics(
            params.id,
            startDate,
            endDate
        );

        // Return CSV file
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="analytics-${deployment.name}-${Date.now()}.csv"`,
            },
        });
    } catch (error: any) {
        console.error('Error exporting analytics:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to export analytics' },
            { status: 500 }
        );
    }
}
