'use server';

import { createClient } from "@/lib/supabase/server";

/**
 * Helper functions to check if notifications are enabled for a school
 */

export async function isEmailNotificationEnabled(schoolId: number): Promise<boolean> {
    const supabase = createClient();
    
    try {
        const { data, error } = await supabase
            .from('schools')
            .select('enable_email_notifications')
            .eq('id', schoolId)
            .single();
            
        if (error) {
            console.warn('Failed to check email notification setting, defaulting to true:', error);
            return true; // Default to enabled if we can't check
        }
        
        return data?.enable_email_notifications ?? true;
    } catch (e) {
        console.warn('Failed to check email notification setting, defaulting to true:', e);
        return true; // Default to enabled if there's an error
    }
}

export async function isSmsNotificationEnabled(schoolId: number): Promise<boolean> {
    const supabase = createClient();
    
    try {
        const { data, error } = await supabase
            .from('schools')
            .select('enable_sms_notifications')
            .eq('id', schoolId)
            .single();
            
        if (error) {
            console.warn('Failed to check SMS notification setting, defaulting to true:', error);
            return true; // Default to enabled if we can't check
        }
        
        return data?.enable_sms_notifications ?? true;
    } catch (e) {
        console.warn('Failed to check SMS notification setting, defaulting to true:', e);
        return true; // Default to enabled if there's an error
    }
}

/**
 * Combined function to get both notification settings at once
 */
export async function getNotificationSettings(schoolId: number): Promise<{
    emailEnabled: boolean;
    smsEnabled: boolean;
}> {
    const supabase = createClient();
    
    try {
        const { data, error } = await supabase
            .from('schools')
            .select('enable_email_notifications, enable_sms_notifications')
            .eq('id', schoolId)
            .single();
            
        if (error) {
            console.warn('Failed to check notification settings, defaulting to true:', error);
            return { emailEnabled: true, smsEnabled: true };
        }
        
        return {
            emailEnabled: data?.enable_email_notifications ?? true,
            smsEnabled: data?.enable_sms_notifications ?? true
        };
    } catch (e) {
        console.warn('Failed to check notification settings, defaulting to true:', e);
        return { emailEnabled: true, smsEnabled: true };
    }
}
