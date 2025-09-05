
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

    try {
        const { data, error } = await supabase
            .from('school_announcements')
            .select('*')
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
    
    try {
        const { title, message, target_audience } = payload;
        const author_name = "Admin";

        const { data: savedAnnouncement, error } = await supabase
            .from('school_announcements')
            .insert({
                title,
                message,
                target_audience,
                author_name,
            })
            .select()
            .single();

        if (error) throw error;
        
        return { success: true, message: "Announcement posted.", data: savedAnnouncement };

    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteAnnouncementAction(announcementId: string): Promise<ActionResponse> {
    const supabase = createClient();
    
    try {
        const { error } = await supabase
            .from('school_announcements')
            .delete()
            .eq('id', announcementId);

        if (error) throw error;

        return { success: true, message: "Announcement deleted." };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
