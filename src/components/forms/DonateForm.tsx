
'use client';

import { useState, useCallback } from "react";
import { usePaystackPayment } from 'react-paystack';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Heart } from "lucide-react";

interface DonateFormProps {
    schoolName: string | null;
}

const paystackPublicKeyFromEnv = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

const donationTiers = [
  { amount: 50, label: "GHS 50" },
  { amount: 100, label: "GHS 100" },
  { amount: 200, label: "GHS 200" },
  { amount: 500, label: "GHS 500" },
];

export function DonateForm({ schoolName }: DonateFormProps) {
    const { toast } = useToast();
    const [customAmount, setCustomAmount] = useState("");
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const finalSchoolName = schoolName || "Donation";

    const handleAmountClick = (amount: number) => {
        setSelectedAmount(amount);
        setCustomAmount(amount.toString());
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomAmount(value);
        if (selectedAmount !== null && value !== selectedAmount.toString()) {
            setSelectedAmount(null);
        }
    };

    const onPaystackSuccess = useCallback(() => {
        toast({
            title: "Donation Received!",
            description: "Thank you so much for your generous support. Your contribution makes a real difference.",
        });
        setCustomAmount("");
        setSelectedAmount(null);
        setIsProcessing(false);
    }, [toast]);

    const onPaystackClose = useCallback(() => {
        toast({
            title: "Payment Window Closed",
            description: "The payment process was cancelled.",
            variant: "default",
        });
        setIsProcessing(false);
    }, [toast]);
    
    const parsedAmount = parseFloat(customAmount);
    
    const paystackConfig = {
        email: `donation-${Date.now()}@${finalSchoolName?.toLowerCase().replace(/\s+/g, '') || 'school'}.com`,
        amount: isNaN(parsedAmount) ? 0 : Math.round(parsedAmount * 100), // Amount in pesewas
        publicKey: paystackPublicKeyFromEnv,
        currency: 'GHS',
        metadata: {
            donation: "true",
            school_name: finalSchoolName,
        }
    };

    const initializePayment = usePaystackPayment(paystackConfig);

    const handleDonateClick = () => {
        setIsProcessing(true);
        initializePayment({
            onSuccess: onPaystackSuccess, 
            onClose: onPaystackClose
        });
    };
    
    const isDonationDisabled = isProcessing || !customAmount || parseFloat(customAmount) <= 0 || !paystackPublicKeyFromEnv;

    return (
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
                <Button className="w-full text-xl py-8" size="lg" disabled={isDonationDisabled} onClick={() => handleDonateClick()}>
                    {isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin"/> : null}
                    {isProcessing ? "Processing..." : "Donate Now"}
                </Button>
                {!paystackPublicKeyFromEnv && <p className="text-xs text-center text-destructive mt-2">Online donations are currently unavailable. Please contact the school to contribute.</p>}
            </CardContent>
        </Card>
    )
}
