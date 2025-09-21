"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EmailSettings {
  resend_api_key: string;
  from_email: string;
}

export default function EmailSettingsPage() {
  const { schoolId, isAdmin } = useAuth();
  const [settings, setSettings] = useState<EmailSettings>({
    resend_api_key: '',
    from_email: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (schoolId && isAdmin) {
      loadSettings();
    }
  }, [schoolId, isAdmin]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('resend_api_key, from_email')
        .eq('id', schoolId)
        .single();

      if (error) throw error;

      setSettings({
        resend_api_key: data.resend_api_key || '',
        from_email: data.from_email || ''
      });
    } catch (error) {
      console.error('Error loading email settings:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load email settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('schools')
        .update({
          resend_api_key: settings.resend_api_key,
          from_email: settings.from_email
        })
        .eq('id', schoolId);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Email settings saved successfully!'
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save email settings'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access email settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Email Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Resend Email Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="resend_api_key">Resend API Key</Label>
            <Input
              id="resend_api_key"
              type="password"
              placeholder="re_xxxxxxxxxxxx"
              value={settings.resend_api_key}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                resend_api_key: e.target.value
              }))}
            />
            <p className="text-sm text-gray-600">
              Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Resend Dashboard</a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from_email">From Email Address</Label>
            <Input
              id="from_email"
              type="email"
              placeholder="noreply@yourschool.com"
              value={settings.from_email}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                from_email: e.target.value
              }))}
            />
            <p className="text-sm text-gray-600">
              This email address must be verified with Resend and match your domain
            </p>
          </div>

          <Button 
            onClick={saveSettings} 
            disabled={saving || !settings.resend_api_key || !settings.from_email}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Setup Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Sign up for a Resend account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a></li>
              <li>Verify your domain in the Resend dashboard</li>
              <li>Generate an API key in the Resend dashboard</li>
              <li>Enter your API key and verified from email address above</li>
              <li>Test email functionality using the contact form</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
