import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CalendarCheck, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <PublicLayout>
      <section className="bg-primary/5 py-20 text-center">
        <div className="container mx-auto">
          <h1 className="text-5xl font-bold text-primary mb-4 font-headline">
            EduSync Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Nurturing Minds, Building Futures.
          </p>
          <Button asChild size="lg">
            <Link href="/admissions">Enroll Now</Link>
          </Button>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary font-headline">Why Choose Us?</h2>
            <p className="text-muted-foreground mt-2">
              A holistic approach to education, fostering growth and curiosity.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Expert Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Dedicated and experienced educators committed to your child's success.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Vibrant Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  A supportive and inclusive environment for all students and families.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit">
                  <CalendarCheck className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Modern Facilities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  State-of-the-art resources to enhance the learning experience.
                </p>
              </CardContent>
            </Card>
             <Card className="text-center">
              <CardHeader>
                <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Safe Environment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  A secure and nurturing space where children can thrive.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary mb-4 font-headline">
            Explore Our Programs
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            From creche to Junior High School, our curriculum is designed to challenge and inspire students at every level.
          </p>
          <Button asChild variant="outline">
            <Link href="/programs">Learn More</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
