
'use server';

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import type { PaymentDetailsForReceipt } from '@/components/shared/PaymentReceipt';
import { resolveAssetUrl } from '@/lib/supabase/storage.server';

type ActionResponse = {
    success: boolean;
    message: string;
    data?: any;
    receiptData?: PaymentDetailsForReceipt | null;
}

export async function getArrears(): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };
    
    try {
        const { data: arrears, error: arrearsError } = await supabase.from('student_arrears').select('*').eq('school_id', roleData.school_id);
        if(arrearsError) throw arrearsError;
        
        const { data: students, error: studentsError } = await supabase.from('students').select('student_id_display, grade_level').eq('school_id', roleData.school_id);
        if(studentsError) throw studentsError;
        
        const studentGradeMap = new Map(students.map(s => [s.student_id_display, s.grade_level]));

        const displayArrears = arrears.map(arrear => ({
            ...arrear,
            current_grade_level: studentGradeMap.get(arrear.student_id_display) || 'N/A'
        }));

        return { success: true, message: "Arrears fetched successfully", data: displayArrears };
    } catch (error: any) {
        console.error("Error fetching arrears:", error);
        return { success: false, message: error.message };
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };
    
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };

    const { arrearId, status, notes, amountPaidNow, originalArrearAmount } = payload;
    let receiptData: PaymentDetailsForReceipt | null = null;
    let newOutstandingAmount = originalArrearAmount;

    try {
        if (amountPaidNow && amountPaidNow > 0) {
            const { data: arrearData, error: arrearError } = await supabase.from('student_arrears').select('*').eq('id', arrearId).single();
            if (arrearError || !arrearData) throw new Error("Arrear record not found.");
            
            const paymentIdDisplay = `AR-${Date.now()}`;
            const paymentPayload = {
                school_id: roleData.school_id,
                payment_id_display: paymentIdDisplay,
                // keep canonical student_id_display uppercase to match other inserts
                student_id_display: String(arrearData.student_id_display || '').toUpperCase(),
                student_name: arrearData.student_name,
                grade_level: arrearData.grade_level_at_arrear,
                amount_paid: amountPaidNow,
                payment_date: format(new Date(), 'yyyy-MM-dd'),
                payment_method: 'Cash',
                term_paid_for: 'Arrears',
                notes: `Payment towards arrear from ${arrearData.academic_year_from}. ${notes || ''}`.trim(),
                received_by_name: user.user_metadata?.full_name || 'Admin',
                received_by_user_id: user.id,
                // try to include student auth id if present on arrear record
                student_auth_user_id: (arrearData as any).student_auth_user_id || null,
            };
            const { error: paymentError } = await supabase.from('fee_payments').insert(paymentPayload);
            if (paymentError) throw paymentError;

            newOutstandingAmount = originalArrearAmount - amountPaidNow;
            
                        const { data: schoolBranding } = await supabase.from('schools').select('name, address, logo_url').eq('id', roleData.school_id).single();
                        let schoolLogoUrl = schoolBranding?.logo_url || null;
                        if (schoolLogoUrl) {
                            try {
                                const resolved = await resolveAssetUrl(schoolLogoUrl);
                                schoolLogoUrl = resolved ?? schoolLogoUrl;
                            } catch (e) {
                                // ignore and keep existing value
                            }
                        }

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
                                schoolName: schoolBranding?.name || "School",
                                schoolLocation: schoolBranding?.address || "N/A",
                                schoolLogoUrl: schoolLogoUrl,
                                receivedBy: user.user_metadata?.full_name || "Admin",
                        };
        }

        const { error: updateError } = await supabase
            .from('student_arrears')
            .update({ status, notes, amount: newOutstandingAmount < 0 ? 0 : newOutstandingAmount, updated_at: new Date().toISOString() })
            .eq('id', arrearId);
        if(updateError) throw updateError;
        
        return { success: true, message: "Arrear updated successfully.", receiptData };
    } catch (error: any) {
        console.error("Error updating arrear:", error);
        return { success: false, message: error.message };
    }
}

export async function deleteArrear(arrearId: string): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };

    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };

    try {
        await supabase.from('student_arrears').delete().eq('id', arrearId).eq('school_id', roleData.school_id);
        return { success: true, message: "Arrear record deleted successfully." };
    } catch (error: any) {
        console.error("Error deleting arrear:", error);
        return { success: false, message: error.message };
    }
}
