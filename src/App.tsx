import { useState, useEffect } from 'react';
import { Loader2, Truck } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
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
import { TrialExpiredModal } from './components/TrialExpiredModal';
import { Document } from './lib/supabase';

function getPublicDocumentId(): string | null {
  const match = window.location.pathname.match(/^\/documento\/([a-f0-9-]{36})$/i);
  return match ? match[1] : null;
}

type AuthScreen = 'login' | 'register' | 'forgot-password';
type AppScreen =
  | 'dashboard'
  | 'lugares'
  | 'vehiculos'
  | 'historial'
  | 'crear'
  | 'documento'
  | 'equipo'
  | 'planes'
  | 'stripe-return';

function getAccessTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

function getStripeReturnParams(): { success: boolean; isPack: boolean } | null {
  const params = new URLSearchParams(window.location.search);
  if (params.has('checkout_success')) {
    return { success: true, isPack: params.get('type') === 'pack' };
  }
  if (params.has('checkout_cancel')) {
    return { success: false, isPack: false };
  }
  return null;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="bg-blue-600 p-4 rounded-2xl mb-4">
        <Truck size={56} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-4">DOKO</h1>
      <Loader2 size={40} className="animate-spin text-blue-600" />
    </div>
  );
}

function AppContent() {
  const { session, profile, loading, isDriver, isAdmin, signOut } = useAuth();
  const { isTrialExpired, hasActiveSubscription, loading: subLoading } = useSubscription();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [driverToken, setDriverToken] = useState<string | null>(null);
  const [stripeReturn, setStripeReturn] = useState<{ success: boolean; isPack: boolean } | null>(null);
  const [showTrialModal, setShowTrialModal] = useState(false);

  useEffect(() => {
    const token = getAccessTokenFromUrl();
    if (token) {
      setDriverToken(token);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    const stripeParams = getStripeReturnParams();
    if (stripeParams) {
      setStripeReturn(stripeParams);
      setCurrentScreen('stripe-return');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!subLoading && isAdmin && isTrialExpired && !hasActiveSubscription && currentScreen === 'dashboard') {
      setShowTrialModal(true);
    }
  }, [subLoading, isAdmin, isTrialExpired, hasActiveSubscription, currentScreen]);

  const handleLogout = async () => {
    await signOut();
    setCurrentScreen('dashboard');
    setAuthScreen('login');
    setDriverToken(null);
    setShowTrialModal(false);
  };

  const handleNavigate = (screen: AppScreen) => {
    setShowTrialModal(false);
    setCurrentScreen(screen);
  };

  const handleDocumentComplete = (document: Document) => {
    setSelectedDocument(document);
    setCurrentScreen('documento');
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setCurrentScreen('documento');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (driverToken && (!session || !profile)) {
    return (
      <DriverAccess
        accessToken={driverToken}
        onSuccess={() => setDriverToken(null)}
      />
    );
  }

  if (!session || !profile) {
    switch (authScreen) {
      case 'register':
        return <Register onNavigateToLogin={() => setAuthScreen('login')} />;
      case 'forgot-password':
        return <ForgotPassword onNavigateToLogin={() => setAuthScreen('login')} />;
      default:
        return (
          <Login
            onNavigateToRegister={() => setAuthScreen('register')}
            onNavigateToForgotPassword={() => setAuthScreen('forgot-password')}
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

  const trialBlocksNavigation = isAdmin && isTrialExpired && !hasActiveSubscription;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'planes':
        return <Planes onBack={() => handleNavigate('dashboard')} />;
      case 'lugares':
        if (trialBlocksNavigation) { handleNavigate('dashboard'); return null; }
        return <Lugares onBack={() => handleNavigate('dashboard')} />;
      case 'vehiculos':
        if (trialBlocksNavigation) { handleNavigate('dashboard'); return null; }
        return <Vehiculos onBack={() => handleNavigate('dashboard')} />;
      case 'historial':
        return (
          <Historial
            onBack={() => handleNavigate('dashboard')}
            onViewDocument={handleViewDocument}
          />
        );
      case 'crear':
        if (trialBlocksNavigation) { handleNavigate('planes'); return null; }
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
              onBack={() => handleNavigate('dashboard')}
            />
          );
        }
        return <Dashboard onNavigate={handleNavigate} onLogout={handleLogout} />;
      case 'equipo':
        if (trialBlocksNavigation) { handleNavigate('dashboard'); return null; }
        return <Equipo onBack={() => handleNavigate('dashboard')} />;
      default:
        return <Dashboard onNavigate={handleNavigate} onLogout={handleLogout} />;
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
