
'use server';

import pool from "@/lib/db";
import { getSession } from "@/lib/session";
import { format } from "date-fns";
import type { PaymentDetailsForReceipt } from '@/components/shared/PaymentReceipt';

type ActionResponse = {
    success: boolean;
    message: string;
    data?: any;
    receiptData?: PaymentDetailsForReceipt | null;
}

export async function getArrears(): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn) {
        return { success: false, message: "Not authenticated" };
    }
    const client = await pool.connect();
    try {
        // First, get all arrears for the school
        const { rows: arrears } = await client.query('SELECT * FROM student_arrears WHERE school_id = $1', [session.schoolId]);
        
        // Then, get all students to map current grade level
        const { rows: students } = await client.query('SELECT student_id_display, grade_level FROM students WHERE school_id = $1', [session.schoolId]);
        const studentGradeMap = new Map(students.map(s => [s.student_id_display, s.grade_level]));

        const displayArrears = arrears.map(arrear => ({
            ...arrear,
            current_grade_level: studentGradeMap.get(arrear.student_id_display) || 'N/A'
        }));

        return { success: true, message: "Arrears fetched successfully", data: displayArrears };
    } catch (error: any) {
        console.error("Error fetching arrears:", error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
}

interface UpdateArrearPayload {
    arrearId: string;
    status: string;
    notes?: string | null;
    amountPaidNow?: number;
    originalArrearAmount: number;
}

export async function updateArrear(payload: UpdateArrearPayload): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
        return { success: false, message: "Not authenticated" };
    }

    const { arrearId, status, notes, amountPaidNow, originalArrearAmount } = payload;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let receiptData: PaymentDetailsForReceipt | null = null;
        let newOutstandingAmount = originalArrearAmount;

        // If a payment is made, record it
        if (amountPaidNow && amountPaidNow > 0) {
            const { rows: arrearDataRows } = await client.query('SELECT * FROM student_arrears WHERE id = $1', [arrearId]);
            if (arrearDataRows.length === 0) throw new Error("Arrear record not found.");
            const arrearData = arrearDataRows[0];
            
            const paymentIdDisplay = `AR-${Date.now()}`;
            await client.query(
                `INSERT INTO fee_payments 
                 (school_id, payment_id_display, student_id_display, student_name, grade_level, amount_paid, payment_date, payment_method, term_paid_for, notes, received_by_name, received_by_user_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    session.schoolId,
                    paymentIdDisplay,
                    arrearData.student_id_display,
                    arrearData.student_name,
                    arrearData.grade_level_at_arrear,
                    amountPaidNow,
                    format(new Date(), 'yyyy-MM-dd'),
                    'Cash',
                    'Arrears',
                    `Payment towards arrear from ${arrearData.academic_year_from}. ${notes || ''}`.trim(),
                    session.fullName,
                    session.userId
                ]
            );

            newOutstandingAmount = originalArrearAmount - amountPaidNow;
            
            // Get school branding for receipt
            const { rows: schoolRows } = await client.query('SELECT school_name, school_address, school_logo_url FROM schools WHERE id = $1', [session.schoolId]);
            const schoolBranding = schoolRows[0];
            
            receiptData = {
                paymentId: paymentIdDisplay,
                studentId: arrearData.student_id_display,
                studentName: arrearData.student_name,
                gradeLevel: arrearData.grade_level_at_arrear,
                amountPaid: amountPaidNow,
                paymentDate: format(new Date(), "PPP"),
                paymentMethod: 'Cash/Manual',
                termPaidFor: 'Arrears',
                notes: `Payment for arrear from ${arrearData.academic_year_from}.`,
                schoolName: schoolBranding?.school_name || "School",
                schoolLocation: schoolBranding?.school_address || "N/A",
                schoolLogoUrl: schoolBranding?.school_logo_url || null,
                receivedBy: session.fullName || "Admin",
            };
        }

        await client.query('UPDATE student_arrears SET status = $1, notes = $2, amount = $3, updated_at = now() WHERE id = $4', [status, notes, newOutstandingAmount < 0 ? 0 : newOutstandingAmount, arrearId]);

        await client.query('COMMIT');
        return { success: true, message: "Arrear updated successfully.", receiptData };
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Error updating arrear:", error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
}

export async function deleteArrear(arrearId: string): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn) {
        return { success: false, message: "Not authenticated" };
    }

    const client = await pool.connect();
    try {
        await client.query('DELETE FROM student_arrears WHERE id = $1 AND school_id = $2', [arrearId, session.schoolId]);
        return { success: true, message: "Arrear record deleted successfully." };
    } catch (error: any) {
        console.error("Error deleting arrear:", error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
}
