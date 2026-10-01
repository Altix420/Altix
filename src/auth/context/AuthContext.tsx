import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../shared/lib/supabase';
import { AuthContext, type Profile, type Sucursal } from './auth-context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sucursalActiva, setSucursalActiva] = useState<Sucursal | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequestRef = useRef(0);

  const fetchProfile = useCallback(async (userId: string) => {
    const requestId = ++profileRequestRef.current;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (requestId !== profileRequestRef.current) return;
      if (profileData) setProfile(profileData);

      const { data: sucursalData } = await supabase
        .from('usuario_sucursal')
        .select('sucursales(*)')
        .eq('user_id', userId)
        .order('sucursal_id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (requestId !== profileRequestRef.current) return;
      if (sucursalData && sucursalData.sucursales) {
        setSucursalActiva(sucursalData.sucursales as unknown as Sucursal);
      }
    } catch (err) {
      console.error('Error cargando datos del perfil:', err);
    } finally {
      if (requestId === profileRequestRef.current) setLoading(false);
    }
  }, []);

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
        setProfile(null);
        setSucursalActiva(null);
        setLoading(true);
        fetchProfile(session.user.id);
      } else {
        profileRequestRef.current += 1;
        setProfile(null);
        setSucursalActiva(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, sucursalActiva, loading, signOut, setSucursalActiva }}>
      {children}
    </AuthContext.Provider>
  );
};
