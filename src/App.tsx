import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { DriverAccess } from './pages/DriverAccess';
import { DriverLogin } from './pages/DriverLogin';
import { Lugares } from './pages/Lugares';
import { Vehiculos } from './pages/Vehiculos';
import { Historial } from './pages/Historial';
import { CrearDocumento } from './pages/CrearDocumento';
import { DocumentoControl } from './pages/DocumentoControl';
import { DocumentoPublico } from './pages/DocumentoPublico';
import { Equipo } from './pages/Equipo';
import { Planes } from './pages/Planes';
import { StripeReturn } from './pages/StripeReturn';
import { Configuracion } from './pages/Configuracion';
import { SubscriptionExpiredModal } from './components/SubscriptionExpiredModal';
import { Document } from './lib/supabase';
import { AdminPanel } from './pages/admin/AdminPanel';

function getPublicDocumentId(): string | null {
  const match = window.location.pathname.match(/^\/documento\/([a-f0-9-]{36})$/i);
  return match ? match[1] : null;
}

type AuthScreen = 'login' | 'register' | 'forgot-password' | 'driver-login';

const AUTH_ROUTE_TO_SCREEN: Record<string, AuthScreen> = {
  '/': 'login',
  '/inicio': 'login',
  '/registro': 'register',
  '/recuperar': 'forgot-password',
  '/conductor': 'driver-login',
};

const AUTH_SCREEN_TO_ROUTE: Record<AuthScreen, string> = {
  'login': '/',
  'register': '/registro',
  'forgot-password': '/recuperar',
  'driver-login': '/conductor',
};

function getInitialAuthScreen(): AuthScreen {
  return AUTH_ROUTE_TO_SCREEN[window.location.pathname] ?? 'login';
}
type AppScreen =
  | 'dashboard'
  | 'lugares'
  | 'vehiculos'
  | 'historial'
  | 'crear'
  | 'documento'
  | 'equipo'
  | 'planes'
  | 'stripe-return'
  | 'configuracion';

function getAccessTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

function getStripeReturnParams(): { success: boolean; isPack: boolean; portalReturn: boolean } | null {
  const params = new URLSearchParams(window.location.search);
  if (params.has('checkout_success')) {
    return { success: true, isPack: params.get('type') === 'pack', portalReturn: false };
  }
  if (params.has('checkout_cancel')) {
    return { success: false, isPack: false, portalReturn: false };
  }
  if (params.has('portal_return')) {
    return { success: true, isPack: false, portalReturn: true };
  }
  return null;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center justify-center">
      <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-16 w-auto object-contain mb-6" />
      <Loader2 size={28} className="animate-spin text-blue-500" />
    </div>
  );
}

function AppContent() {
  const { session, profile, loading: authLoading, isDriver, isAdmin, signOut } = useAuth();
  const { usage, isSubscriptionExpired, hasActiveSubscription, loading: subLoading, syncAndRefresh } = useSubscription();
  const [authScreen, setAuthScreen] = useState<AuthScreen>(getInitialAuthScreen);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [driverToken, setDriverToken] = useState<string | null>(null);
  const [stripeReturn, setStripeReturn] = useState<{ success: boolean; isPack: boolean; portalReturn: boolean } | null>(null);
  const [showSubExpiredModal, setShowSubExpiredModal] = useState(false);
  const [pendingPortalSync, setPendingPortalSync] = useState(false);

  useEffect(() => {
    const urlToken = getAccessTokenFromUrl();
    if (urlToken) {
      try {
        localStorage.setItem('doko_driver_token', urlToken);
      } catch {}
      window.history.replaceState({}, '', window.location.pathname);
      setDriverToken(urlToken);
      return;
    }

    const savedToken = (() => { try { return localStorage.getItem('doko_driver_token'); } catch { return null; } })();
    if (savedToken) {
      setDriverToken(savedToken);
      return;
    }

    const stripeParams = getStripeReturnParams();
    if (stripeParams) {
      window.history.replaceState({}, '', window.location.pathname);
      if (stripeParams.portalReturn) {
        setPendingPortalSync(true);
      } else {
        setStripeReturn(stripeParams);
        setCurrentScreen('stripe-return');
      }
    }
  }, []);

  useEffect(() => {
    if (pendingPortalSync && !authLoading && !subLoading) {
      setPendingPortalSync(false);
      syncAndRefresh(usage);
    }
  }, [pendingPortalSync, authLoading, subLoading, syncAndRefresh, usage]);

  useEffect(() => {
    if (!subLoading && isAdmin && isSubscriptionExpired && currentScreen === 'dashboard') {
      setShowSubExpiredModal(true);
    } else {
      setShowSubExpiredModal(false);
    }
  }, [subLoading, isAdmin, isSubscriptionExpired, currentScreen]);

  const navigateAuth = useCallback((screen: AuthScreen) => {
    setAuthScreen(screen);
    window.history.pushState({}, '', AUTH_SCREEN_TO_ROUTE[screen]);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const screen = AUTH_ROUTE_TO_SCREEN[window.location.pathname];
      if (screen) {
        setAuthScreen(screen);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (session && profile) {
      window.history.replaceState({}, '', '/');
    }
  }, [session, profile]);

  const handleLogout = async () => {
    const wasDriver = isDriver;
    await signOut();
    setCurrentScreen('dashboard');
    setDriverToken(null);
    setShowSubExpiredModal(false);
    if (wasDriver) {
      setAuthScreen('driver-login');
      window.history.replaceState({}, '', '/conductor');
    } else {
      setAuthScreen('login');
      window.history.replaceState({}, '', '/');
    }
  };

  const handleNavigate = (screen: AppScreen) => {
    setShowSubExpiredModal(false);
    setCurrentScreen(screen);
    window.scrollTo(0, 0);
  };

  const handleDocumentComplete = (document: Document) => {
    setSelectedDocument(document);
    setCurrentScreen('documento');
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setCurrentScreen('documento');
  };

  const navItemToScreen: Record<string, AppScreen> = {
    'inicio': 'dashboard',
    'documentos': 'historial',
    'equipo': 'equipo',
    'lugares': 'lugares',
    'suscripcion': 'planes',
    'configuracion': 'configuracion',
  };
  const sharedNav = (screen: string) => handleNavigate((navItemToScreen[screen] ?? screen) as AppScreen);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (driverToken && !session && !profile) {
    return (
      <DriverAccess
        accessToken={driverToken}
        onSuccess={() => {}}
      />
    );
  }

  if (!session || !profile) {
    switch (authScreen) {
      case 'register':
        return (
          <Register
            onNavigateToLogin={() => navigateAuth('login')}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPassword
            onNavigateToLogin={() => navigateAuth('login')}
          />
        );
      case 'driver-login':
        return (
          <DriverLogin
            onNavigateToLogin={() => navigateAuth('login')}
          />
        );
      default:
        return (
          <Login
            onNavigateToRegister={() => navigateAuth('register')}
            onNavigateToForgotPassword={() => navigateAuth('forgot-password')}
            onNavigateToDriverLogin={() => navigateAuth('driver-login')}
          />
        );
    }
  }

  if (isDriver) {
    switch (currentScreen) {
      case 'crear':
        return (
          <CrearDocumento
            onBack={() => handleNavigate('dashboard')}
            onComplete={handleDocumentComplete}
          />
        );
      case 'documento':
        if (selectedDocument) {
          return (
            <DocumentoControl
              document={selectedDocument}
              onBack={() => handleNavigate('dashboard')}
              onLogout={handleLogout}
              onNavigate={sharedNav}
            />
          );
        }
        return (
          <DriverDashboard
            onCreateDocument={() => handleNavigate('crear')}
            onViewDocument={handleViewDocument}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <DriverDashboard
            onCreateDocument={() => handleNavigate('crear')}
            onViewDocument={handleViewDocument}
            onLogout={handleLogout}
          />
        );
    }
  }

  if (currentScreen === 'stripe-return' && stripeReturn) {
    return (
      <StripeReturn
        success={stripeReturn.success}
        isPack={stripeReturn.isPack}
        onContinue={() => {
          setStripeReturn(null);
          handleNavigate('dashboard');
        }}
      />
    );
  }

  const blocksNavigation = isAdmin && isSubscriptionExpired && !hasActiveSubscription;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'planes':
        return <Planes onBack={() => handleNavigate('dashboard')} onGoToEquipo={() => handleNavigate('equipo')} onLogout={handleLogout} onNavigate={sharedNav} />;
      case 'lugares':
        if (blocksNavigation) { handleNavigate('dashboard'); return null; }
        return <Lugares onBack={() => handleNavigate('dashboard')} onLogout={handleLogout} onNavigate={sharedNav} />;
      case 'vehiculos':
        if (blocksNavigation) { handleNavigate('dashboard'); return null; }
        return <Vehiculos onBack={() => handleNavigate('dashboard')} />;
      case 'historial':
        return (
          <Historial
            onBack={() => handleNavigate('dashboard')}
            onViewDocument={handleViewDocument}
            onLogout={handleLogout}
            onNavigate={sharedNav}
          />
        );
      case 'crear':
        if (blocksNavigation) { handleNavigate('planes'); return null; }
        return (
          <CrearDocumento
            onBack={() => handleNavigate('dashboard')}
            onComplete={handleDocumentComplete}
            onNavigatePlanes={() => handleNavigate('planes')}
          />
        );
      case 'documento':
        if (selectedDocument) {
          return (
            <DocumentoControl
              document={selectedDocument}
              onBack={() => handleNavigate('historial')}
              onLogout={handleLogout}
              onNavigate={sharedNav}
            />
          );
        }
        return <Dashboard onNavigate={handleNavigate} onLogout={handleLogout} onViewDocument={handleViewDocument} />;
      case 'equipo':
        return <Equipo onBack={() => handleNavigate('dashboard')} onGoToPlanes={() => handleNavigate('planes')} onLogout={handleLogout} onNavigate={sharedNav} />;
      case 'configuracion':
        if (!isAdmin) { handleNavigate('dashboard'); return null; }
        return <Configuracion onBack={() => handleNavigate('dashboard')} onLogout={handleLogout} onNavigate={sharedNav} />;
      default:
        return <Dashboard onNavigate={handleNavigate} onLogout={handleLogout} onViewDocument={handleViewDocument} />;
    }
  };

  return (
    <>
      {renderScreen()}
      {showSubExpiredModal && currentScreen === 'dashboard' && (
        <SubscriptionExpiredModal
          onSelectPlan={() => handleNavigate('planes')}
          onViewHistory={() => handleNavigate('historial')}
        />
      )}
    </>
  );
}

function App() {
  const publicDocId = getPublicDocumentId();

  if (publicDocId) {
    return <DocumentoPublico documentId={publicDocId} />;
  }

  if (window.location.pathname.startsWith('/admin')) {
    return <AdminPanel />;
  }

  return (
    <AuthProvider>
      <DataProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
