import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import QRCode from "npm:qrcode@1.5.3";
import { DOKO_HEADER_BASE64 } from "./logo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    weight_unit?: string;
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
  observations?: string;
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

// Colors
const TEAL = rgb(0.02, 0.47, 0.55);
const DARK_TEAL = rgb(0.01, 0.35, 0.42);
const EMERALD = rgb(0.01, 0.47, 0.35);
const SLATE_DARK = rgb(0.13, 0.16, 0.22);
const SLATE_MED = rgb(0.28, 0.33, 0.42);
const SLATE_LIGHT = rgb(0.58, 0.64, 0.72);
const AMBER = rgb(0.7, 0.33, 0.04);
const WHITE = rgb(1, 1, 1);
const LIGHT_BG = rgb(0.97, 0.98, 0.99);
const BORDER_GRAY = rgb(0.88, 0.9, 0.92);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 45;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })} ${d.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })}`;
}

function formatWeight(kg: number): string {
  return kg.toLocaleString("es-ES");
}

const WEIGHT_UNIT_SHORT: Record<string, string> = {
  kilogramos: "kg",
  toneladas: "tn",
  "metros cubicos": "m3",
  litros: "L",
  unidades: "u",
};

function weightUnitShort(unit?: string): string {
  if (!unit) return "kg";
  return WEIGHT_UNIT_SHORT[unit] || unit;
}

function getOriginText(origin: DocumentContent["origin"]): string[] {
  const lines: string[] = [];
  if (origin.empresa) lines.push(origin.empresa);
  if (origin.domicilio) {
    lines.push(origin.domicilio);
    if (origin.poblacion) lines.push(origin.poblacion);
    return lines;
  }
  if (origin.name) lines.push(origin.name);
  if (origin.address) lines.push(origin.address);
  const loc = [origin.postal_code, origin.city, origin.province ? `(${origin.province})` : ""].filter(Boolean).join(" ");
  if (loc.trim()) lines.push(loc);
  if (origin.contact_name) lines.push(`Contacto: ${origin.contact_name}`);
  if (origin.phone) lines.push(`Tel: ${origin.phone}`);
  return lines;
}

function getDestinationText(dest: DocumentContent["destination"]): string[] {
  const lines: string[] = [];
  if (dest.empresa) lines.push(dest.empresa);
  if (dest.domicilio) {
    lines.push(dest.domicilio);
    if (dest.poblacion) lines.push(dest.poblacion);
    return lines;
  }
  if (dest.name) lines.push(dest.name);
  if (dest.address) lines.push(dest.address);
  const loc = [dest.postal_code, dest.city, dest.province ? `(${dest.province})` : ""].filter(Boolean).join(" ");
  if (loc.trim()) lines.push(loc);
  if (dest.contact_name) lines.push(`Contacto: ${dest.contact_name}`);
  if (dest.phone) lines.push(`Tel: ${dest.phone}`);
  return lines;
}

function drawSection(
  page: ReturnType<typeof PDFDocument.prototype.addPage>,
  x: number,
  y: number,
  w: number,
  title: string,
  accentColor: ReturnType<typeof rgb>,
  lines: { text: string; bold?: boolean; size?: number }[],
  fontRegular: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  fontBold: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
): number {
  const headerH = 20;
  const lineHeight = 14;
  const padding = 10;
  const bodyH = lines.length * lineHeight + padding * 2;
  const totalH = headerH + bodyH;

  // Section background
  page.drawRectangle({ x, y: y - totalH, width: w, height: totalH, color: WHITE });
  // Border
  page.drawRectangle({ x, y: y - totalH, width: w, height: totalH, borderColor: BORDER_GRAY, borderWidth: 1 });
  // Header bar
  page.drawRectangle({ x, y: y - headerH, width: w, height: headerH, color: accentColor });
  // Header text (centered, regular weight)
  const titleW = fontRegular.widthOfTextAtSize(title.toUpperCase(), 7.5);
  page.drawText(title.toUpperCase(), {
    x: x + (w - titleW) / 2,
    y: y - headerH + 6,
    size: 7.5,
    font: fontRegular,
    color: WHITE,
  });

  // Body lines
  let lineY = y - headerH - padding - 10;
  for (const line of lines) {
    const font = line.bold ? fontBold : fontRegular;
    const size = line.size || 9;
    page.drawText(line.text, {
      x: x + padding,
      y: lineY,
      size,
      font,
      color: line.bold ? SLATE_DARK : SLATE_MED,
      maxWidth: w - padding * 2,
    });
    lineY -= lineHeight;
  }

  return totalH;
}

async function generatePdf(doc: DocumentRecord, qrPngBytes: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const c = doc.content;
  const docId = doc.id.substring(0, 8).toUpperCase();

  // === HEADER BAND ===
  const headerH = 60;
  page.drawRectangle({
    x: 0, y: PAGE_H - headerH,
    width: PAGE_W, height: headerH,
    color: TEAL,
  });

  // Logo
  let logoEndX = MARGIN_X;
  try {
    const logoBytes = Uint8Array.from(atob(DOKO_HEADER_BASE64), (ch) => ch.charCodeAt(0));
    const logoImg = await pdfDoc.embedJpg(logoBytes);
    const logoDims = logoImg.scaleToFit(130, 40);
    page.drawImage(logoImg, {
      x: MARGIN_X,
      y: PAGE_H - headerH + (headerH - logoDims.height) / 2,
      width: logoDims.width,
      height: logoDims.height,
    });
    logoEndX = MARGIN_X + logoDims.width + 15;
  } catch (e) {
    console.error("Logo embed failed:", e);
  }

  // Title
  page.drawText("DOCUMENTO DE CONTROL", {
    x: logoEndX,
    y: PAGE_H - 30,
    size: 16,
    font: fontBold,
    color: WHITE,
  });
  page.drawText("Transporte de mercancias por carretera", {
    x: logoEndX,
    y: PAGE_H - 45,
    size: 8,
    font: fontRegular,
    color: rgb(0.8, 0.92, 0.95),
  });

  // Doc ID badge (right)
  const idText = `DOC-${docId}`;
  const idWidth = fontBold.widthOfTextAtSize(idText, 10);
  page.drawRectangle({
    x: PAGE_W - MARGIN_X - idWidth - 16,
    y: PAGE_H - 40,
    width: idWidth + 16,
    height: 20,
    color: DARK_TEAL,
  });
  page.drawText(idText, {
    x: PAGE_W - MARGIN_X - idWidth - 8,
    y: PAGE_H - 35,
    size: 10,
    font: fontBold,
    color: WHITE,
  });

  // === META ROW ===
  let cursorY = PAGE_H - headerH - 18;
  const driverName = c.driver?.name || doc.driver_name || "";
  const metaLeft = `Salida: ${formatDate(doc.departure_date)}`;
  const metaRight = driverName ? `Conductor: ${driverName}` : `Generado: ${formatDateTime(doc.created_at)}`;

  page.drawText(metaLeft, { x: MARGIN_X, y: cursorY, size: 8, font: fontRegular, color: SLATE_LIGHT });
  const mrWidth = fontRegular.widthOfTextAtSize(metaRight, 8);
  page.drawText(metaRight, { x: PAGE_W - MARGIN_X - mrWidth, y: cursorY, size: 8, font: fontRegular, color: SLATE_LIGHT });

  cursorY -= 22;

  // === CARGADOR / TRANSPORTISTA (two columns) ===
  const colW = (CONTENT_W - 12) / 2;

  const shipperName = c.contractual_shipper?.nombre || c.company.name;
  const shipperNif = c.contractual_shipper ? `NIF: ${c.contractual_shipper.nif}` : `CIF: ${c.company.cif}`;
  const shipperAddr = c.contractual_shipper
    ? `${c.contractual_shipper.domicilio}, ${c.contractual_shipper.poblacion}`
    : `${c.company.address}, ${c.company.postal_code} ${c.company.city}`;

  const shipperLines = [
    { text: shipperName, bold: true, size: 10 },
    { text: shipperNif },
    { text: shipperAddr },
  ];

  const carrierLines = [
    { text: c.company.name, bold: true, size: 10 },
    { text: `CIF: ${c.company.cif}` },
    { text: `${c.company.address}, ${c.company.postal_code} ${c.company.city}` },
    ...(c.company.phone ? [{ text: `Tel: ${c.company.phone}` }] : []),
  ];

  const h1 = drawSection(page, MARGIN_X, cursorY, colW, "Cargador Contractual", TEAL, shipperLines, fontRegular, fontBold);
  const h2 = drawSection(page, MARGIN_X + colW + 12, cursorY, colW, "Transportista Efectivo", TEAL, carrierLines, fontRegular, fontBold);
  cursorY -= Math.max(h1, h2) + 12;

  // === ORIGEN / DESTINO (two columns) ===
  const originTextLines = getOriginText(c.origin);
  const originLines = originTextLines.map((t, i) => ({ text: t, bold: i === 0, size: i === 0 ? 10 : 9 }));
  originLines.push({ text: `Salida: ${formatDate(doc.departure_date)}`, bold: true, size: 8.5 });

  const destTextLines = getDestinationText(c.destination);
  const destLines = destTextLines.map((t, i) => ({ text: t, bold: i === 0, size: i === 0 ? 10 : 9 }));
  if (c.unloading_date) {
    destLines.push({ text: `Descarga: ${formatDate(c.unloading_date)}`, bold: true, size: 8.5 });
  }

  const h3 = drawSection(page, MARGIN_X, cursorY, colW, "Origen", EMERALD, originLines, fontRegular, fontBold);
  const h4 = drawSection(page, MARGIN_X + colW + 12, cursorY, colW, "Destino", EMERALD, destLines, fontRegular, fontBold);
  cursorY -= Math.max(h3, h4) + 12;

  // === VEHICULO (full width) ===
  const trailerPlate1 = c.vehicle.trailer_plate_1 || c.vehicle.trailer_plate || "";
  const vehicleLines: { text: string; bold?: boolean; size?: number }[] = [
    { text: `Cabeza Tractora:  ${c.vehicle.tractor_plate}`, bold: true, size: 11 },
  ];
  if (trailerPlate1) {
    vehicleLines.push({ text: `Remolque 1:  ${trailerPlate1}`, bold: true, size: 11 });
  }
  if (c.vehicle.trailer_plate_2) {
    vehicleLines.push({ text: `Remolque 2:  ${c.vehicle.trailer_plate_2}`, bold: true, size: 11 });
  }

  const h5 = drawSection(page, MARGIN_X, cursorY, CONTENT_W, "Vehiculo", SLATE_DARK, vehicleLines, fontRegular, fontBold);
  cursorY -= h5 + 12;

  // === CONDUCTOR (full width, if present) ===
  if (driverName) {
    const driverDni = c.driver?.dni || "";
    const driverLines: { text: string; bold?: boolean; size?: number }[] = [
      { text: driverName, bold: true, size: 10 },
    ];
    if (driverDni) driverLines.push({ text: `DNI: ${driverDni}` });

    const h6 = drawSection(page, MARGIN_X, cursorY, CONTENT_W, "Conductor", SLATE_DARK, driverLines, fontRegular, fontBold);
    cursorY -= h6 + 12;
  }

  // === MERCANCIA (full width) ===
  const cargoLines: { text: string; bold?: boolean; size?: number }[] = [
    { text: c.cargo.description, bold: true, size: 10 },
  ];
  if (c.cargo.packages != null && c.cargo.packages > 0) {
    cargoLines.push({ text: `Bultos: ${c.cargo.packages}` });
  }
  cargoLines.push({ text: `Peso bruto: ${formatWeight(c.cargo.weight_kg)} ${weightUnitShort(c.cargo.weight_unit)}`, bold: true, size: 12 });

  const h7 = drawSection(page, MARGIN_X, cursorY, CONTENT_W, "Mercancia", AMBER, cargoLines, fontRegular, fontBold);
  cursorY -= h7 + 30;

  // === OBSERVACIONES ===
  {
    const obsText = c.observations?.trim() || "";
    const textToShow = obsText || "No hay observaciones";
    const textColor = obsText ? SLATE_MED : SLATE_LIGHT;
    const obsPad = 10;
    const obsLineH = 13;
    const obsMaxW = CONTENT_W - obsPad * 2;
    const obsHeaderH = 20;

    // Wrap text
    const wrappedLines: string[] = [];
    for (const para of textToShow.split("\n")) {
      if (!para.trim()) { wrappedLines.push(""); continue; }
      const words = para.split(" ");
      let cur = "";
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (fontRegular.widthOfTextAtSize(test, 9) <= obsMaxW) {
          cur = test;
        } else {
          if (cur) wrappedLines.push(cur);
          cur = word;
        }
      }
      if (cur) wrappedLines.push(cur);
    }

    const bodyH = wrappedLines.length * obsLineH + obsPad * 2;
    const totalH = obsHeaderH + bodyH;

    page.drawRectangle({ x: MARGIN_X, y: cursorY - totalH, width: CONTENT_W, height: totalH, color: WHITE });
    page.drawRectangle({ x: MARGIN_X, y: cursorY - totalH, width: CONTENT_W, height: totalH, borderColor: BORDER_GRAY, borderWidth: 1 });
    page.drawRectangle({ x: MARGIN_X, y: cursorY - obsHeaderH, width: CONTENT_W, height: obsHeaderH, color: SLATE_MED });
    const obsTitleW = fontRegular.widthOfTextAtSize("OBSERVACIONES", 7.5);
    page.drawText("OBSERVACIONES", {
      x: MARGIN_X + (CONTENT_W - obsTitleW) / 2,
      y: cursorY - obsHeaderH + 6,
      size: 7.5, font: fontRegular, color: WHITE,
    });
    let obsLy = cursorY - obsHeaderH - obsPad - 10;
    for (const line of wrappedLines) {
      page.drawText(line || " ", { x: MARGIN_X + obsPad, y: obsLy, size: 9, font: fontRegular, color: textColor, maxWidth: obsMaxW });
      obsLy -= obsLineH;
    }
    cursorY -= totalH + 12;
  }

  // === QR CODE (large, centered) ===
  try {
    const qrImg = await pdfDoc.embedPng(qrPngBytes);
    const qrSize = 140;
    const qrX = (PAGE_W - qrSize) / 2;
    const qrY = cursorY - qrSize;

    // Light background behind QR
    page.drawRectangle({
      x: qrX - 12,
      y: qrY - 12,
      width: qrSize + 24,
      height: qrSize + 24,
      color: LIGHT_BG,
      borderColor: BORDER_GRAY,
      borderWidth: 1,
    });

    page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const captionText = "Escanea para verificar la autenticidad";
    const captionW = fontRegular.widthOfTextAtSize(captionText, 8);
    page.drawText(captionText, {
      x: (PAGE_W - captionW) / 2,
      y: qrY - 16,
      size: 8,
      font: fontRegular,
      color: SLATE_LIGHT,
    });

    cursorY = qrY - 35;
  } catch (e) {
    console.error("QR embed failed:", e);
  }

  // === FOOTER ===
  const footerText = "Este documento ha sido generado digitalmente — DOKO";
  const footerW = fontRegular.widthOfTextAtSize(footerText, 7.5);
  page.drawText(footerText, {
    x: (PAGE_W - footerW) / 2,
    y: 30,
    size: 7.5,
    font: fontRegular,
    color: SLATE_LIGHT,
  });

  // Set metadata
  pdfDoc.setTitle(`Documento de Control DOC-${docId}`);
  pdfDoc.setAuthor("DOKO - Sistema de Control de Transporte");
  pdfDoc.setSubject("Documento de control de transporte de mercancias por carretera");
  pdfDoc.setCreator("DOKO");
  pdfDoc.setProducer("pdf-lib");
  pdfDoc.setCreationDate(new Date(doc.created_at));

  return await pdfDoc.save();
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

    // Generate QR as PNG buffer
    let qrPngBytes = new Uint8Array(0);
    try {
      const qrBuffer = await QRCode.toBuffer(origUrlData.publicUrl, {
        width: 400,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      qrPngBytes = new Uint8Array(qrBuffer);
    } catch (qrErr) {
      console.error("QR generation failed:", qrErr);
    }

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await generatePdf(doc, qrPngBytes);
    } catch (pdfError) {
      const errorMsg = pdfError instanceof Error ? pdfError.message : String(pdfError);
      console.error("PDF generation failed:", errorMsg);
      return new Response(
        JSON.stringify({ error: "PDF generation failed", details: errorMsg }),
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

    const pdfUrl = origUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("documents")
      .update({ pdf_url: pdfUrl, pdf_original_url: pdfUrl })
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
        pdf_original_url: pdfUrl,
        pdf_url: pdfUrl,
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
