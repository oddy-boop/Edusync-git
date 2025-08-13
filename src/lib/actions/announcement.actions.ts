
'use server';

import pool from "@/lib/db";
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
    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            'SELECT * FROM school_announcements WHERE school_id = $1 ORDER BY created_at DESC',
            [session.schoolId]
        );
        return { success: true, message: "Announcements fetched.", data: rows };
    } catch (e: any) {
        return { success: false, message: e.message };
    } finally {
        client.release();
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

    const client = await pool.connect();
    try {
        const { title, message, target_audience } = payload;
        const author_name = session.fullName || "Admin";

        const { rows } = await client.query(
            'INSERT INTO school_announcements (school_id, title, message, target_audience, author_id, author_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [session.schoolId, title, message, target_audience, session.userId, author_name]
        );
        const savedAnnouncement = rows[0];

        // Trigger notifications
        const { rows: settingsDataRows } = await client.query('SELECT enable_email_notifications, enable_sms_notifications FROM schools WHERE id = $1', [session.schoolId]);
        const settingsData = settingsDataRows[0];
          
        if (settingsData?.enable_email_notifications) {
            sendAnnouncementEmail({ title, message }, target_audience);
        }
        
        if (settingsData?.enable_sms_notifications) {
            const recipientsForSms: { phoneNumber: string }[] = [];
            if (target_audience === 'All' || target_audience === 'Students') {
                const { rows: students } = await client.query('SELECT guardian_contact FROM students WHERE school_id = $1 AND guardian_contact IS NOT NULL', [session.schoolId]);
                recipientsForSms.push(...students.map(s => ({ phoneNumber: s.guardian_contact })));
            }
            if (target_audience === 'All' || target_audience === 'Teachers') {
                const { rows: teachers } = await client.query('SELECT contact_number FROM teachers WHERE school_id = $1 AND contact_number IS NOT NULL', [session.schoolId]);
                recipientsForSms.push(...teachers.map(t => ({ phoneNumber: t.contact_number })));
            }
            if (recipientsForSms.length > 0) {
                sendSms({ message: `${title}: ${message}`, recipients: recipientsForSms });
            }
        }
        
        return { success: true, message: "Announcement posted.", data: savedAnnouncement };

    } catch (e: any) {
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}

export async function deleteAnnouncementAction(announcementId: string): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) {
        return { success: false, message: "Not authenticated" };
    }

    const client = await pool.connect();
    try {
        const { rowCount } = await client.query(
            'DELETE FROM school_announcements WHERE id = $1 AND school_id = $2',
            [announcementId, session.schoolId]
        );
        if (rowCount === 0) {
            return { success: false, message: "Announcement not found or you do not have permission to delete it." };
        }
        return { success: true, message: "Announcement deleted." };
    } catch (e: any) {
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}
