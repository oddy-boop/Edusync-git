
'use server';

import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const schoolSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(3, { message: 'School name must be at least 3 characters.' }),
  domain: z.string().regex(/^[a-z0-9-]+$/, { message: 'Subdomain can only contain lowercase letters, numbers, and hyphens.' }).optional().nullable(),
});

type FormState = {
  success: boolean;
  message: string;
}

export async function createOrUpdateSchoolAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleData?.role !== 'super_admin') {
    return { success: false, message: 'Permission denied. You must be a Super Admin.' };
  }

  const validatedFields = schoolSchema.safeParse({
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    name: formData.get('name'),
    domain: formData.get('domain') || null,
  });

  if (!validatedFields.success) {
    return { success: false, message: validatedFields.error.flatten().fieldErrors.name?.[0] || 'Validation failed.' };
  }

  const { id, name, domain } = validatedFields.data;

  try {
    if (id) {
      // Update
      const { error } = await supabase.from('schools').update({ name, domain, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return { success: true, message: 'School updated successfully.' };
    } else {
      // Create
      const { error } = await supabase.from('schools').insert({ name, domain });
      if (error) throw error;
      return { success: true, message: 'School created successfully.' };
    }
  } catch (error: any) {
    return { success: false, message: `Database error: ${error.message}` };
  }
}

export async function deleteSchoolAction({ schoolId }: { schoolId: number }): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
          },
        }
      );
    const { data: { user } } = await supabase.auth.getUser();
  
    if (!user) {
      return { success: false, message: 'Not authenticated.' };
    }
  
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    if (roleData?.role !== 'super_admin') {
      return { success: false, message: 'Permission denied.' };
    }
  
    try {
      const { error } = await supabase.from('schools').delete().eq('id', schoolId);
      if (error) throw error;
      return { success: true, message: 'School and all its data have been deleted.' };
    } catch (error: any) {
      return { success: false, message: `Database error: ${error.message}` };
    }
}
