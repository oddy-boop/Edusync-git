
'use server';

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function fetchIncidentsAction(): Promise<ActionResponse> {
    const supabase = createClient();

    try {
        const { data, error } = await supabase
            .from('behavior_incidents')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        return { success: true, message: "Incidents fetched.", data };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

interface IncidentPayload {
    type: string;
    description: string;
    date: Date;
    id?: string;
}

export async function updateIncidentAction(incidentId: string, payload: IncidentPayload): Promise<ActionResponse> {
    const supabase = createClient();

    try {
        const incidentUpdatePayload = {
            type: payload.type,
            description: payload.description,
            date: format(payload.date, "yyyy-MM-dd"),
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('behavior_incidents')
            .update(incidentUpdatePayload)
            .eq('id', incidentId);
        
        if(error) {
            return { success: false, message: `Could not update incident: ${error.message}` };
        }
        return { success: true, message: "Incident updated." };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteIncidentAction(incidentId: string): Promise<ActionResponse> {
    const supabase = createClient();
    
    try {
        const { error } = await supabase
            .from('behavior_incidents')
            .delete()
            .eq('id', incidentId);

        if (error) {
            return { success: false, message: `Could not delete incident: ${error.message}` };
        }
        return { success: true, message: "Incident deleted." };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
