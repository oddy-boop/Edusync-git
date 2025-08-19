
"use client";

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from './supabase/client';

type AuthContextType = {
  role: string | null;
  schoolId: number | null;
  schoolName: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  fullName: string | null;
  hasNewResultsForApproval: boolean;
  setHasNewResultsForApproval: Dispatch<SetStateAction<boolean>>;
  hasNewBehaviorLog: boolean;
  setHasNewBehaviorLog: Dispatch<SetStateAction<boolean>>;
  hasNewApplication: boolean;
  setHasNewApplication: Dispatch<SetStateAction<boolean>>;
  hasNewAnnouncement: boolean;
  setHasNewAnnouncement: Dispatch<SetStateAction<boolean>>;
  hasNewResult: boolean;
  setHasNewResult: Dispatch<SetStateAction<boolean>>;
};

export const AuthContext = React.createContext<AuthContextType>({
  role: null,
  schoolId: null,
  schoolName: null,
  isAdmin: false,
  isLoading: true,
  user: null,
  session: null,
  fullName: null,
  hasNewResultsForApproval: false,
  setHasNewResultsForApproval: () => {},
  hasNewBehaviorLog: false,
  setHasNewBehaviorLog: () => {},
  hasNewApplication: false,
  setHasNewApplication: () => {},
  hasNewAnnouncement: false,
  setHasNewAnnouncement: () => {},
  hasNewResult: false,
  setHasNewResult: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [schoolId, setSchoolId] = useState<number | null>(null);
    const [schoolName, setSchoolName] = useState<string | null>(null);
    const [fullName, setFullName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [hasNewResultsForApproval, setHasNewResultsForApproval] = useState(false);
    const [hasNewBehaviorLog, setHasNewBehaviorLog] = useState(false);
    const [hasNewApplication, setHasNewApplication] = useState(false);
    const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
    const [hasNewResult, setHasNewResult] = useState(false);
    
    const supabase = createClient();

    useEffect(() => {
        const fetchUserAndRole = async (session: Session | null) => {
            setIsLoading(true);
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setSession(session);
            setFullName(currentUser?.user_metadata?.full_name || null);

            if (currentUser) {
                try {
                    const { data: roleData, error } = await supabase
                        .from('user_roles')
                        .select('role, school_id, schools(id, name)') // Correctly join with schools table
                        .eq('user_id', currentUser.id)
                        .single();

                    if (error && error.code !== 'PGRST116') {
                       console.warn("Could not fetch user role:", error.message);
                       setRole(null);
                       setSchoolId(null);
                       setSchoolName(null);
                    } else if (roleData) {
                        setRole(roleData.role);
                        setSchoolId(roleData.school_id);
                        // The joined data is an object, not an array
                        const schoolInfo = roleData.schools as { id: number; name: string } | null;
                        setSchoolName(schoolInfo?.name || null);
                    } else {
                        setRole(null);
                        setSchoolId(null);
                        setSchoolName(null);
                    }
                } catch (e) {
                    console.error("Error fetching user role on auth change:", e);
                    setRole(null);
                    setSchoolId(null);
                    setSchoolName(null);
                }
            } else {
                setRole(null);
                setSchoolId(null);
                setSchoolName(null);
            }
            setIsLoading(false);
        };
        
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserAndRole(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            fetchUserAndRole(session);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const value = {
        user,
        session,
        role,
        schoolId,
        schoolName,
        isAdmin: role === 'admin' || role === 'super_admin' || role === 'accountant',
        isLoading,
        fullName,
        hasNewResultsForApproval, setHasNewResultsForApproval,
        hasNewBehaviorLog, setHasNewBehaviorLog,
        hasNewApplication, setHasNewApplication,
        hasNewAnnouncement, setHasNewAnnouncement,
        hasNewResult, setHasNewResult,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => React.useContext(AuthContext);

    