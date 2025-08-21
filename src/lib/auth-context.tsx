"use client";

import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

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

  const resetAuthState = () => {
    setRole(null);
    setSchoolId(null);
    setSchoolName(null);
  };

  const setupAdminNotifications = async (schoolId: number) => {
    try {
      const { data: pendingResults } = await supabase
        .from("academic_results")
        .select("id")
        .eq("school_id", schoolId)
        .eq("status", "pending")
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
        .from("academic_results")
        .select("id")
        .eq("school_id", schoolId)
        .eq("status", "approved")
        .eq("is_new", true)
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

    const fetchUserAndRole = async (session: Session | null) => {
      setIsLoading(true);
      const currentUser = session?.user ?? null;

      // Check session expiration
      if (session && session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();

        // If session expires in less than 5 minutes, refresh it
        if (timeUntilExpiry < 300000) {
          const {
            data: { session: newSession },
            error,
          } = await supabase.auth.refreshSession();
          if (!error && newSession) {
            session = newSession;
          }
        }
      }

      setUser(currentUser);
      setSession(session);
      setFullName(currentUser?.user_metadata?.full_name || null);

      if (currentUser) {
        try {
          const { data: roleData, error } = await supabase
            .from("user_roles")
            .select("role, school_id, schools(id, name)")
            .eq("user_id", currentUser.id)
            .single();

          if (error) {
            if (error.code === "PGRST116") {
              // No role found - this is expected for new users
              resetAuthState();
            } else {
              console.error("Error fetching user role:", error.message);
              resetAuthState();
              throw new Error(
                "Failed to verify user permissions. Please try logging in again."
              );
            }
          } else if (roleData) {
            // Valid role found
            setRole(roleData.role);
            setSchoolId(roleData.school_id);
            const schoolInfo = roleData.schools as unknown as {
              id: number;
              name: string;
            } | null;
            setSchoolName(schoolInfo?.name || null);

            // Set up role-specific notifications
            if (roleData.role === "admin") {
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
      }
      setIsLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserAndRole(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
