
'use client';

import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Target, Users, TrendingUp, Lightbulb, Loader2 } from "lucide-react";
import Image from 'next/image';
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import React from 'react';
import { getSubdomain } from '@/lib/utils';
import pool from "@/lib/db";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    schoolAddress: string | null;
    schoolEmail: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    missionText: string | null;
    visionText: string | null;
    imageUrl: string | null;
    teamMembers: TeamMember[];
    academicYear?: string | null;
    updated_at?: string;
}

const safeParseJson = (jsonString: any, fallback: any[] = []) => {
  if (Array.isArray(jsonString)) {
    return jsonString;
  }
  if (typeof jsonString === 'string') {
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
};

const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url) return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
}

export default function AboutPage() {
  const [settings, setSettings] = React.useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchAboutPageSettings() {
        // This is a client-side fetch now
    }
    fetchAboutPageSettings();
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

  const finalImageUrl = generateCacheBustingUrl(settings?.imageUrl, settings?.updated_at) || "https://placehold.co/600x400.png";

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
        <AnimatedSection className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">About {settings?.schoolName || 'Us'}</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            We are dedicated to revolutionizing school management by providing a seamless, integrated platform that connects administrators, teachers, students, and parents.
          </p>
        </AnimatedSection>

        <AnimatedSection className="grid md:grid-cols-2 gap-12 mb-16 items-center">
            <div className="order-2 md:order-1">
                <h2 className="text-3xl font-bold text-primary font-headline mb-4 flex items-center"><Target className="mr-3 h-8 w-8 text-accent" /> Our Mission</h2>
                <p className="text-muted-foreground mb-6">
                    {settings?.missionText || "The school's mission statement has not been set yet."}
                </p>
                <h2 className="text-3xl font-bold text-primary font-headline mb-4 flex items-center"><TrendingUp className="mr-3 h-8 w-8 text-accent" /> Our Vision</h2>
                <p className="text-muted-foreground">
                    {settings?.visionText || "The school's vision statement has not been set yet."}
                </p>
            </div>
            <div className="order-1 md:order-2">
                <Image 
                  src={finalImageUrl}
                  alt="Collaborative team working on laptops" 
                  width={600} 
                  height={400} 
                  className="rounded-lg shadow-lg"
                  data-ai-hint="collaboration team"
                />
            </div>
        </AnimatedSection>

        {settings?.teamMembers && settings.teamMembers.length > 0 && (
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary font-headline mb-8">Meet the Team</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {settings.teamMembers.map((member) => (
                <div key={member.id} className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={generateCacheBustingUrl(member.imageUrl, settings?.updated_at) || `https://placehold.co/100x100.png`} alt={member.name} data-ai-hint="person portrait" />
                    <AvatarFallback>{member.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-primary">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        )}
        
        <AnimatedSection>
          <h2 className="text-3xl font-bold text-primary font-headline text-center mb-8">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-6 w-6 text-yellow-500" /> Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Continuously improving and innovating to meet the evolving needs of modern education.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6 text-blue-500" /> User-Centricity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Placing the needs and experiences of our users at the heart of everything we build.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Target className="mr-2 h-6 w-6 text-green-500" /> Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Operating with transparency and honesty, ensuring data security and reliability.</p>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>
      </div>
    </PublicLayout>
  );
}
