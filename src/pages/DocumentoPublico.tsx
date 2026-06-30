import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Share2, Printer, Eye, History } from 'lucide-react';
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

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('documents')
        .select('pdf_url')
        .eq('id', documentId)
        .maybeSingle();

      if (data?.pdf_url && (!document || !document.pdf_url)) {
        setDocument((prev) => prev ? { ...prev, pdf_url: data.pdf_url } : null);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [documentId, document]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center justify-center">
        <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-14 w-auto object-contain mb-4" />
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <p className="text-slate-500 mt-3 text-sm">Cargando documento...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center justify-center p-6">
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
  const documentUrl = document.pdf_url || window.location.href;
  const qrDownloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-pdf?id=${document.id}`;

  const handleShare = () => {
    const text = encodeURIComponent(`Documento de Control de Transporte: ${documentUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleViewPdf = () => {
    if (document.pdf_url) {
      window.open(document.pdf_url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <header className="bg-white border-b border-slate-200 px-4 py-4 print:hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-8 w-auto object-contain" />
          </div>
        </div>

        {document.pdf_url ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleViewPdf}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm"
            >
              <Eye size={18} />
              Ver documento
            </button>
            <button
              onClick={handlePrint}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={handleShare}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm"
            >
              <Share2 size={18} />
              <span className="hidden sm:inline">Compartir</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            <span>Generando PDF...</span>
          </div>
        )}
      </header>

      <div className="p-4 pb-8 print:p-0 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden print:rounded-none print:shadow-none print:border-2 print:border-black">
          <div className="bg-slate-800 text-white p-5 text-center">
            <h1 className="text-xl font-bold tracking-wide">
              DOCUMENTO DE CONTROL DE TRANSPORTE
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Conforme a la normativa vigente de transporte por carretera
            </p>
          </div>

          <div className="p-5">
            {document.pdf_url && (
              <div className="flex justify-center mb-6">
                <div className="bg-white p-3 border border-slate-200 rounded-xl">
                  <QRCode value={qrDownloadUrl} size={120} />
                </div>
              </div>
            )}

            <div className="text-center mb-5 pb-5 border-b border-slate-200">
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

              {(content.driver?.name || document.driver_name) && (
                <section className="border border-slate-200 rounded-xl p-4">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Conductor</h2>
                  <p className="text-base font-semibold text-slate-900">{content.driver?.name || document.driver_name}</p>
                </section>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="border border-blue-200 bg-blue-50/50 rounded-xl p-4">
                  <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Origen</h2>
                  {content.origin.empresa && <p className="text-base font-bold text-slate-900">{content.origin.empresa}</p>}
                  <p className={content.origin.empresa ? 'text-sm text-slate-700' : 'text-base font-bold text-slate-900'}>{originDisplay.primary}</p>
                  {originDisplay.secondary && <p className="text-sm text-slate-600">{originDisplay.secondary}</p>}
                  {content.origin.contact_name && <p className="text-sm text-slate-500 mt-2">Contacto: {content.origin.contact_name}</p>}
                  {content.origin.phone && <p className="text-sm text-slate-500">Tel: {content.origin.phone}</p>}
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Salida:</span>{' '}
                      {format(new Date(document.departure_date), "d/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                </section>

                <section className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4">
                  <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Destino</h2>
                  {content.destination.empresa && <p className="text-base font-bold text-slate-900">{content.destination.empresa}</p>}
                  <p className={content.destination.empresa ? 'text-sm text-slate-700' : 'text-base font-bold text-slate-900'}>{destinationDisplay.primary}</p>
                  {destinationDisplay.secondary && <p className="text-sm text-slate-600">{destinationDisplay.secondary}</p>}
                  {content.destination.contact_name && <p className="text-sm text-slate-500 mt-2">Contacto: {content.destination.contact_name}</p>}
                  {content.destination.phone && <p className="text-sm text-slate-500">Tel: {content.destination.phone}</p>}
                  {content.unloading_date && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">Descarga:</span>{' '}
                        {format(new Date(content.unloading_date), "d/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <section className="border border-slate-200 rounded-xl p-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vehiculo</h2>
                <div className="flex flex-wrap gap-6 mb-2">
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Cabeza Tractora</p>
                    <p className="text-lg font-bold text-slate-900 font-mono tracking-wider">{content.vehicle.tractor_plate}</p>
                  </div>
                  {trailerPlate1 && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Remolque 1</p>
                      <p className="text-lg font-bold text-slate-900 font-mono tracking-wider">{trailerPlate1}</p>
                    </div>
                  )}
                  {content.vehicle.trailer_plate_2 && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Remolque 2</p>
                      <p className="text-lg font-bold text-slate-900 font-mono tracking-wider">{content.vehicle.trailer_plate_2}</p>
                    </div>
                  )}
                </div>
                {content.vehicle.amendments && content.vehicle.amendments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Matriculas Sucesivas</p>
                    {content.vehicle.amendments.map((a, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 text-sm">
                        <p className="text-xs text-slate-400 mb-1">{format(new Date(a.amended_at), "d/MM/yyyy HH:mm", { locale: es })}</p>
                        <div className="flex flex-wrap gap-3">
                          {a.tractor_plate && <span className="font-mono font-semibold text-slate-700">Tractora: {a.tractor_plate}</span>}
                          {a.trailer_plate_1 && <span className="font-mono font-semibold text-slate-700">R1: {a.trailer_plate_1}</span>}
                          {a.trailer_plate_2 && <span className="font-mono font-semibold text-slate-700">R2: {a.trailer_plate_2}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
                <h2 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Mercancia</h2>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-bold text-slate-900">{content.cargo.description}</p>
                    {content.cargo.packages != null && content.cargo.packages > 0 && (
                      <p className="text-sm text-slate-500 mt-1">Bultos: {content.cargo.packages}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-slate-400 uppercase">Peso bruto</p>
                    <p className="text-xl font-bold text-slate-900">{content.cargo.weight_kg.toLocaleString()} kg</p>
                  </div>
                </div>
              </section>

              {content.amendments && content.amendments.length > 0 && (
                <section className="border border-amber-300 bg-amber-50/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History size={14} className="text-amber-600" />
                    <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Historial de Modificaciones</h2>
                    <span className="ml-auto text-[10px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                      {content.amendments.length} modificacion(es)
                    </span>
                  </div>
                  <div className="space-y-3">
                    {content.amendments.map((amendment) => (
                      <div key={amendment.id} className="bg-white border border-amber-200/60 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-amber-700">
                            {amendment.amended_by || 'Usuario'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {format(new Date(amendment.amended_at), "d/MM/yyyy HH:mm", { locale: es })}
                          </p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                          <p className="text-xs text-amber-800">
                            <span className="font-semibold">Motivo:</span> {amendment.reason}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          {amendment.changes.map((change, idx) => (
                            <div key={idx} className="text-xs">
                              <p className="font-semibold text-slate-600">{change.label}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="line-through text-red-500/80 bg-red-50 px-1.5 py-0.5 rounded text-[11px]">
                                  {change.old_value || '(vacio)'}
                                </span>
                                <span className="text-slate-400">&rarr;</span>
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium text-[11px]">
                                  {change.new_value || '(vacio)'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
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
