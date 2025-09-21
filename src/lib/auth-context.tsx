"use client";

import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

type AuthContextType = {
  role: string | null;
  schoolId: number | null;
  schoolName: string | null;
  schoolLogoUrl: string | null;
  schoolLogoUpdatedAt: string | null;
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
  schoolLogoUrl: null,
  schoolLogoUpdatedAt: null,
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
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const [schoolLogoUpdatedAt, setSchoolLogoUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewResultsForApproval, setHasNewResultsForApproval] = useState(false);
  const [hasNewBehaviorLog, setHasNewBehaviorLog] = useState(false);
  const [hasNewApplication, setHasNewApplication] = useState(false);
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
  const [hasNewResult, setHasNewResult] = useState(false);
  
  const mounted = React.useRef(true);
  const supabase = createClient();

  const resetAuthState = () => {
    setRole(null);
    setSchoolId(null);
    setSchoolName(null);
    setSchoolLogoUrl(null);
    setSchoolLogoUpdatedAt(null);
  };

  const setupAdminNotifications = async (schoolId: number) => {
    try {
      const { data: pendingResults } = await supabase
        .from("student_results")
        .select("id")
        .eq("school_id", schoolId)
        .eq("approval_status", "pending")
        .limit(1);
      setHasNewResultsForApproval(!!pendingResults?.length);

      const { data: newBehavior } = await supabase
        .from("behavior_incidents")
        .select("id")
        .eq("school_id", schoolId)
        .eq("status", "unread")
        .limit(1);
      setHasNewBehaviorLog(!!newBehavior?.length);

      const { data: newApplications } = await supabase
        .from("admission_applications")
        .select("id")
        .eq("school_id", schoolId)
        .eq("status", "pending")
        .limit(1);
      setHasNewApplication(!!newApplications?.length);
    } catch (error) {
      console.error("Error setting up admin notifications:", error);
    }
  };

  const setupTeacherNotifications = async (schoolId: number) => {
    try {
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("school_id", schoolId)
        .eq("status", "new_submissions")
        .limit(1);
      setHasNewApplication(!!assignments?.length);
    } catch (error) {
      console.error("Error setting up teacher notifications:", error);
    }
  };

  const setupStudentNotifications = async (schoolId: number) => {
    try {
      const { data: results } = await supabase
        .from("student_results")
        .select("id")
        .eq("school_id", schoolId)
        .eq("approval_status", "approved")
        .limit(1);
      setHasNewResult(!!results?.length);

      const { data: announcements } = await supabase
        .from("school_announcements")
        .select("id")
        .eq("school_id", schoolId)
        .eq("is_read", false)
        .limit(1);
      setHasNewAnnouncement(!!announcements?.length);
    } catch (error) {
      console.error("Error setting up student notifications:", error);
    }
  };

  useEffect(() => {
    mounted.current = true;

    const fetchUserAndRole = async (session: Session | null, isInitialLoad = false) => {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setSession(session);
      setFullName(currentUser?.user_metadata?.full_name || null);

      if (currentUser) {
        try {
          // Direct query for user role, no RPC or safe function
          const { data: roleData, error } = await supabase
            .from("user_roles")
            .select("role, school_id")
            .eq("user_id", currentUser.id)
            .maybeSingle();

          if (error) {
            console.error("Error fetching user role:", error.message);
            resetAuthState();
            return;
          }

          if (roleData) {
            if (!mounted.current) return;
            
            setRole(roleData.role);
            setSchoolId(roleData.school_id);

            // Fetch school name if we have school_id
            if (roleData.school_id) {
              const { data: schoolData } = await supabase
                .from("schools")
                .select("name")
                .eq("id", roleData.school_id)
                .single();
              
              if (schoolData) {
                setSchoolName(schoolData.name);
              }
            }

            // Fetch school branding
            try {
              const resp = await fetch('/api/school-branding');
              if (resp.ok) {
                const json = await resp.json();
                const branding = json?.data ?? null;
                const logoUrl = branding?.school_logo_url ?? branding?.logo_url ?? null;
                const logoUpdatedAt = branding?.logo_updated_at ?? null;
                setSchoolLogoUrl(logoUrl);
                setSchoolLogoUpdatedAt(logoUpdatedAt);
              }
            } catch (e) {
              setSchoolLogoUrl(null);
              setSchoolLogoUpdatedAt(null);
            }

            // Set up role-specific notifications
            if (roleData.role === "admin" || roleData.role === "accountant") {
              setupAdminNotifications(roleData.school_id);
            } else if (roleData.role === "teacher") {
              setupTeacherNotifications(roleData.school_id);
            } else if (roleData.role === "student") {
              setupStudentNotifications(roleData.school_id);
            }
          } else {
            resetAuthState();
          }
        } catch (e) {
          console.error("Error in auth state change:", e);
          resetAuthState();
        }
      } else {
        resetAuthState();
      }

      if (isInitialLoad) {
        setIsLoading(false);
      }
    };

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserAndRole(session, true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchUserAndRole(session, false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    role,
    schoolId,
    schoolName,
    schoolLogoUrl,
    schoolLogoUpdatedAt,
    isAdmin: role === "admin" || role === "super_admin" || role === "accountant",
    isLoading,
    fullName,
    hasNewResultsForApproval,
    setHasNewResultsForApproval,
    hasNewBehaviorLog,
    setHasNewBehaviorLog,
    hasNewApplication,
    setHasNewApplication,
    hasNewAnnouncement,
    setHasNewAnnouncement,
    hasNewResult,
    setHasNewResult,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => React.useContext(AuthContext);
