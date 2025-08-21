import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase";

async function getSchools() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });

  const { data: schools, error } = await supabase.from("schools").select("*");

  if (error) {
    console.error("Error fetching schools:", error);
    throw error;
  }

  return schools;
}

export default async function SchoolsPage() {
  const schools = await getSchools();

  return (
    <div>{/* Your existing JSX here, but now with proper async data */}</div>
  );
}
