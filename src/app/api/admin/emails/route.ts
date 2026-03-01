import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role and get school_id
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, school_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profileData || !['admin', 'super_admin', 'accountant'].includes(profileData.role)) {
      return NextResponse.json({ error: "Forbidden - Admin/Accountant access required" }, { status: 403 });
    }

    const schoolId = profileData.school_id;
    if (!schoolId) {
      return NextResponse.json({ error: "School ID not found" }, { status: 400 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('emails')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,sender_name.ilike.%${search}%,sender_email.ilike.%${search}%,message.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: emails, error: emailsError } = await query;

    if (emailsError) {
      console.error('Error fetching emails:', emailsError);
      return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
    }

    return NextResponse.json({ emails: emails || [] });

  } catch (error) {
    console.error('Emails API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role and get school_id
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, school_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profileData || !['admin', 'super_admin', 'accountant'].includes(profileData.role)) {
      return NextResponse.json({ error: "Forbidden - Admin/Accountant access required" }, { status: 403 });
    }

    const body = await request.json();
    const { emailId, action, status } = body;

    if (!emailId || !action) {
      return NextResponse.json({ error: "Email ID and action are required" }, { status: 400 });
    }

    let updateData: any = { updated_at: new Date().toISOString() };

    switch (action) {
      case 'mark_read':
        updateData.status = 'read';
        updateData.read_at = new Date().toISOString();
        break;
      case 'mark_unread':
        updateData.status = 'unread';
        updateData.read_at = null;
        break;
      case 'archive':
        updateData.status = 'archived';
        break;
      case 'update_status':
        if (status) {
          updateData.status = status;
        }
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('emails')
      .update(updateData)
      .eq('id', emailId)
      .eq('school_id', profileData.school_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating email:', error);
      return NextResponse.json({ error: "Failed to update email" }, { status: 500 });
    }

    return NextResponse.json({ email: data });

  } catch (error) {
    console.error('Email update API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
