import { useState, useEffect } from 'react';
import { Loader2, Truck, AlertCircle, Share2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import type { Document } from '../lib/supabase';

interface DocumentoPublicoProps {
  documentId: string;
}

function getOriginDisplay(content: Document['content']) {
  if (content.origin.domicilio) {
    return {
      primary: content.origin.domicilio,
      secondary: content.origin.poblacion || '',
    };
  }
  return {
    primary: content.origin.name || '',
    secondary: [content.origin.address, content.origin.postal_code, content.origin.city, content.origin.province ? `(${content.origin.province})` : ''].filter(Boolean).join(' '),
  };
}

function getDestinationDisplay(content: Document['content']) {
  if (content.destination.domicilio) {
    return {
      primary: content.destination.domicilio,
      secondary: content.destination.poblacion || '',
    };
  }
  return {
    primary: content.destination.name || '',
    secondary: [content.destination.address, content.destination.postal_code, content.destination.city, content.destination.province ? `(${content.destination.province})` : ''].filter(Boolean).join(' '),
  };
}

export function DocumentoPublico({ documentId }: DocumentoPublicoProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocument() {
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .maybeSingle();

      if (fetchError) {
        setError('Error al cargar el documento');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Documento no encontrado');
        setLoading(false);
        return;
      }

      setDocument(data);
      setLoading(false);
    }

    fetchDocument();
  }, [documentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="bg-blue-600 p-3 rounded-2xl mb-4">
          <Truck size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-4">DOKO</h1>
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <p className="text-slate-500 mt-3 text-sm">Cargando documento...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-red-100 p-4 rounded-2xl mb-4">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {error || 'Documento no encontrado'}
        </h1>
        <p className="text-slate-500 text-center text-sm max-w-sm">
          El documento solicitado no existe o no esta disponible. Verifica que el enlace sea correcto.
        </p>
      </div>
    );
  }

  const { content } = document;
  const originDisplay = getOriginDisplay(content);
  const destinationDisplay = getDestinationDisplay(content);

  const shipperName = content.contractual_shipper?.nombre || content.company.name;
  const shipperNif = content.contractual_shipper?.nif || content.company.cif;
  const shipperAddress = content.contractual_shipper
    ? `${content.contractual_shipper.domicilio}, ${content.contractual_shipper.poblacion}`
    : `${content.company.address}, ${content.company.postal_code} ${content.company.city} (${content.company.province})`;

  const trailerPlate1 = content.vehicle.trailer_plate_1 || content.vehicle.trailer_plate;
  const documentUrl = window.location.href;

  const handleShare = () => {
    const text = encodeURIComponent(`Documento de Control de Transporte: ${documentUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Truck size={24} />
          </div>
          <h1 className="text-lg font-bold">DOKO</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-white/20 text-white px-3 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm"
          >
            <Printer size={18} />
            Imprimir
          </button>
          <button
            onClick={handleShare}
            className="bg-white text-blue-600 px-3 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm"
          >
            <Share2 size={18} />
            Compartir
          </button>
        </div>
      </header>

      <div className="p-4 pb-8 print:p-0 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden print:rounded-none print:shadow-none print:border-2 print:border-black">
          <div className="bg-slate-800 text-white p-5 text-center">
            <h1 className="text-xl font-bold tracking-wide">
              DOCUMENTO DE CONTROL DE TRANSPORTE
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Conforme a la normativa vigente de transporte por carretera
            </p>
          </div>

          <div className="p-5">
            <div className="flex justify-center mb-6">
              <div className="bg-white p-3 border-2 border-slate-200 rounded-xl">
                <QRCode value={documentUrl} size={120} />
              </div>
            </div>

            <div className="text-center mb-5 pb-5 border-b-2 border-slate-100">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Documento ID</p>
              <p className="text-lg font-mono font-bold text-slate-900 mt-1">
                DOC-{document.id.toUpperCase().slice(0, 8)}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Generado:{' '}
                {format(new Date(document.created_at), "d/MM/yyyy 'a las' HH:mm", {
                  locale: es,
                })}
              </p>
            </div>

            <div className="space-y-4">
              <section className="border border-slate-200 rounded-xl p-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Cargador Contractual
                </h2>
                <p className="text-base font-bold text-slate-900">{shipperName}</p>
                {shipperNif && (
                  <p className="text-sm text-slate-600">NIF: {shipperNif}</p>
                )}
                <p className="text-sm text-slate-500">{shipperAddress}</p>
                {!content.contractual_shipper && content.company.phone && (
                  <p className="text-sm text-slate-500">Tel: {content.company.phone}</p>
                )}
              </section>

              <section className="border border-slate-200 rounded-xl p-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Transportista Efectivo
                </h2>
                <p className="text-base font-bold text-slate-900">{content.company.name}</p>
                {content.company.cif && (
                  <p className="text-sm text-slate-600">CIF: {content.company.cif}</p>
                )}
                <p className="text-sm text-slate-500">
                  {content.company.address}, {content.company.postal_code} {content.company.city}
                </p>
                {content.company.phone && (
                  <p className="text-sm text-slate-500">Tel: {content.company.phone}</p>
                )}
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="border border-blue-200 bg-blue-50/50 rounded-xl p-4">
                  <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                    Origen
                  </h2>
                  <p className="text-base font-bold text-slate-900">
                    {originDisplay.primary}
                  </p>
                  {originDisplay.secondary && (
                    <p className="text-sm text-slate-600">
                      {originDisplay.secondary}
                    </p>
                  )}
                  {content.origin.contact_name && (
                    <p className="text-sm text-slate-500 mt-2">
                      Contacto: {content.origin.contact_name}
                    </p>
                  )}
                  {content.origin.phone && (
                    <p className="text-sm text-slate-500">
                      Tel: {content.origin.phone}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Fecha salida:</span>{' '}
                      {format(new Date(document.departure_date), "d/MM/yyyy 'a las' HH:mm", {
                        locale: es,
                      })}
                    </p>
                  </div>
                </section>

                <section className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4">
                  <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                    Destino
                  </h2>
                  <p className="text-base font-bold text-slate-900">
                    {destinationDisplay.primary}
                  </p>
                  {destinationDisplay.secondary && (
                    <p className="text-sm text-slate-600">
                      {destinationDisplay.secondary}
                    </p>
                  )}
                  {content.destination.contact_name && (
                    <p className="text-sm text-slate-500 mt-2">
                      Contacto: {content.destination.contact_name}
                    </p>
                  )}
                  {content.destination.phone && (
                    <p className="text-sm text-slate-500">
                      Tel: {content.destination.phone}
                    </p>
                  )}
                </section>
              </div>

              <section className="border border-slate-200 rounded-xl p-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Vehiculo
                </h2>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Cabeza Tractora</p>
                    <p className="text-lg font-bold text-slate-900 font-mono tracking-wider">
                      {content.vehicle.tractor_plate}
                    </p>
                  </div>
                  {trailerPlate1 && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Remolque 1</p>
                      <p className="text-lg font-bold text-slate-900 font-mono tracking-wider">
                        {trailerPlate1}
                      </p>
                    </div>
                  )}
                  {content.vehicle.trailer_plate_2 && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Remolque 2</p>
                      <p className="text-lg font-bold text-slate-900 font-mono tracking-wider">
                        {content.vehicle.trailer_plate_2}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
                <h2 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">
                  Mercancia
                </h2>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-bold text-slate-900">
                      {content.cargo.description}
                    </p>
                    {content.cargo.packages != null && content.cargo.packages > 0 && (
                      <p className="text-sm text-slate-500 mt-1">
                        Bultos: {content.cargo.packages}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-slate-400 uppercase">Peso bruto</p>
                    <p className="text-xl font-bold text-slate-900">
                      {content.cargo.weight_kg.toLocaleString()} kg
                    </p>
                  </div>
                </div>
              </section>

              {document.driver_name && (
                <section className="border border-slate-200 rounded-xl p-4">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Conductor
                  </h2>
                  <p className="text-base font-semibold text-slate-900">{document.driver_name}</p>
                </section>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Este documento ha sido generado digitalmente por <span className="font-bold text-slate-500 tracking-wider">DOKO</span>
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Verificable mediante codigo QR
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
