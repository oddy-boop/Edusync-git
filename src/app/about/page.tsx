
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Info } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
        <MainHeader />
        <main className="flex-grow container mx-auto px-6 py-12 md:py-16">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-8 text-center">
                About St. Joseph's Montessori
            </h1>
            <div className="max-w-4xl mx-auto">
                <PlaceholderContent
                    title="Our History & Mission"
                    icon={Info}
                    description="This is where you can share the rich history of the school, its founding principles, and its mission to provide exceptional education. Talk about the journey, the values that drive the school, and the vision for the future. You can also include information about the school's accreditation and affiliations here."
                />
                 <div className="mt-8">
                    <PlaceholderContent
                        title="Meet Our Leadership"
                        icon={Users}
                        description="Introduce the key members of your leadership team, including the Headmaster/Headmistress, academic supervisors, and administrative heads. A brief bio and a photo for each person can help build trust and connection with parents and the community."
                    />
                </div>
                <div className="mt-8">
                    <PlaceholderContent
                        title="Our Campus & Facilities"
                        icon={School}
                        description="Showcase your school's campus. Describe the classrooms, library, science labs, computer rooms, playground, and any other facilities that make your school a great place to learn and grow. You can add a photo gallery in a future update."
                    />
                </div>
            </div>
        </main>
        <MainFooter />
    </div>
  );
}
