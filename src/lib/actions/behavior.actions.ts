
'use server';

import pool from "@/lib/db";
import { getSession } from "@/lib/session";
import { format } from "date-fns";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function fetchIncidentsAction(): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) {
        return { success: false, message: "Not authenticated" };
    }
    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            'SELECT * FROM behavior_incidents WHERE school_id = $1 ORDER BY date DESC, created_at DESC',
            [session.schoolId]
        );
        return { success: true, message: "Incidents fetched.", data: rows };
    } catch (e: any) {
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}

interface IncidentPayload {
    type: string;
    description: string;
    date: Date;
    id?: string;
}

export async function updateIncidentAction(incidentId: string, payload: IncidentPayload): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) {
        return { success: false, message: "Not authenticated" };
    }
    const client = await pool.connect();
    try {
        const incidentUpdatePayload = {
            type: payload.type,
            description: payload.description,
            date: format(payload.date, "yyyy-MM-dd"),
            updated_at: new Date().toISOString(),
        };

        const { rowCount } = await client.query(
            'UPDATE behavior_incidents SET type = $1, description = $2, date = $3, updated_at = $4 WHERE id = $5 AND school_id = $6',
            [incidentUpdatePayload.type, incidentUpdatePayload.description, incidentUpdatePayload.date, incidentUpdatePayload.updated_at, incidentId, session.schoolId]
        );
        if(rowCount === 0) {
            return { success: false, message: "Incident not found or you do not have permission to update it." };
        }
        return { success: true, message: "Incident updated." };
    } catch (e: any) {
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}

export async function deleteIncidentAction(incidentId: string): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) {
        return { success: false, message: "Not authenticated" };
    }
    const client = await pool.connect();
    try {
        const { rowCount } = await client.query(
            'DELETE FROM behavior_incidents WHERE id = $1 AND school_id = $2',
            [incidentId, session.schoolId]
        );
        if (rowCount === 0) {
            return { success: false, message: "Incident not found or you do not have permission to delete it." };
        }
        return { success: true, message: "Incident deleted." };
    } catch (e: any) {
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}

    