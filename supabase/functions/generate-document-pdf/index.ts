import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "npm:pdf-lib@1.17.1";
import QRCode from "npm:qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─────────────────────────────────────────────────────────────────────────
// TIPOS DE DATOS DEL DOCUMENTO (forma real guardada por la app en Supabase)
// ─────────────────────────────────────────────────────────────────────────

interface VehicleAmendment {
  tractor_plate?: string;
  trailer_plate_1?: string;
  trailer_plate_2?: string;
  amended_at: string;
}

interface DocumentFieldChange {
  field: string;
  label: string;
  old_value: string;
  new_value: string;
}

interface DocumentAmendment {
  id: string;
  reason: string;
  changes: DocumentFieldChange[];
  amended_at: string;
  amended_by?: string;
}

interface DocumentContent {
  acting_as?: "transportista" | "cargador";
  contractual_shipper?: {
    nombre: string;
    nif: string;
    domicilio: string;
    poblacion: string;
    postal_code?: string;
  };
  transportista_efectivo?: {
    nombre: string;
    nif: string;
    domicilio: string;
    poblacion: string;
    postal_code?: string;
  };
  origin: {
    empresa?: string;
    domicilio?: string;
    poblacion?: string;
    nif?: string;
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
    nif?: string;
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
    special_authorization?: string;
    amendments?: VehicleAmendment[];
  };
  cargo: {
    description: string;
    packages?: number;
    weight_kg: number;
    weight_unit?: string;
  };
  observations?: string;
  unloading_date?: string;
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
  amendments?: DocumentAmendment[];
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

// ─────────────────────────────────────────────────────────────────────────
// FORMATEO DE FECHAS / PESO (sin cambios respecto a la version anterior)
// ─────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} ${timePart}`;
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

// ─────────────────────────────────────────────────────────────────────────
// CONSTANTES DE LAYOUT (A4 en puntos) — valores tal como los da el diseño
// resuelto para DOKO_solución.pdf, no reinterpretados.
// ─────────────────────────────────────────────────────────────────────────

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const MARGIN_BOTTOM = 80;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 495.28
const COLUMN_GAP = 24;
const COLUMN_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2; // ~235.64

const BLACK = rgb(0, 0, 0);
const GRAY_TEXT = rgb(0.45, 0.45, 0.45);
const BORDER_GRAY = rgb(0.75, 0.75, 0.75);

const SIZE_TITLE = 20;
const SIZE_SECTION_DIVIDER = 11.5;
const SIZE_COLUMN_HEADER = 10;
const SIZE_BODY = 9.5;
const SIZE_FOOTER = 8;

const LINE_HEIGHT_BODY = 13;
const LINE_HEIGHT_HEADER = 16;

// ─────────────────────────────────────────────────────────────────────────
// TIPOS INTERNOS PARA EL RENDERIZADO (independientes de la forma de la DB)
// ─────────────────────────────────────────────────────────────────────────

interface Empresa {
  nombre: string;
  identificador?: string; // NIF/CIF
  direccion?: string;
  cp?: string;
  localidad?: string;
}

interface Amendment {
  date: string;
  reason: string;
  changes?: string;
}

interface ControlDocumentData {
  cargador: Empresa;
  transportista: Empresa;
  origen: Empresa;
  destino: Empresa;
  mercancia: {
    descripcion: string;
    pesoBruto: string;
    autorizacionEspecial?: string;
  };
  fechas: { carga: string; descarga?: string };
  matriculas: { tractora?: string; remolque1?: string; remolque2?: string };
  observations?: string;
  amendments?: Amendment[];
  generatedAt: string;
  verificationUrl: string;
}

// ─────────────────────────────────────────────────────────────────────────
// ADAPTACION: DocumentRecord (dato real de Supabase) -> ControlDocumentData
// ─────────────────────────────────────────────────────────────────────────

function resolveContractualShipper(c: DocumentContent): Empresa {
  const s = c.contractual_shipper;
  return {
    nombre: s?.nombre || "",
    identificador: s?.nif || "",
    direccion: s?.domicilio || "",
    cp: s?.postal_code || "",
    localidad: s?.poblacion || "",
  };
}

function resolveTransportistaEfectivo(c: DocumentContent): Empresa {
  // Documentos creados antes de soportar el rol "cargador" no guardan
  // transportista_efectivo; en ese caso la propia empresa era el transportista.
  if (c.transportista_efectivo) {
    const t = c.transportista_efectivo;
    return {
      nombre: t.nombre || "",
      identificador: t.nif || "",
      direccion: t.domicilio || "",
      cp: t.postal_code || "",
      localidad: t.poblacion || "",
    };
  }
  return {
    nombre: c.company?.name || "",
    identificador: c.company?.cif || "",
    direccion: c.company?.address || "",
    cp: c.company?.postal_code || "",
    localidad: c.company?.city || "",
  };
}

function resolveLocation(loc: DocumentContent["origin"] | DocumentContent["destination"]): Empresa {
  return {
    nombre: loc.empresa || loc.name || "",
    direccion: loc.domicilio || loc.address || "",
    cp: loc.postal_code || "",
    localidad: loc.poblacion || loc.city || "",
  };
}

function toControlDocumentData(doc: DocumentRecord, verificationUrl: string): ControlDocumentData {
  const c = doc.content;

  const amendments: Amendment[] | undefined = c.amendments?.map((a) => ({
    date: `${formatDateTime(a.amended_at)}${a.amended_by ? ` — ${a.amended_by}` : ""}`,
    reason: a.reason || "",
    changes: (a.changes || [])
      .map((ch) => `${ch.label}: ${ch.old_value || "(vacio)"} -> ${ch.new_value || "(vacio)"}`)
      .join("\n"),
  }));

  return {
    cargador: resolveContractualShipper(c),
    transportista: resolveTransportistaEfectivo(c),
    origen: resolveLocation(c.origin),
    destino: resolveLocation(c.destination),
    mercancia: {
      descripcion: c.cargo.description || "",
      pesoBruto: `${formatWeight(c.cargo.weight_kg)} ${weightUnitShort(c.cargo.weight_unit)}`,
      autorizacionEspecial: hasValue(c.vehicle.special_authorization)
        ? c.vehicle.special_authorization!.trim()
        : "No requiere autorización especial",
    },
    fechas: {
      carga: formatDate(doc.departure_date),
      descarga: c.unloading_date ? formatDate(c.unloading_date) : undefined,
    },
    matriculas: {
      tractora: c.vehicle.tractor_plate || "",
      remolque1: c.vehicle.trailer_plate_1 || c.vehicle.trailer_plate || "",
      remolque2: c.vehicle.trailer_plate_2 || "",
    },
    observations: c.observations,
    amendments,
    generatedAt: formatDateTime(new Date().toISOString()),
    verificationUrl,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// HELPERS DE TEXTO
// ─────────────────────────────────────────────────────────────────────────

/**
 * Rompe una palabra/token que por si solo ya excede maxWidth (por ejemplo un
 * texto pegado sin espacios) en trozos que si caben, caracter a caracter.
 */
function breakLongToken(token: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const ch of token) {
    const test = current + ch;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current !== "") {
      chunks.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current !== "") chunks.push(current);

  return chunks;
}

/** Divide un texto en lineas que caben en maxWidth, midiendo con la fuente real. */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
        continue;
      }

      if (currentLine !== "") lines.push(currentLine);

      // La palabra sola (sin nada delante) tambien excede el ancho: no hay
      // ningun espacio donde partirla, asi que se rompe caracter a caracter
      // para que nunca se salga del margen de la pagina.
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        const chunks = breakLongToken(word, font, fontSize, maxWidth);
        for (let i = 0; i < chunks.length - 1; i++) lines.push(chunks[i]);
        currentLine = chunks[chunks.length - 1] ?? "";
      } else {
        currentLine = word;
      }
    }
    if (currentLine !== "") lines.push(currentLine);
  }

  return lines;
}

/** Devuelve true si el valor tiene contenido real (no vacio/null/undefined). */
function hasValue(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

// ─────────────────────────────────────────────────────────────────────────
// PAGINACION
// ─────────────────────────────────────────────────────────────────────────

interface Cursor {
  page: PDFPage;
  y: number;
}

function checkPageBreak(
  pdfDoc: PDFDocument,
  cursor: Cursor,
  neededHeight: number,
): Cursor {
  if (cursor.y - neededHeight < MARGIN_BOTTOM) {
    const newPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    return { page: newPage, y: PAGE_HEIGHT - MARGIN };
  }
  return cursor;
}

// ─────────────────────────────────────────────────────────────────────────
// BLOQUES DE DIBUJO
// ─────────────────────────────────────────────────────────────────────────

/** Caja con borde fino y texto centrado en mayusculas (separador de seccion). */
function drawSectionDivider(cursor: Cursor, text: string, font: PDFFont): Cursor {
  const boxHeight = 22;
  const textWidth = font.widthOfTextAtSize(text, SIZE_SECTION_DIVIDER);
  const boxWidth = textWidth + 40;
  const boxX = PAGE_WIDTH / 2 - boxWidth / 2;
  const boxY = cursor.y - boxHeight;

  cursor.page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    borderColor: BORDER_GRAY,
    borderWidth: 1,
  });

  cursor.page.drawText(text, {
    x: PAGE_WIDTH / 2 - textWidth / 2,
    y: boxY + boxHeight / 2 - SIZE_SECTION_DIVIDER / 2 + 1,
    size: SIZE_SECTION_DIVIDER,
    font,
    color: BLACK,
  });

  return { page: cursor.page, y: boxY - 18 };
}

/** Dibuja una columna (cabecera en negrita + lineas de texto) y devuelve la altura consumida. */
function drawColumn(
  page: PDFPage,
  x: number,
  startY: number,
  header: string,
  lines: (string | undefined)[],
  fontBold: PDFFont,
  fontRegular: PDFFont,
  maxWidth: number,
): number {
  let y = startY;

  page.drawText(header, { x, y, size: SIZE_COLUMN_HEADER, font: fontBold, color: BLACK });
  y -= LINE_HEIGHT_HEADER;

  for (const line of lines) {
    if (!hasValue(line)) continue;
    const wrapped = wrapText(line, fontRegular, SIZE_BODY, maxWidth);
    for (const wLine of wrapped) {
      page.drawText(wLine, { x, y, size: SIZE_BODY, font: fontRegular, color: BLACK });
      y -= LINE_HEIGHT_BODY;
    }
  }

  return startY - y; // altura total consumida por esta columna
}

/**
 * Dibuja una seccion de dos columnas lado a lado. Antes de dibujar, calcula
 * la altura real de cada columna (con wrapping ya aplicado) para reservar
 * el espacio correcto en la paginacion.
 */
function drawTwoColumnSection(
  pdfDoc: PDFDocument,
  cursor: Cursor,
  left: { header: string; lines: (string | undefined)[] },
  right: { header: string; lines: (string | undefined)[] },
  fontBold: PDFFont,
  fontRegular: PDFFont,
): Cursor {
  // Altura estimada = la mayor de las dos columnas, calculada con un dry-run
  // de wrapText (sin dibujar) para decidir si hace falta salto de pagina.
  const estimate = (lines: (string | undefined)[]) => {
    let lineCount = 1; // cabecera
    for (const line of lines) {
      if (!hasValue(line)) continue;
      lineCount += wrapText(line, fontRegular, SIZE_BODY, COLUMN_WIDTH).length;
    }
    return LINE_HEIGHT_HEADER + lineCount * LINE_HEIGHT_BODY;
  };

  const neededHeight = Math.max(estimate(left.lines), estimate(right.lines));
  cursor = checkPageBreak(pdfDoc, cursor, neededHeight);

  const leftHeight = drawColumn(
    cursor.page, MARGIN, cursor.y, left.header, left.lines, fontBold, fontRegular, COLUMN_WIDTH,
  );
  const rightHeight = drawColumn(
    cursor.page, MARGIN + COLUMN_WIDTH + COLUMN_GAP, cursor.y, right.header, right.lines,
    fontBold, fontRegular, COLUMN_WIDTH,
  );

  return { page: cursor.page, y: cursor.y - Math.max(leftHeight, rightHeight) - 18 };
}

/** Bloque OBSERVACIONES / motivo de modificacion: titulo + texto largo con wrap real. */
function drawWrappedBlock(
  pdfDoc: PDFDocument,
  cursor: Cursor,
  title: string,
  body: string,
  fontBold: PDFFont,
  fontRegular: PDFFont,
): Cursor {
  const wrapped = wrapText(body, fontRegular, SIZE_BODY, CONTENT_WIDTH);
  const titleHeight = LINE_HEIGHT_HEADER;
  const neededHeight = titleHeight + wrapped.length * LINE_HEIGHT_BODY;

  cursor = checkPageBreak(pdfDoc, cursor, neededHeight);

  cursor.page.drawText(title, {
    x: MARGIN, y: cursor.y, size: SIZE_COLUMN_HEADER, font: fontBold, color: BLACK,
  });
  let y = cursor.y - titleHeight;

  for (const line of wrapped) {
    cursor = checkPageBreak(pdfDoc, { page: cursor.page, y }, LINE_HEIGHT_BODY);
    y = cursor.y;
    cursor.page.drawText(line, {
      x: MARGIN, y, size: SIZE_BODY, font: fontRegular, color: BLACK,
    });
    y -= LINE_HEIGHT_BODY;
  }

  return { page: cursor.page, y: y - 12 };
}

// ─────────────────────────────────────────────────────────────────────────
// GENERADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────

async function generatePdf(doc: DocumentRecord, verificationUrl: string): Promise<Uint8Array> {
  const data = toControlDocumentData(doc, verificationUrl);

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let cursor: Cursor = {
    page: pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
  };

  // ── Bloque 1: Titulo ──────────────────────────────────────────────────
  const titleText = "DOCUMENTO DE CONTROL";
  const titleWidth = fontBold.widthOfTextAtSize(titleText, SIZE_TITLE);
  cursor.page.drawText(titleText, {
    x: PAGE_WIDTH / 2 - titleWidth / 2,
    y: cursor.y,
    size: SIZE_TITLE,
    font: fontBold,
    color: BLACK,
  });
  cursor.y -= 26;

  // ── Bloque 2: Separador "DATOS FACILITADOS POR EL CARGADOR CONTRACTUAL" ─
  cursor = drawSectionDivider(cursor, "DATOS FACILITADOS POR EL CARGADOR CONTRACTUAL", fontRegular);

  // ── Cargador / Transportista (dos columnas) ─────────────────────────────
  cursor = drawTwoColumnSection(
    pdfDoc,
    cursor,
    {
      header: "CARGADOR CONTRACTUAL",
      lines: [
        data.cargador.nombre,
        data.cargador.identificador,
        data.cargador.direccion,
        [data.cargador.cp, data.cargador.localidad].filter(hasValue).join(" "),
      ],
    },
    {
      header: "TRANSPORTISTA EFECTIVO",
      lines: [
        data.transportista.nombre,
        data.transportista.identificador,
        data.transportista.direccion,
        [data.transportista.cp, data.transportista.localidad].filter(hasValue).join(" "),
      ],
    },
    fontBold,
    fontRegular,
  );

  // ── Bloque 3: Origen / Destino (dos columnas) ───────────────────────────
  cursor = drawTwoColumnSection(
    pdfDoc,
    cursor,
    {
      header: "ORIGEN",
      lines: [
        data.origen.nombre,
        data.origen.direccion,
        [data.origen.cp, data.origen.localidad].filter(hasValue).join(" "),
      ],
    },
    {
      header: "DESTINO",
      lines: [
        data.destino.nombre,
        data.destino.direccion,
        [data.destino.cp, data.destino.localidad].filter(hasValue).join(" "),
      ],
    },
    fontBold,
    fontRegular,
  );

  // ── Bloque 4: Mercancia (ancho completo) ────────────────────────────────
  {
    const lines = [
      data.mercancia.descripcion,
      hasValue(data.mercancia.pesoBruto) ? `Peso bruto: ${data.mercancia.pesoBruto}` : undefined,
      data.mercancia.autorizacionEspecial,
    ];
    const estimateHeight = LINE_HEIGHT_HEADER + lines.filter(hasValue).length * LINE_HEIGHT_BODY;
    cursor = checkPageBreak(pdfDoc, cursor, estimateHeight);
    const consumed = drawColumn(
      cursor.page, MARGIN, cursor.y, "MERCANCÍA", lines, fontBold, fontRegular, CONTENT_WIDTH,
    );
    cursor.y -= consumed + 8;
  }

  // ── Bloque 5: Separador "DATOS FACILITADOS POR EL TRANSPORTISTA EFECTIVO" ─
  cursor = drawSectionDivider(cursor, "DATOS FACILITADOS POR EL TRANSPORTISTA EFECTIVO", fontRegular);

  // ── Bloque 6: Fechas / Matriculas (dos columnas) ────────────────────────
  cursor = drawTwoColumnSection(
    pdfDoc,
    cursor,
    {
      header: "FECHAS DE REALIZACIÓN",
      lines: [
        `Carga: ${data.fechas.carga}`,
        hasValue(data.fechas.descarga) ? `Descarga: ${data.fechas.descarga}` : undefined,
      ],
    },
    {
      // Las matriculas siempre muestran la etiqueta, aunque el valor este vacio
      header: "MATRÍCULAS",
      lines: [
        `Cabeza tractora: ${data.matriculas.tractora ?? ""}`,
        `Remolque: ${data.matriculas.remolque1 ?? ""}`,
        `Remolque 2: ${data.matriculas.remolque2 ?? ""}`,
      ],
    },
    fontBold,
    fontRegular,
  );

  // ── Bloque 7: linea separadora fina ─────────────────────────────────────
  cursor = checkPageBreak(pdfDoc, cursor, 20);
  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y },
    end: { x: PAGE_WIDTH - MARGIN, y: cursor.y },
    thickness: 0.5,
    color: BORDER_GRAY,
  });
  cursor.y -= 24;

  // ── Bloque 8: Observaciones (solo si hay contenido) ─────────────────────
  if (hasValue(data.observations)) {
    cursor = drawWrappedBlock(pdfDoc, cursor, "OBSERVACIONES", data.observations!, fontBold, fontRegular);
  }

  // ── Bloque 9: Historial de modificaciones (si existen) ──────────────────
  if (data.amendments && data.amendments.length > 0) {
    // Separador fino entre OBSERVACIONES (si la hubo) e HISTORIAL DE MODIFICACIONES
    cursor = checkPageBreak(pdfDoc, cursor, 20);
    cursor.page.drawLine({
      start: { x: MARGIN, y: cursor.y },
      end: { x: PAGE_WIDTH - MARGIN, y: cursor.y },
      thickness: 0.5,
      color: BORDER_GRAY,
    });
    cursor.y -= 24;

    cursor = checkPageBreak(pdfDoc, cursor, 20);
    cursor.page.drawText("HISTORIAL DE MODIFICACIONES", {
      x: MARGIN, y: cursor.y, size: SIZE_COLUMN_HEADER, font: fontBold, color: BLACK,
    });
    cursor.y -= LINE_HEIGHT_HEADER;

    for (const amendment of data.amendments) {
      cursor = checkPageBreak(pdfDoc, cursor, LINE_HEIGHT_BODY);
      cursor.page.drawText(amendment.date, {
        x: MARGIN, y: cursor.y, size: SIZE_BODY, font: fontBold, color: BLACK,
      });
      cursor.y -= LINE_HEIGHT_BODY;

      if (hasValue(amendment.changes)) {
        cursor = drawWrappedBlock(pdfDoc, cursor, "Cambios:", amendment.changes!, fontBold, fontRegular);
      }

      cursor = drawWrappedBlock(pdfDoc, cursor, "Motivo:", amendment.reason, fontBold, fontRegular);
    }
  }

  // ── Bloque 10: Pie (QR + fecha de generacion + linea + texto legal) ─────
  {
    const qrSize = 90;
    const footerY = MARGIN_BOTTOM - 10;
    cursor = checkPageBreak(pdfDoc, cursor, footerY + qrSize + 30 - MARGIN_BOTTOM);
    // En la practica el pie se fija siempre cerca de MARGIN_BOTTOM en la ultima pagina

    const qrPngBytes = await QRCode.toBuffer(data.verificationUrl, { type: "png", margin: 0 });
    const qrImage = await pdfDoc.embedPng(qrPngBytes);

    const qrX = PAGE_WIDTH - MARGIN - qrSize;
    const qrY = footerY;

    cursor.page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const label = "Fecha de generación del documento:";
    const labelWidth = fontRegular.widthOfTextAtSize(label, SIZE_FOOTER);
    const dateWidth = fontBold.widthOfTextAtSize(data.generatedAt, SIZE_FOOTER + 1);

    const dateY = qrY + 4; // linea inferior, alineada con la base del QR
    const labelY = dateY + (SIZE_FOOTER + 5); // linea superior, justo encima de la fecha

    cursor.page.drawText(label, {
      x: qrX - labelWidth - 16,
      y: labelY,
      size: SIZE_FOOTER,
      font: fontRegular,
      color: GRAY_TEXT,
    });

    cursor.page.drawText(data.generatedAt, {
      x: qrX - dateWidth - 16,
      y: dateY,
      size: SIZE_FOOTER + 1,
      font: fontBold,
      color: BLACK,
    });

    cursor.page.drawLine({
      start: { x: MARGIN, y: MARGIN_BOTTOM - 30 },
      end: { x: PAGE_WIDTH - MARGIN, y: MARGIN_BOTTOM - 30 },
      thickness: 0.5,
      color: BORDER_GRAY,
    });

    const legalText = "Este documento ha sido generado digitalmente — DOKO";
    const legalWidth = fontRegular.widthOfTextAtSize(legalText, SIZE_FOOTER);
    cursor.page.drawText(legalText, {
      x: PAGE_WIDTH / 2 - legalWidth / 2,
      y: MARGIN_BOTTOM - 45,
      size: SIZE_FOOTER,
      font: fontRegular,
      color: GRAY_TEXT,
    });
  }

  // Metadata del PDF
  const docId = doc.id.substring(0, 8).toUpperCase();
  pdfDoc.setTitle(`Documento de Control DOC-${docId}`);
  pdfDoc.setAuthor("DOKO - Sistema de Control de Transporte");
  pdfDoc.setSubject("Documento de control de transporte de mercancias por carretera");
  pdfDoc.setCreator("DOKO");
  pdfDoc.setProducer("pdf-lib");
  pdfDoc.setCreationDate(new Date(doc.created_at));

  return pdfDoc.save();
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

    // El QR apunta a la funcion download-pdf para forzar la descarga con el nombre correcto
    const qrTargetUrl = `${supabaseUrl}/functions/v1/download-pdf?id=${doc.id}`;

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await generatePdf(doc, qrTargetUrl);
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
        // El archivo se sobrescribe en la misma ruta en cada regeneracion
        // (tras firmar/modificar): sin esto, Supabase Storage cachearia la
        // version anterior durante 1h y el visor/QR mostrarian el PDF viejo.
        cacheControl: "0",
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
