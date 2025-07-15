
import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Target, Users, TrendingUp, Lightbulb } from "lucide-react";
import Image from 'next/image';
import { getSupabase } from "@/lib/supabaseClient";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}

async function getAboutPageSettings() {
    const supabase = getSupabase();
    try {
        const { data } = await supabase.from('app_settings').select('about_mission, about_vision, about_image_url, team_members').single();
        return data;
    } catch (error) {
        console.error("Could not fetch settings for about page:", error);
        return null;
    }
}

export default async function AboutPage() {
  const settings = await getAboutPageSettings();
  const missionText = settings?.about_mission || "To empower educational institutions with intuitive technology, streamlining administrative tasks, fostering collaboration, and creating more time for what truly matters: teaching and learning.";
  const visionText = settings?.about_vision || "To be the leading school management platform, known for our innovation, reliability, and commitment to enhancing the educational experience for every user.";
  const imageUrl = settings?.about_image_url || "https://placehold.co/600x400.png";
  const teamMembers: TeamMember[] = settings?.team_members || [];

  return (
    <PublicLayout>
      <div className="container mx-auto py-16 px-4">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">About EduSync</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            We are dedicated to revolutionizing school management by providing a seamless, integrated platform that connects administrators, teachers, students, and parents.
          </p>
        </section>

        {/* Mission and Vision Section */}
        <section className="grid md:grid-cols-2 gap-12 mb-16 items-center">
            <div className="order-2 md:order-1">
                <h2 className="text-3xl font-bold text-primary font-headline mb-4 flex items-center"><Target className="mr-3 h-8 w-8 text-accent" /> Our Mission</h2>
                <p className="text-muted-foreground mb-6">
                    {missionText}
                </p>
                <h2 className="text-3xl font-bold text-primary font-headline mb-4 flex items-center"><TrendingUp className="mr-3 h-8 w-8 text-accent" /> Our Vision</h2>
                <p className="text-muted-foreground">
                    {visionText}
                </p>
            </div>
            <div className="order-1 md:order-2">
                <Image 
                  src={imageUrl}
                  alt="Collaborative team working on laptops" 
                  width={600} 
                  height={400} 
                  className="rounded-lg shadow-lg"
                  data-ai-hint="collaboration team"
                />
            </div>
        </section>

        {/* Team Section */}
        {teamMembers.length > 0 && (
          <section className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary font-headline mb-8">Meet the Team</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={member.imageUrl || `https://placehold.co/100x100.png`} alt={member.name} data-ai-hint="person portrait" />
                    <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
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
