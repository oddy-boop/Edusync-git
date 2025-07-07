import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { Phone, Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/forms/ContactForm";
import { getSupabase } from "@/lib/supabaseClient";

export const dynamic = 'force-dynamic';

async function getContactInfo() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("app_settings")
      .select("school_address, school_email, school_phone")
      .eq("id", 1)
      .single();
    return {
      address: data?.school_address || "123 Education Lane, Accra, Ghana",
      email: data?.school_email || "info@stjosephmontessori.edu.gh",
      phone: data?.school_phone || "+233 12 345 6789",
    };
  } catch (error) {
    console.error("Could not fetch contact info from settings, using defaults.", error);
    return {
      address: "123 Education Lane, Accra, Ghana",
      email: "info@stjosephmontessori.edu.gh",
      phone: "+233 12 345 6789",
    };
  }
}

export default async function ContactPage() {
  const contactInfo = await getContactInfo();

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <MainHeader />
      <main className="flex-grow container mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-2">
                Get In Touch
            </h1>
            <p className="text-lg text-muted-foreground">
                We're here to help and answer any question you might have.
            </p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <MapPin className="text-primary h-6 w-6" /> School Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{contactInfo.address}</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Mail className="text-primary h-6 w-6" /> Email Us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {contactInfo.email}
                </a>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Phone className="text-primary h-6 w-6" /> Call Us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={`tel:${contactInfo.phone}`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {contactInfo.phone}
                </a>
              </CardContent>
            </Card>
          </div>
          <div>
            <ContactForm />
          </div>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
