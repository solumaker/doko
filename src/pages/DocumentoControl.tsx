import { ArrowLeft, Share2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'react-qr-code';
import { Document } from '../lib/supabase';

interface DocumentoControlProps {
  document: Document;
  onBack: () => void;
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

export function DocumentoControl({ document, onBack }: DocumentoControlProps) {
  const { content } = document;
  const originDisplay = getOriginDisplay(content);
  const destinationDisplay = getDestinationDisplay(content);

  const shipperName = content.contractual_shipper?.nombre || content.company.name;
  const shipperNif = content.contractual_shipper?.nif || content.company.cif;
  const shipperAddress = content.contractual_shipper
    ? `${content.contractual_shipper.domicilio}, ${content.contractual_shipper.poblacion}`
    : `${content.company.address}, ${content.company.postal_code} ${content.company.city} (${content.company.province})`;

  const trailerPlate1 = content.vehicle.trailer_plate_1 || content.vehicle.trailer_plate;

  const documentUrl = document.pdf_url || `${window.location.origin}/documento/${document.id}`;

  const handleShare = () => {
    const text = encodeURIComponent(`Documento de Control de Transporte: ${documentUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownload = () => {
    if (document.pdf_url) {
      const link = window.document.createElement('a');
      link.href = document.pdf_url;
      link.download = `documento-${document.id.slice(0, 8)}.pdf`;
      link.target = '_blank';
      link.click();
    }
  };

  const qrData = documentUrl;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2">
            <ArrowLeft size={32} />
          </button>
          <h1 className="text-xl font-bold">Documento de Control</h1>
        </div>
        <button
          onClick={handleShare}
          className="bg-white text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <Share2 size={22} />
          Compartir
        </button>
      </header>

      <div className="p-4 pb-40 print:p-0">
        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-300 overflow-hidden print:rounded-none print:shadow-none print:border-2 print:border-black">
          <div className="bg-slate-800 text-white p-4 text-center">
            <h1 className="text-xl font-bold tracking-wide">
              DOCUMENTO DE CONTROL DE TRANSPORTE
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Conforme a la normativa vigente de transporte por carretera
            </p>
          </div>

          <div className="p-4">
            <div className="flex justify-center mb-6">
              <div className="bg-white p-3 border-2 border-slate-300 rounded-xl">
                <QRCode value={qrData} size={140} />
              </div>
            </div>

            <div className="text-center mb-4 pb-4 border-b-2 border-slate-200">
              <p className="text-slate-500 text-sm">Documento ID</p>
              <p className="text-lg font-mono font-bold text-slate-900">
                {document.id.toUpperCase().slice(0, 8)}
              </p>
              <p className="text-slate-600 text-base mt-1">
                Generado:{' '}
                {format(new Date(document.created_at), "d/MM/yyyy 'a las' HH:mm", {
                  locale: es,
                })}
              </p>
            </div>

            <div className="space-y-4">
              <section className="border-2 border-slate-200 rounded-xl p-4">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Cargador Contractual
                </h2>
                <p className="text-lg font-bold text-slate-900">{shipperName}</p>
                {shipperNif && (
                  <p className="text-base text-slate-700">NIF: {shipperNif}</p>
                )}
                <p className="text-base text-slate-600">{shipperAddress}</p>
                {!content.contractual_shipper && content.company.phone && (
                  <p className="text-base text-slate-600">Tel: {content.company.phone}</p>
                )}
              </section>

              <section className="border-2 border-slate-200 rounded-xl p-4">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Transportista Efectivo
                </h2>
                <p className="text-lg font-bold text-slate-900">{content.company.name}</p>
                {content.company.cif && (
                  <p className="text-base text-slate-700">CIF: {content.company.cif}</p>
                )}
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4">
                  <h2 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-2">
                    Origen
                  </h2>
                  <p className="text-lg font-bold text-slate-900">
                    {originDisplay.primary}
                  </p>
                  {originDisplay.secondary && (
                    <p className="text-base text-slate-700">
                      {originDisplay.secondary}
                    </p>
                  )}
                  {content.origin.contact_name && (
                    <p className="text-base text-slate-600 mt-2">
                      Contacto: {content.origin.contact_name}
                    </p>
                  )}
                  {content.origin.phone && (
                    <p className="text-base text-slate-600">
                      Tel: {content.origin.phone}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-base text-slate-700">
                      <span className="font-semibold">Fecha salida:</span>{' '}
                      {format(new Date(document.departure_date), "d/MM/yyyy 'a las' HH:mm", {
                        locale: es,
                      })}
                    </p>
                  </div>
                </section>

                <section className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
                  <h2 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-2">
                    Destino
                  </h2>
                  <p className="text-lg font-bold text-slate-900">
                    {destinationDisplay.primary}
                  </p>
                  {destinationDisplay.secondary && (
                    <p className="text-base text-slate-700">
                      {destinationDisplay.secondary}
                    </p>
                  )}
                  {content.destination.contact_name && (
                    <p className="text-base text-slate-600 mt-2">
                      Contacto: {content.destination.contact_name}
                    </p>
                  )}
                  {content.destination.phone && (
                    <p className="text-base text-slate-600">
                      Tel: {content.destination.phone}
                    </p>
                  )}
                </section>
              </div>

              <section className="border-2 border-slate-200 rounded-xl p-4">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Vehiculo
                </h2>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Cabeza Tractora</p>
                    <p className="text-xl font-bold text-slate-900 font-mono">
                      {content.vehicle.tractor_plate}
                    </p>
                  </div>
                  {trailerPlate1 && (
                    <div>
                      <p className="text-sm text-slate-500">Remolque 1</p>
                      <p className="text-xl font-bold text-slate-900 font-mono">
                        {trailerPlate1}
                      </p>
                    </div>
                  )}
                  {content.vehicle.trailer_plate_2 && (
                    <div>
                      <p className="text-sm text-slate-500">Remolque 2</p>
                      <p className="text-xl font-bold text-slate-900 font-mono">
                        {content.vehicle.trailer_plate_2}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="border-2 border-amber-200 bg-amber-50 rounded-xl p-4">
                <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-2">
                  Mercancia
                </h2>
                <p className="text-lg font-bold text-slate-900">
                  {content.cargo.description}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {content.cargo.packages != null && content.cargo.packages > 0 && (
                    <div>
                      <p className="text-sm text-slate-500">Bultos</p>
                      <p className="text-xl font-bold text-slate-900">
                        {content.cargo.packages}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-500">Peso bruto</p>
                    <p className="text-xl font-bold text-slate-900">
                      {content.cargo.weight_kg.toLocaleString()} kg
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                Este documento ha sido generado digitalmente por DOKO
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Verificable mediante codigo QR
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-slate-200 print:hidden space-y-3">
        {document.pdf_url && (
          <button
            onClick={handleDownload}
            className="w-full bg-green-600 text-white text-xl font-bold py-4 rounded-xl active:bg-green-700 flex items-center justify-center gap-3"
          >
            <Download size={26} />
            DESCARGAR PDF
          </button>
        )}
        <button
          onClick={onBack}
          className="w-full bg-blue-600 text-white text-xl font-bold py-4 rounded-xl active:bg-blue-700"
        >
          VOLVER AL INICIO
        </button>
      </div>
    </div>
  );
}
