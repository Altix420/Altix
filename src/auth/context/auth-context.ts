import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Database } from '../../shared/types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Sucursal = Database['public']['Tables']['sucursales']['Row'];

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  sucursalActiva: Sucursal | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setSucursalActiva: (sucursal: Sucursal) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
