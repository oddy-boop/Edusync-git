
import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Feather, Atom, Globe, Paintbrush } from "lucide-react";
import Image from 'next/image';
import { getSupabase } from "@/lib/supabaseClient";

const programs = [
  {
    title: "Creche & Nursery",
    description: "A nurturing and stimulating environment for our youngest learners. We focus on play-based learning, social development, and foundational literacy and numeracy skills to build a strong base for future learning.",
    image: "https://placehold.co/600x400.png",
    aiHint: "children playing",
  },
  {
    title: "Kindergarten",
    description: "Our Kindergarten program builds on early learning with a more structured approach to phonics, reading, writing, and mathematics, while still encouraging creativity and exploration through hands-on activities.",
    image: "https://placehold.co/600x400.png",
    aiHint: "teacher reading children"
  },
  {
    title: "Primary School (Basic 1-6)",
    description: "A comprehensive curriculum covering core subjects like English, Mathematics, Science, and Social Studies. We emphasize critical thinking, problem-solving, and collaborative skills.",
    image: "https://placehold.co/600x400.png",
    aiHint: "students classroom"
  },
  {
    title: "Junior High School (JHS 1-3)",
    description: "Preparing students for secondary education and beyond. Our JHS program offers a challenging academic environment with a focus on specialized subjects and readiness for standardized examinations.",
    image: "https://placehold.co/600x400.png",
    aiHint: "teenagers studying"
  },
];

const extraCurricular = [
    { name: "Debate Club", icon: Feather },
    { name: "Science & Tech Club", icon: Atom },
    { name: "Cultural Troupe", icon: Globe },
    { name: "Art & Craft Club", icon: Paintbrush },
];

async function getProgramsPageSettings() {
    const supabase = getSupabase();
    try {
        const { data } = await supabase.from('app_settings').select('programs_intro').single();
        return data;
    } catch (error) {
        console.error("Could not fetch settings for programs page:", error);
        return null;
    }
}

export default async function ProgramsPage() {
  const settings = await getProgramsPageSettings();
  const introText = settings?.programs_intro || "We offer a rich and diverse curriculum designed to foster intellectual curiosity and a lifelong love of learning at every stage of development.";

  return (
    <PublicLayout>
      <div className="container mx-auto py-16 px-4">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">Our Academic Programs</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            {introText}
          </p>
        </section>

        <section className="space-y-16">
          {programs.map((program, index) => (
            <div key={program.title} className="grid md:grid-cols-2 gap-12 items-center">
              <div className={index % 2 === 0 ? "order-1" : "order-1 md:order-2"}>
                 <Image 
                  src={program.image}
                  alt={program.title}
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg"
                  data-ai-hint={program.aiHint}
                 />
              </div>
              <div className={index % 2 === 0 ? "order-2" : "order-2 md:order-1"}>
                <h2 className="text-3xl font-bold text-primary font-headline mb-4">{program.title}</h2>
                <p className="text-muted-foreground">{program.description}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-20 text-center">
            <h2 className="text-3xl font-bold text-primary font-headline mb-8">Extracurricular Activities</h2>
            <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
                We believe in holistic development. Our extracurricular activities provide students with opportunities to explore their interests, develop new skills, and build character outside the classroom.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {extraCurricular.map((activity) => (
                    <Card key={activity.name} className="shadow-md hover:shadow-xl hover:-translate-y-1 transition-transform">
                        <CardContent className="pt-6 flex flex-col items-center justify-center">
                            <div className="bg-primary/10 p-4 rounded-full mb-3">
                                <activity.icon className="h-8 w-8 text-primary" />
                            </div>
                            <p className="font-semibold text-primary">{activity.name}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>

      </div>
    </PublicLayout>
  );
}
