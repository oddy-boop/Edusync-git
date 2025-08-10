
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
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

interface ExpenditureFormProps {
    expenditures: Expenditure[];
    onDataUpdate: () => Promise<void>;
}

export function ExpenditureForm({ expenditures, onDataUpdate }: ExpenditureFormProps) {
  const { toast } = useToast();
  const supabase = getSupabase();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentExpenditure, setCurrentExpenditure] = useState<Expenditure | null>(null);
  const [expenditureToDelete, setExpenditureToDelete] = useState<Expenditure | null>(null);

  const form = useForm<ExpenditureFormData>({
    resolver: zodResolver(expenditureSchema),
  });

  const initializePayment = usePaystackPayment();

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
        await onDataUpdate();

    } catch (e: any) {
        toast({ title: 'Error', description: `Could not save expenditure: ${e.message}`, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCardPayment = () => {
    const currentValues = form.getValues();
    const validation = expenditureSchema.safeParse(currentValues);

    if (!validation.success) {
      toast({
        title: "Invalid Form Data",
        description: "Please fill all required fields correctly before paying.",
        variant: "destructive"
      });
      form.trigger();
      return;
    }
    
    const config: PaystackProps = {
      email: user?.email || '',
      amount: (validation.data.amount || 0) * 100,
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

    initializePayment({
        ...config,
        onSuccess: (reference: any) => {
          toast({ title: "Payment Successful!", description: `Reference: ${reference.reference}. Recording expense...` });
          saveExpenseToDB(validation.data);
        },
        onClose: () => {
          toast({ title: "Payment window closed.", variant: "default" });
        },
    });
  };

  const onDeleteConfirm = async () => {
    if (!expenditureToDelete) return;
    setIsSubmitting(true);
    try {
        const { error } = await supabase.from('expenditures').delete().eq('id', expenditureToDelete.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Expenditure deleted.' });
        setExpenditureToDelete(null);
        await onDataUpdate();
    } catch (e: any) {
        toast({ title: 'Error', description: `Could not delete expenditure: ${e.message}`, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex justify-between items-center'>
            <CardTitle>Expenditures This Month</CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </div>
        </CardHeader>
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
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => setExpenditureToDelete(exp)}><Trash2 className="h-4 w-4"/></Button>
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
                <FormItem>
                  <FormLabel>Amount (GHS)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? undefined : parseFloat(value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>{EXPENDITURE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
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
    </>
  );
}
