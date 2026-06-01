import { useState, useRef, useEffect } from 'react';
import {
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
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'react-qr-code';
import { Document, SignatureData } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { SignatureCanvas, SignatureCanvasRef } from '../components/SignatureCanvas';
import { AppLayout } from '../components/AppLayout';

interface DocumentoControlProps {
  document: Document;
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
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
  { label: 'Finalizando documento', threshold: 60 },
  { label: 'Subiendo archivo', threshold: 78 },
];

function getPdfPhaseLabel(pct: number) {
  for (let i = PDF_PHASES.length - 1; i >= 0; i--) {
    if (pct >= PDF_PHASES[i].threshold) return PDF_PHASES[i].label;
  }
  return PDF_PHASES[0].label;
}

export function DocumentoControl({ document: initialDoc, onBack, onLogout, onNavigate }: DocumentoControlProps) {
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
      <div className={`rounded-xl p-4 border ${isOrigin ? 'border-blue-200 bg-blue-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isOrigin ? 'text-blue-700' : 'text-emerald-700'}`}>
            Firma — {label}
          </h3>
          <button
            onClick={() => openSignModal(side)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white ${isOrigin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-500 hover:bg-emerald-600'} transition-colors`}
          >
            <PenLine size={13} />{sig ? 'Re-firmar' : 'Firmar'}
          </button>
        </div>
        {sig ? (
          <div className="space-y-2">
            <div className="flex gap-4 text-sm">
              <div><p className="text-slate-500 text-xs">Firmante</p><p className="font-semibold text-slate-900">{sig.firmante}</p></div>
              <div><p className="text-slate-500 text-xs">DNI</p><p className="font-semibold text-slate-900">{sig.dni}</p></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-2">
              <img src={sig.firma_imagen} alt="Firma" className="max-h-16 w-full object-contain" />
            </div>
            <p className="text-xs text-slate-500">{format(new Date(sig.fecha), "d/MM/yyyy 'a las' HH:mm", { locale: es })}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Sin firma. Pulsa "Firmar" para añadir.</p>
        )}
      </div>
    );
  };

  const handleNavItem = (item: string) => {
    onNavigate(item);
  };

  return (
    <AppLayout
      activeNav="documentos"
      onNavigate={handleNavItem}
      onLogout={onLogout}
      pageTitle="Documento de Control"
      onBack={onBack}
    >
      <div className="max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 border-2 border-dashed border-slate-200 rounded-xl">
                  <QRCode value={documentUrl} size={180} />
                </div>
              </div>
              <div className="text-center mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Codigo QR de Verificacion</p>
                <p className="text-xs text-slate-500">Escanea para validar la autenticidad del documento</p>
              </div>
              <div className={`rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 ${pdfProgress >= 100 ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                <ShieldCheck size={16} className={pdfProgress >= 100 ? 'text-emerald-600' : 'text-amber-500'} />
                <span className={`text-xs font-bold uppercase tracking-wide ${pdfProgress >= 100 ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {pdfProgress >= 100 ? 'Documento Verificado' : 'Verificando...'}
                </span>
              </div>
            </div>

            {pdfProgress < 100 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-blue-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700">{getPdfPhaseLabel(pdfProgress)}</span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 tabular-nums">{pdfProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${pdfProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin shrink-0" />
                  Puedes navegar — el PDF se sigue generando
                </p>
              </div>
            ) : (
              <button
                onClick={handleDownload}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-md shadow-emerald-500/20"
              >
                <Download size={20} />
                Descargar PDF
              </button>
            )}

            <button
              onClick={handleShare}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Share2 size={18} />
              Compartir QR
            </button>

            <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-800 mb-1">Informacion de Firma</p>
                  <p className="text-xs text-blue-700">Documento generado digitalmente por DOKO. Verificable mediante codigo QR.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-sm font-bold text-white tracking-wide uppercase">Documento de Control de Transporte</h1>
                    <p className="text-slate-400 text-xs mt-0.5">Conforme a la normativa vigente de transporte por carretera</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">ID</p>
                    <p className="text-sm font-mono font-bold text-white">{doc.id.toUpperCase().slice(0, 8)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{format(new Date(doc.created_at), "d/MM/yyyy · HH:mm", { locale: es })}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Partes involucradas</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-100 p-1.5 rounded-lg">
                          <FileText size={14} className="text-blue-600" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Cargador Contractual</p>
                      </div>
                      <p className="text-base font-bold text-slate-900">{shipperName}</p>
                      {shipperNif && <p className="text-sm text-slate-600 mt-0.5">NIF: {shipperNif}</p>}
                      <p className="text-sm text-slate-500 mt-0.5">{shipperAddr}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-emerald-100 p-1.5 rounded-lg">
                          <Truck size={14} className="text-emerald-600" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Transportista Efectivo</p>
                      </div>
                      <p className="text-base font-bold text-slate-900">{content.company.name}</p>
                      {content.company.cif && <p className="text-sm text-slate-600 mt-0.5">CIF: {content.company.cif}</p>}
                      <p className="text-sm text-slate-500 mt-0.5">{[content.company.address, content.company.postal_code, content.company.city].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(content.driver?.name || doc.driver_name) && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Conductor</p>
                      <p className="text-sm font-bold text-slate-900">{content.driver?.name || doc.driver_name}</p>
                      {content.driver?.dni && <p className="text-xs text-slate-500 mt-0.5">DNI: {content.driver.dni}</p>}
                    </div>
                  )}

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                    <div className="flex items-center mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vehiculo</p>
                    </div>
                    <p className="text-lg font-bold text-slate-900 font-mono">{content.vehicle.tractor_plate}</p>
                    {trailerPlate1 && <p className="text-xs text-slate-500 mt-0.5">R1: {trailerPlate1}</p>}
                    {content.vehicle.trailer_plate_2 && <p className="text-xs text-slate-500">R2: {content.vehicle.trailer_plate_2}</p>}
                    {content.vehicle.amendments && content.vehicle.amendments.length > 0 && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-1">+{content.vehicle.amendments.length} enmienda(s)</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Ruta</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={14} className="text-blue-600" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Origen</p>
                      </div>
                      {origin.empresa && <p className="text-sm font-bold text-slate-900">{origin.empresa}</p>}
                      <p className={origin.empresa ? 'text-sm text-slate-600' : 'text-sm font-bold text-slate-900'}>{origin.addr}</p>
                      {origin.loc && <p className="text-xs text-slate-500">{origin.loc}</p>}
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <p className="text-xs font-semibold text-slate-700">
                          Salida: {format(new Date(doc.departure_date), "d/MM/yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={14} className="text-emerald-600" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Destino</p>
                      </div>
                      {destination.empresa && <p className="text-sm font-bold text-slate-900">{destination.empresa}</p>}
                      <p className={destination.empresa ? 'text-sm text-slate-600' : 'text-sm font-bold text-slate-900'}>{destination.addr}</p>
                      {destination.loc && <p className="text-xs text-slate-500">{destination.loc}</p>}
                      {content.unloading_date && (
                        <div className="mt-2 pt-2 border-t border-emerald-200">
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Clock size={11} className="text-emerald-600" />
                            Descarga: {format(new Date(content.unloading_date), "d/MM/yyyy", { locale: es })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">Carga & Mercancia</p>
                  <p className="text-sm font-bold text-slate-900">{content.cargo.description}</p>
                  <div className="flex gap-6 mt-2">
                    {content.cargo.packages != null && content.cargo.packages > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Bultos</p>
                        <p className="text-lg font-bold text-slate-900">{content.cargo.packages}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Peso bruto</p>
                      <p className="text-lg font-bold text-slate-900">{content.cargo.weight_kg.toLocaleString()} kg</p>
                    </div>
                  </div>
                </div>

                {content.vehicle.amendments && content.vehicle.amendments.length > 0 && (
                  <div className="border border-slate-200 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Matriculas Sucesivas</p>
                    <div className="space-y-2">
                      {content.vehicle.amendments.map((a, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-slate-400 mb-1">{format(new Date(a.amended_at), "d/MM/yyyy HH:mm", { locale: es })}</p>
                          <div className="flex flex-wrap gap-3">
                            {a.tractor_plate && <span className="font-mono font-semibold text-slate-800 text-sm">Tractora: {a.tractor_plate}</span>}
                            {a.trailer_plate_1 && <span className="font-mono font-semibold text-slate-800 text-sm">R1: {a.trailer_plate_1}</span>}
                            {a.trailer_plate_2 && <span className="font-mono font-semibold text-slate-800 text-sm">R2: {a.trailer_plate_2}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-800 px-5 py-3 flex items-center justify-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Documento Verificado por DOKO</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSignModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Firma — {showSignModal === 'origin' ? 'Origen' : 'Destino'}</h2>
              <button onClick={() => setShowSignModal(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
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
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
            >
              {signSaving ? <><Loader2 size={18} className="animate-spin" />Guardando...</> : <><Check size={18} />Confirmar Firma</>}
            </button>
          </div>
        </div>
      )}

      {showAmendModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg"><Truck size={18} className="text-blue-600" /></div>
                <h2 className="text-base font-bold text-slate-900">Matriculas Sucesivas</h2>
              </div>
              <button onClick={() => setShowAmendModal(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
            >
              {amendSaving ? <><Loader2 size={18} className="animate-spin" />Guardando...</> : <><Check size={18} />Guardar Matriculas</>}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
