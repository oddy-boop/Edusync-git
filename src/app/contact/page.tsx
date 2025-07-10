
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter, type FooterContactInfo } from "@/components/layout/MainFooter";
import { Phone, Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/forms/ContactForm";
import { getSupabase } from "@/lib/supabaseClient";

export const revalidate = 0; // Ensures fresh data on every request

interface PageData {
    contactInfo: FooterContactInfo;
    schoolName: string | null;
}

async function getPageData(): Promise<PageData> {
  const defaultContactInfo: FooterContactInfo = {
    address: "123 Education Lane, Accra, Ghana",
    email: "info@sjm.edu.gh",
    phone: "+233 12 345 6789",
  };
  let schoolName: string | null = "St. Joseph's Montessori";
  
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("app_settings")
      .select("school_name, school_address, school_email, school_phone")
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error("ContactPage: Supabase error fetching settings:", error);
        return { contactInfo: defaultContactInfo, schoolName };
    }
    
    schoolName = data?.school_name || "St. Joseph's Montessori";
    const contactInfo = {
      address: data?.school_address || defaultContactInfo.address,
      email: data?.school_email || defaultContactInfo.email,
      phone: data?.school_phone || defaultContactInfo.phone,
    };
    return { contactInfo, schoolName };

  } catch (e: any) {
    console.error("ContactPage: Critical error fetching page data:", e.message);
    return { contactInfo: defaultContactInfo, schoolName };
  }
}

export default async function ContactPage() {
  const { contactInfo, schoolName } = await getPageData();

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
                  <MapPin className="text-primary h-6 w-6" /> Office Address
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
      <MainFooter contactInfo={contactInfo} schoolName={schoolName}/>
    </div>
  );
}
