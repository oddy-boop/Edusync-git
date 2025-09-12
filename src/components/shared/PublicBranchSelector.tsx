"use client";

import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface School {
  id: string;
  name: string;
  domain?: string;
  logo_url?: string;
}

export function PublicBranchSelector() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved selection from localStorage
    const savedSchoolId = localStorage.getItem('selectedSchoolId');
    
    if (savedSchoolId) setSelectedSchoolId(savedSchoolId);

    // Fetch schools (branches)
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/schools');
      if (response.ok) {
        const data = await response.json();
        setSchools(data);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchoolChange = (schoolId: string, schoolName: string) => {
    setSelectedSchoolId(schoolId);
    
    // Save the selection to localStorage (this is what the system expects)
    localStorage.setItem('selectedSchoolId', schoolId);
    localStorage.setItem('selectedSchoolName', schoolName);
    
    // Also save in the format expected by BranchGate
    const selectedSchool = schools.find(s => s.id === schoolId);
    if (selectedSchool) {
      localStorage.setItem('selectedSchool', JSON.stringify({
        id: parseInt(schoolId),
        name: schoolName,
        domain: selectedSchool.domain,
        logo_url: selectedSchool.logo_url
      }));
    }
    
    // Force a page reload to ensure the auth context picks up the new selection
    // This ensures consistent data display across the app
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
        <Building2 size={16} />
        <span>Loading schools...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-primary-foreground/70 font-medium">Select Your School Branch</div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="justify-start bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 w-full sm:w-auto"
          >
            <Building2 size={14} className="mr-2" />
            {selectedSchool ? selectedSchool.name : 'Choose Your School'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {schools.map((school) => (
            <DropdownMenuItem
              key={school.id}
              onClick={() => handleSchoolChange(school.id, school.name)}
            >
              <div className="flex items-center gap-2">
                {school.logo_url && (
                  <img 
                    src={school.logo_url} 
                    alt={school.name} 
                    className="w-4 h-4 rounded object-cover"
                  />
                )}
                <span>{school.name}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {selectedSchool && (
        <div className="text-xs text-primary-foreground/60">
          Selected: {selectedSchool.name}
        </div>
      )}
    </div>
  );
}
