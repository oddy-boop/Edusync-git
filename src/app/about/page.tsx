
'use client';
import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Target, Users, TrendingUp, Lightbulb } from "lucide-react";
import Image from 'next/image';
import { getSupabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    missionText: string | null;
    visionText: string | null;
    imageUrl: string | null;
    teamMembers: TeamMember[];
    updated_at?: string;
}

export default function AboutPage() {
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAboutPageSettings() {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.from('app_settings')
          .select('school_name, school_logo_url, facebook_url, twitter_url, instagram_url, linkedin_url, about_mission, about_vision, about_image_url, team_members, updated_at')
          .single();

        if (error) {
          console.error("Error fetching settings for about page:", error);
          // Provide default settings in case of an error
          setSettings({
            schoolName: 'EduSync',
            logoUrl: null,
            socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
            missionText: "Mission text not set.",
            visionText: "Vision text not set.",
            imageUrl: "https://placehold.co/600x400.png",
            teamMembers: [],
          });
        } else {
          setSettings({
            schoolName: data?.school_name,
            logoUrl: data?.school_logo_url,
            socials: {
              facebook: data?.facebook_url,
              twitter: data?.twitter_url,
              instagram: data?.instagram_url,
              linkedin: data?.linkedin_url,
            },
            missionText: data?.about_mission,
            visionText: data?.about_vision,
            imageUrl: data?.about_image_url,
            teamMembers: data?.team_members || [],
            updated_at: data?.updated_at,
          });
        }
      } catch (error) {
        console.error("Could not fetch settings for about page:", error);
        // Provide default settings in case of an error
        setSettings({
          schoolName: 'EduSync',
          logoUrl: null,
          socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
          missionText: "Mission text not set.",
          visionText: "Vision text not set.",
          imageUrl: "https://placehold.co/600x400.png",
          teamMembers: [],
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAboutPageSettings();
  }, []); // Empty dependency array means this effect runs once on mount

  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url) return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }

  // Render loading state or null while settings are being fetched
  if (isLoading || !settings) {
    return <div>Loading...</div>; // Or a more sophisticated loading component
  }

  const finalImageUrl = generateCacheBustingUrl(settings.imageUrl, settings.updated_at) || "https://placehold.co/600x400.png";

  return (
    <PublicLayout schoolName={settings.schoolName} logoUrl={settings.logoUrl} socials={settings.socials} updated_at={settings.updated_at}>
      <div className="container mx-auto py-16 px-4">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">About {settings.schoolName || 'Us'}</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            We are dedicated to revolutionizing school management by providing a seamless, integrated platform that connects administrators, teachers, students, and parents.
          </p>
        </section>

        {/* Mission and Vision Section */}
        <section className="grid md:grid-cols-2 gap-12 mb-16 items-center">
            <div className="order-2 md:order-1">
                <h2 className="text-3xl font-bold text-primary font-headline mb-4 flex items-center"><Target className="mr-3 h-8 w-8 text-accent" /> Our Mission</h2>
                <p className="text-muted-foreground mb-6">
                    {settings.missionText || "The school's mission statement has not been set yet."}
                </p>
                <h2 className="text-3xl font-bold text-primary font-headline mb-4 flex items-center"><TrendingUp className="mr-3 h-8 w-8 text-accent" /> Our Vision</h2>
                <p className="text-muted-foreground">
                    {settings.visionText || "The school's vision statement has not been set yet."}
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
        </section>

        {/* Team Section */}
        {settings.teamMembers && settings.teamMembers.length > 0 && (
          <section className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary font-headline mb-8">Meet the Team</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {settings.teamMembers.map((member) => (
                <div key={member.id} className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={generateCacheBustingUrl(member.imageUrl, settings.updated_at) || `https://placehold.co/100x100.png`} alt={member.name} data-ai-hint="person portrait" />
                    <AvatarFallback>{member.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-primary">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* Core Values Section */}
        <section>
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
        </section>
      </div>
    </PublicLayout>
  );
}
