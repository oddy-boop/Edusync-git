
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertCircle, School, PlusCircle, Building, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import Link from "next/link";

interface School {
  id: string;
  name: string;
  domain?: string | null;
  created_at: string;
}

const schoolSchema = z.object({
  name: z.string().min(3, "School name must be at least 3 characters long."),
  domain: z.string().optional().refine(val => !val || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val), {
    message: "Must be a valid domain name (e.g., portal.sjm.com)",
  }),
});
type SchoolFormData = z.infer<typeof schoolSchema>;

export default function SuperAdminSchoolsPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const isMounted = useRef(true);

  const [schools, setSchools] = useState<School[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: { name: "", domain: "" },
  });

  const fetchSchoolsAndCheckRole = async () => {
    if (!isMounted.current) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to view this page.");
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleError && roleError.code !== 'PGRST116') throw roleError;

      if (roleData?.role !== 'super_admin') {
        setIsSuperAdmin(false);
        setError("You do not have permission to manage schools.");
        setIsLoading(false);
        return;
      }
      
      setIsSuperAdmin(true);

      const { data: schoolsData, error: schoolsError } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (schoolsError) throw schoolsError;

      if (isMounted.current) {
        setSchools(schoolsData || []);
      }
    } catch (e: any) {
      console.error("Error loading schools/role:", e);
      if (isMounted.current) setError(`Failed to load data: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchSchoolsAndCheckRole();
    return () => { isMounted.current = false; };
  }, [supabase]);

  const onSubmit: SubmitHandler<SchoolFormData> = async (data) => {
    if (!isSuperAdmin) {
      toast({ title: "Permission Denied", description: "Only a Super Admin can create schools.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("schools")
        .insert({ name: data.name, domain: data.domain || null });

      if (insertError) {
        if (insertError.message.includes('duplicate key value violates unique constraint "schools_domain_key"')) {
            throw new Error(`The domain '${data.domain}' is already in use by another school.`);
        }
        throw insertError;
      }

      toast({ title: "Success", description: `School "${data.name}" has been created.` });
      form.reset();
      await fetchSchoolsAndCheckRole();
    } catch (e: any) {
      console.error("Error creating school:", e);
      toast({ title: "Error", description: `Could not create school: ${e.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying permissions and loading schools...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Access Denied</CardTitle></CardHeader>
        <CardContent>
          <p>{error || "You do not have the required permissions to view this page."}</p>
          <Button asChild className="mt-4"><Link href="/admin/dashboard">Return to Dashboard</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <Building className="mr-3 h-8 w-8" /> Platform Schools Management
      </h2>
      <CardDescription>
        As a Super Admin, you can create and manage all school instances on the platform.
      </CardDescription>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-lg flex items-center"><PlusCircle className="mr-2"/> Create New School</CardTitle></CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Greenhill International" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4"/> Custom Domain (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="portal.greenhill.com" {...field} />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create School
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardHeader><CardTitle className="text-lg flex items-center"><School className="mr-2"/> Registered Schools</CardTitle></CardHeader>
            <CardContent>
              {schools.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No schools have been created yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School Name</TableHead>
                        <TableHead>Custom Domain</TableHead>
                        <TableHead>Date Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schools.map((school) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">{school.name}</TableCell>
                          <TableCell className="font-mono text-xs">{school.domain || "Not set"}</TableCell>
                          <TableCell>{format(new Date(school.created_at), "PPP")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
