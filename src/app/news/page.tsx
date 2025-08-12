
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, AlertCircle, Calendar, School, Loader2 } from "lucide-react";
import { format } from "date-fns";
import PublicLayout from "@/components/layout/PublicLayout";
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import React from 'react';
import { getSubdomain } from '@/lib/utils';
import pool from "@/lib/db";

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  author_name?: string | null;
  published_at: string;
}

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    schoolAddress: string | null;
    schoolEmail: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    academicYear?: string | null;
    updated_at?: string;
}

function UnconfiguredAppFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <Alert variant="destructive" className="max-w-xl">
            <School className="h-5 w-5" />
            <AlertTitle>Welcome to EduSync!</AlertTitle>
            <AlertDescription>
                <p className="font-semibold">This school is not yet configured.</p>
                <p className="text-xs mt-2">
                  Please visit the main setup page to create the first administrator account and configure your school.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/auth/setup/super-admin">
                    Go to Super Admin Setup
                  </Link>
                </Button>
            </AlertDescription>
        </Alert>
    </div>
  );
}

export default function NewsPage() {
  const [newsPosts, setNewsPosts] = React.useState<NewsPost[]>([]);
  const [settings, setSettings] = React.useState<PageSettings | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchNewsData() {
        setIsLoading(true);
        // client-side logic placeholder
        setIsLoading(false);
    }
    fetchNewsData();
  }, []);

  if (isLoading) {
    return (
        <PublicLayout schoolName={null} logoUrl={null} socials={null} updated_at={undefined} schoolAddress={null} schoolEmail={null} academicYear={null}>
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        </PublicLayout>
    );
  }

  if (!settings && !isLoading) {
      return <UnconfiguredAppFallback />;
  }

  return (
    <PublicLayout 
        schoolName={settings?.schoolName} 
        logoUrl={settings?.logoUrl} 
        socials={settings?.socials} 
        updated_at={settings?.updated_at}
        schoolAddress={settings?.schoolAddress}
        schoolEmail={settings?.schoolEmail}
        academicYear={settings?.academicYear}
    >
       <div className="container mx-auto py-16 px-4">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">News & Updates</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            Stay up-to-date with the latest news, events, and important updates from our school.
          </p>
        </section>
        
        <section className="max-w-4xl mx-auto">
            {error ? (
                 <Card className="border-destructive bg-destructive/10">
                    <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error Loading News</CardTitle></CardHeader>
                    <CardContent><p>{error}</p></CardContent>
                </Card>
            ) : newsPosts.length === 0 ? (
                 <Card className="text-center py-12">
                    <CardHeader><CardTitle>No News Yet</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">There are currently no news items to display. Please check back later.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {newsPosts.map(post => (
                        <Card key={post.id} className="shadow-md overflow-hidden">
                          {post.image_url && (
                             <div className="relative h-64 w-full">
                                <Image src={post.image_url} alt={post.title} layout="fill" objectFit="cover" className="object-cover" />
                             </div>
                          )}
                          <CardHeader className="pb-3 pt-5 px-6">
                              <CardTitle className="text-xl md:text-2xl">{post.title}</CardTitle>
                              <CardDescription className="text-xs flex items-center gap-2">
                                  <Calendar className="h-3 w-3"/>
                                  <span>Published on {format(new Date(post.published_at), "PPP")}</span>
                                  {post.author_name && <span>by {post.author_name}</span>}
                              </CardDescription>
                          </CardHeader>
                          <CardContent className="px-6 pb-5">
                              <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                                {post.content}
                              </div>
                          </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
      </div>
    </PublicLayout>
  );
}
