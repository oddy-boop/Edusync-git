
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Book, Eye, Flag, Users, School } from "lucide-react";
import Image from "next/image";
import { getSupabase } from "@/lib/supabaseClient";

interface AboutPageContent {
  historyAndMission: string;
  vision: string;
  coreValues: string;
  aboutHistoryImageUrl: string;
}

async function getAboutContent(): Promise<AboutPageContent> {
  const defaultContent = {
    historyAndMission: "Founded on the principles of academic rigor and holistic development, St. Joseph's Montessori has been a cornerstone of the community for decades. Our journey began with a simple yet powerful vision: to create a learning environment where every child feels valued, challenged, and inspired to reach their full potential. Our mission is to provide a comprehensive education that nurtures intellectual curiosity, fosters critical thinking, and instills strong moral character. We are committed to preparing our students not just for the next stage of their education, but for a lifetime of success and meaningful contribution to society.",
    vision: "To be a leading educational institution recognized for empowering students with the knowledge, skills, and values to thrive in a dynamic world.",
    coreValues: "Integrity & Respect\nExcellence in Teaching & Learning\nCommunity & Collaboration\nInnovation & Adaptability",
    aboutHistoryImageUrl: "https://placehold.co/600x400.png",
  };

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("app_settings")
      .select("about_history_mission, about_vision, about_core_values, about_history_image_url")
      .eq("id", 1)
      .single();
    
    return {
      historyAndMission: data?.about_history_mission || defaultContent.historyAndMission,
      vision: data?.about_vision || defaultContent.vision,
      coreValues: data?.about_core_values || defaultContent.coreValues,
      aboutHistoryImageUrl: data?.about_history_image_url || defaultContent.aboutHistoryImageUrl,
    };
  } catch (error) {
    console.warn("Could not fetch 'About Us' content from settings, using defaults.", error);
    return defaultContent;
  }
}

export default async function AboutPage() {
  const content = await getAboutContent();
  const coreValuesList = content.coreValues.split('\n').filter(Boolean);

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

        <Card className="shadow-lg mb-12">
            <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center text-2xl text-primary">
                  <Users className="mr-3 h-6 w-6" /> Meet Our Leadership
                </CardTitle>
                <CardContent className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                    Our dedicated leadership team is committed to upholding the school's mission and driving its vision forward. They bring a wealth of experience and a shared passion for education.
                </CardContent>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                    { name: "Dr. Evelyn Mensah", title: "Headmistress", imageHint: "woman headshot professional" },
                    { name: "Mr. Samuel Adjei", title: "Head of Primary School", imageHint: "man headshot professional" },
                    { name: "Mrs. Abena Owusu", title: "Head of JHS", imageHint: "woman headshot smiling" },
                ].map(person => (
                    <div key={person.name} className="text-center">
                        <Image src="https://placehold.co/300x300.png" alt={person.name} width={150} height={150} className="rounded-full mx-auto mb-4 object-cover" data-ai-hint={person.imageHint} />
                        <h4 className="font-semibold text-lg text-primary">{person.name}</h4>
                        <p className="text-sm text-muted-foreground">{person.title}</p>
                    </div>
                ))}
            </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader className="text-center">
                 <CardTitle className="flex items-center justify-center text-2xl text-primary">
                  <School className="mr-3 h-6 w-6" /> Our Campus & Facilities
                </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {[
                    { name: "Modern Classrooms", icon: School, hint: "classroom modern" },
                    { name: "Science & ICT Labs", icon: Users, hint: "science lab school" },
                    { name: "Library & Resource Center", icon: Book, hint: "library school" },
                 ].map(facility => (
                     <div key={facility.name} className="relative rounded-lg overflow-hidden h-48 group">
                        <Image src="https://placehold.co/400x300.png" alt={facility.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={facility.hint} />
                        <div className="absolute inset-0 bg-primary/70 flex items-center justify-center p-4">
                            <h4 className="text-xl font-bold text-white text-center">{facility.name}</h4>
                        </div>
                     </div>
                 ))}
            </CardContent>
        </Card>

      </main>
      <MainFooter />
    </div>
  );
}
