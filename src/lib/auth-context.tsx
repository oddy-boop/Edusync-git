
"use client";

import React, { Dispatch, SetStateAction } from 'react';
import { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  isAdmin: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  // Admin-specific notifications
  hasNewResultsForApproval: boolean;
  setHasNewResultsForApproval: Dispatch<SetStateAction<boolean>>;
  // Teacher-specific notifications
  hasNewAnnouncement: boolean;
  setHasNewAnnouncement: Dispatch<SetStateAction<boolean>>;
  // Student-specific notifications
  hasNewResult: boolean;
  setHasNewResult: Dispatch<SetStateAction<boolean>>;
};

export const AuthContext = React.createContext<AuthContextType>({
  isAdmin: false,
  isLoading: true,
  user: null,
  session: null,
  hasNewResultsForApproval: false,
  setHasNewResultsForApproval: () => {},
  hasNewAnnouncement: false,
  setHasNewAnnouncement: () => {},
  hasNewResult: false,
  setHasNewResult: () => {},
});

export const useAuth = () => React.useContext(AuthContext);
