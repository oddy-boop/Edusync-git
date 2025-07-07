
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Book, Eye, Flag, Users, School } from "lucide-react";
import Image from "next/image";
import { getSupabase } from "@/lib/supabaseClient";

export const dynamic = 'force-dynamic';

interface AboutPageContent {
  historyAndMission: string;
  vision: string;
  coreValues: string;
  aboutHistoryImageUrl: string;
  
  leader1Name: string;
  leader1Title: string;
  leader1ImageUrl: string;
  
  leader2Name: string;
  leader2Title: string;
  leader2ImageUrl: string;

  leader3Name: string;
  leader3Title: string;
  leader3ImageUrl: string;

  facility1Name: string;
  facility1ImageUrl: string;
  facility2Name: string;
  facility2ImageUrl: string;
  facility3Name: string;
  facility3ImageUrl: string;
}

async function getAboutContent(): Promise<AboutPageContent> {
  const defaultContent = {
    historyAndMission: "Founded on the principles of academic rigor and holistic development, St. Joseph's Montessori has been a cornerstone of the community for decades. Our journey began with a simple yet powerful vision: to create a learning environment where every child feels valued, challenged, and inspired to reach their full potential. Our mission is to provide a comprehensive education that nurtures intellectual curiosity, fosters critical thinking, and instills strong moral character. We are committed to preparing our students not just for the next stage of their education, but for a lifetime of success and meaningful contribution to society.",
    vision: "To be a leading educational institution recognized for empowering students with the knowledge, skills, and values to thrive in a dynamic world.",
    coreValues: "Integrity & Respect\nExcellence in Teaching & Learning\nCommunity & Collaboration\nInnovation & Adaptability",
    aboutHistoryImageUrl: "https://placehold.co/600x400.png",
    
    leader1Name: "Dr. Evelyn Mensah",
    leader1Title: "Headmistress",
    leader1ImageUrl: "https://placehold.co/300x300.png",

    leader2Name: "Mr. Samuel Adjei",
    leader2Title: "Head of Primary School",
    leader2ImageUrl: "https://placehold.co/300x300.png",

    leader3Name: "Mrs. Abena Owusu",
    leader3Title: "Head of JHS",
    leader3ImageUrl: "https://placehold.co/300x300.png",

    facility1Name: "Modern Classrooms",
    facility1ImageUrl: "https://placehold.co/400x300.png",
    facility2Name: "Science & ICT Labs",
    facility2ImageUrl: "https://placehold.co/400x300.png",
    facility3Name: "Library & Resource Center",
    facility3ImageUrl: "https://placehold.co/400x300.png",
  };

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("app_settings")
      .select(`
        about_history_mission, about_vision, about_core_values, about_history_image_url,
        about_leader1_name, about_leader1_title, about_leader1_image_url,
        about_leader2_name, about_leader2_title, about_leader2_image_url,
        about_leader3_name, about_leader3_title, about_leader3_image_url,
        facility1_name, facility1_image_url,
        facility2_name, facility2_image_url,
        facility3_name, facility3_image_url
      `)
      .eq("id", 1)
      .single();
    
    return {
      historyAndMission: data?.about_history_mission || defaultContent.historyAndMission,
      vision: data?.about_vision || defaultContent.vision,
      coreValues: data?.about_core_values || defaultContent.coreValues,
      aboutHistoryImageUrl: data?.about_history_image_url || defaultContent.aboutHistoryImageUrl,
      
      leader1Name: data?.about_leader1_name || defaultContent.leader1Name,
      leader1Title: data?.about_leader1_title || defaultContent.leader1Title,
      leader1ImageUrl: data?.about_leader1_image_url || defaultContent.leader1ImageUrl,

      leader2Name: data?.about_leader2_name || defaultContent.leader2Name,
      leader2Title: data?.about_leader2_title || defaultContent.leader2Title,
      leader2ImageUrl: data?.about_leader2_image_url || defaultContent.leader2ImageUrl,
      
      leader3Name: data?.about_leader3_name || defaultContent.leader3Name,
      leader3Title: data?.about_leader3_title || defaultContent.leader3Title,
      leader3ImageUrl: data?.about_leader3_image_url || defaultContent.leader3ImageUrl,

      facility1Name: data?.facility1_name || defaultContent.facility1Name,
      facility1ImageUrl: data?.facility1_image_url || defaultContent.facility1ImageUrl,
      facility2Name: data?.facility2_name || defaultContent.facility2Name,
      facility2ImageUrl: data?.facility2_image_url || defaultContent.facility2ImageUrl,
      facility3Name: data?.facility3_name || defaultContent.facility3Name,
      facility3ImageUrl: data?.facility3_image_url || defaultContent.facility3ImageUrl,
    };
  } catch (error) {
    console.error("Could not fetch 'About Us' content from settings, using defaults.", error);
    return defaultContent;
  }
}

export default async function AboutPage() {
  const content = await getAboutContent();
  const coreValuesList = content.coreValues.split('\n').filter(Boolean);
  
  const leadershipTeam = [
    { name: content.leader1Name, title: content.leader1Title, image: content.leader1ImageUrl, imageHint: "woman headshot professional" },
    { name: content.leader2Name, title: content.leader2Title, image: content.leader2ImageUrl, imageHint: "man headshot professional" },
    { name: content.leader3Name, title: content.leader3Title, image: content.leader3ImageUrl, imageHint: "woman headshot smiling" },
  ].filter(leader => leader.name); // Only show leaders if a name is provided

  const facilities = [
      { name: content.facility1Name, image: content.facility1ImageUrl, hint: "classroom modern school" },
      { name: content.facility2Name, image: content.facility2ImageUrl, hint: "science lab school" },
      { name: content.facility3Name, image: content.facility3ImageUrl, hint: "library school kids" },
  ].filter(facility => facility.name);

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <MainHeader />
      <main className="flex-grow container mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-2">
            About St. Joseph's Montessori
          </h1>
          <p className="text-lg text-muted-foreground">
            A tradition of excellence, a future of innovation.
          </p>
        </div>

        <Card className="shadow-lg mb-12 overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="flex items-center text-2xl text-primary">
                  <Flag className="mr-3 h-6 w-6" /> Our History & Mission
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 text-muted-foreground space-y-4 whitespace-pre-wrap">
                <p>
                  {content.historyAndMission}
                </p>
              </CardContent>
            </div>
            <div className="relative min-h-[250px] md:min-h-full">
               <Image
                src={content.aboutHistoryImageUrl}
                alt="School historical photo"
                fill
                className="object-cover"
                data-ai-hint="school building classic"
              />
            </div>
          </div>
        </Card>
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-primary">
                <Eye className="mr-2 h-5 w-5" /> Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{content.vision}</p>
            </CardContent>
          </Card>
           <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-primary">
                <Book className="mr-2 h-5 w-5" /> Our Core Values
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {coreValuesList.map((value, index) => (
                  <li key={index}>{value}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {leadershipTeam.length > 0 && (
          <Card className="shadow-lg mb-12">
              <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center text-2xl text-primary">
                    <Users className="mr-3 h-6 w-6" /> Meet Our Leadership
                  </CardTitle>
                  <CardContent className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                      Our dedicated leadership team is committed to upholding the school's mission and driving its vision forward. They bring a wealth of experience and a shared passion for education.
                  </CardContent>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-1 md:grid-cols-3 gap-8">
                  {leadershipTeam.map(person => (
                      <div key={person.name} className="text-center">
                          <Image src={person.image} alt={person.name} width={150} height={150} className="rounded-full mx-auto mb-4 object-cover" data-ai-hint={person.imageHint} />
                          <h4 className="font-semibold text-lg text-primary">{person.name}</h4>
                          <p className="text-sm text-muted-foreground">{person.title}</p>
                      </div>
                  ))}
              </CardContent>
          </Card>
        )}

        {facilities.length > 0 && (
          <Card className="shadow-lg">
              <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center text-2xl text-primary">
                    <School className="mr-3 h-6 w-6" /> Our Campus & Facilities
                  </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
                  {facilities.map(facility => (
                      <div key={facility.name} className="relative rounded-lg overflow-hidden h-48 group">
                          <Image src={facility.image} alt={facility.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={facility.hint} />
                          <div className="absolute inset-0 bg-primary/70 flex items-center justify-center p-4">
                              <h4 className="text-xl font-bold text-white text-center">{facility.name}</h4>
                          </div>
                      </div>
                  ))}
              </CardContent>
          </Card>
        )}

      </main>
      <MainFooter />
    </div>
  );
}
