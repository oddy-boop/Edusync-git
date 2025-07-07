
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { GraduationCap } from "lucide-react";

export default function ProgramsPage() {
  return (
    <div className="flex flex-col min-h-screen">
        <MainHeader />
        <main className="flex-grow container mx-auto px-6 py-12 md:py-16">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-8 text-center">
                Our Programs
            </h1>
            <div className="max-w-4xl mx-auto space-y-8">
                <PlaceholderContent
                    title="Creche & Nursery"
                    icon={GraduationCap}
                    description="Our early childhood program focuses on creating a safe, stimulating, and caring environment. We use a play-based approach to develop social skills, emotional growth, and a love for learning."
                />
                 <PlaceholderContent
                    title="Kindergarten"
                    icon={GraduationCap}
                    description="The kindergarten curriculum builds on foundational skills with a focus on literacy, numeracy, and critical thinking. We encourage curiosity and creativity through hands-on activities and projects."
                />
                <PlaceholderContent
                    title="Primary School (Basic 1-6)"
                    icon={GraduationCap}
                    description="Our primary school program offers a balanced and comprehensive curriculum covering core subjects like Mathematics, English, Science, and Social Studies, alongside creative arts and physical education."
                />
                <PlaceholderContent
                    title="Junior High School (JHS 1-3)"
                    icon={GraduationCap}
                    description="The JHS program prepares students for their future academic careers with a rigorous curriculum designed to meet national standards. We focus on academic excellence, character development, and leadership skills."
                />
                 <PlaceholderContent
                    title="Extracurricular Activities"
                    icon={GraduationCap}
                    description="We believe in holistic development. This section will detail our extracurricular offerings, such as sports teams, debate club, coding club, art club, and music lessons, which allow students to explore their passions beyond the classroom."
                />
            </div>
        </main>
        <MainFooter />
    </div>
  );
}
