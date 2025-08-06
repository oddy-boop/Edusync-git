// To deploy this function:
// 1. In your Supabase project, go to "Database" > "Functions".
// 2. Click "Create a new function", name it "send-fee-reminders".
// 3. Copy and paste the entire content of this file into the editor.
// 4. Click "Create function".
//
// To schedule this function to run automatically (e.g., every two weeks):
// 1. In your Supabase project, go to "Database" > "Cron Jobs".
// 2. Click "New cron job".
// 3. Give it a name, e.g., "Fortnightly Fee Reminders".
// 4. In the "Expression" field, use a cron expression. For every two weeks at 9 AM, you might use '0 9 */14 * *'.
// 5. In the "Function to run" dropdown, select your `send-fee-reminders` function.
// 6. Click "Create job".

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@3';

// Define types for better code clarity
interface AppSettings {
  school_name: string;
  school_email: string;
  resend_api_key: string | null;
  current_academic_year: string;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
}

interface Student {
  student_id_display: string;
  full_name: string;
  grade_level: string;
  contact_email: string | null;
  guardian_contact: string | null;
  total_paid_override: number | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Helper Functions ---

// Helper to format Ghanaian phone numbers to E.164 standard for Twilio
function formatPhoneNumberToE164(phoneNumber: string): string | null {
  if (!phoneNumber || typeof phoneNumber !== 'string') return null;
  
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+233${cleaned.substring(1)}`;
  }
  
  console.warn(`Could not format phone number "${phoneNumber}" to E.164. Skipping.`);
  return null;
}

// --- Main Function Logic ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Best practice: Ensure the function is called securely.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`) {
     // For scheduled jobs, sometimes a different key might be needed, but anon key is a safe default.
     // For higher security, use a custom secret passed in the header.
     console.warn("Unauthorized attempt to run fee reminder function.");
     // We don't return 401 to prevent revealing function existence, just log and exit.
     return new Response('Request processed.', { status: 200, headers: corsHeaders });
  }

  try {
    // --- Initialization ---
    const supabaseAdmin: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Fetch Settings ---
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('app_settings')
      .select('school_name, school_email, resend_api_key, current_academic_year, enable_email_notifications, enable_sms_notifications')
      .eq('id', 1)
      .single();

    if (settingsError) throw new Error(`DB Error: Could not fetch settings. ${settingsError.message}`);
    if (!settings) throw new Error("App settings not found.");

    const {
      school_name,
      school_email,
      resend_api_key,
      current_academic_year,
      enable_email_notifications,
      enable_sms_notifications
    } = settings as AppSettings;

    if (!current_academic_year) throw new Error("Current academic year is not set in settings.");

    // --- Fetch All Necessary Data ---
    const { data: students } = await supabaseAdmin.from('students').select<string, Student>('student_id_display, full_name, grade_level, contact_email, guardian_contact, total_paid_override');
    const { data: feeItems } = await supabaseAdmin.from('school_fee_items').select('grade_level, amount').eq('academic_year', current_academic_year);
    const startYear = current_academic_year.split('-')[0];
    const endYear = current_academic_year.split('-')[1];
    const { data: payments } = await supabaseAdmin.from('fee_payments').select('student_id_display, amount_paid').gte('payment_date', `${startYear}-08-01`).lte('payment_date', `${endYear}-07-31`);

    // --- Process Data to Find Balances ---
    const paymentsByStudent = (payments || []).reduce((acc, p) => {
      acc[p.student_id_display] = (acc[p.student_id_display] || 0) + p.amount_paid;
      return acc;
    }, {} as Record<string, number>);

    const feesByGrade = (feeItems || []).reduce((acc, f) => {
      acc[f.grade_level] = (acc[f.grade_level] || 0) + f.amount;
      return acc;
    }, {} as Record<string, number>);

    const studentsWithBalance = (students || []).map(student => {
      const totalDue = feesByGrade[student.grade_level] || 0;
      const totalPaid = student.total_paid_override ?? paymentsByStudent[student.student_id_display] ?? 0;
      const balance = totalDue - totalPaid;
      return { ...student, balance };
    }).filter(s => s.balance > 0);

    if (studentsWithBalance.length === 0) {
      return new Response(JSON.stringify({ message: "No students with outstanding balances found." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    let emailResults = { sent: 0, failed: 0, message: "Email notifications disabled or not configured." };
    let smsResults = { sent: 0, failed: 0, message: "SMS notifications disabled or not configured." };

    // --- Send Email Reminders ---
    const canSendEmail = enable_email_notifications && resend_api_key && !resend_api_key.includes("YOUR_") && school_email;
    if (canSendEmail) {
      const resend = new Resend(resend_api_key);
      const emailFromAddress = Deno.env.get('EMAIL_FROM_ADDRESS') || `noreply@${school_name.toLowerCase().replace(/\s/g, '')}.com`;
      
      const emailsToSend = studentsWithBalance
        .filter(student => student.contact_email)
        .map(student => ({
            from: `${school_name} <${emailFromAddress}>`,
            to: student.contact_email!,
            subject: `Gentle Fee Reminder from ${school_name}`,
            html: `<p>Dear Parent/Guardian of ${student.full_name},</p><p>This is a friendly reminder regarding the outstanding balance of <strong>GHS ${student.balance.toFixed(2)}</strong> for the ${current_academic_year} academic year. Please settle the amount at your earliest convenience.</p><p>Thank you,<br/>${school_name} Administration</p>`,
        }));

      if (emailsToSend.length > 0) {
        const { data, error } = await resend.batch.send(emailsToSend);
        if (error) {
           emailResults.message = `Failed to send batch emails: ${error.message}`;
           emailResults.failed = emailsToSend.length;
        } else {
           emailResults.sent = data?.created_at ? emailsToSend.length : 0;
           emailResults.message = `Batch email job created. Sent: ${emailResults.sent}.`;
        }
      } else {
        emailResults.message = "No students with balances had valid email addresses.";
      }
    } else {
      console.log("Skipping email reminders due to missing configuration (enable_email_notifications=false, or missing resend_api_key/school_email).");
    }

    // --- Send SMS Reminders ---
    if (enable_sms_notifications) {
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioSender = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') || Deno.env.get('TWILIO_PHONE_NUMBER');

      if (twilioAccountSid && twilioAuthToken && twilioSender) {
        let sentCount = 0;
        let failedCount = 0;
        for (const student of studentsWithBalance) {
          const formattedNumber = formatPhoneNumberToE164(student.guardian_contact || '');
          if (!formattedNumber) {
            failedCount++;
            continue;
          }
          
          const smsBody = `Dear parent of ${student.full_name}, a friendly reminder of an outstanding school fee balance of GHS ${student.balance.toFixed(2)}. Thank you. -${school_name}`;
          const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          
          const details: Record<string, string> = { To: formattedNumber, Body: smsBody };
          if(twilioSender.startsWith('MG')) {
              details.MessagingServiceSid = twilioSender;
          } else {
              details.From = twilioSender;
          }

          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
              },
              body: new URLSearchParams(details).toString(),
            });
            if (response.ok) {
              sentCount++;
            } else {
              failedCount++;
            }
          } catch {
              failedCount++;
          }
        }
        smsResults = { sent: sentCount, failed: failedCount, message: `Attempted to send ${sentCount + failedCount} SMS. Success: ${sentCount}, Failed: ${failedCount}.` };
      } else {
          console.log("Skipping SMS reminders due to missing Twilio configuration.");
          smsResults.message = "SMS service is not fully configured in settings or environment variables.";
      }
    }

    return new Response(JSON.stringify({ 
        message: "Fee reminder process completed.",
        students_with_balance: studentsWithBalance.length,
        email_results: emailResults,
        sms_results: smsResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in fee reminder function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
