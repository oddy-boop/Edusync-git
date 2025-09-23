import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACADEMIC_RESULT_APPROVAL_STATUSES } from "@/lib/constants";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  if (!schoolId) {
    return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
  }
  const supabase = createClient();
  // Fetch pending results
  const { data: results, error: resultsError } = await supabase
    .from("student_results")
    .select("*")
    .eq("school_id", schoolId)
    .eq("approval_status", ACADEMIC_RESULT_APPROVAL_STATUSES.PENDING)
    .order("created_at", { ascending: true });
  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }
  // Fetch school info for enrichment (bypassing RLS)
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .single();
  if (schoolError) {
    // Don't block results if school fetch fails, but include error
    return NextResponse.json({ data: results, school: null, schoolError: schoolError.message });
  }
  return NextResponse.json({ data: results, school });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { resultId, updatePayload } = body;
  if (!resultId || !updatePayload) {
    return NextResponse.json({ error: "Missing resultId or updatePayload" }, { status: 400 });
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("student_results")
    .update(updatePayload)
    .eq("id", resultId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
