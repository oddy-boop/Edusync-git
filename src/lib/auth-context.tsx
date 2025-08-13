
"use client";

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from './supabase/client';

type AuthContextType = {
  role: string | null;
  schoolId: number | null;
  isAdmin: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
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
  isAdmin: false,
  isLoading: true,
  user: null,
  session: null,
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
    const [isLoading, setIsLoading] = useState(true);

    const [hasNewResultsForApproval, setHasNewResultsForApproval] = useState(false);
    const [hasNewBehaviorLog, setHasNewBehaviorLog] = useState(false);
    const [hasNewApplication, setHasNewApplication] = useState(false);
    const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
    const [hasNewResult, setHasNewResult] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setIsLoading(true);
            setUser(session?.user ?? null);
            setSession(session);

            if (session?.user) {
                try {
                    const { data, error } = await supabase
                        .from('user_roles')
                        .select('role, school_id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (error) {
                       console.warn("Could not fetch user role:", error.message);
                       setRole(null);
                       setSchoolId(null);
                    } else if (data) {
                        setRole(data.role);
                        setSchoolId(data.school_id);
                    } else {
                        setRole(null);
                        setSchoolId(null);
                    }
                } catch (e) {
                    console.error("Error fetching user role on auth change:", e);
                    setRole(null);
                    setSchoolId(null);
                }
            } else {
                setRole(null);
                setSchoolId(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        user,
        session,
        role,
        schoolId,
        isAdmin: role === 'admin' || role === 'super_admin',
        isLoading,
        hasNewResultsForApproval, setHasNewResultsForApproval,
        hasNewBehaviorLog, setHasNewBehaviorLog,
        hasNewApplication, setHasNewApplication,
        hasNewAnnouncement, setHasNewAnnouncement,
        hasNewResult, setHasNewResult,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => React.useContext(AuthContext);
