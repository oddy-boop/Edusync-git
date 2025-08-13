
'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Dynamically import the form component to ensure Paystack hook is only loaded on the client
const ExpenditureForm = dynamic(() => import('@/components/forms/ExpenditureForm').then(mod => mod.ExpenditureForm), {
  ssr: false,
  loading: () => <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>,
});


interface Expenditure {
  id: string;
  amount: number;
  category: string;
  date: Date;
  description: string;
  created_at: string;
}

export default function ExpendituresPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [feesCollectedThisMonth, setFeesCollectedThisMonth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlyData = async () => {
    setIsLoading(true);
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');

    try {
      const { data: expData, error: expError } = await supabase
        .from('expenditures')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });
      
      if (expError) throw expError;
      setExpenditures((expData || []).map(item => ({ ...item, date: new Date(item.date) })));
      
      const { data: feesData, error: feesError } = await supabase
        .from('fee_payments')
        .select('amount_paid')
        .gte('payment_date', start)
        .lte('payment_date', end);

      if (feesError) throw feesError;
      setFeesCollectedThisMonth((feesData || []).reduce((sum, p) => sum + p.amount_paid, 0));

    } catch (e: any) {
        setError(e.message);
        toast({ title: 'Error', description: `Could not fetch monthly data: ${e.message}`, variant: 'destructive' });
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchMonthlyData();
      } else {
        setError("You must be logged in as an admin or accountant to view this page.");
        setIsLoading(false);
      }
    };
    checkUser();
  }, [supabase]);

  const totalExpensesThisMonth = useMemo(() => {
    return expenditures.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenditures]);

  const netBalance = feesCollectedThisMonth - totalExpensesThisMonth;

  const monthlyChartData = useMemo(() => {
    const summary = expenditures.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(summary)
        .map(([name, total]) => ({ name, total }))
        .sort((a,b) => b.total - a.total);
  }, [expenditures]);
  
  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2"/> Access Denied or Error</CardTitle></CardHeader>
        <CardContent><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <TrendingUp className="mr-3 h-8 w-8" /> Monthly Financial Summary
        </h2>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200"><CardHeader><CardTitle>Total Income</CardTitle><CardDescription>Fees collected this month</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold text-green-700">GHS {feesCollectedThisMonth.toFixed(2)}</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardHeader><CardTitle>Total Expenses</CardTitle><CardDescription>Expenditures this month</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold text-red-700">GHS {totalExpensesThisMonth.toFixed(2)}</p></CardContent></Card>
        <Card className={netBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}><CardHeader><CardTitle>Net Balance</CardTitle><CardDescription>Income - Expenses</CardDescription></CardHeader><CardContent><p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>GHS {netBalance.toFixed(2)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ExpenditureForm 
              expenditures={expenditures} 
              onDataUpdate={fetchMonthlyData}
          />
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown for {format(new Date(), 'MMMM yyyy')}</CardTitle>
              <CardDescription>Visual breakdown of expenditures by category.</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyChartData.length > 0 ? (
                <ChartContainer config={{ total: { label: 'Total', color: 'hsl(var(--destructive))'}}} className="min-h-[300px] w-full">
                  <BarChart data={monthlyChartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No expenditures recorded for this month yet.</p>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
