
import PublicLayout from "@/components/layout/PublicLayout";
import { ContactForm } from "@/components/forms/ContactForm";

export const revalidate = 0; // Ensures the page is always dynamic

export default function ContactPage() {
  return (
    <PublicLayout>
       <div className="container mx-auto py-16 px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-4 font-headline">Get In Touch</h1>
            <p className="text-muted-foreground mb-6">
              Have questions about admissions, programs, or anything else? We're here to help.
              Fill out the form, and our team will get back to you as soon as possible.
            </p>
            <div className="space-y-4 text-sm">
              <p><strong>Address:</strong> Accra, Ghana</p>
              <p><strong>Email:</strong> info@edusync.com</p>
              <p><strong>Phone:</strong> +233 12 345 6789</p>
            </div>
          </div>
          <ContactForm />
        </div>
      </div>
    </PublicLayout>
  );
}
