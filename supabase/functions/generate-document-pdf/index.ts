import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import QRCode from "npm:qrcode@1.5.3";
import { INTER_LATIN_WOFF2_BASE64 } from "./fonts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SignatureData {
  firmante: string;
  dni: string;
  firma_imagen: string;
  fecha: string;
}

interface VehicleAmendment {
  tractor_plate?: string;
  trailer_plate_1?: string;
  trailer_plate_2?: string;
  amended_at: string;
}

interface DocumentContent {
  contractual_shipper?: {
    nombre: string;
    nif: string;
    domicilio: string;
    poblacion: string;
  };
  origin: {
    empresa?: string;
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
    empresa?: string;
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
    amendments?: VehicleAmendment[];
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
  driver?: {
    name: string;
    email?: string;
    dni?: string;
  };
  unloading_date?: string;
  signatures?: {
    origin?: SignatureData;
    destination?: SignatureData;
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
  const lines: string[] = [];
  if (origin.empresa) lines.push(`<p class="name">${esc(origin.empresa)}</p>`);
  if (origin.domicilio) {
    const parts = [origin.domicilio, origin.poblacion].filter(Boolean);
    parts.forEach((p) => lines.push(`<p>${esc(p)}</p>`));
    return lines.join("");
  }
  if (origin.name) lines.push(`<p>${esc(origin.name)}</p>`);
  if (origin.address) lines.push(`<p>${esc(origin.address)}</p>`);
  const loc = [origin.postal_code, origin.city, origin.province ? `(${origin.province})` : ""].filter(Boolean).join(" ");
  if (loc.trim()) lines.push(`<p>${esc(loc)}</p>`);
  if (origin.contact_name) lines.push(`<p>Contacto: ${esc(origin.contact_name)}</p>`);
  if (origin.phone) lines.push(`<p>Tel: ${esc(origin.phone)}</p>`);
  return lines.join("");
}

function buildDestinationBlock(dest: DocumentContent["destination"], unloadingDate?: string): string {
  const lines: string[] = [];
  if (dest.empresa) lines.push(`<p class="name">${esc(dest.empresa)}</p>`);
  if (dest.domicilio) {
    const parts = [dest.domicilio, dest.poblacion].filter(Boolean);
    parts.forEach((p) => lines.push(`<p>${esc(p)}</p>`));
    if (unloadingDate) lines.push(`<p class="detail" style="margin-top:4px;font-weight:600;">Descarga: ${esc(formatDate(unloadingDate))}</p>`);
    return lines.join("");
  }
  if (dest.name) lines.push(`<p>${esc(dest.name)}</p>`);
  if (dest.address) lines.push(`<p>${esc(dest.address)}</p>`);
  const loc = [dest.postal_code, dest.city, dest.province ? `(${dest.province})` : ""].filter(Boolean).join(" ");
  if (loc.trim()) lines.push(`<p>${esc(loc)}</p>`);
  if (dest.contact_name) lines.push(`<p>Contacto: ${esc(dest.contact_name)}</p>`);
  if (dest.phone) lines.push(`<p>Tel: ${esc(dest.phone)}</p>`);
  if (unloadingDate) lines.push(`<p class="detail" style="margin-top:4px;font-weight:600;">Descarga: ${esc(formatDate(unloadingDate))}</p>`);
  return lines.join("");
}

function buildSignatureCell(sig: SignatureData | undefined, label: string): string {
  if (!sig) {
    return `<td><p style="color:#94a3b8;font-style:italic;font-size:8pt;">Sin firma</p></td>`;
  }
  return `<td>
    <p style="font-weight:700;font-size:9.5pt;color:#0f172a;">${esc(sig.firmante)}</p>
    <p style="font-size:8.5pt;color:#475569;">DNI: ${esc(sig.dni)}</p>
    <p style="font-size:7.5pt;color:#94a3b8;">${esc(formatDateTime(sig.fecha))}</p>
    ${sig.firma_imagen ? `<img src="${sig.firma_imagen}" alt="Firma ${esc(label)}" style="max-width:160px;max-height:70px;margin-top:6px;display:block;" />` : ""}
  </td>`;
}

function buildHtml(doc: DocumentRecord, qrDataUrl: string): string {
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

  const vehicleRows: string[] = [];
  vehicleRows.push(`<tr><th scope="row">Cabeza Tractora</th><td>${esc(c.vehicle.tractor_plate)}</td></tr>`);
  if (trailerPlate1) {
    vehicleRows.push(`<tr><th scope="row">Remolque 1</th><td>${esc(trailerPlate1)}</td></tr>`);
  }
  if (c.vehicle.trailer_plate_2) {
    vehicleRows.push(`<tr><th scope="row">Remolque 2</th><td>${esc(c.vehicle.trailer_plate_2)}</td></tr>`);
  }

  const driverName = c.driver?.name || doc.driver_name || "";
  const driverDni = c.driver?.dni || "";

  return `<!DOCTYPE html>
<html lang="es-ES">
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
    unicode-range: U+0000-024F, U+0259, U+1E00-1EFF, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
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

  header[role="banner"] {
    text-align: center;
    border-bottom: 3px solid #1e40af;
    padding-bottom: 10px;
    margin-bottom: 6px;
  }
  header h1 {
    font-size: 16pt;
    font-weight: 800;
    color: #1e40af;
    letter-spacing: 1.5px;
    margin-bottom: 2px;
  }
  header h2.subtitle {
    font-size: 8.5pt;
    color: #64748b;
    font-weight: 400;
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
  .section-heading {
    background: #1e40af;
    color: #fff;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    padding: 5px 10px;
    margin: 0;
  }
  .section-heading.green { background: #047857; }
  .section-heading.slate { background: #334155; }
  .section-heading.amber { background: #b45309; }

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

  .full-width { grid-column: 1 / -1; }

  table.vehicle-table {
    width: 100%;
    border-collapse: collapse;
  }
  table.vehicle-table th {
    font-size: 8pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    padding: 2px 10px;
    font-weight: 400;
    width: 40%;
  }
  table.vehicle-table td {
    font-family: 'Inter', monospace;
    font-weight: 600;
    font-size: 11pt;
    letter-spacing: 1px;
    color: #0f172a;
    padding: 2px 10px;
  }

  table.cargo-table {
    width: 100%;
    border-collapse: collapse;
  }
  table.cargo-table th {
    font-size: 8pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    padding: 2px 0;
    font-weight: 400;
  }
  table.cargo-table td {
    padding: 2px 0;
  }
  table.cargo-table td.cargo-desc {
    font-weight: 700;
    font-size: 10.5pt;
    color: #0f172a;
  }
  table.cargo-table td.cargo-weight {
    font-size: 13pt;
    font-weight: 800;
    color: #0f172a;
    text-align: right;
  }

  table.sig-table {
    width: 100%;
    border-collapse: collapse;
  }
  table.sig-table th {
    font-size: 8pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    padding: 10px 10px 4px;
    font-weight: 400;
    width: 50%;
    border-right: 1px solid #e2e8f0;
  }
  table.sig-table th:last-child { border-right: none; }
  table.sig-table td {
    font-size: 9pt;
    font-weight: 600;
    color: #334155;
    padding: 0 10px 30px;
    vertical-align: top;
    border-right: 1px solid #e2e8f0;
  }
  table.sig-table td:last-child { border-right: none; }

  footer[role="contentinfo"] {
    margin-top: 20px;
    text-align: center;
    font-size: 7.5pt;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
  }
  footer .brand {
    font-weight: 700;
    color: #64748b;
    letter-spacing: 2px;
  }

  @media print {
    body { background: #fff; }
    section { break-inside: avoid; }
  }
</style>
</head>
<body role="document">

<header role="banner">
  <h1>DOCUMENTO DE CONTROL</h1>
  <h2 class="subtitle">Conforme a la normativa vigente de transporte de mercanc&iacute;as por carretera</h2>
</header>

<div class="meta-row" aria-label="Identificaci&oacute;n del documento">
  <span>DOC-${esc(docId)}</span>
  <span>${c.driver?.name ? `Conductor: ${esc(c.driver.name)} &middot; ` : ""}Generado: ${esc(formatDateTime(doc.created_at))}</span>
  ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Documento" style="width:60px;height:60px;margin-left:auto;" />` : ""}
</div>

<main role="main">
<div class="grid">

  <section class="section" aria-labelledby="sec-shipper">
    <h3 class="section-heading" id="sec-shipper">Cargador Contractual</h3>
    <div class="section-body">
      <p class="name">${esc(shipperName)}</p>
      <p class="detail">${esc(shipperNif)}</p>
      <p class="detail">${esc(shipperAddr)}</p>
      ${c.company.phone && !c.contractual_shipper ? `<p class="detail">Tel: ${esc(c.company.phone)}</p>` : ""}
    </div>
  </section>

  <section class="section" aria-labelledby="sec-carrier">
    <h3 class="section-heading" id="sec-carrier">Transportista Efectivo</h3>
    <div class="section-body">
      <p class="name">${esc(c.company.name)}</p>
      <p class="detail">CIF: ${esc(c.company.cif)}</p>
      <p class="detail">${esc([c.company.address, c.company.postal_code, c.company.city, c.company.province ? `(${c.company.province})` : ""].filter(Boolean).join(", "))}</p>
      ${c.company.phone ? `<p class="detail">Tel: ${esc(c.company.phone)}</p>` : ""}
    </div>
  </section>

  <section class="section" aria-labelledby="sec-origin">
    <h3 class="section-heading green" id="sec-origin">Origen</h3>
    <div class="section-body">
      ${buildOriginBlock(c.origin)}
      <p class="detail" style="margin-top:4px;font-weight:600;">Salida: ${esc(formatDate(doc.departure_date))}</p>
    </div>
  </section>

  <section class="section" aria-labelledby="sec-dest">
    <h3 class="section-heading green" id="sec-dest">Destino</h3>
    <div class="section-body">
      ${buildDestinationBlock(c.destination, c.unloading_date)}
    </div>
  </section>

  <section class="section full-width" aria-labelledby="sec-vehicle">
    <h3 class="section-heading slate" id="sec-vehicle">Veh&iacute;culo</h3>
    <div class="section-body">
      <table class="vehicle-table" aria-label="Matr&iacute;culas del veh&iacute;culo">
        <tbody>
          ${vehicleRows.join("\n          ")}
        </tbody>
      </table>
    </div>
  </section>

  ${driverName ? `<section class="section full-width" aria-labelledby="sec-driver">
    <h3 class="section-heading slate" id="sec-driver">Conductor</h3>
    <div class="section-body">
      <table class="vehicle-table" aria-label="Datos del conductor">
        <tbody>
          <tr><th scope="row">Nombre</th><td>${esc(driverName)}</td></tr>
          ${driverDni ? `<tr><th scope="row">DNI</th><td>${esc(driverDni)}</td></tr>` : ""}
        </tbody>
      </table>
    </div>
  </section>` : ""}

  <section class="section full-width" aria-labelledby="sec-cargo">
    <h3 class="section-heading amber" id="sec-cargo">Mercanc&iacute;a</h3>
    <div class="section-body">
      <table class="cargo-table" aria-label="Datos de la mercanc&iacute;a">
        <thead>
          <tr>
            <th scope="col">Descripci&oacute;n</th>
            ${c.cargo.packages != null && c.cargo.packages > 0 ? `<th scope="col">Bultos</th>` : ""}
            <th scope="col" style="text-align:right;">Peso bruto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="cargo-desc">${esc(c.cargo.description)}</td>
            ${c.cargo.packages != null && c.cargo.packages > 0 ? `<td>${c.cargo.packages}</td>` : ""}
            <td class="cargo-weight">${formatWeight(c.cargo.weight_kg)} kg</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

</div>

</main>

<footer role="contentinfo">
  <p>Este documento ha sido generado digitalmente &mdash; <span class="brand">DOKO</span></p>
  <p>Formato PDF/A &middot; V&aacute;lido para archivo y cumplimiento normativo</p>
</footer>

</body>
</html>`;
}

function buildMetadataJson(doc: DocumentRecord): string {
  const docId = doc.id.substring(0, 8).toUpperCase();
  return JSON.stringify({
    "dc:title": `Documento de Control DOC-${docId}`,
    "dc:creator": ["DOKO - Sistema de Control de Transporte"],
    "dc:description": "Documento de control de transporte de mercancias",
    "dc:language": "es-ES",
    "dc:subject": "Documento de control de transporte de mercancias por carretera",
    "dc:date": new Date(doc.created_at).toISOString(),
    "pdf:Producer": "DOKO - Sistema de Control de Transporte",
    "Marked": true,
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
  formData.append("generateTaggedPDF", "true");

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

async function convertToPdfA(pdfBytes: ArrayBuffer): Promise<ArrayBuffer> {
  const convertApiToken = Deno.env.get("CONVERTAPI_TOKEN");
  if (!convertApiToken) {
    throw new Error("CONVERTAPI_TOKEN environment variable is not set");
  }

  const formData = new FormData();
  const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
  formData.append("File", pdfBlob, "document.pdf");
  formData.append("PdfaVersion", "PdfA1a");

  const response = await fetch("https://v2.convertapi.com/convert/pdf/to/pdfa", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${convertApiToken}`,
    },
    body: formData,
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ConvertAPI error: status=${response.status} body=${errorText.substring(0, 500)}`
    );
  }

  const result = await response.json();
  const file = result.Files?.[0];

  if (!file) {
    const keys = Object.keys(result).join(", ");
    throw new Error(`ConvertAPI response has no Files array. Keys: ${keys}`);
  }

  if (file.FileData) {
    const binaryString = atob(file.FileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  if (file.Url) {
    console.log("FileData absent, downloading from ConvertAPI Url...");
    const downloadResp = await fetch(file.Url, { signal: AbortSignal.timeout(30000) });
    if (!downloadResp.ok) {
      throw new Error(`Failed to download PDF/A from ConvertAPI Url: status=${downloadResp.status}`);
    }
    return await downloadResp.arrayBuffer();
  }

  const fileKeys = Object.keys(file).join(", ");
  throw new Error(`ConvertAPI file has neither FileData nor Url. Keys: ${fileKeys}`);
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

    const originalFileName = `${doc.id}_original.pdf`;
    const { data: origUrlData } = supabase.storage
      .from("document-pdfs")
      .getPublicUrl(originalFileName);

    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(origUrlData.publicUrl, { width: 120, margin: 1 });
    } catch (qrErr) {
      console.error("QR generation failed:", qrErr);
    }

    const html = buildHtml(doc, qrDataUrl);

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

    const { error: origUploadError } = await supabase.storage
      .from("document-pdfs")
      .upload(originalFileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (origUploadError) {
      return new Response(
        JSON.stringify({ error: "Failed to upload original PDF", details: origUploadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let pdfaUrl: string | null = null;
    let pdfaError: string | null = null;

    try {
      console.log("Starting PDF/A conversion...");
      const pdfaBytes = await convertToPdfA(pdfBytes);
      console.log(`PDF/A conversion done, size: ${pdfaBytes.byteLength} bytes`);

      const pdfaHeader = new Uint8Array(pdfaBytes.slice(0, 5));
      const pdfaHeaderStr = String.fromCharCode(...pdfaHeader);
      if (pdfaHeaderStr !== "%PDF-") {
        throw new Error(`Converted file is not a valid PDF (header: ${pdfaHeaderStr})`);
      }

      const pdfaFileName = `converted/${doc.id}.pdf`;
      const { error: pdfaUploadError } = await supabase.storage
        .from("document-pdfs")
        .upload(pdfaFileName, pdfaBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (pdfaUploadError) {
        throw new Error(`Storage upload failed: ${pdfaUploadError.message}`);
      }

      const { data: pdfaUrlData } = supabase.storage
        .from("document-pdfs")
        .getPublicUrl(pdfaFileName);

      pdfaUrl = pdfaUrlData.publicUrl;
      console.log("PDF/A uploaded successfully:", pdfaUrl);
    } catch (convError) {
      pdfaError = convError instanceof Error ? convError.message : String(convError);
      console.error("PDF/A-1a conversion failed:", pdfaError);
    }

    const dbUpdate: Record<string, string> = {
      pdf_original_url: origUrlData.publicUrl,
    };
    if (pdfaUrl) {
      dbUpdate.pdf_url = pdfaUrl;
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update(dbUpdate)
      .eq("id", documentId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update document with PDF URLs", details: updateError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdf_original_url: origUrlData.publicUrl,
        pdf_url: pdfaUrl,
        pdfa_conversion_failed: pdfaUrl === null,
        pdfa_error: pdfaError,
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
