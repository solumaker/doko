import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { INTER_LATIN_WOFF2_BASE64 } from "./fonts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DocumentContent {
  contractual_shipper?: {
    nombre: string;
    nif: string;
    domicilio: string;
    poblacion: string;
  };
  origin: {
    domicilio?: string;
    poblacion?: string;
    name?: string;
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    contact_name?: string;
    phone?: string;
  };
  destination: {
    domicilio?: string;
    poblacion?: string;
    name?: string;
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    contact_name?: string;
    phone?: string;
  };
  vehicle: {
    tractor_plate: string;
    trailer_plate_1?: string;
    trailer_plate_2?: string;
    trailer_plate?: string;
    alias?: string;
  };
  cargo: {
    description: string;
    packages?: number;
    weight_kg: number;
  };
  company: {
    name: string;
    cif: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    phone: string;
  };
}

interface DocumentRecord {
  id: string;
  company_id: string;
  creator_id: string;
  content: DocumentContent;
  departure_date: string;
  created_at: string;
  driver_name?: string;
}

function esc(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-ES")} ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatWeight(kg: number): string {
  return kg.toLocaleString("es-ES");
}

function buildOriginBlock(origin: DocumentContent["origin"]): string {
  if (origin.domicilio) {
    const parts = [origin.domicilio, origin.poblacion].filter(Boolean);
    return parts.map((p) => `<p>${esc(p)}</p>`).join("");
  }
  const lines: string[] = [];
  if (origin.name) lines.push(origin.name);
  if (origin.address) lines.push(origin.address);
  const loc = [origin.postal_code, origin.city, origin.province ? `(${origin.province})` : ""].filter(Boolean).join(" ");
  if (loc.trim()) lines.push(loc);
  if (origin.contact_name) lines.push(`Contacto: ${origin.contact_name}`);
  if (origin.phone) lines.push(`Tel: ${origin.phone}`);
  return lines.map((l) => `<p>${esc(l)}</p>`).join("");
}

function buildDestinationBlock(dest: DocumentContent["destination"]): string {
  if (dest.domicilio) {
    const parts = [dest.domicilio, dest.poblacion].filter(Boolean);
    return parts.map((p) => `<p>${esc(p)}</p>`).join("");
  }
  const lines: string[] = [];
  if (dest.name) lines.push(dest.name);
  if (dest.address) lines.push(dest.address);
  const loc = [dest.postal_code, dest.city, dest.province ? `(${dest.province})` : ""].filter(Boolean).join(" ");
  if (loc.trim()) lines.push(loc);
  if (dest.contact_name) lines.push(`Contacto: ${dest.contact_name}`);
  if (dest.phone) lines.push(`Tel: ${dest.phone}`);
  return lines.map((l) => `<p>${esc(l)}</p>`).join("");
}

function buildHtml(doc: DocumentRecord): string {
  const c = doc.content;
  const docId = doc.id.substring(0, 8).toUpperCase();

  const shipperName = c.contractual_shipper?.nombre || c.company.name;
  const shipperNif = c.contractual_shipper
    ? `NIF: ${c.contractual_shipper.nif}`
    : `CIF: ${c.company.cif}`;
  const shipperAddr = c.contractual_shipper
    ? `${c.contractual_shipper.domicilio}, ${c.contractual_shipper.poblacion}`
    : `${c.company.address}, ${c.company.postal_code} ${c.company.city} (${c.company.province})`;

  const trailerPlate1 = c.vehicle.trailer_plate_1 || c.vehicle.trailer_plate || "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Documento de Control DOC-${esc(docId)}</title>
<meta name="author" content="DOKO - Sistema de Control de Transporte">
<meta name="description" content="Documento de control de transporte de mercancias">
<style>
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 100 900;
    font-display: block;
    src: url(data:font/woff2;base64,${INTER_LATIN_WOFF2_BASE64}) format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
  }

  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    color: #1e293b;
    background: #fff;
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 16mm 14mm 16mm;
    font-size: 10.5pt;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header {
    text-align: center;
    border-bottom: 3px solid #1e40af;
    padding-bottom: 10px;
    margin-bottom: 6px;
  }
  .header h1 {
    font-size: 16pt;
    font-weight: 800;
    color: #1e40af;
    letter-spacing: 1.5px;
    margin-bottom: 2px;
  }
  .header .subtitle {
    font-size: 8.5pt;
    color: #64748b;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    color: #64748b;
    margin-bottom: 14px;
    padding-top: 6px;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .section {
    border: 1.5px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
  }
  .section-title {
    background: #1e40af;
    color: #fff;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    padding: 5px 10px;
  }
  .section-title.green { background: #047857; }
  .section-title.slate { background: #334155; }
  .section-title.amber { background: #b45309; }

  .section-body {
    padding: 8px 10px;
    font-size: 9.5pt;
  }
  .section-body p {
    margin-bottom: 1px;
  }
  .section-body .name {
    font-weight: 700;
    font-size: 10.5pt;
    color: #0f172a;
    margin-bottom: 2px;
  }
  .section-body .detail {
    color: #475569;
  }
  .section-body .mono {
    font-family: 'Inter', monospace;
    font-weight: 600;
    font-size: 11pt;
    letter-spacing: 1px;
    color: #0f172a;
  }
  .section-body .label {
    font-size: 8pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .section-body .weight {
    font-size: 13pt;
    font-weight: 800;
    color: #0f172a;
  }

  .full-width { grid-column: 1 / -1; }

  .vehicle-plates {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
  }
  .plate-group { flex: 1; min-width: 120px; }

  .footer {
    margin-top: 20px;
    text-align: center;
    font-size: 7.5pt;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
  }
  .footer .brand {
    font-weight: 700;
    color: #64748b;
    letter-spacing: 2px;
  }

  .driver-section {
    margin-top: 12px;
    border: 1.5px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
  }
  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }
  .sig-box {
    padding: 10px 10px 30px;
    border-right: 1px solid #e2e8f0;
  }
  .sig-box:last-child { border-right: none; }
  .sig-box .sig-label {
    font-size: 8pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .sig-box .sig-name {
    font-size: 9pt;
    font-weight: 600;
    color: #334155;
  }

  @media print {
    body { background: #fff; }
    .section { break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>DOCUMENTO DE CONTROL</h1>
  <div class="subtitle">Conforme a la normativa vigente de transporte de mercanc&iacute;as por carretera</div>
</div>

<div class="meta-row">
  <span>DOC-${esc(docId)}</span>
  <span>Generado: ${esc(formatDateTime(doc.created_at))}</span>
</div>

<div class="grid">

  <div class="section">
    <div class="section-title">Cargador Contractual</div>
    <div class="section-body">
      <p class="name">${esc(shipperName)}</p>
      <p class="detail">${esc(shipperNif)}</p>
      <p class="detail">${esc(shipperAddr)}</p>
      ${c.company.phone && !c.contractual_shipper ? `<p class="detail">Tel: ${esc(c.company.phone)}</p>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Transportista Efectivo</div>
    <div class="section-body">
      <p class="name">${esc(c.company.name)}</p>
      ${c.company.cif ? `<p class="detail">CIF: ${esc(c.company.cif)}</p>` : ""}
      <p class="detail">${esc(c.company.address)}, ${esc(c.company.postal_code)} ${esc(c.company.city)}</p>
      ${c.company.phone ? `<p class="detail">Tel: ${esc(c.company.phone)}</p>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title green">Origen</div>
    <div class="section-body">
      ${buildOriginBlock(c.origin)}
      <p class="detail" style="margin-top:4px;font-weight:600;">Salida: ${esc(formatDate(doc.departure_date))}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title green">Destino</div>
    <div class="section-body">
      ${buildDestinationBlock(c.destination)}
    </div>
  </div>

  <div class="section full-width">
    <div class="section-title slate">Veh&iacute;culo</div>
    <div class="section-body">
      <div class="vehicle-plates">
        <div class="plate-group">
          <p class="label">Cabeza Tractora</p>
          <p class="mono">${esc(c.vehicle.tractor_plate)}</p>
        </div>
        ${trailerPlate1 ? `
        <div class="plate-group">
          <p class="label">Remolque 1</p>
          <p class="mono">${esc(trailerPlate1)}</p>
        </div>` : ""}
        ${c.vehicle.trailer_plate_2 ? `
        <div class="plate-group">
          <p class="label">Remolque 2</p>
          <p class="mono">${esc(c.vehicle.trailer_plate_2)}</p>
        </div>` : ""}
      </div>
    </div>
  </div>

  <div class="section full-width">
    <div class="section-title amber">Mercanc&iacute;a</div>
    <div class="section-body" style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <p class="name">${esc(c.cargo.description)}</p>
        ${c.cargo.packages != null && c.cargo.packages > 0 ? `<p class="detail">Bultos: ${c.cargo.packages}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <p class="label">Peso bruto</p>
        <p class="weight">${formatWeight(c.cargo.weight_kg)} kg</p>
      </div>
    </div>
  </div>

</div>

<div class="driver-section">
  <div class="section-title slate">Firmas</div>
  <div class="signatures">
    <div class="sig-box">
      <p class="sig-label">Conductor</p>
      ${doc.driver_name ? `<p class="sig-name">${esc(doc.driver_name)}</p>` : ""}
    </div>
    <div class="sig-box">
      <p class="sig-label">Cargador</p>
    </div>
  </div>
</div>

<div class="footer">
  <p>Este documento ha sido generado digitalmente &mdash; <span class="brand">DOKO</span></p>
  <p>Formato PDF/A &middot; V&aacute;lido para archivo y cumplimiento normativo</p>
</div>

</body>
</html>`;
}

function buildMetadataJson(doc: DocumentRecord): string {
  const docId = doc.id.substring(0, 8).toUpperCase();
  return JSON.stringify({
    "dc:title": `Documento de Control DOC-${docId}`,
    "dc:creator": ["DOKO - Sistema de Control de Transporte"],
    "dc:description": "Documento de control de transporte de mercancias",
    "pdf:Producer": "DOKO - Sistema de Control de Transporte",
  });
}

async function convertHtmlToPdf(html: string, doc: DocumentRecord): Promise<ArrayBuffer> {
  const gotenbergUrl = Deno.env.get("GOTENBERG_URL");
  if (!gotenbergUrl) {
    throw new Error("GOTENBERG_URL environment variable is not set");
  }

  const formData = new FormData();

  const htmlBlob = new Blob([html], { type: "text/html" });
  formData.append("files", htmlBlob, "index.html");

  formData.append("paperWidth", "8.27");
  formData.append("paperHeight", "11.69");
  formData.append("marginTop", "0");
  formData.append("marginBottom", "0");
  formData.append("marginLeft", "0");
  formData.append("marginRight", "0");
  formData.append("preferCssPageSize", "false");
  formData.append("printBackground", "true");

  formData.append("emulatedMediaType", "print");
  formData.append("waitDelay", "1s");
  formData.append("failOnConsoleExceptions", "true");

  const metadataBlob = new Blob([buildMetadataJson(doc)], { type: "application/json" });
  formData.append("metadata", metadataBlob, "metadata.json");

  const response = await fetch(
    `${gotenbergUrl}/forms/chromium/convert/html`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const errorText = await response.text();
    const contentType = response.headers.get("content-type") || "unknown";
    throw new Error(
      `Gotenberg error: status=${response.status} content-type=${contentType} body=${errorText.substring(0, 500)}`
    );
  }

  const pdfBuffer = await response.arrayBuffer();

  if (pdfBuffer.byteLength < 1024) {
    throw new Error(
      `Gotenberg returned suspiciously small PDF: ${pdfBuffer.byteLength} bytes`
    );
  }

  const pdfHeader = new Uint8Array(pdfBuffer.slice(0, 5));
  const headerStr = String.fromCharCode(...pdfHeader);
  if (headerStr !== "%PDF-") {
    throw new Error(
      `Gotenberg response is not a valid PDF (header: ${headerStr})`
    );
  }

  return pdfBuffer;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "documentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();

    if (docError) {
      return new Response(
        JSON.stringify({ error: "Database error", details: docError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const doc = document as DocumentRecord;
    const html = buildHtml(doc);

    let pdfBytes: ArrayBuffer;
    try {
      pdfBytes = await convertHtmlToPdf(html, doc);
    } catch (pdfError) {
      const errorMsg = pdfError instanceof Error ? pdfError.message : String(pdfError);
      console.error("PDF generation failed:", errorMsg);
      return new Response(
        JSON.stringify({
          error: "PDF generation failed",
          details: errorMsg,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileName = `${doc.id}_original.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("document-pdfs")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF", details: uploadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("document-pdfs")
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("documents")
      .update({ pdf_original_url: publicUrlData.publicUrl })
      .eq("id", documentId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update document with PDF URL", details: updateError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdf_original_url: publicUrlData.publicUrl,
        sizeBytes: pdfBytes.byteLength,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
