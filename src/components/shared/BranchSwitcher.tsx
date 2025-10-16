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
  has_admin?: boolean;
  domain?: string;
}

export function BranchSwitcher() {
  const { schoolId, schoolName } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  // Dynamically update cache if schoolId changes
  useEffect(() => {
    if (schoolId) {
      // Only update if different from cached value
      try {
        const cached = localStorage.getItem('selectedSchool');
        let cachedId = null;
        if (cached) {
          try { cachedId = JSON.parse(cached)?.id; } catch {}
        }
        if (cachedId !== schoolId) {
          // If we have schools loaded, find the matching school
          const match = schools.find(s => s.id === schoolId);
          if (match) {
            localStorage.setItem('selectedSchool', JSON.stringify(match));
          } else {
            // fallback: just store id
            localStorage.setItem('selectedSchool', JSON.stringify({ id: schoolId, name: schoolName }));
          }
        }
      } catch {}
    }
  }, [schoolId, schoolName, schools]);
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
  const response = await fetch('/api/public/schools');
      if (response.ok) {
        const data = await response.json();
        setSchools(data || []);
      } else {
        console.error('Error loading schools:', await response.text());
      }
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
        // Optionally, trigger a context update or reload
        window.location.reload();
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
  // Dynamically update cache if schoolId changes
  useEffect(() => {
    if (schoolId) {
      try {
        const cached = localStorage.getItem('selectedSchool');
        let cachedId = null;
        if (cached) {
          try { cachedId = JSON.parse(cached)?.id; } catch {}
        }
        if (cachedId !== schoolId) {
          const match = schools.find(s => s.id === schoolId);
          if (match) {
            localStorage.setItem('selectedSchool', JSON.stringify(match));
          } else {
            localStorage.setItem('selectedSchool', JSON.stringify({ id: schoolId, name: schoolName }));
          }
        }
      } catch {}
    }
  }, [schoolId, schoolName, schools]);
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
  const response = await fetch('/api/public/schools');
      if (response.ok) {
        const data = await response.json();
        setSchools(data || []);
      } else {
        console.error('Error loading schools:', await response.text());
      }
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
