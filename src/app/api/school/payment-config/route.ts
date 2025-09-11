import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAuthClient();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Get user's school ID
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('school_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userRole?.school_id || !['admin', 'teacher'].includes(userRole.role)) {
      return NextResponse.json({ success: false, message: 'School admin access required' }, { status: 403 });
    }

    // Get school payment configuration
    const { data: config, error } = await supabase
      .from('school_payment_configs')
      .select(`
        paystack_public_key,
        paystack_secret_key,
        paystack_subaccount_code,
        stripe_account_id,
        stripe_account_status,
        preferred_gateway,
        auto_split_enabled
      `)
      .eq('school_id', userRole.school_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    // Return default config if none exists
    const defaultConfig = {
      paystack_public_key: '',
      paystack_secret_key: '',
      paystack_subaccount_code: '',
      stripe_account_id: '',
      stripe_account_status: '',
      preferred_gateway: 'paystack',
      auto_split_enabled: true
    };

    return NextResponse.json({
      success: true,
      config: config || defaultConfig
    });

  } catch (error) {
    console.error('Error fetching school payment config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthClient();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Get user's school ID
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('school_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userRole?.school_id || !['admin', 'teacher'].includes(userRole.role)) {
      return NextResponse.json({ success: false, message: 'School admin access required' }, { status: 403 });
    }

    const config = await request.json();

    // Validate required fields
    if (!config.preferred_gateway || !['paystack', 'stripe'].includes(config.preferred_gateway)) {
      return NextResponse.json(
        { success: false, message: 'Valid preferred gateway is required' },
        { status: 400 }
      );
    }

    // Check if configuration already exists
    const { data: existingConfig } = await supabase
      .from('school_payment_configs')
      .select('id')
      .eq('school_id', userRole.school_id)
      .single();

    let result;
    if (existingConfig) {
      // Update existing configuration
      result = await supabase
        .from('school_payment_configs')
        .update({
          paystack_public_key: config.paystack_public_key || null,
          paystack_secret_key: config.paystack_secret_key || null,
          paystack_subaccount_code: config.paystack_subaccount_code || null,
          stripe_account_id: config.stripe_account_id || null,
          stripe_account_status: config.stripe_account_status || null,
          preferred_gateway: config.preferred_gateway,
          auto_split_enabled: config.auto_split_enabled ?? true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id);
    } else {
      // Insert new configuration
      result = await supabase
        .from('school_payment_configs')
        .insert({
          school_id: userRole.school_id,
          paystack_public_key: config.paystack_public_key || null,
          paystack_secret_key: config.paystack_secret_key || null,
          paystack_subaccount_code: config.paystack_subaccount_code || null,
          stripe_account_id: config.stripe_account_id || null,
          stripe_account_status: config.stripe_account_status || null,
          preferred_gateway: config.preferred_gateway,
          auto_split_enabled: config.auto_split_enabled ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({
      success: true,
      message: 'Payment configuration saved successfully'
    });

  } catch (error) {
    console.error('Error saving school payment config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
