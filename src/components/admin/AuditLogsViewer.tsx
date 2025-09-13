'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Search, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  table_name?: string;
  record_id?: string;
  target_id?: string;
  details?: any;
  created_at: string;
  performed_by_user?: { email: string };
}

interface AuditLogsViewerProps {
  schoolId?: number;
}

export default function AuditLogsViewer({ schoolId }: AuditLogsViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = async (reset = false) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (schoolId) params.set('schoolId', schoolId.toString());
      if (actionFilter) params.set('action_filter', actionFilter);
      if (tableFilter) params.set('table_filter', tableFilter);
      if (searchTerm) params.set('search', searchTerm);
      params.set('limit', '50');
      params.set('offset', reset ? '0' : (page * 50).toString());

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      
      if (reset) {
        setLogs(data.data || []);
        setPage(0);
      } else {
        setLogs(prev => [...prev, ...(data.data || [])]);
        setPage(prev => prev + 1);
      }
      
      setHasMore((data.data || []).length === 50);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, [schoolId, actionFilter, tableFilter]);

  const handleSearch = () => {
    fetchLogs(true);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('delete')) return 'destructive';
    if (action.includes('create') || action.includes('register')) return 'default';
    if (action.includes('update') || action.includes('payment')) return 'secondary';
    return 'outline';
  };

  const formatDetails = (details: any) => {
    if (!details) return 'No details';
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      return Object.entries(parsed)
        .filter(([key, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ');
    } catch {
      return String(details);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Audit Logs
          </CardTitle>
          <CardDescription>
            View system activity and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex gap-2">
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actions</SelectItem>
                <SelectItem value="user_registered">User Registration</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="arrear">Arrears</SelectItem>
                <SelectItem value="update">Updates</SelectItem>
                <SelectItem value="delete">Deletions</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All tables</SelectItem>
                <SelectItem value="fee_payments">Fee Payments</SelectItem>
                <SelectItem value="student_arrears">Student Arrears</SelectItem>
                <SelectItem value="accountants">Accountants</SelectItem>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="teachers">Teachers</SelectItem>
                <SelectItem value="user_roles">User Roles</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => fetchLogs(true)} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="space-y-4">
        {error && (
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {logs.map((log) => (
          <Card key={log.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getActionBadgeColor(log.action)}>
                      {log.action.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                    {log.table_name && (
                      <Badge variant="outline">{log.table_name}</Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>Performed by:</strong> {log.performed_by_user?.email || 'System'}</p>
                    <p><strong>Time:</strong> {format(new Date(log.created_at), 'PPpp')}</p>
                    {log.target_id && (
                      <p><strong>Target:</strong> {log.target_id}</p>
                    )}
                    {log.record_id && (
                      <p><strong>Record ID:</strong> {log.record_id}</p>
                    )}
                  </div>
                  
                  {log.details && (
                    <div className="text-sm">
                      <strong>Details:</strong> {formatDetails(log.details)}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {logs.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No audit logs found
            </CardContent>
          </Card>
        )}

        {hasMore && !loading && (
          <div className="text-center">
            <Button onClick={() => fetchLogs(false)} variant="outline">
              Load More
            </Button>
          </div>
        )}

        {loading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading audit logs...
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
