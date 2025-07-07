
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { Phone, Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/forms/ContactForm";

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen">
        <MainHeader />
        <main className="flex-grow container mx-auto px-6 py-12 md:py-16">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-12 text-center">
                Get In Touch
            </h1>
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-3"><MapPin className="text-primary"/> School Address</CardTitle></CardHeader>
                        <CardContent><p className="text-muted-foreground">123 Education Lane, Accra, Ghana</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="flex items-center gap-3"><Mail className="text-primary"/> Email Us</CardTitle></CardHeader>
                        <CardContent><a href="mailto:info@stjosephmontessori.edu.gh" className="text-muted-foreground hover:text-primary">info@stjosephmontessori.edu.gh</a></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="flex items-center gap-3"><Phone className="text-primary"/> Call Us</CardTitle></CardHeader>
                        <CardContent><p className="text-muted-foreground">+233 12 345 6789</p></CardContent>
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
