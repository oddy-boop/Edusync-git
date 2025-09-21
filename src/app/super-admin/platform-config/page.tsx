"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Key, 
  CreditCard, 
  Shield, 
  Save, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle,
  Globe,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PlatformConfig {
  // AI Configuration
  openai_api_key: string;
  gemini_api_key: string;
  claude_api_key: string;
  
  // Payment Platform Configuration - Paystack
  paystack_public_key: string;
  paystack_secret_key: string;
  paystack_webhook_secret: string;
  
  // Payment Platform Configuration - Stripe
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  stripe_connect_client_id: string;
  
  // Platform Settings
  platform_name: string;
  platform_email: string;
  support_email: string;
  webhook_url: string;
  
  // Revenue Settings
  auto_collection_enabled: boolean;
  revenue_account_number: string;
  revenue_bank_code: string;
}

export default function PlatformConfigurationPage() {
  const [config, setConfig] = useState<PlatformConfig>({
    openai_api_key: '',
    gemini_api_key: '',
    claude_api_key: '',
    paystack_public_key: '',
    paystack_secret_key: '',
    paystack_webhook_secret: '',
    stripe_publishable_key: '',
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    stripe_connect_client_id: '',
    platform_name: 'EduSync Platform',
    platform_email: '',
    support_email: '',
    webhook_url: '',
    auto_collection_enabled: true,
    revenue_account_number: '',
    revenue_bank_code: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleInputChange = (field: keyof PlatformConfig, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const loadConfiguration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/super-admin/platform-config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
      } else {
        toast({
          title: "Error",
          description: "Failed to load platform configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: "Error",
        description: "Failed to load configuration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/super-admin/platform-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Platform configuration saved successfully",
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  const SecretInput = ({ 
    field, 
    label, 
    placeholder, 
    description 
  }: { 
    field: keyof PlatformConfig; 
    label: string; 
    placeholder: string;
    description?: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <div className="relative">
        <Input
          id={field}
          type={showSecrets[field] ? "text" : "password"}
          value={typeof config[field] === "string" ? config[field] : ""}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={() => toggleSecretVisibility(field)}
        >
          {showSecrets[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-headline font-semibold text-primary">Platform Configuration</h2>
          <p className="text-muted-foreground">Configure AI keys, payment settings, and platform preferences</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Super Admin Only
        </Badge>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These settings control platform-wide functionality including AI features and payment collection. 
          Changes here affect all schools on the platform.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai">AI Configuration</TabsTrigger>
          <TabsTrigger value="payments">Payment Setup</TabsTrigger>
          <TabsTrigger value="platform">Platform Settings</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Config</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                AI Service Keys
              </CardTitle>
              <CardDescription>
                Configure API keys for AI services used across the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SecretInput
                field="openai_api_key"
                label="OpenAI API Key"
                placeholder="sk-..."
                description="For ChatGPT and GPT-based features"
              />
              
              <SecretInput
                field="gemini_api_key"
                label="Google Gemini API Key"
                placeholder="AIza..."
                description="For Google Gemini AI features"
              />
              
              <SecretInput
                field="claude_api_key"
                label="Anthropic Claude API Key"
                placeholder="sk-ant-..."
                description="For Claude AI assistant features"
              />

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  AI keys are encrypted and stored securely. They enable intelligent features like automated grading, 
                  smart recommendations, and AI-powered analytics across all schools.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {/* Paystack Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Paystack Configuration (Local Payments)
              </CardTitle>
              <CardDescription>
                Configure Paystack credentials for collecting platform fees from Nigerian schools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SecretInput
                field="paystack_public_key"
                label="Paystack Public Key"
                placeholder="pk_live_... or pk_test_..."
                description="Your platform's Paystack public key for payment processing"
              />
              
              <SecretInput
                field="paystack_secret_key"
                label="Paystack Secret Key"
                placeholder="sk_live_... or sk_test_..."
                description="Your platform's Paystack secret key (keep this secure!)"
              />
              
              <SecretInput
                field="paystack_webhook_secret"
                label="Paystack Webhook Secret"
                placeholder="whsec_..."
                description="For verifying webhook authenticity"
              />

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Paystack handles local Nigerian payments with lower fees and better conversion rates for Naira transactions.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Stripe Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Stripe Configuration (International Payments)
              </CardTitle>
              <CardDescription>
                Configure Stripe credentials for international student payments and global fee collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SecretInput
                field="stripe_publishable_key"
                label="Stripe Publishable Key"
                placeholder="pk_live_... or pk_test_..."
                description="Your platform's Stripe publishable key for international payments"
              />
              
              <SecretInput
                field="stripe_secret_key"
                label="Stripe Secret Key"
                placeholder="sk_live_... or sk_test_..."
                description="Your platform's Stripe secret key (keep this secure!)"
              />
              
              <SecretInput
                field="stripe_webhook_secret"
                label="Stripe Webhook Secret"
                placeholder="whsec_..."
                description="For verifying Stripe webhook authenticity"
              />

              <SecretInput
                field="stripe_connect_client_id"
                label="Stripe Connect Client ID"
                placeholder="ca_..."
                description="For enabling schools to connect their own Stripe accounts"
              />

              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  Stripe enables international payments with support for 135+ currencies, global payment methods, 
                  and automatic fee collection through Stripe Connect.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure webhook endpoints for payment notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook_url">Webhook Base URL</Label>
                <Input
                  id="webhook_url"
                  value={config.webhook_url ?? ""}
                  onChange={(e) => handleInputChange('webhook_url', e.target.value)}
                  placeholder="https://yourdomain.com/api/webhooks"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Configure these URLs in your payment dashboards:</p>
                  <p>• Paystack: {config.webhook_url || 'https://yourdomain.com/api/webhooks'}/paystack</p>
                  <p>• Stripe: {config.webhook_url || 'https://yourdomain.com/api/webhooks'}/stripe</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Platform Information
              </CardTitle>
              <CardDescription>
                Basic platform settings and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform_name">Platform Name</Label>
                <Input
                  id="platform_name"
                  value={config.platform_name ?? ""}
                  onChange={(e) => handleInputChange('platform_name', e.target.value)}
                  placeholder="EduSync Platform"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform_email">Platform Email</Label>
                <Input
                  id="platform_email"
                  type="email"
                  value={config.platform_email ?? ""}
                  onChange={(e) => handleInputChange('platform_email', e.target.value)}
                  placeholder="admin@edusync.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support_email">Support Email</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={config.support_email ?? ""}
                  onChange={(e) => handleInputChange('support_email', e.target.value)}
                  placeholder="support@edusync.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Revenue Collection
              </CardTitle>
              <CardDescription>
                Configure how platform fees are collected and transferred to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="revenue_account_number">Revenue Account Number</Label>
                <Input
                  id="revenue_account_number"
                  value={config.revenue_account_number ?? ""}
                  onChange={(e) => handleInputChange('revenue_account_number', e.target.value)}
                  placeholder="1234567890"
                />
                <p className="text-xs text-muted-foreground">
                  Bank account where platform fees will be automatically transferred
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="revenue_bank_code">Bank Code</Label>
                <Input
                  id="revenue_bank_code"
                  value={config.revenue_bank_code ?? ""}
                  onChange={(e) => handleInputChange('revenue_bank_code', e.target.value)}
                  placeholder="057"
                />
                <p className="text-xs text-muted-foreground">
                  Bank code for automatic transfers (e.g., 057 for Zenith Bank)
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Platform fees will be automatically collected when students make payments and transferred 
                  to this account. Schools receive their portion separately.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button 
          onClick={saveConfiguration}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
