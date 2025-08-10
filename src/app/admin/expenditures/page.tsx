
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabaseClient';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  Loader2,
  AlertCircle,
  PlusCircle,
  Edit,
  Trash2,
  TrendingUp,
  CalendarIcon,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePaystackPayment } from 'react-paystack';
import type { PaystackProps } from 'react-paystack/dist/types';

const paystackPublicKeyFromEnv = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

const EXPENDITURE_CATEGORIES = [
    "Salaries & Wages",
    "Rent & Utilities",
    "Office Supplies",
    "Software & Subscriptions",
    "Marketing & Advertising",
    "Maintenance & Repairs",
    "Travel & Transportation",
    "Legal & Professional Fees",
    "Taxes",
    "Miscellaneous",
];

const expenditureSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Amount must be a positive number.' }),
  category: z.string().min(1, 'Category is required.'),
  date: z.date({ required_error: 'Date is required.' }),
  description: z.string().min(3, 'Description must be at least 3 characters.').max(200, 'Description is too long.'),
});

type ExpenditureFormData = z.infer<typeof expenditureSchema>;

interface Expenditure extends ExpenditureFormData {
  id: string;
  created_at: string;
}

interface FeePayment {
    amount_paid: number;
}

export default function ExpendituresPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const { role, user } = useAuth();

  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [feesCollectedThisMonth, setFeesCollectedThisMonth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentExpenditure, setCurrentExpenditure] = useState<Expenditure | null>(null);
  
  const [expenditureToDelete, setExpenditureToDelete] = useState<Expenditure | null>(null);

  const form = useForm<ExpenditureFormData>({
    resolver: zodResolver(expenditureSchema),
  });

  const fetchMonthlyData = async () => {
    setIsLoading(true);
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');

    const { data: expData, error: expError } = await supabase
        .from('expenditures')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });

    if (expError) {
        setError(expError.message);
        toast({ title: 'Error', description: 'Could not fetch expenditures.', variant: 'destructive' });
    } else {
        setExpenditures((expData || []).map(item => ({ ...item, date: new Date(item.date) })));
    }

    const { data: feesData, error: feesError } = await supabase
        .from('fee_payments')
        .select('amount_paid')
        .gte('payment_date', start)
        .lte('payment_date', end);

    if (feesError) {
        setError(prev => prev ? `${prev}\n${feesError.message}` : feesError.message);
        toast({ title: 'Error', description: 'Could not fetch fee payments.', variant: 'destructive' });
    } else {
        setFeesCollectedThisMonth((feesData || []).reduce((sum, p) => sum + p.amount_paid, 0));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    if (role === null) return;
    
    if (role !== 'super_admin') {
      setError("You do not have permission to view this page.");
      setIsLoading(false);
      return;
    }
    fetchMonthlyData();
  }, [supabase, toast, role]);

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
  
  const handleOpenDialog = (expenditure?: Expenditure) => {
    if (expenditure) {
      setCurrentExpenditure(expenditure);
      form.reset({
        ...expenditure,
        date: new Date(expenditure.date)
      });
    } else {
      setCurrentExpenditure(null);
      form.reset({
        amount: undefined,
        category: '',
        date: new Date(),
        description: '',
      });
    }
    setIsFormDialogOpen(true);
  };
  
  const handleDeleteDialog = (expenditure: Expenditure) => {
      setExpenditureToDelete(expenditure);
  }

  const saveExpenseToDB = async (values: ExpenditureFormData) => {
    setIsSubmitting(true);
    const payload = { ...values, date: format(values.date, 'yyyy-MM-dd') };

    try {
        let error;
        if (currentExpenditure) {
            ({ error } = await supabase.from('expenditures').update(payload).eq('id', currentExpenditure.id));
        } else {
            ({ error } = await supabase.from('expenditures').insert(payload));
        }
        if (error) throw error;
        
        toast({ title: 'Success', description: `Expenditure ${currentExpenditure ? 'updated' : 'saved'}.` });
        setIsFormDialogOpen(false);
        await fetchMonthlyData();

    } catch (e: any) {
        toast({ title: 'Error', description: `Could not save expenditure: ${e.message}`, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const initializePayment = usePaystackPayment();

  const handleCardPayment = () => {
    const currentValues = form.getValues();
    const validation = expenditureSchema.safeParse(currentValues);

    if (!validation.success) {
      toast({
        title: "Invalid Form Data",
        description: "Please fill all required fields correctly before paying.",
        variant: "destructive"
      });
      // Trigger validation messages to show up
      form.trigger();
      return;
    }
    
    const config: PaystackProps = {
      email: user?.email || '',
      amount: (validation.data.amount || 0) * 100, // Amount in pesewas
      publicKey: paystackPublicKeyFromEnv,
      currency: 'GHS',
      metadata: {
          custom_fields: [{
              display_name: "Expense For",
              variable_name: "expense_for",
              value: validation.data.description || "School Expense"
          }]
      },
    };

    const onSuccess = (reference: any) => {
      toast({ title: "Payment Successful!", description: `Reference: ${reference.reference}. Recording expense...` });
      saveExpenseToDB(validation.data);
    };

    const onClose = () => {
      toast({ title: "Payment window closed.", variant: "default" });
    };

    initializePayment({onSuccess, onClose, config});
  };

  const onDeleteConfirm = async () => {
    if (!expenditureToDelete) return;
    setIsSubmitting(true);
    try {
        const { error } = await supabase.from('expenditures').delete().eq('id', expenditureToDelete.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Expenditure deleted.' });
        setExpenditures(expenditures.filter(exp => exp.id !== expenditureToDelete.id));
        setExpenditureToDelete(null);
    } catch (e: any) {
        toast({ title: 'Error', description: `Could not delete expenditure: ${e.message}`, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

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
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200"><CardHeader><CardTitle>Total Income</CardTitle><CardDescription>Fees collected this month</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold text-green-700">GHS {feesCollectedThisMonth.toFixed(2)}</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardHeader><CardTitle>Total Expenses</CardTitle><CardDescription>Expenditures this month</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold text-red-700">GHS {totalExpensesThisMonth.toFixed(2)}</p></CardContent></Card>
        <Card className={netBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}><CardHeader><CardTitle>Net Balance</CardTitle><CardDescription>Income - Expenses</CardDescription></CardHeader><CardContent><p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>GHS {netBalance.toFixed(2)}</p></CardContent></Card>
      </div>

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

      <Card>
        <CardHeader><CardTitle>All Expenditures This Month</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (GHS)</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenditures.map(exp => (
                <TableRow key={exp.id}>
                  <TableCell>{format(new Date(exp.date), 'PPP')}</TableCell>
                  <TableCell>{exp.category}</TableCell>
                  <TableCell>{exp.description}</TableCell>
                  <TableCell className="text-right font-medium">{exp.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(exp)}><Edit className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => handleDeleteDialog(exp)}><Trash2 className="h-4 w-4"/></Button>
                  </TableCell>
                </TableRow>
              ))}
               {expenditures.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24">No expenditures recorded yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentExpenditure ? 'Edit' : 'Add'} Expenditure</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(saveExpenseToDB)} className="space-y-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className="w-[240px] pl-3 text-left font-normal">
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent></Popover><FormMessage /></FormItem>)} />
               <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (GHS)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>{EXPENDITURE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
                <Button type="button" variant="outline" onClick={handleCardPayment} disabled={isSubmitting || !paystackPublicKeyFromEnv}>
                    <CreditCard className="mr-2 h-4 w-4"/> Pay with Card & Record
                </Button>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsFormDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {currentExpenditure ? 'Update' : 'Save'} Manually
                    </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {expenditureToDelete && (
         <AlertDialog open={!!expenditureToDelete} onOpenChange={() => setExpenditureToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the expenditure record for "{expenditureToDelete.description}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeleteConfirm} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                       {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>} Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
