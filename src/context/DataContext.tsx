import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, Location, Vehicle, Document, DocumentContent, ShipperHistory, SignatureData, VehicleAmendment } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface HiddenDocEntry {
  document_id: string;
  profile_id: string;
}

interface DataContextType {
  locations: Location[];
  vehicles: Vehicle[];
  documents: Document[];
  allDocuments: Document[];
  hiddenDocIds: string[];
  shipperHistory: ShipperHistory[];
  loadingLocations: boolean;
  loadingVehicles: boolean;
  loadingDocuments: boolean;
  addLocation: (location: Omit<Location, 'id' | 'company_id' | 'created_at'>) => Promise<Location | null>;
  updateLocation: (id: string, location: Omit<Location, 'id' | 'company_id' | 'created_at'>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>) => Promise<Vehicle | null>;
  updateVehicle: (id: string, vehicle: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addDocument: (content: DocumentContent, departureDate: Date, driverOverride?: { name: string; email?: string; dni?: string }, creatorId?: string) => Promise<Document | null>;
  signDocument: (id: string, side: 'origin' | 'destination', data: SignatureData) => Promise<Document | null>;
  amendVehiclePlates: (id: string, amendment: Omit<VehicleAmendment, 'amended_at'>) => Promise<Document | null>;
  hideDocumentForProfile: (documentId: string, profileId: string) => Promise<void>;
  showDocumentForProfile: (documentId: string, profileId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

async function triggerPdfRegen(documentId: string, onSuccess: (result: { pdf_original_url?: string; pdf_url?: string }) => void) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-document-pdf`;
  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentId }),
    });
    if (response.ok) {
      const result = await response.json();
      onSuccess(result);
      if (result.pdfa_conversion_failed) {
        console.error('PDF/A conversion failed:', result.pdfa_error);
      }
    } else {
      const errorText = await response.text();
      console.error('Edge function error:', errorText);
    }
  } catch (err) {
    console.error('Error generating PDF:', err);
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { profile, company, user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [hiddenDocIds, setHiddenDocIds] = useState<string[]>([]);
  const [shipperHistory, setShipperHistory] = useState<ShipperHistory[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);

  const fetchLocations = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoadingLocations(true);
    const { data, error } = await supabase.from('locations').select('*').order('name');
    if (error) console.error('Error fetching locations:', error);
    else setLocations(data || []);
    setLoadingLocations(false);
  }, [profile?.company_id]);

  const fetchVehicles = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoadingVehicles(true);
    const { data, error } = await supabase.from('vehicles').select('*').order('alias');
    if (error) console.error('Error fetching vehicles:', error);
    else setVehicles(data || []);
    setLoadingVehicles(false);
  }, [profile?.company_id]);

  const fetchDocuments = useCallback(async () => {
    if (!profile?.company_id || !profile?.id) return;
    setLoadingDocuments(true);

    let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (profile.role !== 'admin') {
      query = query.eq('creator_id', profile.id);
    }
    const { data, error } = await query;
    if (error) console.error('Error fetching documents:', error);
    else setAllDocuments(data || []);

    if (profile.role !== 'admin') {
      const { data: hiddenData } = await supabase
        .from('document_visibility')
        .select('document_id')
        .eq('profile_id', profile.id);
      setHiddenDocIds((hiddenData || []).map((r: { document_id: string }) => r.document_id));
    } else {
      setHiddenDocIds([]);
    }

    setLoadingDocuments(false);
  }, [profile?.company_id, profile?.id, profile?.role]);

  const fetchShipperHistory = useCallback(async () => {
    if (!profile?.company_id) return;
    const { data, error } = await supabase
      .from('shipper_history')
      .select('*')
      .order('last_used', { ascending: false });
    if (error) console.error('Error fetching shipper history:', error);
    else setShipperHistory(data || []);
  }, [profile?.company_id]);

  useEffect(() => {
    if (profile?.company_id) {
      fetchLocations();
      fetchVehicles();
      fetchDocuments();
      fetchShipperHistory();
    } else {
      setLocations([]);
      setVehicles([]);
      setAllDocuments([]);
      setHiddenDocIds([]);
      setShipperHistory([]);
      setLoadingLocations(false);
      setLoadingVehicles(false);
      setLoadingDocuments(false);
    }
  }, [profile?.company_id, fetchLocations, fetchVehicles, fetchDocuments, fetchShipperHistory]);

  const upsertShipperToHistory = async (shipper: { nombre: string; nif: string; domicilio: string; poblacion: string }) => {
    if (!profile?.company_id || !shipper.nif.trim()) return;
    const { data, error } = await supabase
      .from('shipper_history')
      .upsert(
        {
          company_id: profile.company_id,
          nombre: shipper.nombre,
          nif: shipper.nif,
          domicilio: shipper.domicilio,
          poblacion: shipper.poblacion,
          use_count: 1,
          last_used: new Date().toISOString(),
        },
        {
          onConflict: 'company_id,nif',
          ignoreDuplicates: false,
        }
      )
      .select()
      .maybeSingle();

    if (!error && data) {
      setShipperHistory((prev) => {
        const existing = prev.findIndex((s) => s.nif === shipper.nif);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated.sort((a, b) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime());
        }
        return [data, ...prev];
      });
    }
  };

  const addLocation = async (location: Omit<Location, 'id' | 'company_id' | 'created_at'>) => {
    if (!profile?.company_id) return null;
    const { data, error } = await supabase
      .from('locations')
      .insert({ ...location, company_id: profile.company_id })
      .select()
      .single();
    if (error) { console.error('Error adding location:', error); return null; }
    setLocations((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const updateLocation = async (id: string, location: Omit<Location, 'id' | 'company_id' | 'created_at'>) => {
    const { error } = await supabase.from('locations').update(location).eq('id', id);
    if (error) { console.error('Error updating location:', error); return; }
    setLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, ...location } : loc)));
  };

  const deleteLocation = async (id: string) => {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) { console.error('Error deleting location:', error); return; }
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>) => {
    if (!profile?.company_id) return null;
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ ...vehicle, company_id: profile.company_id })
      .select()
      .single();
    if (error) { console.error('Error adding vehicle:', error); return null; }
    setVehicles((prev) => [...prev, data].sort((a, b) => (a.alias || '').localeCompare(b.alias || '')));
    return data;
  };

  const updateVehicle = async (id: string, vehicle: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>) => {
    const { error } = await supabase.from('vehicles').update(vehicle).eq('id', id);
    if (error) { console.error('Error updating vehicle:', error); return; }
    setVehicles((prev) => prev.map((veh) => (veh.id === id ? { ...veh, ...vehicle } : veh)));
  };

  const deleteVehicle = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) { console.error('Error deleting vehicle:', error); return; }
    setVehicles((prev) => prev.filter((veh) => veh.id !== id));
  };

  const addDocument = async (content: DocumentContent, departureDate: Date, driverOverride?: { name: string; email?: string; dni?: string }, creatorId?: string) => {
    if (!profile?.company_id || !user?.id || !company) return null;

    const driverData = driverOverride || {
      name: profile.full_name,
      email: profile.email,
      dni: profile.dni || undefined,
    };

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
      driver: driverData,
    };

    const { data, error } = await supabase
      .from('documents')
      .insert({
        company_id: profile.company_id,
        creator_id: creatorId || user.id,
        content: fullContent,
        departure_date: departureDate.toISOString(),
        driver_name: driverData.name,
      })
      .select()
      .single();

    if (error) { console.error('Error adding document:', error); return null; }

    setAllDocuments((prev) => [data, ...prev]);

    if (content.contractual_shipper) {
      upsertShipperToHistory(content.contractual_shipper);
    }

    triggerPdfRegen(data.id, (result) => {
      setAllDocuments((prev) =>
        prev.map((doc) =>
          doc.id === data.id
            ? { ...doc, pdf_original_url: result.pdf_original_url, pdf_url: result.pdf_url }
            : doc
        )
      );
    });

    return data;
  };

  const signDocument = async (id: string, side: 'origin' | 'destination', sigData: SignatureData): Promise<Document | null> => {
    const current = allDocuments.find((d) => d.id === id);
    if (!current) return null;

    const newContent: DocumentContent = {
      ...current.content,
      signatures: {
        ...current.content.signatures,
        [side]: sigData,
      },
    };

    const { data, error } = await supabase
      .from('documents')
      .update({ content: newContent })
      .eq('id', id)
      .select()
      .single();

    if (error) { console.error('Error signing document:', error); return null; }

    setAllDocuments((prev) => prev.map((d) => (d.id === id ? data : d)));

    triggerPdfRegen(id, (result) => {
      setAllDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? { ...doc, pdf_original_url: result.pdf_original_url, pdf_url: result.pdf_url }
            : doc
        )
      );
    });

    return data;
  };

  const amendVehiclePlates = async (id: string, amendment: Omit<VehicleAmendment, 'amended_at'>): Promise<Document | null> => {
    const current = allDocuments.find((d) => d.id === id);
    if (!current) return null;

    const newAmendment: VehicleAmendment = {
      ...amendment,
      amended_at: new Date().toISOString(),
    };

    const existingAmendments = current.content.vehicle.amendments || [];
    const newContent: DocumentContent = {
      ...current.content,
      vehicle: {
        ...current.content.vehicle,
        amendments: [...existingAmendments, newAmendment],
      },
    };

    const { data, error } = await supabase
      .from('documents')
      .update({ content: newContent })
      .eq('id', id)
      .select()
      .single();

    if (error) { console.error('Error amending vehicle:', error); return null; }

    setAllDocuments((prev) => prev.map((d) => (d.id === id ? data : d)));

    triggerPdfRegen(id, (result) => {
      setAllDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? { ...doc, pdf_original_url: result.pdf_original_url, pdf_url: result.pdf_url }
            : doc
        )
      );
    });

    return data;
  };

  const hideDocumentForProfile = async (documentId: string, profileId: string) => {
    await supabase.from('document_visibility').upsert(
      { document_id: documentId, profile_id: profileId },
      { onConflict: 'document_id,profile_id', ignoreDuplicates: true }
    );
    setHiddenDocIds((prev) => (prev.includes(documentId) ? prev : [...prev, documentId]));
  };

  const showDocumentForProfile = async (documentId: string, profileId: string) => {
    await supabase.from('document_visibility')
      .delete()
      .eq('document_id', documentId)
      .eq('profile_id', profileId);
    setHiddenDocIds((prev) => prev.filter((id) => id !== documentId));
  };

  const refreshData = async () => {
    await Promise.all([fetchLocations(), fetchVehicles(), fetchDocuments(), fetchShipperHistory()]);
  };

  const documents = allDocuments.filter((d) => {
    if (hiddenDocIds.includes(d.id)) return false;
    if (profile?.role === 'driver' && company?.driver_doc_visibility_days != null) {
      const days = company.driver_doc_visibility_days;
      const docDate = new Date(d.created_at);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (docDate < cutoff) return false;
    }
    return true;
  });

  return (
    <DataContext.Provider
      value={{
        locations,
        vehicles,
        documents,
        allDocuments,
        hiddenDocIds,
        shipperHistory,
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
        signDocument,
        amendVehiclePlates,
        hideDocumentForProfile,
        showDocumentForProfile,
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
