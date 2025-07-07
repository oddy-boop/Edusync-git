
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Baby, Users, BookOpen, Microscope, Palette } from "lucide-react";
import Image from "next/image";
import { getSupabase } from "@/lib/supabaseClient";

export const dynamic = 'force-dynamic';

interface ProgramsContent {
    crecheDesc: string;
    kindergartenDesc: string;
    primaryDesc: string;
    jhsDesc: string;
    extracurricularDesc: string;
    scienceTechDesc: string;
}

async function getProgramsContent(): Promise<ProgramsContent> {
    const defaultContent = {
        crecheDesc: "Our early childhood program focuses on creating a safe, stimulating, and caring environment. We use a play-based approach to develop social skills, emotional growth, and a love for learning in our youngest students.",
        kindergartenDesc: "The kindergarten curriculum builds on foundational skills with a focus on literacy, numeracy, and critical thinking. We encourage curiosity and creativity through hands-on activities and projects.",
        primaryDesc: "Our primary school program offers a balanced and comprehensive curriculum covering core subjects like Mathematics, English, Science, and Social Studies, alongside creative arts and physical education.",
        jhsDesc: "The JHS program prepares students for their future academic careers with a rigorous curriculum designed to meet national standards. We focus on academic excellence, character development, and leadership skills.",
        extracurricularDesc: "We believe in holistic development. We offer a wide range of activities such as sports, debate, coding club, and music, allowing students to explore their passions beyond the classroom.",
        scienceTechDesc: "With modern science and ICT labs, we emphasize practical, hands-on learning to prepare students for a technology-driven world. Students engage in experiments, coding, and digital literacy programs.",
    };

    try {
        const supabase = getSupabase();
        const { data } = await supabase
            .from("app_settings")
            .select("program_creche_desc, program_kindergarten_desc, program_primary_desc, program_jhs_desc, program_extracurricular_desc, program_science_tech_desc")
            .eq("id", 1)
            .single();

        return {
            crecheDesc: data?.program_creche_desc || defaultContent.crecheDesc,
            kindergartenDesc: data?.program_kindergarten_desc || defaultContent.kindergartenDesc,
            primaryDesc: data?.program_primary_desc || defaultContent.primaryDesc,
            jhsDesc: data?.program_jhs_desc || defaultContent.jhsDesc,
            extracurricularDesc: data?.program_extracurricular_desc || defaultContent.extracurricularDesc,
            scienceTechDesc: data?.program_science_tech_desc || defaultContent.scienceTechDesc,
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
      },
      {
          title: "Kindergarten",
          icon: Users,
          imageHint: "children learning classroom",
          description: content.kindergartenDesc,
      },
      {
          title: "Primary School (Basic 1-6)",
          icon: BookOpen,
          imageHint: "students library books",
          description: content.primaryDesc,
      },
      {
          title: "Junior High School (JHS 1-3)",
          icon: GraduationCap,
          imageHint: "teenagers science lab",
          description: content.jhsDesc,
      },
      {
          title: "Extracurricular Activities",
          icon: Palette,
          imageHint: "kids painting art",
          description: content.extracurricularDesc,
      },
      {
          title: "Science & Technology",
          icon: Microscope,
          imageHint: "student microscope lab",
          description: content.scienceTechDesc,
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
                        src={`https://placehold.co/400x300.png`}
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
