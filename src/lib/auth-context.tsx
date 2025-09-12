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

  const [hasNewResultsForApproval, setHasNewResultsForApproval] =
    useState(false);
  const [hasNewBehaviorLog, setHasNewBehaviorLog] = useState(false);
  const [hasNewApplication, setHasNewApplication] = useState(false);
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
  const [hasNewResult, setHasNewResult] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;

    const fetchUserAndRole = async (session: Session | null, isInitialLoad = false) => {
      // Only set loading state for initial load, not for subsequent auth updates
      if (isInitialLoad) {
        setIsLoading(true);
      }
      const currentUser = session?.user ?? null;

      // REMOVED: Automatic session refresh - let users manually refresh if needed
      // No more automatic token refresh to prevent unwanted reloads

      setUser(currentUser);
      setSession(session);
      setFullName(currentUser?.user_metadata?.full_name || null);

      if (currentUser) {
        try {
          const { data: roleData, error } = await supabase
            .from("user_roles")
            .select("role, school_id, schools(id, name)")
            .eq("user_id", currentUser.id)
            .maybeSingle();

          if (error) {
            // Log and reset auth state but do not throw. A transient DB error
            // shouldn't force the UI to treat the user as unauthenticated.
            console.error("Error fetching user role:", error.message || error);
            resetAuthState();
          } else if (roleData) {
            // Valid role found
            setRole(roleData.role);
            
            // Check if user has selected a different branch via localStorage
            let finalSchoolId = roleData.school_id;
            let finalSchoolName = (roleData.schools as unknown as { id: number; name: string; } | null)?.name || null;
            
            try {
              // First check for the simple selectedSchoolId/selectedSchoolName format (from PublicBranchSelector)
              const selectedSchoolId = localStorage.getItem('selectedSchoolId');
              const selectedSchoolName = localStorage.getItem('selectedSchoolName');
              
              if (selectedSchoolId && selectedSchoolName) {
                finalSchoolId = parseInt(selectedSchoolId);
                finalSchoolName = selectedSchoolName;
                console.log(`Using selected branch from simple format: ${finalSchoolName} (${finalSchoolId})`);
              } else {
                // Fall back to the BranchGate format
                const selectedSchoolRaw = localStorage.getItem('selectedSchool');
                if (selectedSchoolRaw) {
                  const selectedSchool = JSON.parse(selectedSchoolRaw);
                  if (selectedSchool && selectedSchool.id) {
                    finalSchoolId = parseInt(selectedSchool.id);
                    finalSchoolName = selectedSchool.name || null;
                    console.log(`Using selected branch from BranchGate format: ${finalSchoolName} (${finalSchoolId})`);
                  }
                }
              }
            } catch (e) {
              console.error('Error reading selected school from localStorage:', e);
              // Fall back to original school_id if localStorage is corrupted
            }
            
            setSchoolId(finalSchoolId);
            setSchoolName(finalSchoolName);

            // Fetch resolved branding from server-side action to ensure consistent URL resolution
            try {
              const resp = await fetch('/api/school-branding');
              if (resp.ok) {
                const json = await resp.json();
                const branding = json?.data ?? null;
                const logoUrl = branding?.school_logo_url ?? branding?.logo_url ?? null;
                const logoUpdatedAt = branding?.logo_updated_at ?? null;
                setSchoolLogoUrl(logoUrl);
                setSchoolLogoUpdatedAt(logoUpdatedAt);
              } else {
                setSchoolLogoUrl(null);
                setSchoolLogoUpdatedAt(null);
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
          setSchoolName(null);
        }
      } else {
        setRole(null);
        setSchoolId(null);
        setSchoolName(null);
  setSchoolLogoUrl(null);
  setSchoolLogoUpdatedAt(null);
      }
      // Only set loading to false if this was an initial load
      if (isInitialLoad) {
        setIsLoading(false);
      }
    };

    // Initial session fetch - this is the only time we show loading
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserAndRole(session, true); // isInitialLoad = true
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only respond to actual login/logout events, not token refreshes or tab switches
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Only refetch for significant auth events, not every session change
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          fetchUserAndRole(session, false); // isInitialLoad = false
        }
        // For TOKEN_REFRESHED, just update the session without full data refetch
        else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session);
        }
      }
      // Ignore other events like 'USER_UPDATED', 'PASSWORD_RECOVERY', etc.
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Set up periodic notification refresh
  useEffect(() => {
    if (!user || !role || !schoolId) return;

    // Initial setup - set notifications to false initially
    setHasNewResultsForApproval(false);
    setHasNewBehaviorLog(false);
    setHasNewApplication(false);
    setHasNewAnnouncement(false);
    setHasNewResult(false);

    // Note: Actual notification counts will be updated by NotificationBadge components
    // which use the proper API endpoints with caching and error handling

  }, [user, role, schoolId]);

  const value = {
    user,
    session,
    role,
    schoolId,
    schoolName,
  schoolLogoUrl,
  schoolLogoUpdatedAt,
    isAdmin:
      role === "admin" || role === "super_admin" || role === "accountant",
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
