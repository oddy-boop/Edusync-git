
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, Users, DollarSign, Edit3, BarChart2, Brain } from 'lucide-react';
import { MainHeader } from '@/components/layout/MainHeader';
import { MainFooter } from '@/components/layout/MainFooter';
import { db } from '@/lib/firebase'; 
import { doc, getDoc } from 'firebase/firestore';

interface BrandingSettings {
  schoolName: string;
  schoolSlogan?: string; 
  schoolHeroImageUrl: string;
}

const defaultBrandingSettings: BrandingSettings = {
  schoolName: "St. Joseph's Montessori",
  schoolSlogan: "A modern solution for St. Joseph's Montessori (Ghana) to manage school operations, enhance learning, and empower students, teachers, and administrators.",
  schoolHeroImageUrl: "https://placehold.co/1200x600.png", 
};

async function getBrandingSettings(): Promise<BrandingSettings> {
  try {
    const settingsDocRef = doc(db, "appSettings", "general");
    // console.log(`HomePage: Attempting to get document from path: appSettings/general using shared db instance. Project ID: ${db.app.options.projectId}`);
    
    const docSnap = await getDoc(settingsDocRef);
    
    if (docSnap.exists()) {
      // console.log("HomePage: Firestore document snapshot exists. Data:", docSnap.data());
      const data = docSnap.data();
      return {
        schoolName: data.schoolName || defaultBrandingSettings.schoolName,
        schoolSlogan: data.schoolSlogan || defaultBrandingSettings.schoolSlogan,
        schoolHeroImageUrl: data.schoolHeroImageUrl || defaultBrandingSettings.schoolHeroImageUrl,
      };
    }
    console.warn("HomePage: No 'general' document found in 'appSettings'. Using default settings.");
    return { ...defaultBrandingSettings };
  } catch (error: any) {
    let projectIdInUse = "N/A (db instance or app options not available for logging)";
    try {
      projectIdInUse = db.app.options.projectId || "N/A";
    } catch (e) {
      // ignore if projectId cannot be accessed
    }
    
    console.error(
      `HomePage: CRITICAL_FIREBASE_READ_ERROR for appSettings/general. Attempted Project ID: [${projectIdInUse}]. Falling back to defaults. Error details:`,
      error
    );
    if (error.name === 'FirebaseError' || error.constructor?.name === 'FirebaseError') {
        console.error(`HomePage: Firebase Error Code: ${error.code}, Message: ${error.message}`);
    }
    return { ...defaultBrandingSettings };
  }
}


export default async function HomePage() {
  const branding = await getBrandingSettings();

  const features = [
    {
      title: "Fee Management",
      description: "Streamlined configuration of school fees across all grade levels.",
      icon: DollarSign,
      link: "/auth/admin/login",
      cta: "Admin Portal"
    },
    {
      title: "Attendance & Behavior",
      description: "Digital tracking for daily student attendance and behavior incidents.",
      icon: Edit3, 
      link: "/auth/teacher/login",
      cta: "Teacher Portal"
    },
    {
      title: "Assignment System",
      description: "Efficiently create, distribute, and grade student assignments.",
      icon: BookOpen,
      link: "/auth/teacher/login",
      cta: "Teacher Portal"
    },
    {
      title: "Student Results",
      description: "Access payment-gated results and track academic progress.",
      icon: BarChart2,
      link: "/auth/student/login",
      cta: "Student Portal"
    },
    {
      title: "AI Lesson Planner",
      description: "Intelligent assistant for generating innovative lesson plan ideas.",
      icon: Brain,
      link: "/auth/teacher/login",
      cta: "Teacher Portal"
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-headline font-bold text-primary mb-6">
              Welcome to {branding.schoolName}
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 mb-10 max-w-3xl mx-auto">
              {branding.schoolSlogan}
            </p>
            <div className="flex justify-center items-center space-x-4 mb-12">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-105">
                <Link href="/auth/student/login">
                  Student Login <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary text-primary hover:bg-primary/10 shadow-lg transition-transform hover:scale-105">
                <Link href="/auth/teacher/login">
                  Teacher Login <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
             <div className="relative aspect-video max-w-4xl mx-auto rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={branding.schoolHeroImageUrl || defaultBrandingSettings.schoolHeroImageUrl}
                alt={`${branding.schoolName} Campus`}
                fill={true}
                className="object-cover"
                priority
                data-ai-hint="school campus students"
              />
              <div className="absolute inset-0 bg-primary/30"></div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-headline font-semibold text-primary text-center mb-12">
              Core Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <Card key={feature.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4 mx-auto">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-center text-primary">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription className="text-center text-foreground/70">{feature.description}</CardDescription>
                  </CardContent>
                  <div className="p-6 pt-0 mt-auto">
                    <Button variant="link" asChild className="w-full text-accent hover:text-accent/80">
                      <Link href={feature.link}>
                        Access {feature.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-headline font-semibold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg md:text-xl opacity-80 mb-10 max-w-2xl mx-auto">
              Log in to your respective portal to access dedicated tools and resources.
            </p>
            <div className="space-x-4">
              <Button size="lg" variant="secondary" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-transform hover:scale-105">
                <Link href="/auth/admin/login">Admin Portal</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <MainFooter />
    </div>
  );
}
