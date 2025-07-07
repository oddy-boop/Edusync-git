
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Baby, Users, BookOpen, Microscope, Palette } from "lucide-react";
import Image from "next/image";
import { getSupabase } from "@/lib/supabaseClient";

interface ProgramsContent {
    crecheDesc: string;
    crecheImageUrl: string;
    kindergartenDesc: string;
    kindergartenImageUrl: string;
    primaryDesc: string;
    primaryImageUrl: string;
    jhsDesc: string;
    jhsImageUrl: string;
    extracurricularDesc: string;
    extracurricularImageUrl: string;
    scienceTechDesc: string;
    scienceTechImageUrl: string;
}

async function getProgramsContent(): Promise<ProgramsContent> {
    const defaultContent: ProgramsContent = {
        crecheDesc: "Our early childhood program focuses on creating a safe, stimulating, and caring environment. We use a play-based approach to develop social skills, emotional growth, and a love for learning in our youngest students.",
        crecheImageUrl: "https://placehold.co/400x300.png",
        kindergartenDesc: "The kindergarten curriculum builds on foundational skills with a focus on literacy, numeracy, and critical thinking. We encourage curiosity and creativity through hands-on activities and projects.",
        kindergartenImageUrl: "https://placehold.co/400x300.png",
        primaryDesc: "Our primary school program offers a balanced and comprehensive curriculum covering core subjects like Mathematics, English, Science, and Social Studies, alongside creative arts and physical education.",
        primaryImageUrl: "https://placehold.co/400x300.png",
        jhsDesc: "The JHS program prepares students for their future academic careers with a rigorous curriculum designed to meet national standards. We focus on academic excellence, character development, and leadership skills.",
        jhsImageUrl: "https://placehold.co/400x300.png",
        extracurricularDesc: "We believe in holistic development. We offer a wide range of activities such as sports, debate, coding club, and music, allowing students to explore their passions beyond the classroom.",
        extracurricularImageUrl: "https://placehold.co/400x300.png",
        scienceTechDesc: "With modern science and ICT labs, we emphasize practical, hands-on learning to prepare students for a technology-driven world. Students engage in experiments, coding, and digital literacy programs.",
        scienceTechImageUrl: "https://placehold.co/400x300.png",
    };

    try {
        const supabase = getSupabase();
        const { data } = await supabase
            .from("app_settings")
            .select(`
                program_creche_desc, program_creche_image_url,
                program_kindergarten_desc, program_kindergarten_image_url,
                program_primary_desc, program_primary_image_url,
                program_jhs_desc, program_jhs_image_url,
                program_extracurricular_desc, program_extracurricular_image_url,
                program_science_tech_desc, program_science_tech_image_url
            `)
            .eq("id", 1)
            .single();

        return {
            crecheDesc: data?.program_creche_desc || defaultContent.crecheDesc,
            crecheImageUrl: data?.program_creche_image_url || defaultContent.crecheImageUrl,
            kindergartenDesc: data?.program_kindergarten_desc || defaultContent.kindergartenDesc,
            kindergartenImageUrl: data?.program_kindergarten_image_url || defaultContent.kindergartenImageUrl,
            primaryDesc: data?.program_primary_desc || defaultContent.primaryDesc,
            primaryImageUrl: data?.program_primary_image_url || defaultContent.primaryImageUrl,
            jhsDesc: data?.program_jhs_desc || defaultContent.jhsDesc,
            jhsImageUrl: data?.program_jhs_image_url || defaultContent.jhsImageUrl,
            extracurricularDesc: data?.program_extracurricular_desc || defaultContent.extracurricularDesc,
            extracurricularImageUrl: data?.program_extracurricular_image_url || defaultContent.extracurricularImageUrl,
            scienceTechDesc: data?.program_science_tech_desc || defaultContent.scienceTechDesc,
            scienceTechImageUrl: data?.program_science_tech_image_url || defaultContent.scienceTechImageUrl,
        };
    } catch (error) {
        console.warn("Could not fetch Programs content from settings, using defaults.", error);
        return defaultContent;
    }
}


export default async function ProgramsPage() {
  const content = await getProgramsContent();
  
  const programs = [
      {
          title: "Creche & Nursery",
          icon: Baby,
          imageHint: "toddlers playing indoors",
          description: content.crecheDesc,
          imageUrl: content.crecheImageUrl,
      },
      {
          title: "Kindergarten",
          icon: Users,
          imageHint: "children learning classroom",
          description: content.kindergartenDesc,
          imageUrl: content.kindergartenImageUrl,
      },
      {
          title: "Primary School (Basic 1-6)",
          icon: BookOpen,
          imageHint: "students library books",
          description: content.primaryDesc,
          imageUrl: content.primaryImageUrl,
      },
      {
          title: "Junior High School (JHS 1-3)",
          icon: GraduationCap,
          imageHint: "teenagers science lab",
          description: content.jhsDesc,
          imageUrl: content.jhsImageUrl,
      },
      {
          title: "Extracurricular Activities",
          icon: Palette,
          imageHint: "kids painting art",
          description: content.extracurricularDesc,
          imageUrl: content.extracurricularImageUrl,
      },
      {
          title: "Science & Technology",
          icon: Microscope,
          imageHint: "student microscope lab",
          description: content.scienceTechDesc,
          imageUrl: content.scienceTechImageUrl,
      },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <MainHeader />
      <main className="flex-grow container mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-2">
                Our Programs
            </h1>
            <p className="text-lg text-muted-foreground">
                A complete educational journey from nursery to junior high.
            </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((program) => (
            <Card key={program.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <div className="relative h-48 w-full">
                    <Image
                        src={program.imageUrl}
                        alt={`${program.title} image`}
                        fill
                        className="object-cover rounded-t-lg"
                        data-ai-hint={program.imageHint}
                    />
                </div>
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-primary">
                  <program.icon className="mr-3 h-6 w-6" /> {program.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="whitespace-pre-wrap">{program.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
