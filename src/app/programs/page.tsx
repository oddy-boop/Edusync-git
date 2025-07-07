
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Baby, Users, BookOpen, Microscope, Palette } from "lucide-react";
import Image from "next/image";

const programs = [
    {
        title: "Creche & Nursery",
        icon: Baby,
        imageHint: "toddlers playing indoors",
        description: "Our early childhood program focuses on creating a safe, stimulating, and caring environment. We use a play-based approach to develop social skills, emotional growth, and a love for learning in our youngest students.",
    },
    {
        title: "Kindergarten",
        icon: Users,
        imageHint: "children learning classroom",
        description: "The kindergarten curriculum builds on foundational skills with a focus on literacy, numeracy, and critical thinking. We encourage curiosity and creativity through hands-on activities and projects.",
    },
    {
        title: "Primary School (Basic 1-6)",
        icon: BookOpen,
        imageHint: "students library books",
        description: "Our primary school program offers a balanced and comprehensive curriculum covering core subjects like Mathematics, English, Science, and Social Studies, alongside creative arts and physical education.",
    },
    {
        title: "Junior High School (JHS 1-3)",
        icon: GraduationCap,
        imageHint: "teenagers science lab",
        description: "The JHS program prepares students for their future academic careers with a rigorous curriculum designed to meet national standards. We focus on academic excellence, character development, and leadership skills.",
    },
    {
        title: "Extracurricular Activities",
        icon: Palette,
        imageHint: "kids painting art",
        description: "We believe in holistic development. We offer a wide range of activities such as sports, debate, coding club, and music, allowing students to explore their passions beyond the classroom.",
    },
    {
        title: "Science & Technology",
        icon: Microscope,
        imageHint: "student microscope lab",
        description: "With modern science and ICT labs, we emphasize practical, hands-on learning to prepare students for a technology-driven world. Students engage in experiments, coding, and digital literacy programs.",
    },
];

export default function ProgramsPage() {
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
                <CardDescription>{program.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
