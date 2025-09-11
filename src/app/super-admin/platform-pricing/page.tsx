"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  getPlatformPricing, 
  setPlatformPricing, 
  deactivatePlatformPricing,
  type PlatformPricing 
} from "@/lib/actions/platform-pricing.actions";
import { 
  DollarSign, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  TrendingUp,
  GraduationCap,
  Calendar
} from "lucide-react";
import { GRADE_LEVELS } from "@/lib/constants";

const CURRENT_ACADEMIC_YEAR = "2024-2025";

interface PricingFormData {
  grade_level: string;
  pricing_type: 'per_term' | 'per_year';
  platform_fee: number;
  academic_year: string;
}

export default function PlatformPricingPage() {
  const { toast } = useToast();
  const [pricing, setPricing] = useState<PlatformPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<PlatformPricing | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<PricingFormData>({
    grade_level: '',
    pricing_type: 'per_term',
    platform_fee: 0,
    academic_year: CURRENT_ACADEMIC_YEAR,
  });

  useEffect(() => {
    fetchPlatformPricing();
  }, []);

  const fetchPlatformPricing = async () => {
    try {
      setIsLoading(true);
      const result = await getPlatformPricing(CURRENT_ACADEMIC_YEAR);
      
      if (result.success) {
        setPricing(result.data || []);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching platform pricing:', error);
      toast({
        title: "Error",
        description: "Failed to load platform pricing",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      if (!formData.grade_level || formData.platform_fee < 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields correctly",
          variant: "destructive",
        });
        return;
      }

      const result = await setPlatformPricing(formData);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        
        setIsDialogOpen(false);
        setEditingPricing(null);
        resetForm();
        await fetchPlatformPricing();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving platform pricing:', error);
      toast({
        title: "Error",
        description: "Failed to save platform pricing",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (pricingItem: PlatformPricing) => {
    setEditingPricing(pricingItem);
    setFormData({
      grade_level: pricingItem.grade_level,
      pricing_type: pricingItem.pricing_type,
      platform_fee: pricingItem.platform_fee,
      academic_year: pricingItem.academic_year,
    });
    setIsDialogOpen(true);
  };

  const handleDeactivate = async (pricingId: string) => {
    try {
      const result = await deactivatePlatformPricing(pricingId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        await fetchPlatformPricing();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deactivating platform pricing:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate platform pricing",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      grade_level: '',
      pricing_type: 'per_term',
      platform_fee: 0,
      academic_year: CURRENT_ACADEMIC_YEAR,
    });
  };

  const handleAddNew = () => {
    setEditingPricing(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const totalRevenue = pricing.reduce((sum, item) => sum + item.platform_fee, 0);
  const averageFee = pricing.length > 0 ? totalRevenue / pricing.length : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">
          Loading platform pricing...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <DollarSign className="mr-3 h-8 w-8" />
          Platform Pricing Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Set and manage platform fees that will be added to school fees for each grade level.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Grade Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pricing.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Platform Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">GHS {averageFee.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Academic Year</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{CURRENT_ACADEMIC_YEAR}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pricing Model</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Per Term</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Pricing Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <GraduationCap className="mr-2 h-5 w-5" />
                Platform Pricing Configuration
              </CardTitle>
              <CardDescription>
                Manage platform fees for different grade levels. These fees will be automatically added to school fees.
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pricing
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPricing ? 'Edit Platform Pricing' : 'Add New Platform Pricing'}
                  </DialogTitle>
                  <DialogDescription>
                    Set the platform fee for a grade level. This will be automatically added to school fees.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="grade_level">Grade Level</Label>
                    <Select
                      value={formData.grade_level}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, grade_level: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="pricing_type">Pricing Type</Label>
                    <Select
                      value={formData.pricing_type}
                      onValueChange={(value: 'per_term' | 'per_year') => 
                        setFormData(prev => ({ ...prev, pricing_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_term">Per Term</SelectItem>
                        <SelectItem value="per_year">Per Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="platform_fee">Platform Fee (GHS)</Label>
                    <Input
                      id="platform_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.platform_fee}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        platform_fee: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="academic_year">Academic Year</Label>
                    <Input
                      id="academic_year"
                      value={formData.academic_year}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        academic_year: e.target.value 
                      }))}
                      placeholder="2024-2025"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Pricing'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {pricing.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium">No platform pricing configured</p>
              <p className="text-muted-foreground mb-4">
                Add platform pricing for different grade levels to start collecting fees.
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Pricing
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Pricing Type</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricing.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.grade_level}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.pricing_type === 'per_term' ? 'Per Term' : 'Per Year'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      GHS {item.platform_fee.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(item.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
