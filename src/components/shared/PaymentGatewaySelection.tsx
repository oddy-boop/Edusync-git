"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Globe, 
  MapPin, 
  DollarSign,
  ArrowRight,
  Shield,
  Clock
} from 'lucide-react';
import { CURRENCIES } from '@/lib/constants';
import { calculatePlatformFee } from '@/lib/actions/payment-gateway.actions';

interface PaymentGatewaySelectionProps {
  amount: number;
  studentId: string;
  schoolId: string;
  feeType: string;
  onPaymentInitiated: (gateway: 'paystack', paymentUrl: string) => void;
}

export default function PaymentGatewaySelection({
  amount,
  studentId,
  schoolId,
  feeType,
  onPaymentInitiated
}: PaymentGatewaySelectionProps) {
  const [selectedCurrency, setSelectedCurrency] = useState('GHS');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('Ghana');
  const [isProcessing, setIsProcessing] = useState(false);

  // Always use Paystack - it handles both local and international payments
  const selectedGateway = 'paystack';

  // Calculate fees for Paystack
  const platformFee = calculatePlatformFee(amount, 'paystack');
  const totalAmount = amount + platformFee;

  // Get currency details
  const currencyInfo = CURRENCIES.find(c => c.code === selectedCurrency);

  // Determine if this is an international payment
  const isInternationalPayment = selectedCurrency === 'USD' && !['Nigeria', 'Ghana', 'South Africa', 'Kenya'].includes(country);

  const handlePayment = async () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setIsProcessing(true);
    
    try {
      const paymentRequest = {
        amount: totalAmount,
        currency: selectedCurrency,
        email,
        studentId,
        schoolId,
        feeType,
        reference: `pay_${Date.now()}_${studentId}`,
        gateway: selectedGateway,
        metadata: {
          country,
          original_amount: amount,
          platform_fee: platformFee
        }
      };

      // Call payment initialization API
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequest),
      });

      const result = await response.json();

      if (result.success && result.authorizationUrl) {
        onPaymentInitiated(selectedGateway, result.authorizationUrl);
      } else {
        alert(result.error || 'Payment initialization failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment service unavailable. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Paystack Information Card */}
      <Card className="border-2 border-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-blue-700">
            <CreditCard className="h-5 w-5" />
            Secure Payment via Paystack
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Process your payment securely using Paystack - trusted by millions across Africa and internationally.
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              <span>Local & International</span>
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span>Multi-currency support</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span>Instant processing</span>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Bank-level security</span>
            </div>
          </div>

          {isInternationalPayment && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Globe className="h-4 w-4" />
                <span><strong>International Payment:</strong> Your payment will be processed globally. Your bank will handle currency conversion to USD.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GHS">₵ Ghana Cedi (GHS)</SelectItem>
                  <SelectItem value="NGN">₦ Nigerian Naira (NGN)</SelectItem>
                  <SelectItem value="USD">$ US Dollar (USD) - International</SelectItem>
                  <SelectItem value="ZAR">R South African Rand (ZAR)</SelectItem>
                  <SelectItem value="KES">KSh Kenyan Shilling (KES)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* African Countries */}
                  <SelectItem value="Ghana">🇬🇭 Ghana</SelectItem>
                  <SelectItem value="Nigeria">🇳🇬 Nigeria</SelectItem>
                  <SelectItem value="South Africa">🇿🇦 South Africa</SelectItem>
                  <SelectItem value="Kenya">🇰🇪 Kenya</SelectItem>
                  
                  {/* International Countries */}
                  <SelectItem value="United States">🇺🇸 United States</SelectItem>
                  <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                  <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                  <SelectItem value="France">🇫🇷 France</SelectItem>
                  <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                  <SelectItem value="Other">🌍 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
            />
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Fee Amount:</span>
              <span>{currencyInfo?.symbol}{amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Platform Fee (2%):</span>
              <span>{currencyInfo?.symbol}{platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Processing Fee:</span>
              <span>{isInternationalPayment ? '3.9%' : '1.5%'} (charged by Paystack)</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Amount:</span>
              <span>{currencyInfo?.symbol}{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your payment will be processed securely by Paystack. All transactions are encrypted and PCI DSS compliant.
              {isInternationalPayment && ' International payments are processed through Paystack\'s global network.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Payment Button */}
      <Button 
        onClick={handlePayment}
        disabled={isProcessing || !email}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          'Processing...'
        ) : (
          <div className="flex items-center gap-2">
            <span>Pay {currencyInfo?.symbol}{totalAmount.toFixed(2)} via Paystack</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
      </Button>
    </div>
  );
}
