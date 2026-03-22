import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { job_id, payment_method, amount, customer_id } = body;

        // 1. Basic validation
        if (!job_id || !payment_method || !amount || !customer_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 2. Get job details
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('id, customer_id, specialist_id, status')
            .eq('id', job_id)
            .single();

        if (jobError || !job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // 3. Verify Customer
        if (job.customer_id !== customer_id) {
            return NextResponse.json({ error: 'Unauthorized: ID mismatch' }, { status: 403 });
        }

        // 4. Get the Worker's ID
        const { data: specialist, error: specError } = await supabase
            .from('specialists')
            .select('user_id')
            .eq('id', job.specialist_id)
            .single();

        if (specError || !specialist) {
            return NextResponse.json({ error: 'Specialist record not found' }, { status: 404 });
        }

        // 5. LOGIC: Process Wallet Update (Improved with Upsert)
        if (payment_method === 'GCash') {
            // First, try to get the current balance
            const { data: workerDetail } = await supabase
                .from('worker_details')
                .select('wallet_balance')
                .eq('id', specialist.user_id)
                .maybeSingle();

            const currentBalance = workerDetail?.wallet_balance || 0;
            const newBalance = currentBalance + Number(amount);

            // Use UPSERT: This creates the row if it's missing, or updates it if it exists
            const { error: walletError } = await supabase
                .from('worker_details')
                .upsert({
                    id: specialist.user_id,
                    wallet_balance: newBalance
                }, { onConflict: 'id' });

            if (walletError) {
                console.error("Wallet Error:", walletError);
                return NextResponse.json({ error: 'Wallet update failed: ' + walletError.message }, { status: 500 });
            }
        }

        // 6. Log payment confirmation (job status stays 'completed')
        // Payment is tracked separately - wallet update above confirms the transfer
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