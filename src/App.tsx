import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { DriverAccess } from './pages/DriverAccess';
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
import { TrialExpiredModal } from './components/TrialExpiredModal';
import { SubscriptionExpiredModal } from './components/SubscriptionExpiredModal';
import { Document } from './lib/supabase';

function getPublicDocumentId(): string | null {
  const match = window.location.pathname.match(/^\/documento\/([a-f0-9-]{36})$/i);
  return match ? match[1] : null;
}

type AuthScreen = 'landing' | 'login' | 'register' | 'forgot-password';
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
  const { usage, isTrialExpired, isSubscriptionExpired, hasActiveSubscription, loading: subLoading, refreshSubscription, syncAndRefresh } = useSubscription();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('landing');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [driverToken, setDriverToken] = useState<string | null>(null);
  const [stripeReturn, setStripeReturn] = useState<{ success: boolean; isPack: boolean; portalReturn: boolean } | null>(null);
  const [showTrialModal, setShowTrialModal] = useState(false);
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
    if (!subLoading && isAdmin && isTrialExpired && !hasActiveSubscription && !isSubscriptionExpired && currentScreen === 'dashboard') {
      setShowTrialModal(true);
    } else {
      setShowTrialModal(false);
    }
  }, [subLoading, isAdmin, isTrialExpired, hasActiveSubscription, isSubscriptionExpired, currentScreen]);

  useEffect(() => {
    if (!subLoading && isAdmin && isSubscriptionExpired && currentScreen === 'dashboard') {
      setShowSubExpiredModal(true);
    } else {
      setShowSubExpiredModal(false);
    }
  }, [subLoading, isAdmin, isSubscriptionExpired, currentScreen]);

  const handleLogout = async () => {
    await signOut();
    setCurrentScreen('dashboard');
    setAuthScreen('landing');
    setDriverToken(null);
    setShowTrialModal(false);
    setShowSubExpiredModal(false);
  };

  const handleNavigate = (screen: AppScreen) => {
    setShowTrialModal(false);
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
      case 'login':
        return (
          <Login
            onNavigateToRegister={() => setAuthScreen('register')}
            onNavigateToForgotPassword={() => setAuthScreen('forgot-password')}
          />
        );
      case 'register':
        return <Register onNavigateToLogin={() => setAuthScreen('login')} />;
      case 'forgot-password':
        return <ForgotPassword onNavigateToLogin={() => setAuthScreen('login')} />;
      default:
        return (
          <LandingPage
            onNavigateToLogin={() => setAuthScreen('login')}
            onNavigateToRegister={() => setAuthScreen('register')}
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

  const blocksNavigation = isAdmin && (isTrialExpired || isSubscriptionExpired) && !hasActiveSubscription;

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
      {showTrialModal && currentScreen === 'dashboard' && (
        <TrialExpiredModal
          onSelectPlan={() => handleNavigate('planes')}
          onViewHistory={() => handleNavigate('historial')}
        />
      )}
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
