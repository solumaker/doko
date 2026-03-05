import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Download,
  PenLine,
  Truck,
  X,
  Check,
  Loader2,
  User,
  CreditCard,
  AlertCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'react-qr-code';
import { Document, SignatureData } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { SignatureCanvas, SignatureCanvasRef } from '../components/SignatureCanvas';

interface DocumentoControlProps {
  document: Document;
  onBack: () => void;
}

const inputClass =
  'w-full p-3 text-base border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900 placeholder:text-slate-400';

function getOriginLabel(content: Document['content']) {
  return {
    empresa: content.origin.empresa,
    addr: content.origin.domicilio || content.origin.name || '',
    loc: content.origin.poblacion || content.origin.city || '',
  };
}

function getDestinationLabel(content: Document['content']) {
  return {
    empresa: content.destination.empresa,
    addr: content.destination.domicilio || content.destination.name || '',
    loc: content.destination.poblacion || content.destination.city || '',
  };
}

const PDF_PHASES = [
  { label: 'Preparando documento', threshold: 0 },
  { label: 'Generando estructura PDF', threshold: 20 },
  { label: 'Aplicando formato legal', threshold: 40 },
  { label: 'Convirtiendo a PDF/A', threshold: 60 },
  { label: 'Subiendo archivo', threshold: 78 },
];

function getPdfPhaseLabel(pct: number) {
  for (let i = PDF_PHASES.length - 1; i >= 0; i--) {
    if (pct >= PDF_PHASES[i].threshold) return PDF_PHASES[i].label;
  }
  return PDF_PHASES[0].label;
}

export function DocumentoControl({ document: initialDoc, onBack }: DocumentoControlProps) {
  const { signDocument, amendVehiclePlates } = useData();
  const [doc, setDoc] = useState<Document>(initialDoc);
  const [pdfProgress, setPdfProgress] = useState(() =>
    (initialDoc.pdf_url || initialDoc.pdf_original_url) ? 100 : 3
  );
  const resolvedRef = useRef(false);

  const resolvePdf = (updatedDoc: Partial<Document>) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setPdfProgress(100);
    setDoc((prev) => ({ ...prev, ...updatedDoc }));
  };

  useEffect(() => {
    if (initialDoc.pdf_url || initialDoc.pdf_original_url) {
      resolvedRef.current = true;
      return;
    }

    let animFrameId: ReturnType<typeof setTimeout>;
    let currentPct = 3;

    const animateTo = (target: number, duration: number) => {
      const start = currentPct;
      const diff = target - start;
      const startTime = Date.now();
      const step = () => {
        if (resolvedRef.current) return;
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        currentPct = start + diff * eased;
        setPdfProgress(Math.round(currentPct));
        if (t < 1) animFrameId = setTimeout(step, 30);
      };
      step();
    };

    animateTo(88, 20000);

    const channel = supabase
      .channel(`doc-pdf-${doc.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents', filter: `id=eq.${doc.id}` },
        (payload) => {
          const updated = payload.new as Document;
          if (updated.pdf_url || updated.pdf_original_url) {
            clearTimeout(animFrameId);
            resolvePdf({ pdf_url: updated.pdf_url, pdf_original_url: updated.pdf_original_url });
          }
        }
      )
      .subscribe();

    const pollInterval = setInterval(async () => {
      if (resolvedRef.current) { clearInterval(pollInterval); return; }
      const { data } = await supabase
        .from('documents')
        .select('pdf_url, pdf_original_url')
        .eq('id', doc.id)
        .maybeSingle();
      if (data && (data.pdf_url || data.pdf_original_url)) {
        clearInterval(pollInterval);
        clearTimeout(animFrameId);
        resolvePdf({ pdf_url: data.pdf_url, pdf_original_url: data.pdf_original_url });
      }
    }, 4000);

    return () => {
      clearTimeout(animFrameId);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [doc.id]);


  const [showSignModal, setShowSignModal] = useState<'origin' | 'destination' | null>(null);
  const [signFirmante, setSignFirmante] = useState('');
  const [signDni, setSignDni] = useState('');
  const [signDrawn, setSignDrawn] = useState(false);
  const [signSaving, setSignSaving] = useState(false);
  const canvasRef = useRef<SignatureCanvasRef>(null);

  const [showAmendModal, setShowAmendModal] = useState(false);
  const [amendTractor, setAmendTractor] = useState('');
  const [amendTrailer1, setAmendTrailer1] = useState('');
  const [amendTrailer2, setAmendTrailer2] = useState('');
  const [amendSaving, setAmendSaving] = useState(false);

  const { content } = doc;
  const origin = getOriginLabel(content);
  const destination = getDestinationLabel(content);

  const shipperName = content.contractual_shipper?.nombre || content.company.name;
  const shipperNif = content.contractual_shipper?.nif || content.company.cif;
  const shipperAddr = content.contractual_shipper
    ? `${content.contractual_shipper.domicilio}, ${content.contractual_shipper.poblacion}`
    : `${content.company.address}, ${content.company.postal_code} ${content.company.city}`;

  const trailerPlate1 = content.vehicle.trailer_plate_1 || content.vehicle.trailer_plate;
  const downloadUrl = doc.pdf_url || doc.pdf_original_url;
  const documentUrl = doc.pdf_url || `${window.location.origin}/documento/${doc.id}`;

  const handleShare = () => {
    const text = encodeURIComponent(`Documento de Control de Transporte: ${documentUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = window.document.createElement('a');
    link.href = downloadUrl;
    link.download = `documento-${doc.id.slice(0, 8)}.pdf`;
    link.target = '_blank';
    link.click();
  };

  const openSignModal = (side: 'origin' | 'destination') => {
    const existing = content.signatures?.[side];
    setSignFirmante(existing?.firmante || '');
    setSignDni(existing?.dni || '');
    setSignDrawn(false);
    setShowSignModal(side);
    setTimeout(() => canvasRef.current?.clear(), 50);
  };

  const handleSaveSignature = async () => {
    if (!showSignModal || !canvasRef.current?.hasContent()) return;
    if (!signFirmante.trim() || !signDni.trim()) return;
    setSignSaving(true);
    const sigData: SignatureData = {
      firmante: signFirmante.trim(),
      dni: signDni.trim(),
      firma_imagen: canvasRef.current.getDataUrl(),
      fecha: new Date().toISOString(),
    };
    const updated = await signDocument(doc.id, showSignModal, sigData);
    setSignSaving(false);
    if (updated) { setDoc(updated); setShowSignModal(null); }
  };

  const handleSaveAmendment = async () => {
    if (!amendTractor.trim() && !amendTrailer1.trim() && !amendTrailer2.trim()) return;
    setAmendSaving(true);
    const updated = await amendVehiclePlates(doc.id, {
      tractor_plate: amendTractor.trim().toUpperCase() || undefined,
      trailer_plate_1: amendTrailer1.trim().toUpperCase() || undefined,
      trailer_plate_2: amendTrailer2.trim().toUpperCase() || undefined,
    });
    setAmendSaving(false);
    if (updated) {
      setDoc(updated);
      setShowAmendModal(false);
      setAmendTractor(''); setAmendTrailer1(''); setAmendTrailer2('');
    }
  };

  const SignatureBlock = ({ side, label }: { side: 'origin' | 'destination'; label: string }) => {
    const sig = content.signatures?.[side];
    const isOrigin = side === 'origin';
    return (
      <section className={`border rounded-xl p-4 ${isOrigin ? 'border-blue-200 bg-blue-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-sm font-bold uppercase tracking-wide ${isOrigin ? 'text-blue-700' : 'text-emerald-700'}`}>
            Firma — {label}
          </h2>
          <button
            onClick={() => openSignModal(side)}
            className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg text-white active:opacity-80 ${isOrigin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
          >
            <PenLine size={14} />{sig ? 'Re-firmar' : 'Firmar'}
          </button>
        </div>
        {sig ? (
          <div className="space-y-2">
            <div className="flex gap-4 text-sm">
              <div><p className="text-slate-500">Firmante</p><p className="font-semibold text-slate-900">{sig.firmante}</p></div>
              <div><p className="text-slate-500">DNI</p><p className="font-semibold text-slate-900">{sig.dni}</p></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-2">
              <img src={sig.firma_imagen} alt="Firma" className="max-h-20 w-full object-contain" />
            </div>
            <p className="text-xs text-slate-500">Firmado: {format(new Date(sig.fecha), "d/MM/yyyy 'a las' HH:mm", { locale: es })}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Sin firma todavia. Pulsa "Firmar" para añadir.</p>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between print:hidden">
        <button onClick={onBack} className="p-2 -ml-2">
          <ArrowLeft size={24} className="text-slate-800" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 flex-1 text-center -ml-10">Documento de Control</h1>
        <button onClick={handleShare} className="text-blue-600 p-2">
          <Share2 size={22} />
        </button>
      </header>

      <div className="p-4 pb-40 print:p-0">
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden print:rounded-none print:shadow-none">
          <div className="bg-slate-800 text-white p-4 text-center">
            <h1 className="text-xl font-bold tracking-wide">DOCUMENTO DE CONTROL DE TRANSPORTE</h1>
            <p className="text-slate-300 text-sm mt-1">Conforme a la normativa vigente de transporte por carretera</p>
          </div>

          <div className="p-4">
            <div className="flex justify-center mb-6">
              <div className="bg-white p-3 border border-slate-200 rounded-xl">
                <QRCode value={documentUrl} size={140} />
              </div>
            </div>

            <div className="text-center mb-4 pb-4 border-b border-slate-200">
              <p className="text-slate-500 text-sm">Documento ID</p>
              <p className="text-lg font-mono font-bold text-slate-900">{doc.id.toUpperCase().slice(0, 8)}</p>
              <p className="text-slate-600 text-base mt-1">
                Generado: {format(new Date(doc.created_at), "d/MM/yyyy 'a las' HH:mm", { locale: es })}
              </p>
            </div>

            <div className="space-y-4">
              <section className="border border-slate-200 rounded-xl p-4">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Cargador Contractual</h2>
                <p className="text-lg font-bold text-slate-900">{shipperName}</p>
                {shipperNif && <p className="text-base text-slate-700">NIF: {shipperNif}</p>}
                <p className="text-base text-slate-600">{shipperAddr}</p>
              </section>

              <section className="border border-slate-200 rounded-xl p-4">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Transportista Efectivo</h2>
                <p className="text-lg font-bold text-slate-900">{content.company.name}</p>
                {content.company.cif && <p className="text-base text-slate-700">CIF: {content.company.cif}</p>}
              </section>

              {(content.driver?.name || doc.driver_name) && (
                <section className="border border-slate-200 rounded-xl p-4">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Conductor</h2>
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg"><User size={20} className="text-slate-600" /></div>
                    <p className="text-lg font-bold text-slate-900">{content.driver?.name || doc.driver_name}</p>
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="border border-blue-200 bg-blue-50/50 rounded-xl p-4">
                  <h2 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-2">Origen</h2>
                  {origin.empresa && <p className="text-lg font-bold text-slate-900">{origin.empresa}</p>}
                  <p className={origin.empresa ? 'text-base text-slate-700' : 'text-lg font-bold text-slate-900'}>{origin.addr}</p>
                  {origin.loc && <p className="text-base text-slate-700">{origin.loc}</p>}
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-base text-slate-700"><span className="font-semibold">Salida:</span> {format(new Date(doc.departure_date), "d/MM/yyyy", { locale: es })}</p>
                  </div>
                </section>

                <section className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4">
                  <h2 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2">Destino</h2>
                  {destination.empresa && <p className="text-lg font-bold text-slate-900">{destination.empresa}</p>}
                  <p className={destination.empresa ? 'text-base text-slate-700' : 'text-lg font-bold text-slate-900'}>{destination.addr}</p>
                  {destination.loc && <p className="text-base text-slate-700">{destination.loc}</p>}
                  {content.unloading_date && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <p className="text-base text-slate-700 flex items-center gap-1.5">
                        <Clock size={14} className="text-emerald-600" />
                        <span className="font-semibold">Descarga:</span> {format(new Date(content.unloading_date), "d/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <section className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Vehiculo</h2>
                </div>
                <div className="flex flex-wrap gap-4 mb-2">
                  <div><p className="text-sm text-slate-500">Cabeza Tractora</p><p className="text-xl font-bold text-slate-900 font-mono">{content.vehicle.tractor_plate}</p></div>
                  {trailerPlate1 && <div><p className="text-sm text-slate-500">Remolque 1</p><p className="text-xl font-bold text-slate-900 font-mono">{trailerPlate1}</p></div>}
                  {content.vehicle.trailer_plate_2 && <div><p className="text-sm text-slate-500">Remolque 2</p><p className="text-xl font-bold text-slate-900 font-mono">{content.vehicle.trailer_plate_2}</p></div>}
                </div>
                {content.vehicle.amendments && content.vehicle.amendments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Matriculas Sucesivas</p>
                    {content.vehicle.amendments.map((a, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 text-sm">
                        <p className="text-xs text-slate-400 mb-1">{format(new Date(a.amended_at), "d/MM/yyyy HH:mm", { locale: es })}</p>
                        <div className="flex flex-wrap gap-3">
                          {a.tractor_plate && <span className="font-mono font-semibold text-slate-800">Tractora: {a.tractor_plate}</span>}
                          {a.trailer_plate_1 && <span className="font-mono font-semibold text-slate-800">R1: {a.trailer_plate_1}</span>}
                          {a.trailer_plate_2 && <span className="font-mono font-semibold text-slate-800">R2: {a.trailer_plate_2}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
                <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-2">Mercancia</h2>
                <p className="text-lg font-bold text-slate-900">{content.cargo.description}</p>
                <div className="flex gap-4 mt-2">
                  {content.cargo.packages != null && content.cargo.packages > 0 && (
                    <div><p className="text-sm text-slate-500">Bultos</p><p className="text-xl font-bold text-slate-900">{content.cargo.packages}</p></div>
                  )}
                  <div><p className="text-sm text-slate-500">Peso bruto</p><p className="text-xl font-bold text-slate-900">{content.cargo.weight_kg.toLocaleString()} kg</p></div>
                </div>
              </section>

            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">Este documento ha sido generado digitalmente por DOKO</p>
              <p className="text-xs text-slate-400 mt-1">Verificable mediante codigo QR</p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 print:hidden space-y-3">
        {downloadUrl ? (
          <button
            onClick={handleDownload}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold py-4 rounded-xl active:bg-emerald-700 flex items-center justify-center gap-3"
          >
            <Download size={26} />
            DESCARGAR PDF{!doc.pdf_url && doc.pdf_original_url ? ' (Original)' : ''}
          </button>
        ) : (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-600 shrink-0" />
                <span className="text-sm font-semibold text-slate-700">
                  {getPdfPhaseLabel(pdfProgress)}
                </span>
              </div>
              <span className="text-sm font-bold text-blue-600 tabular-nums">{pdfProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                style={{ width: `${pdfProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Loader2 size={11} className="animate-spin shrink-0" />
              Puedes navegar libremente — el PDF se seguira generando
            </p>
          </div>
        )}
        <button onClick={onBack} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-4 rounded-xl active:bg-blue-800">
          VOLVER AL INICIO
        </button>
      </div>

      {showSignModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Firma — {showSignModal === 'origin' ? 'Origen' : 'Destino'}</h2>
              <button onClick={() => setShowSignModal(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5"><User size={15} />Persona firmante *</label>
                <input type="text" value={signFirmante} onChange={(e) => setSignFirmante(e.target.value)} className={inputClass} placeholder="Nombre y apellidos" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5"><CreditCard size={15} />DNI / NIE *</label>
                <input type="text" value={signDni} onChange={(e) => setSignDni(e.target.value)} className={inputClass} placeholder="12345678A" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Firma *</label>
                <SignatureCanvas ref={canvasRef} width={400} height={150} onChange={setSignDrawn} />
                {!signDrawn && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><AlertCircle size={12} />Dibuja tu firma en el recuadro</p>
                )}
              </div>
            </div>
            <button
              onClick={handleSaveSignature}
              disabled={!signFirmante.trim() || !signDni.trim() || !signDrawn || signSaving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-500 active:bg-emerald-700"
            >
              {signSaving ? <><Loader2 size={20} className="animate-spin" />Guardando...</> : <><Check size={20} />CONFIRMAR FIRMA</>}
            </button>
          </div>
        </div>
      )}

      {showAmendModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg"><Truck size={20} className="text-blue-600" /></div>
                <h2 className="text-xl font-bold text-slate-900">Matriculas Sucesivas</h2>
              </div>
              <button onClick={() => setShowAmendModal(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <p className="text-sm text-slate-600">Las matriculas originales se conservan en el historial del documento.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nueva Cabeza Tractora</label>
                <input type="text" value={amendTractor} onChange={(e) => setAmendTractor(e.target.value.toUpperCase())} className={inputClass} placeholder={content.vehicle.tractor_plate} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nuevo Remolque 1</label>
                <input type="text" value={amendTrailer1} onChange={(e) => setAmendTrailer1(e.target.value.toUpperCase())} className={inputClass} placeholder={trailerPlate1 || 'Opcional'} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nuevo Remolque 2</label>
                <input type="text" value={amendTrailer2} onChange={(e) => setAmendTrailer2(e.target.value.toUpperCase())} className={inputClass} placeholder="Opcional" />
              </div>
            </div>
            <button
              onClick={handleSaveAmendment}
              disabled={(!amendTractor.trim() && !amendTrailer1.trim() && !amendTrailer2.trim()) || amendSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-500 active:bg-blue-800"
            >
              {amendSaving ? <><Loader2 size={20} className="animate-spin" />Guardando...</> : <><Check size={20} />GUARDAR MATRICULAS</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
