
'use client';

import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { HandHeart, School, Users, Heart } from "lucide-react";
import Image from 'next/image';

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    updated_at?: string;
}

const donationTiers = [
    { amount: 50, label: "GHS 50" },
    { amount: 100, label: "GHS 100" },
    { amount: 200, label: "GHS 200" },
    { amount: 500, label: "GHS 500" },
];

export default function DonatePage() {
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  useEffect(() => {
    async function getPageSettings() {
        const supabase = getSupabase();
        try {
            const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url, facebook_url, twitter_url, instagram_url, linkedin_url, updated_at').single();
            if (error && error.code !== 'PGRST116') throw error;
            setSettings({
                schoolName: data?.school_name,
                logoUrl: data?.school_logo_url,
                socials: {
                    facebook: data?.facebook_url,
                    twitter: data?.twitter_url,
                    instagram: data?.instagram_url,
                    linkedin: data?.linkedin_url,
                },
                updated_at: data?.updated_at,
            });
        } catch (error) {
            console.error("Could not fetch settings for donate page:", error);
            setSettings({
                schoolName: null,
                logoUrl: null,
                socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
            });
        } finally {
            setIsLoading(false);
        }
    }
    getPageSettings();
  }, []);
  
  const handleAmountClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount(amount.toString());
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    // Deselect preset if user types a custom amount
    if (selectedAmount !== null && value !== selectedAmount.toString()) {
        setSelectedAmount(null);
    }
  };


  if (isLoading || !settings) {
      return (
        <div className="container mx-auto py-16 px-4 space-y-12">
            <div className="text-center">
                <Skeleton className="h-12 w-1/2 mx-auto mb-4" />
                <Skeleton className="h-6 w-3/4 mx-auto" />
            </div>
             <div className="grid md:grid-cols-2 gap-12 items-center">
                <Skeleton className="h-[450px] w-full" />
                <Skeleton className="w-full h-80 rounded-lg" />
            </div>
        </div>
      );
  }

  return (
    <PublicLayout schoolName={settings?.schoolName} logoUrl={settings?.logoUrl} socials={settings?.socials} updated_at={settings?.updated_at}>
       <div className="container mx-auto py-16 px-4">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">Support Our Mission</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            Your generous contribution helps us provide quality education, improve our facilities, and support our dedicated staff. Every donation, big or small, makes a difference.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-12 items-center">
            <Card className="shadow-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl"><Heart className="mr-2 text-accent"/> Make a Donation</CardTitle>
                    <CardDescription>Choose an amount or enter your own.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {donationTiers.map((tier) => (
                            <Button 
                                key={tier.amount} 
                                variant={selectedAmount === tier.amount ? "default" : "outline"}
                                onClick={() => handleAmountClick(tier.amount)}
                                className="py-6 text-lg"
                            >
                                {tier.label}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <hr className="flex-grow"/>
                        <span className="text-muted-foreground text-sm">OR</span>
                        <hr className="flex-grow"/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="custom-amount" className="text-lg">Enter Custom Amount (GHS)</Label>
                        <Input 
                            id="custom-amount" 
                            type="number" 
                            placeholder="e.g., 150" 
                            className="text-xl h-14"
                            value={customAmount}
                            onChange={handleCustomAmountChange}
                        />
                    </div>
                     <Button className="w-full text-xl py-8" size="lg" disabled={!customAmount || parseFloat(customAmount) <= 0}>
                        Donate Now
                    </Button>
                </CardContent>
            </Card>

            <div>
                 <Image 
                    src="https://placehold.co/600x450.png"
                    alt="Happy students in a classroom" 
                    width={600} 
                    height={450} 
                    className="rounded-lg shadow-lg"
                    data-ai-hint="happy students classroom"
                />
            </div>
        </div>

        <section className="mt-20">
            <h2 className="text-3xl font-bold text-primary font-headline text-center mb-12">Where Your Donation Goes</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center">
                    <div className="bg-accent/10 p-4 rounded-full mb-3">
                        <Users className="h-10 w-10 text-accent"/>
                    </div>
                    <h3 className="text-xl font-semibold text-primary">Empower a Student</h3>
                    <p className="text-muted-foreground mt-2">Provide scholarships, learning materials, and extracurricular opportunities for deserving students.</p>
                </div>
                 <div className="flex flex-col items-center">
                    <div className="bg-accent/10 p-4 rounded-full mb-3">
                        <School className="h-10 w-10 text-accent"/>
                    </div>
                    <h3 className="text-xl font-semibold text-primary">Upgrade Facilities</h3>
                    <p className="text-muted-foreground mt-2">Help us maintain and improve our classrooms, library, and sports facilities for a better learning environment.</p>
                </div>
                 <div className="flex flex-col items-center">
                    <div className="bg-accent/10 p-4 rounded-full mb-3">
                        <HandHeart className="h-10 w-10 text-accent"/>
                    </div>
                    <h3 className="text-xl font-semibold text-primary">Support Our Staff</h3>
                    <p className="text-muted-foreground mt-2">Invest in professional development and resources for our dedicated teachers and staff members.</p>
                </div>
            </div>
        </section>

      </div>
    </PublicLayout>
  );
}

    