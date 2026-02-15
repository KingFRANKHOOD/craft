import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { healthMonitorService } from '@/services/health-monitor.service';

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

        // Check deployment health
        const health = await healthMonitorService.checkDeploymentHealth(params.id);

        return NextResponse.json(health);
    } catch (error: any) {
        console.error('Error checking deployment health:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to check deployment health' },
            { status: 500 }
        );
    }
}
