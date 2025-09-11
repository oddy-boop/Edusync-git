import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAuthClient();

    // Verify user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'super_admin') {
      return NextResponse.json({ success: false, message: 'Super admin access required' }, { status: 403 });
    }

    // Get platform configuration
    const { data: config, error } = await supabase
      .from('platform_configuration')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    // Return default config if none exists
    const defaultConfig = {
      openai_api_key: '',
      gemini_api_key: '',
      claude_api_key: '',
      paystack_public_key: '',
      paystack_secret_key: '',
      paystack_webhook_secret: '',
      platform_name: 'EduSync Platform',
      platform_email: '',
      support_email: '',
      webhook_url: '',
      auto_collection_enabled: true,
      revenue_account_number: '',
      revenue_bank_code: ''
    };

    return NextResponse.json({
      success: true,
      config: config || defaultConfig
    });

  } catch (error) {
    console.error('Error fetching platform config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAuthClient();

    // Verify user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'super_admin') {
      return NextResponse.json({ success: false, message: 'Super admin access required' }, { status: 403 });
    }

    const config = await request.json();

    // Validate required fields
    if (!config.platform_name || !config.platform_email) {
      return NextResponse.json(
        { success: false, message: 'Platform name and email are required' },
        { status: 400 }
      );
    }

    // Check if configuration already exists
    const { data: existingConfig } = await supabase
      .from('platform_configuration')
      .select('id')
      .single();

    let result;
    if (existingConfig) {
      // Update existing configuration
      result = await supabase
        .from('platform_configuration')
        .update({
          ...config,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id);
    } else {
      // Insert new configuration
      result = await supabase
        .from('platform_configuration')
        .insert({
          ...config,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully'
    });

  } catch (error) {
    console.error('Error saving platform config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
