import React from 'react';
import { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  isAdmin: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
};

export const AuthContext = React.createContext<AuthContextType>({
  isAdmin: false,
  isLoading: true,
  user: null,
  session: null,
});

export const useAuth = () => React.useContext(AuthContext);