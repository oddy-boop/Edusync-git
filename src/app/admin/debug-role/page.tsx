"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { provisionCurrentUserAsAdminAction } from '@/lib/actions/debug.actions';
import { toast } from '@/hooks/use-toast';

export default function UserRoleDebugPage() {
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState<string>('');
  const [provisioning, setProvisioning] = useState(false);
  const authContext = useAuth();

  async function fetchDebug() {
    setLoading(true);
    try {
      const res = await fetch('/api/debug/user-role');
      const json = await res.json();
      setApiData(json);
      
      // Auto-populate school ID if available
      if (json.allSchools && json.allSchools.length > 0 && !schoolId) {
        setSchoolId(json.allSchools[0].id.toString());
      }
    } catch (e) {
      setApiData({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function provisionAsAdmin() {
    if (!schoolId) {
      toast({ title: "Error", description: "Please select a school ID", variant: "destructive" });
      return;
    }

    setProvisioning(true);
    try {
      const result = await provisionCurrentUserAsAdminAction(parseInt(schoolId));
      if (result.success) {
        toast({ title: "Success", description: result.message });
        // Refresh the debug info
        await fetchDebug();
        // Refresh the auth context by reloading the page
        window.location.reload();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setProvisioning(false);
    }
  }

  useEffect(() => { fetchDebug(); }, []);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>User Role Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={fetchDebug} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh Debug Info'}
            </Button>
          </div>

          {/* Role Provisioning Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fix Admin Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                If you're getting "Unauthorized" errors, you might need to assign yourself an admin role.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="schoolId">School ID</Label>
                <Input
                  id="schoolId"
                  type="number"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  placeholder="Enter school ID"
                />
                <p className="text-xs text-muted-foreground">
                  Available schools: {apiData?.allSchools?.map((s: any) => `${s.id} (${s.name})`).join(', ')}
                </p>
              </div>

              <Button onClick={provisionAsAdmin} disabled={provisioning || !schoolId}>
                {provisioning ? 'Provisioning...' : 'Make Me Admin for This School'}
              </Button>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Auth Context (Frontend)</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify({
                  role: authContext.role,
                  schoolId: authContext.schoolId,
                  schoolName: authContext.schoolName,
                  isAdmin: authContext.isAdmin,
                  isLoading: authContext.isLoading,
                  userEmail: authContext.user?.email,
                  fullName: authContext.fullName
                }, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">API Response (Backend)</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(apiData, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
