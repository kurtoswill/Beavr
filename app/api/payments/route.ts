/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { job_id, payment_method, amount, customer_id } = body;

        if (!job_id || !payment_method || !amount || !customer_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('id, customer_id, specialist_id, status')
            .eq('id', job_id)
            .single();

        if (jobError || !job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        if (job.customer_id && job.customer_id !== customer_id) {
            return NextResponse.json({ error: 'Unauthorized: ID mismatch' }, { status: 403 });
        }

        const { data: specialist, error: specError } = await supabase
            .from('specialists')
            .select('user_id, years_exp')
            .eq('id', job.specialist_id)
            .single() as { data: { user_id: string; years_exp: string | null } | null; error: any };

        if (specError || !specialist) {
            return NextResponse.json({ error: 'Specialist record not found' }, { status: 404 });
        }

        if (payment_method === 'GCash') {
            const { data: workerDetail } = await supabase
                .from('worker_details')
                .select('wallet_balance')
                .eq('id', specialist.user_id)
                .maybeSingle();

            const currentBalance = workerDetail?.wallet_balance || 0;
            const newBalance = currentBalance + Number(amount);

            const { error: walletError } = await (supabase as any)
                .from('worker_details')
                .upsert({
                    id: specialist.user_id,
                    user_id: job.specialist_id,
                    years_experience: specialist.years_exp ? parseInt(specialist.years_exp, 10) : 0,
                    wallet_balance: newBalance
                }, { onConflict: 'id' });

            if (walletError) {
                console.error("Wallet Error:", walletError);
                return NextResponse.json({ error: 'Wallet update failed: ' + walletError.message }, { status: 500 });
            }

            await (supabase as any)
                .from('jobs')
                .update({ status: 'paid' })
                .eq('id', job_id);
        }

        console.log('Payment processed successfully for job:', job_id);

        return NextResponse.json({
            success: true,
            message: 'Funds transferred successfully',
            amount,
        });

    } catch (error) {
        console.error('Payment API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}