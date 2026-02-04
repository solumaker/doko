import { useState } from 'react';
import { Loader2, Truck } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Lugares } from './pages/Lugares';
import { Vehiculos } from './pages/Vehiculos';
import { Historial } from './pages/Historial';
import { CrearDocumento } from './pages/CrearDocumento';
import { DocumentoControl } from './pages/DocumentoControl';
import { Equipo } from './pages/Equipo';
import { Document } from './lib/supabase';

type AuthScreen = 'login' | 'register' | 'forgot-password';
type AppScreen =
  | 'dashboard'
  | 'lugares'
  | 'vehiculos'
  | 'historial'
  | 'crear'
  | 'documento'
  | 'equipo';

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
  const { session, profile, loading, signOut } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const handleLogout = async () => {
    await signOut();
    setCurrentScreen('dashboard');
    setAuthScreen('login');
  };

  const handleNavigate = (screen: AppScreen) => {
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

  switch (currentScreen) {
    case 'lugares':
      return <Lugares onBack={() => handleNavigate('dashboard')} />;
    case 'vehiculos':
      return <Vehiculos onBack={() => handleNavigate('dashboard')} />;
    case 'historial':
      return (
        <Historial
          onBack={() => handleNavigate('dashboard')}
          onViewDocument={handleViewDocument}
        />
      );
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
      return <Dashboard onNavigate={handleNavigate} onLogout={handleLogout} />;
    case 'equipo':
      return <Equipo onBack={() => handleNavigate('dashboard')} />;
    default:
      return <Dashboard onNavigate={handleNavigate} onLogout={handleLogout} />;
  }
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
