
"use client";

import React, { Dispatch, SetStateAction } from 'react';
import { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  role: string | null; // Added to track specific role like 'super_admin'
  isAdmin: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  // Admin-specific notifications
  hasNewResultsForApproval: boolean;
  setHasNewResultsForApproval: Dispatch<SetStateAction<boolean>>;
  hasNewBehaviorLog: boolean;
  setHasNewBehaviorLog: Dispatch<SetStateAction<boolean>>;
  hasNewApplication: boolean; // New
  setHasNewApplication: Dispatch<SetStateAction<boolean>>; // New
  // Teacher-specific notifications
  hasNewAnnouncement: boolean;
  setHasNewAnnouncement: Dispatch<SetStateAction<boolean>>;
  // Student-specific notifications
  hasNewResult: boolean;
  setHasNewResult: Dispatch<SetStateAction<boolean>>;
};

export const AuthContext = React.createContext<AuthContextType>({
  role: null, // Default value
  isAdmin: false,
  isLoading: true,
  user: null,
  session: null,
  hasNewResultsForApproval: false,
  setHasNewResultsForApproval: () => {},
  hasNewBehaviorLog: false,
  setHasNewBehaviorLog: () => {},
  hasNewApplication: false, // New
  setHasNewApplication: () => {}, // New
  hasNewAnnouncement: false,
  setHasNewAnnouncement: () => {},
  hasNewResult: false,
  setHasNewResult: () => {},
});

export const useAuth = () => React.useContext(AuthContext);
