import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, callEdgeFunction, Profile, Company } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  driverLogin: (accessToken: string, pin: string) => Promise<{ error: string | null }>;
}

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  companyCif: string;
  companyAddress?: string;
  companyCity?: string;
  companyProvince?: string;
  companyPostalCode?: string;
  companyPhone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndCompany = async (userId: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }

    if (profileData) {
      setProfile(profileData);

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profileData.company_id)
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching company:', companyError);
        return;
      }

      if (companyData) {
        setCompany(companyData);
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        fetchProfileAndCompany(initialSession.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        (async () => {
          await fetchProfileAndCompany(newSession.user.id);
        })();
      } else {
        setProfile(null);
        setCompany(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  };

  const signUp = async (data: SignUpData) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Error al crear el usuario' };
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'register_company_and_user',
      {
        p_full_name: data.fullName,
        p_email: data.email,
        p_company_name: data.companyName,
        p_company_cif: data.companyCif,
        p_company_address: data.companyAddress || '',
        p_company_city: data.companyCity || '',
        p_company_province: data.companyProvince || '',
        p_company_postal_code: data.companyPostalCode || '',
        p_company_phone: data.companyPhone || '',
      }
    );

    if (rpcError) {
      return { error: 'Error al registrar: ' + rpcError.message };
    }

    if (rpcData && rpcData.error) {
      return { error: rpcData.error };
    }

    await fetchProfileAndCompany(authData.user.id);

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setCompany(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndCompany(user.id);
    }
  };

  const driverLogin = async (accessToken: string, pin: string) => {
    const { data: result, ok } = await callEdgeFunction('driver-auth', {
      action: 'login',
      access_token: accessToken,
      pin,
    });

    if (!ok || result.error) {
      return { error: result.error || 'Error de autenticacion' };
    }

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: result.token_hash,
      type: 'magiclink',
    });

    if (verifyError || !verifyData.session) {
      return { error: verifyError?.message || 'Error al establecer sesion' };
    }

    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        company,
        loading,
        isAdmin: profile?.role === 'admin',
        isDriver: profile?.role === 'driver',
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
        driverLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
