"use client";

import React, { useState, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Building2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';

interface School {
  id: number;
  name: string;
}

export function BranchSwitcher() {
  const { schoolId, schoolName } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSchools();
    }
  }, [isOpen]);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (schoolIdStr: string) => {
    const selectedSchool = schools.find(s => s.id.toString() === schoolIdStr);
    if (selectedSchool) {
      try {
        localStorage.setItem('selectedSchool', JSON.stringify(selectedSchool));
        window.location.reload(); // Reload to apply the new branch
      } catch (error) {
        console.error('Error saving selected school:', error);
      }
    }
  };

  if (!schoolId) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Branch:</span>
      <Select onValueChange={handleBranchChange} value={schoolId.toString()}>
        <SelectTrigger 
          className="w-auto min-w-32 h-8 text-sm border-0 shadow-none focus:ring-0 bg-transparent"
          onClick={() => setIsOpen(true)}
        >
          <SelectValue placeholder={schoolName || "Select branch"} />
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <div className="flex items-center justify-center p-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm">Loading...</span>
            </div>
          ) : (
            schools.map((school) => (
              <SelectItem key={school.id} value={school.id.toString()}>
                {school.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CompactBranchSwitcher() {
  const { schoolId, schoolName } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSchools();
    }
  }, [isOpen]);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (schoolIdStr: string) => {
    const selectedSchool = schools.find(s => s.id.toString() === schoolIdStr);
    if (selectedSchool) {
      try {
        localStorage.setItem('selectedSchool', JSON.stringify(selectedSchool));
        window.location.reload();
      } catch (error) {
        console.error('Error saving selected school:', error);
      }
    }
  };

  if (!schoolId) return null;

  return (
    <Select onValueChange={handleBranchChange} value={schoolId.toString()}>
      <SelectTrigger 
        className="w-auto min-w-24 h-6 text-xs border border-border/50 bg-background/50 hover:bg-background"
        onClick={() => setIsOpen(true)}
      >
        <Building2 className="h-3 w-3 mr-1" />
        <SelectValue placeholder="Branch" />
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <div className="flex items-center justify-center p-2">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="ml-2 text-xs">Loading...</span>
          </div>
        ) : (
          schools.map((school) => (
            <SelectItem key={school.id} value={school.id.toString()}>
              <span className="text-xs">{school.name}</span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
