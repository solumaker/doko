import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, Location, Vehicle, Document, DocumentContent } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
  locations: Location[];
  vehicles: Vehicle[];
  documents: Document[];
  loadingLocations: boolean;
  loadingVehicles: boolean;
  loadingDocuments: boolean;
  addLocation: (location: Omit<Location, 'id' | 'company_id' | 'created_at'>) => Promise<Location | null>;
  updateLocation: (id: string, location: Omit<Location, 'id' | 'company_id' | 'created_at'>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>) => Promise<Vehicle | null>;
  updateVehicle: (id: string, vehicle: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addDocument: (content: DocumentContent, departureDate: Date) => Promise<Document | null>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { profile, company, user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);

  const fetchLocations = useCallback(async () => {
    if (!profile?.company_id) return;

    setLoadingLocations(true);
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
    } else {
      setLocations(data || []);
    }
    setLoadingLocations(false);
  }, [profile?.company_id]);

  const fetchVehicles = useCallback(async () => {
    if (!profile?.company_id) return;

    setLoadingVehicles(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('alias');

    if (error) {
      console.error('Error fetching vehicles:', error);
    } else {
      setVehicles(data || []);
    }
    setLoadingVehicles(false);
  }, [profile?.company_id]);

  const fetchDocuments = useCallback(async () => {
    if (!profile?.company_id) return;

    setLoadingDocuments(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments(data || []);
    }
    setLoadingDocuments(false);
  }, [profile?.company_id]);

  useEffect(() => {
    if (profile?.company_id) {
      fetchLocations();
      fetchVehicles();
      fetchDocuments();
    } else {
      setLocations([]);
      setVehicles([]);
      setDocuments([]);
      setLoadingLocations(false);
      setLoadingVehicles(false);
      setLoadingDocuments(false);
    }
  }, [profile?.company_id, fetchLocations, fetchVehicles, fetchDocuments]);

  const addLocation = async (location: Omit<Location, 'id' | 'company_id' | 'created_at'>) => {
    if (!profile?.company_id) return null;

    const { data, error } = await supabase
      .from('locations')
      .insert({
        ...location,
        company_id: profile.company_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding location:', error);
      return null;
    }

    setLocations((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const updateLocation = async (id: string, location: Omit<Location, 'id' | 'company_id' | 'created_at'>) => {
    const { error } = await supabase
      .from('locations')
      .update(location)
      .eq('id', id);

    if (error) {
      console.error('Error updating location:', error);
      return;
    }

    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, ...location } : loc))
    );
  };

  const deleteLocation = async (id: string) => {
    const { error } = await supabase.from('locations').delete().eq('id', id);

    if (error) {
      console.error('Error deleting location:', error);
      return;
    }

    setLocations((prev) => prev.filter((loc) => loc.id !== id));
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>) => {
    if (!profile?.company_id) return null;

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        ...vehicle,
        company_id: profile.company_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding vehicle:', error);
      return null;
    }

    setVehicles((prev) => [...prev, data].sort((a, b) => (a.alias || '').localeCompare(b.alias || '')));
    return data;
  };

  const updateVehicle = async (id: string, vehicle: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>) => {
    const { error } = await supabase
      .from('vehicles')
      .update(vehicle)
      .eq('id', id);

    if (error) {
      console.error('Error updating vehicle:', error);
      return;
    }

    setVehicles((prev) =>
      prev.map((veh) => (veh.id === id ? { ...veh, ...vehicle } : veh))
    );
  };

  const deleteVehicle = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      return;
    }

    setVehicles((prev) => prev.filter((veh) => veh.id !== id));
  };

  const addDocument = async (content: DocumentContent, departureDate: Date) => {
    if (!profile?.company_id || !user?.id || !company) return null;

    const fullContent: DocumentContent = {
      ...content,
      company: {
        name: company.name,
        cif: company.cif,
        address: company.address,
        city: company.city,
        province: company.province,
        postal_code: company.postal_code,
        phone: company.phone,
      },
    };

    const { data, error } = await supabase
      .from('documents')
      .insert({
        company_id: profile.company_id,
        creator_id: user.id,
        content: fullContent,
        departure_date: departureDate.toISOString(),
        driver_name: profile.full_name,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding document:', error);
      return null;
    }

    setDocuments((prev) => [data, ...prev]);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-document-pdf`;

      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId: data.id }),
      }).catch(err => {
        console.error('Error generating PDF:', err);
      });
    }

    return data;
  };

  const refreshData = async () => {
    await Promise.all([fetchLocations(), fetchVehicles(), fetchDocuments()]);
  };

  return (
    <DataContext.Provider
      value={{
        locations,
        vehicles,
        documents,
        loadingLocations,
        loadingVehicles,
        loadingDocuments,
        addLocation,
        updateLocation,
        deleteLocation,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addDocument,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
