"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  School, 
  Users, 
  Loader2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import type { PaymentStats, MonthlyRevenue, PlatformRevenue } from '@/lib/actions/payment-analytics.actions';

interface SchoolStats {
  id: number;
  name: string;
  student_count: number;
  teacher_count: number;
}

interface PaymentAnalyticsData {
  schoolPayments: PaymentStats[];
  monthlyRevenue: MonthlyRevenue[];
  platformRevenue: PlatformRevenue;
}

export default function EnhancedSuperAdminDashboard() {
  const [stats, setStats] = useState<SchoolStats[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/super-admin/stats?debug=1');
      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.message || 'Failed to fetch stats');
      }
      setStats(json.data || []);
    } catch (e: any) {
      console.error('SuperAdminDashboard: Fetch Error:', e);
      setError(e.message || 'Unknown error fetching stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPaymentAnalytics = useCallback(async () => {
    setIsLoadingPayments(true);
    try {
      const res = await fetch('/api/super-admin/payment-analytics');
      const json = await res.json();
      
      if (!json.success) {
        console.error('Payment analytics error:', json.message);
        return;
      }
      setPaymentData(json.data);
    } catch (e: any) {
      console.error('Payment analytics fetch error:', e);
    } finally {
      setIsLoadingPayments(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPaymentAnalytics();
  }, [fetchStats, fetchPaymentAnalytics]);

  const formatCurrency = (amount: number) => `GHS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-headline font-semibold text-primary">Super Admin Dashboard</h2>
          <p className="text-muted-foreground">Platform overview and payment analytics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { fetchStats(); fetchPaymentAnalytics(); }} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Platform Revenue Overview */}
      {paymentData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(paymentData.platformRevenue.total_platform_revenue)}
              </div>
              <p className="text-xs text-green-600">
                +{formatCurrency(paymentData.platformRevenue.monthly_platform_revenue)} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">School Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(paymentData.platformRevenue.total_school_revenue)}
              </div>
              <p className="text-xs text-blue-600">
                +{formatCurrency(paymentData.platformRevenue.monthly_school_revenue)} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Schools</CardTitle>
              <School className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">
                {paymentData.platformRevenue.active_schools}
              </div>
              <p className="text-xs text-purple-600">
                Schools with payments
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">
                {paymentData.platformRevenue.total_transactions}
              </div>
              <p className="text-xs text-orange-600">
                Total completed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Analytics Charts */}
      {paymentData && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Payment Analytics
            </CardTitle>
            <CardDescription>
              Visual insights into payment trends and school performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="revenue" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="revenue">Revenue by School</TabsTrigger>
                <TabsTrigger value="collection">Collection Rates</TabsTrigger>
                <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
              </TabsList>
              
              <TabsContent value="revenue" className="space-y-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentData.schoolPayments.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="school_name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis 
                        tickFormatter={(value) => `GHS ${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`GHS ${value.toLocaleString()}`, 'Revenue']}
                        labelStyle={{ color: '#333' }}
                      />
                      <Bar dataKey="total_payments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="collection" className="space-y-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentData.schoolPayments.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="school_name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Collection Rate']}
                        labelStyle={{ color: '#333' }}
                      />
                      <Bar 
                        dataKey="payment_rate" 
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={paymentData.monthlyRevenue.reduce((acc: any[], curr) => {
                        const existing = acc.find(item => item.month === curr.month);
                        if (existing) {
                          existing.total_revenue += curr.revenue;
                        } else {
                          acc.push({ month: curr.month, total_revenue: curr.revenue });
                        }
                        return acc;
                      }, [])}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `GHS ${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => [`GHS ${value.toLocaleString()}`, 'Total Revenue']}
                        labelStyle={{ color: '#333' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total_revenue" 
                        stroke="#3b82f6" 
                        fill="#3b82f6"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* School Payment Progress */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            School Payment Progress
          </CardTitle>
          <CardDescription>
            Payment collection rates and revenue by school branch
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPayments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : paymentData ? (
            <div className="space-y-4">
              {paymentData.schoolPayments.map((school) => (
                <div key={school.school_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{school.school_name}</h3>
                    <Badge variant={school.payment_rate > 75 ? "default" : school.payment_rate > 50 ? "secondary" : "destructive"}>
                      {school.payment_rate.toFixed(1)}% paid
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>Total: {formatCurrency(school.total_payments)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span>Monthly: {formatCurrency(school.monthly_revenue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span>{school.paid_students}/{school.total_students} students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                      <span>{school.recent_payments} recent payments</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Payment Collection Rate</span>
                      <span>{school.payment_rate.toFixed(1)}%</span>
                    </div>
                    <Progress value={school.payment_rate} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No payment data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* School Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map(school => {
          const paymentInfo = paymentData?.schoolPayments.find(p => p.school_id === school.id);
          return (
            <Card key={school.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-6 w-6 text-primary" />
                  {school.name}
                </CardTitle>
                {paymentInfo && (
                  <Badge variant={paymentInfo.payment_rate > 75 ? "default" : "secondary"} className="w-fit">
                    {paymentInfo.payment_rate.toFixed(1)}% collection rate
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                  <span className="font-medium flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600"/>
                    Total Students
                  </span>
                  <span className="font-bold text-lg">{school.student_count}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                  <span className="font-medium flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600"/>
                    Total Teachers
                  </span>
                  <span className="font-bold text-lg">{school.teacher_count}</span>
                </div>
                {paymentInfo && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                    <span className="font-medium flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600"/>
                      Revenue
                    </span>
                    <span className="font-bold text-lg text-green-700">
                      {formatCurrency(paymentInfo.total_payments)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Platform Management</CardTitle>
          <CardDescription>Quick access to platform management tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/super-admin/platform-pricing">Manage Platform Pricing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/super-admin/schools">Manage Schools</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/super-admin/register-admin">Register Admins</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
