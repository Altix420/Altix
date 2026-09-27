import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../shared/lib/supabase';
import type { Database } from '../../shared/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Sucursal = Database['public']['Tables']['sucursales']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  sucursalActiva: Sucursal | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setSucursalActiva: (sucursal: Sucursal) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sucursalActiva, setSucursalActiva] = useState<Sucursal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Error inicializando sesión:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setSucursalActiva(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) setProfile(profileData);

      const { data: sucursalData } = await supabase
        .from('usuario_sucursal')
        .select('sucursales(*)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (sucursalData && sucursalData.sucursales) {
        setSucursalActiva(sucursalData.sucursales as unknown as Sucursal);
      }
    } catch (err) {
      console.error('Error cargando datos del perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, sucursalActiva, loading, signOut, setSucursalActiva }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};
