
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  startOfYear,
  endOfYear,
  isSameMonth,
} from "date-fns";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Target,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingDown,
  DollarSign,
  Info
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { EXPENDITURE_CATEGORIES, DEFAULT_CATEGORY_BUDGETS } from "@/lib/constants";

// Dynamically import the form component to ensure Paystack hook is only loaded on the client
const ExpenditureForm = dynamic(
  () =>
    import("@/components/forms/ExpenditureForm").then(
      (mod) => mod.ExpenditureForm
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

interface Expenditure {
  id: string;
  amount: number;
  category: string;
  date: Date;
  description: string;
  created_at: string;
}

interface MonthlyBudget {
  month: string;
  budget: number;
  actual: number;
  variance: number;
}

interface BudgetAlert {
  category: string;
  budgetLimit: number;
  currentSpent: number;
  percentageUsed: number;
  isOverBudget: boolean;
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0",
  "#87ceeb",
  "#ffa500",
  "#ff69b4",
  "#32cd32",
  "#ff6347",
  "#4682b4",
  "#daa520",
];

export default function ExpendituresPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const { role, schoolId, isLoading: isAuthLoading } = useAuth();

  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [allExpenditures, setAllExpenditures] = useState<Expenditure[]>([]);
  const [feesCollectedThisMonth, setFeesCollectedThisMonth] = useState(0);
  const [totalYearlyFees, setTotalYearlyFees] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "year">(
    "month"
  );
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // New state for enhanced features
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyBudgets, setMonthlyBudgets] =
    useState<Record<string, number>>(DEFAULT_CATEGORY_BUDGETS);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingExpenditure, setEditingExpenditure] =
    useState<Expenditure | null>(null);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);

  // Budget setup state
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>("");
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string>("");
  const [editingBudgetAmount, setEditingBudgetAmount] = useState<string>("");
  const [editingBudget, setEditingBudget] = useState<string | null>(null);

  const fetchDataForPeriod = useCallback(async (period: "month" | "year", month: Date) => {
    if (isAuthLoading || !schoolId || (role !== 'admin' && role !== 'accountant' && role !== 'super_admin')) return;
    
    setIsLoading(true);
    const now = month || new Date();
    let start: string, end: string;

    if (period === "month") {
      start = format(startOfMonth(now), "yyyy-MM-dd");
      end = format(endOfMonth(now), "yyyy-MM-dd");
    } else {
      start = format(startOfYear(now), "yyyy-MM-dd");
      end = format(endOfYear(now), "yyyy-MM-dd");
    }

    try {
      const { data: expData, error: expError } = await supabase.from("expenditures").select("*").gte("date", start).lte("date", end).order("date", { ascending: false });
      if (expError) throw expError;
      setExpenditures((expData || []).map((item) => ({...item,date: new Date(item.date)})));
       // Fetch all expenditures for analytics
        const { data: allExpData, error: allExpError } = await supabase.from("expenditures").select("*").order("date", { ascending: false });
        if (allExpError) throw allExpError;
        setAllExpenditures((allExpData || []).map((item) => ({...item,date: new Date(item.date)})));

        // Fetch fees for the same period (using created_at instead of payment_date and amount instead of amount_paid)
        const { data: feesData, error: feesError } = await supabase.from("fee_payments").select("amount").gte("created_at", start).lte("created_at", end);
        if (feesError) throw feesError;
        const totalFees = (feesData || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        if (period === "month") {
            setFeesCollectedThisMonth(totalFees);
        }

        // Fetch yearly fees for comparison
        const yearStart = format(startOfYear(now), "yyyy-MM-dd");
        const yearEnd = format(endOfYear(now), "yyyy-MM-dd");
        const { data: yearlyFeesData, error: yearlyFeesError } = await supabase.from("fee_payments").select("amount").gte("created_at", yearStart).lte("created_at", yearEnd);
        if (yearlyFeesError) throw yearlyFeesError;
        setTotalYearlyFees((yearlyFeesData || []).reduce((sum, p) => sum + (p.amount || 0), 0));

        // Calculate budget alerts for current month
        if (period === "month" && isSameMonth(now, new Date())) {
            const currentMonthExps = (expData || []).map((item) => ({...item,date: new Date(item.date)}));
            const alerts: BudgetAlert[] = [];
            EXPENDITURE_CATEGORIES.forEach((category) => {
                const categorySpent = currentMonthExps.filter((exp) => exp.category === category).reduce((sum, exp) => sum + exp.amount, 0);
                const budgetLimit = monthlyBudgets[category] || DEFAULT_CATEGORY_BUDGETS[category];
                const percentageUsed = budgetLimit > 0 ? (categorySpent / budgetLimit) * 100 : 0;
                if (percentageUsed >= 80) {
                    alerts.push({ category, budgetLimit, currentSpent: categorySpent, percentageUsed, isOverBudget: percentageUsed > 100 });
                }
            });
            setBudgetAlerts(alerts);
        }
    } catch (e: any) {
      toast({ title: "Error", description: `Could not fetch expenditures for period: ${e.message}`, variant: "destructive" });
    }
    setIsLoading(false);
  }, [isAuthLoading, schoolId, role, supabase, toast, monthlyBudgets]);

  useEffect(() => {
    if (isAuthLoading) return;

    const allowedRoles = ['admin', 'super_admin', 'accountant'];
    if (!role || !allowedRoles.includes(role)) {
      setError("You do not have permission to view this page.");
      setIsLoading(false);
      return;
    }
    
    if (role === 'super_admin') {
      setIsLoading(false);
      return;
    }
    
    fetchDataForPeriod(selectedPeriod, selectedMonth);
    
  }, [role, isAuthLoading, selectedPeriod, selectedMonth, fetchDataForPeriod]);


  // Load academic year and budgets
  useEffect(() => {
    const loadAcademicYearAndBudgets = async () => {
      if (!schoolId) return;

      try {
        // Use maybeSingle to avoid throwing raw PGRST116 when no rows exist
        const { data: settings, error } = await supabase.from("schools").select("current_academic_year").eq('id', schoolId).maybeSingle();
        if (error) {
          // Normalize Supabase error into a JS Error so catch receives a useful message
          throw new Error(error.message || JSON.stringify(error));
        }

        const academicYear = settings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        setCurrentAcademicYear(academicYear);

        const { data: budgets, error: budgetError } = await supabase.from("budget_categories").select("*").eq("academic_year", academicYear);
        if (budgetError) {
          // Only ignore PGRST116 if it appears (no rows); otherwise throw a readable error
          if (budgetError.code !== "PGRST116") throw new Error(budgetError.message || JSON.stringify(budgetError));
        }

        if (budgets && budgets.length > 0) {
          const budgetMap: Record<string, number> = { ...DEFAULT_CATEGORY_BUDGETS };
          budgets.forEach((budget: any) => { budgetMap[budget.category] = budget.monthly_limit; });
          setMonthlyBudgets(budgetMap);
        }
      } catch (err: any) {
        // Ensure we log a useful message and show a toast
        const errMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        console.error("Error loading academic year and budgets:", errMessage, { raw: err });
        toast({ title: 'Error', description: `Could not load budgets: ${errMessage}`, variant: 'destructive' });
      }
    };
    if (role === 'admin' || role === 'accountant') {
        loadAcademicYearAndBudgets();
    }
  }, [role, schoolId, supabase]);

  const totalExpensesThisMonth = useMemo(() => {
    return expenditures.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenditures]);

  const totalExpensesThisYear = useMemo(() => {
    const now = new Date();
    const yearStart = startOfYear(now);
    return allExpenditures
      .filter((exp) => exp.date >= yearStart)
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [allExpenditures]);

  const netBalance =
    selectedPeriod === "month"
      ? feesCollectedThisMonth - totalExpensesThisMonth
      : totalYearlyFees - totalExpensesThisYear;

  const filteredExpenditures = useMemo(() => {
    return expenditures.filter((exp) => {
      const matchesCategory =
        filterCategory === "all" || exp.category === filterCategory;
      const matchesSearch =
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [expenditures, filterCategory, searchTerm]);

  const categoryChartData = useMemo(() => {
    const summary = filteredExpenditures.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(summary)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenditures]);

  const monthlyTrendData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const monthExpenses = allExpenditures
        .filter((exp) => exp.date >= monthStart && exp.date <= monthEnd)
        .reduce((sum, exp) => sum + exp.amount, 0);

      return {
        month: format(date, "MMM yyyy"),
        expenses: monthExpenses,
      };
    }).reverse();

    return last6Months;
  }, [allExpenditures]);

  // Budget vs Actual comparison for selected month
  const budgetVsActualData = useMemo(() => {
    const categorySpending = expenditures.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return EXPENDITURE_CATEGORIES.map((category) => ({
      category:
        category.length > 15 ? category.substring(0, 15) + "..." : category,
      fullCategory: category,
      budget: monthlyBudgets[category] || DEFAULT_CATEGORY_BUDGETS[category],
      actual: categorySpending[category] || 0,
      variance:
        (monthlyBudgets[category] || DEFAULT_CATEGORY_BUDGETS[category]) -
        (categorySpending[category] || 0),
    })).filter((item) => item.budget > 0 || item.actual > 0);
  }, [expenditures, monthlyBudgets]);

  // Month-over-month comparison
  const monthOverMonthData = useMemo(() => {
    const currentMonthTotal = expenditures.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );

    const prevMonth = subMonths(selectedMonth, 1);
    const prevMonthStart = startOfMonth(prevMonth);
    const prevMonthEnd = endOfMonth(prevMonth);

    const prevMonthTotal = allExpenditures
      .filter((exp) => exp.date >= prevMonthStart && exp.date <= prevMonthEnd)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const percentageChange =
      prevMonthTotal > 0
        ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
        : currentMonthTotal > 0 ? 100 : 0;

    return {
      current: currentMonthTotal,
      previous: prevMonthTotal,
      change: currentMonthTotal - prevMonthTotal,
      percentageChange,
    };
  }, [expenditures, allExpenditures, selectedMonth]);

  const handleDeleteExpenditure = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expenditures")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expenditure deleted successfully",
      });
      fetchDataForPeriod(selectedPeriod, selectedMonth);
    } catch (e: any) {
      toast({
        title: "Error",
        description: `Failed to delete expenditure: ${e.message}`,
        variant: "destructive",
      });
    }
  };

  const handlePeriodChange = (period: "month" | "year") => {
    setSelectedPeriod(period);
    fetchDataForPeriod(period, selectedMonth);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth =
      direction === "prev"
        ? subMonths(selectedMonth, 1)
        : addMonths(selectedMonth, 1);
    setSelectedMonth(newMonth);
    fetchDataForPeriod(selectedPeriod, newMonth);
  };

  const goToCurrentMonth = () => {
    const currentMonth = new Date();
    setSelectedMonth(currentMonth);
    fetchDataForPeriod(selectedPeriod, currentMonth);
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Date", "Category", "Amount", "Description"],
      ...filteredExpenditures.map((exp) => [
        format(exp.date, "yyyy-MM-dd"),
        exp.category,
        exp.amount.toString(),
        `"${exp.description.replace(/"/g, '""')}"`
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenditures_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Budget management functions
  const loadBudgets = useCallback(async () => {
    if (!currentAcademicYear || !schoolId) return;

    setIsLoadingBudgets(true);
    try {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .eq("academic_year", currentAcademicYear);

      if (error) throw error;

      // Create budget object from database data
      const budgets: Record<string, number> = { ...DEFAULT_CATEGORY_BUDGETS };
      (data as any[])?.forEach((budget: any) => {
        budgets[budget.category] = budget.monthly_limit;
      });

      setMonthlyBudgets(budgets);
    } catch (error: any) {
      console.error("Error loading budgets:", error);
      toast({
        title: "Error",
        description: `Failed to load budgets: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingBudgets(false);
    }
  }, [supabase, schoolId, currentAcademicYear, toast]);

  const saveBudget = async (category: string, amount: number) => {
    if (!currentAcademicYear || !schoolId) {
      toast({
        title: "Error",
        description: "Academic year or school not set",
        variant: "destructive",
      });
      return;
    }

    try {
      // Read existing budget row matching the keys
      const { data: existingRows, error: selectErr } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('category', category)
        .eq('academic_year', currentAcademicYear)
        .limit(1);

      if (selectErr) {
        console.error('Error checking existing budget row:', selectErr);
        throw new Error(selectErr.message || JSON.stringify(selectErr));
      }

      if (existingRows && existingRows.length > 0) {
        // Update existing row
        const rowId = existingRows[0].id;
        const { data: updated, error: updateErr } = await supabase
          .from('budget_categories')
          .update({ monthly_limit: amount })
          .eq('id', rowId)
          .select()
          .maybeSingle();

        if (updateErr) {
          console.error('Error updating budget row:', updateErr, 'rowId:', rowId);
          throw new Error(updateErr.message || JSON.stringify(updateErr));
        }
      } else {
        // Insert new row
        const { data: inserted, error: insertErr } = await supabase
          .from('budget_categories')
          .insert({ school_id: schoolId, category, monthly_limit: amount, academic_year: currentAcademicYear })
          .select()
          .maybeSingle();

        if (insertErr) {
          console.error('Error inserting budget row:', insertErr);
          throw new Error(insertErr.message || JSON.stringify(insertErr));
        }
      }

      // Update local state
      setMonthlyBudgets((prev) => ({
        ...prev,
        [category]: amount,
      }));

      toast({
        title: "Success",
        description: `Budget for ${category} updated successfully`,
      });

      // Refresh data to update progress bars
      await fetchDataForPeriod(selectedPeriod, selectedMonth);

      setShowBudgetDialog(false);
      setEditingCategory("");
      setEditingBudgetAmount("");
      setEditingBudget(null);
    } catch (error: any) {
      console.error("Error saving budget:", error);
      toast({
        title: "Error",
        description: `Failed to save budget: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleBudgetEdit = (category: string) => {
    setEditingCategory(category);
    setEditingBudget(category);
    setEditingBudgetAmount(monthlyBudgets[category]?.toString() || "0");
    setShowBudgetDialog(true);
  };

  const handleBudgetSave = () => {
    const amount = parseFloat(editingBudgetAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    saveBudget(editingCategory, amount);
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (role === 'super_admin') {
    return (
        <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-blue-700"/>Super Admin View</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-blue-800">
                    This page is for managing expenditures for a specific school. As a super admin, you can manage this data for any school by visiting the "Schools Management" page and navigating to the desired branch's portal.
                </p>
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2" /> Access Denied or Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <><div className="container mx-auto p-3 sm:p-6 max-w-7xl">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center">
          <TrendingUp className="mr-2 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8" />
          Financial Management
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Monitor expenses, track budgets, and analyze spending patterns.
        </p>
      </div>

      {/* Controls Row - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button onClick={exportToCSV} variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <Button onClick={exportToCSV} variant="outline" size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div><div className="space-y-4 sm:space-y-6">
        {/* Month Navigation */}
        {selectedPeriod === "month" && (
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:order-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-900">
                    {format(selectedMonth, "MMMM yyyy")}
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-600">
                    {isSameMonth(selectedMonth, new Date())
                      ? "Current Month"
                      : "Historical Data"}
                  </p>
                </div>

                <div className="flex justify-center sm:justify-start sm:order-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth("prev")}
                    className="flex items-center"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                </div>

                <div className="flex justify-center gap-2 sm:justify-end sm:order-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth("next")}
                    className="flex items-center"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={goToCurrentMonth}
                    className="flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Today</span>
                    <span className="sm:hidden">Now</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-orange-800 flex items-center text-sm sm:text-base">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Budget Alerts ({budgetAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {budgetAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 sm:p-4 rounded-lg border ${alert.isOverBudget
                        ? "bg-red-100 border-red-300"
                        : "bg-yellow-100 border-yellow-300"}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm sm:text-base truncate">
                          {alert.category}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600">
                          GHS {alert.currentSpent.toFixed(2)} / GHS{" "}
                          {alert.budgetLimit.toFixed(2)}
                        </p>
                      </div>
                      <Badge
                        variant={alert.isOverBudget ? "destructive" : "secondary"}
                        className="text-xs flex-shrink-0 ml-2"
                      >
                        {alert.percentageUsed.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards with Month Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Income</CardTitle>
              <CardDescription className="text-xs">
                {selectedPeriod === "month"
                  ? format(selectedMonth, "MMMM yyyy")
                  : "This year"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg sm:text-2xl font-bold text-green-700">
                GHS{" "}
                {(selectedPeriod === "month"
                  ? feesCollectedThisMonth
                  : totalYearlyFees
                ).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Total Expenses
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedPeriod === "month"
                  ? format(selectedMonth, "MMMM yyyy")
                  : "This year"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg sm:text-2xl font-bold text-red-700">
                GHS{" "}
                {(selectedPeriod === "month"
                  ? totalExpensesThisMonth
                  : totalExpensesThisYear
                ).toFixed(2)}
              </p>
              {selectedPeriod === "month" &&
                monthOverMonthData.percentageChange !== 0 && (
                  <p
                    className={`text-xs flex items-center mt-1 ${monthOverMonthData.percentageChange > 0
                        ? "text-red-600"
                        : "text-green-600"}`}
                  >
                    {monthOverMonthData.percentageChange > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(monthOverMonthData.percentageChange).toFixed(1)}% vs
                    last month
                  </p>
                )}
            </CardContent>
          </Card>

          <Card
            className={netBalance >= 0
              ? "bg-blue-50 border-blue-200"
              : "bg-orange-50 border-orange-200"}
          >
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">Net Balance</CardTitle>
              <CardDescription className="text-xs">Income - Expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className={`text-lg sm:text-2xl font-bold ${netBalance >= 0 ? "text-blue-700" : "text-orange-700"}`}
              >
                GHS {netBalance.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">Categories</CardTitle>
              <CardDescription className="text-xs">Active expense types</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg sm:text-2xl font-bold text-purple-700">
                {categoryChartData.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-7 min-w-max sm:min-w-0">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="budget" className="text-xs sm:text-sm">Budget vs Actual</TabsTrigger>
              <TabsTrigger value="budget-setup" className="text-xs sm:text-sm">Budget Setup</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
              <TabsTrigger value="details" className="text-xs sm:text-sm">Transactions</TabsTrigger>
              <TabsTrigger value="manage" className="text-xs sm:text-sm">Manage</TabsTrigger>
              <TabsTrigger value="add" className="text-xs sm:text-sm">Quick Add</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">Expense Categories</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Breakdown by category for{" "}
                    {selectedPeriod === "month"
                      ? format(new Date(), "MMMM yyyy")
                      : format(new Date(), "yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [
                            `GHS ${Number(value).toFixed(2)}`,
                            "Amount",
                          ]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No expenditures recorded yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>
                    Horizontal bar chart by amount
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={categoryChartData}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value) => [
                            `GHS ${Number(value).toFixed(2)}`,
                            "Amount",
                          ]} />
                        <Bar dataKey="value" fill="#8884d8" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No expenditures recorded yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Budget vs Actual Spending</CardTitle>
                  <CardDescription>
                    Comparison for {format(selectedMonth, "MMMM yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {budgetVsActualData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={budgetVsActualData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="category"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12} />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name) => [
                            `GHS ${Number(value).toFixed(2)}`,
                            name === "budget"
                              ? "Budget"
                              : name === "actual"
                                ? "Actual"
                                : "Variance",
                          ]}
                          labelFormatter={(label) => {
                            const item = budgetVsActualData.find(
                              (d) => d.category === label
                            );
                            return item?.fullCategory || label;
                          } } />
                        <Legend />
                        <Bar dataKey="budget" fill="#93c5fd" name="Budget" />
                        <Bar dataKey="actual" fill="#ef4444" name="Actual" />
                        <Line
                          type="monotone"
                          dataKey="variance"
                          stroke="#16a34a"
                          name="Variance" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No budget data available.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Budget Performance</CardTitle>
                  <CardDescription>
                    Category-wise budget utilization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {budgetVsActualData.slice(0, 8).map((item, index) => {
                      const utilizationPercent = item.budget > 0 ? (item.actual / item.budget) * 100 : 0;
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              {item.fullCategory}
                            </span>
                            <div className="text-right">
                              <span className="text-sm">
                                GHS {item.actual.toFixed(2)} / GHS{" "}
                                {item.budget.toFixed(2)}
                              </span>
                              <div
                                className={`text-xs ${utilizationPercent > 100
                                    ? "text-red-600"
                                    : utilizationPercent > 80
                                      ? "text-orange-600"
                                      : "text-green-600"}`}
                              >
                                {utilizationPercent.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${utilizationPercent > 100
                                  ? "bg-red-500"
                                  : utilizationPercent > 80
                                    ? "bg-orange-500"
                                    : "bg-green-500"}`}
                              style={{
                                width: `${Math.min(utilizationPercent, 100)}%`,
                              }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="budget-setup" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Monthly Budget Setup</span>
                    <Badge variant="outline">
                      Academic Year: {currentAcademicYear}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Set monthly budget limits for each expenditure category. These
                    budgets will be used for alerts and analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingBudgets ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Loading budgets...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {EXPENDITURE_CATEGORIES.map((category) => (
                        <Card
                          key={category}
                          className="border-2 hover:border-primary/50 transition-colors"
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              {category}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Monthly budget limit (applies to all months)
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-2xl font-bold text-primary">
                                GHS{" "}
                                {monthlyBudgets[category]?.toFixed(2) || "0.00"}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBudgetEdit(category)}
                                className="mt-3 sm:mt-0"
                              >
                                Edit
                              </Button>
                            </div>

                            {/* Show current month usage */}
                            {(() => {
                              const categoryExpenditures = expenditures.filter((exp) => exp.category === category);
                              const currentSpent = categoryExpenditures.reduce((sum, exp) => sum + exp.amount, 0);
                              const budget = monthlyBudgets[category] || 0;
                              const percentage = budget > 0 ? (currentSpent / budget) * 100 : 0;

                              // Debug logging - show all expenditure categories for the first category only
                              if (category === "Office Supplies") {
                                console.log(`All expenditure categories:`, expenditures.map(exp => ({
                                  category: exp.category,
                                  amount: exp.amount,
                                  description: exp.description
                                })));
                                console.log(`Looking for category: "${category}"`);
                                console.log(`Predefined categories:`, EXPENDITURE_CATEGORIES);
                              }

                              return (
                                <div className="mt-3 space-y-1">
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Spent this month</span>
                                    <span>GHS {currentSpent.toFixed(2)}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${percentage > 100
                                          ? "bg-red-500"
                                          : percentage > 80
                                            ? "bg-orange-500"
                                            : "bg-green-500"}`}
                                      style={{
                                        width: `${Math.min(percentage, 100)}%`,
                                      }} />
                                  </div>
                                  <div className="text-xs text-center">
                                    {percentage.toFixed(1)}% used
                                  </div>
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Budget Tips:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>
                        • Budgets are set per month for the current academic year
                      </li>
                      <li>
                        • You'll receive alerts when spending reaches 80% of the
                        budget
                      </li>
                      <li>
                        • Red alerts appear when you exceed 100% of the budget
                      </li>
                      <li>
                        • Budget comparison charts show actual vs planned spending
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>6-Month Expense Trend</CardTitle>
                <CardDescription>
                  Monthly expenditure pattern over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [
                        `GHS ${Number(value).toFixed(2)}`,
                        "Expenses",
                      ]} />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ fill: "#8884d8" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
                <CardDescription>
                  All expenditure records with filters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4 items-stretch">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by description or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <Select
                    value={filterCategory}
                    onValueChange={setFilterCategory}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {EXPENDITURE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenditures.length > 0 ? (
                        filteredExpenditures.map((expenditure) => (
                          <TableRow key={expenditure.id}>
                            <TableCell className="font-medium">
                              {format(expenditure.date, "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {expenditure.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {expenditure.description}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              GHS {expenditure.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingExpenditure(expenditure)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteExpenditure(expenditure.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No expenditures match your criteria.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {filteredExpenditures.length > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Total: GHS{" "}
                    {filteredExpenditures
                      .reduce((sum, exp) => sum + exp.amount, 0)
                      .toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Expenditure Management</h3>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Expenditure
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-blue-900">
                        {filteredExpenditures.length}
                      </p>
                      <p className="text-sm text-blue-600">Total Records</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-purple-900">
                        GHS{" "}
                        {filteredExpenditures
                          .reduce((sum, exp) => sum + exp.amount, 0)
                          .toFixed(2)}
                      </p>
                      <p className="text-sm text-purple-600">Total Amount</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <PieChartIcon className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-green-900">
                        {new Set(filteredExpenditures.map((exp) => exp.category))
                          .size}
                      </p>
                      <p className="text-sm text-green-600">Categories Used</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Manage Expenditures</CardTitle>
                <CardDescription>
                  View, edit, and delete expenditure records for{" "}
                  {format(selectedMonth, "MMMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4 items-stretch">
                  <div className="flex-1">
                    <Input
                      placeholder="Search expenditures..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <Select
                    value={filterCategory}
                    onValueChange={setFilterCategory}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {EXPENDITURE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenditures.length > 0 ? (
                        filteredExpenditures.map((expenditure) => (
                          <TableRow key={expenditure.id}>
                            <TableCell className="font-medium">
                              {format(expenditure.date, "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {expenditure.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {expenditure.description}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              GHS {expenditure.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingExpenditure(expenditure)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteExpenditure(expenditure.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground py-8"
                          >
                            No expenditures found for the current filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {filteredExpenditures.length > 0 && (
                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredExpenditures.length} expenditure(s)
                    </div>
                    <div className="text-sm font-medium">
                      Total: GHS{" "}
                      {filteredExpenditures
                        .reduce((sum, exp) => sum + exp.amount, 0)
                        .toFixed(2)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Add Expenditure</CardTitle>
                <CardDescription>
                  Add a new expenditure record quickly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenditureForm
                  expenditures={expenditures}
                  onDataUpdate={async () => await fetchDataForPeriod(selectedPeriod, selectedMonth)} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add/Edit Dialog */}
          <Dialog
            open={showAddDialog || editingExpenditure !== null}
            onOpenChange={(open) => {
              if (!open) {
                setShowAddDialog(false);
                setEditingExpenditure(null);
              }
            } }
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingExpenditure
                    ? "Edit Expenditure"
                    : "Add New Expenditure"}
                </DialogTitle>
                <DialogDescription>
                  {editingExpenditure
                    ? "Update the expenditure details below."
                    : "Fill in the details to add a new expenditure."}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <ExpenditureForm
                  expenditures={expenditures}
                  onDataUpdate={async () => {
                    await fetchDataForPeriod(selectedPeriod, selectedMonth);
                    setShowAddDialog(false);
                    setEditingExpenditure(null);
                  } } />
              </div>
            </DialogContent>
          </Dialog>

          {/* Budget Edit Dialog */}
          <Dialog
            open={!!editingBudget}
            onOpenChange={(open) => !open && setEditingBudget(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Monthly Budget for {editingBudget}</DialogTitle>
                <DialogDescription>
                  Set the monthly budget limit for this category. You'll receive
                  alerts when spending approaches or exceeds this amount.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="budgetAmount">
                    Monthly Budget Amount (GHS)
                  </Label>
                  <Input
                    id="budgetAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editingBudgetAmount}
                    onChange={(e) => setEditingBudgetAmount(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingBudget(null)}>
                  Cancel
                </Button>
                <Button onClick={handleBudgetSave}>Save Budget</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Tabs>
      </div></>
  );
}
