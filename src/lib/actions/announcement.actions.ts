
'use server';

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { sendSms } from "@/lib/sms";
import { sendAnnouncementEmail } from "@/lib/email";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function fetchAnnouncementsAction(): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) {
        return { success: false, message: "Not authenticated" };
    }
    const supabase = createClient();
    try {
        const { data, error } = await supabase
            .from('school_announcements')
            .select('*')
            .eq('school_id', session.schoolId)
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
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId || !session.userId) {
        return { success: false, message: "Not authenticated" };
    }

    const supabase = createClient();
    try {
        const { title, message, target_audience } = payload;
        const author_name = session.fullName || "Admin";

        const { data: savedAnnouncement, error } = await supabase
            .from('school_announcements')
            .insert({
                school_id: session.schoolId,
                title,
                message,
                target_audience,
                author_id: session.userId,
                author_name,
            })
            .select()
            .single();

        if (error) throw error;
        
        // Trigger notifications
        const { data: settingsData } = await supabase.from('schools').select('enable_email_notifications, enable_sms_notifications').eq('id', session.schoolId).single();
          
        if (settingsData?.enable_email_notifications) {
            sendAnnouncementEmail({ title, message }, target_audience);
        }
        
        if (settingsData?.enable_sms_notifications) {
            const recipientsForSms: { phoneNumber: string }[] = [];
            if (target_audience === 'All' || target_audience === 'Students') {
                const { data: students } = await supabase.from('students').select('guardian_contact').eq('school_id', session.schoolId).not('guardian_contact', 'is', null);
                if(students) recipientsForSms.push(...students.map(s => ({ phoneNumber: s.guardian_contact })));
            }
            if (target_audience === 'All' || target_audience === 'Teachers') {
                const { data: teachers } = await supabase.from('teachers').select('contact_number').eq('school_id', session.schoolId).not('contact_number', 'is', null);
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
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) {
        return { success: false, message: "Not authenticated" };
    }
    
    const supabase = createClient();
    try {
        const { error } = await supabase
            .from('school_announcements')
            .delete()
            .eq('id', announcementId)
            .eq('school_id', session.schoolId);

        if (error) throw error;

        return { success: true, message: "Announcement deleted." };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
