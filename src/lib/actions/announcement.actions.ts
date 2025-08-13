
'use server';

import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms";
import { sendAnnouncementEmail } from "@/lib/email";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function fetchAnnouncementsAction(): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };
    
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User is not associated with a school" };

    try {
        const { data, error } = await supabase
            .from('school_announcements')
            .select('*')
            .eq('school_id', roleData.school_id)
            .order('created_at', { ascending: false });

        if(error) throw error;

        return { success: true, message: "Announcements fetched.", data };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

interface NewAnnouncement {
    title: string;
    message: string;
    target_audience: 'All' | 'Students' | 'Teachers';
}

export async function createAnnouncementAction(payload: NewAnnouncement): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };

    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User is not associated with a school" };
    
    try {
        const { title, message, target_audience } = payload;
        const author_name = user.user_metadata?.full_name || "Admin";

        const { data: savedAnnouncement, error } = await supabase
            .from('school_announcements')
            .insert({
                school_id: roleData.school_id,
                title,
                message,
                target_audience,
                author_id: user.id,
                author_name,
            })
            .select()
            .single();

        if (error) throw error;
        
        // Trigger notifications
        const { data: settingsData } = await supabase.from('schools').select('enable_email_notifications, enable_sms_notifications').eq('id', roleData.school_id).single();
          
        if (settingsData?.enable_email_notifications) {
            sendAnnouncementEmail({ title, message }, target_audience);
        }
        
        if (settingsData?.enable_sms_notifications) {
            const recipientsForSms: { phoneNumber: string }[] = [];
            if (target_audience === 'All' || target_audience === 'Students') {
                const { data: students } = await supabase.from('students').select('guardian_contact').eq('school_id', roleData.school_id).not('guardian_contact', 'is', null);
                if(students) recipientsForSms.push(...students.map(s => ({ phoneNumber: s.guardian_contact })));
            }
            if (target_audience === 'All' || target_audience === 'Teachers') {
                const { data: teachers } = await supabase.from('teachers').select('contact_number').eq('school_id', roleData.school_id).not('contact_number', 'is', null);
                if(teachers) recipientsForSms.push(...teachers.map(t => ({ phoneNumber: t.contact_number })));
            }
            if (recipientsForSms.length > 0) {
                sendSms({ message: `${title}: ${message}`, recipients: recipientsForSms });
            }
        }
        
        return { success: true, message: "Announcement posted.", data: savedAnnouncement };

    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteAnnouncementAction(announcementId: string): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };
    
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };
    
    try {
        const { error } = await supabase
            .from('school_announcements')
            .delete()
            .eq('id', announcementId)
            .eq('school_id', roleData.school_id);

        if (error) throw error;

        return { success: true, message: "Announcement deleted." };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
