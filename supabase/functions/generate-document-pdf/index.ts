import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { jsPDF } from "npm:jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DocumentContent {
  origin: {
    name: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    contact_name: string;
    phone: string;
  };
  destination: {
    name: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    contact_name: string;
    phone: string;
  };
  vehicle: {
    tractor_plate: string;
    trailer_plate: string;
    alias: string;
  };
  cargo: {
    description: string;
    packages: number;
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

interface Document {
  id: string;
  company_id: string;
  creator_id: string;
  content: DocumentContent;
  departure_date: string;
  created_at: string;
}

async function convertToPdfA1a(pdfBytes: ArrayBuffer): Promise<ArrayBuffer> {
  const convertApiSecret = Deno.env.get("CONVERTAPI_SECRET");

  if (!convertApiSecret) {
    throw new Error("CONVERTAPI_SECRET environment variable is not set");
  }

  const formData = new FormData();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  formData.append("File", blob, "document.pdf");
  formData.append("PdfaVersion", "pdfa1a");
  formData.append("StoreFile", "true");

  const response = await fetch("https://v2.convertapi.com/convert/pdf/to/pdfa", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${convertApiSecret}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ConvertAPI error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (!result.Files || result.Files.length === 0) {
    throw new Error("ConvertAPI returned no files");
  }

  const pdfA1aUrl = result.Files[0].Url;
  const pdfA1aResponse = await fetch(pdfA1aUrl);

  if (!pdfA1aResponse.ok) {
    throw new Error(`Failed to download converted PDF/A-1a: ${pdfA1aResponse.status}`);
  }

  return await pdfA1aResponse.arrayBuffer();
}

function generatePdfDocument(doc: Document): ArrayBuffer {
  const content = doc.content;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 20;

  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("DOCUMENTO DE CONTROL DE TRANSPORTE", pageWidth / 2, y, {
    align: "center",
  });
  y += 10;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    "Conforme a la normativa vigente de transporte por carretera",
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 15;

  pdf.setFontSize(9);
  pdf.text(`Documento ID: ${doc.id.substring(0, 8).toUpperCase()}`, 20, y);
  y += 5;
  const createdDate = new Date(doc.created_at);
  pdf.text(
    `Generado: ${createdDate.toLocaleDateString("es-ES")} ${createdDate.toLocaleTimeString("es-ES")}`,
    20,
    y
  );
  y += 10;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("CARGADOR CONTRACTUAL / EXPEDIDOR", 20, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(content.company.name, 20, y);
  y += 5;
  pdf.text(`CIF: ${content.company.cif}`, 20, y);
  y += 5;
  pdf.text(
    `${content.company.address}, ${content.company.postal_code} ${content.company.city} (${content.company.province})`,
    20,
    y
  );
  y += 5;
  pdf.text(`Tel: ${content.company.phone}`, 20, y);
  y += 10;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("TRANSPORTISTA", 20, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(content.company.name, 20, y);
  y += 5;
  pdf.text(`CIF: ${content.company.cif}`, 20, y);
  y += 10;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("ORIGEN", 20, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(content.origin.name, 20, y);
  y += 5;
  pdf.text(content.origin.address, 20, y);
  y += 5;
  pdf.text(
    `${content.origin.postal_code} ${content.origin.city} (${content.origin.province})`,
    20,
    y
  );
  y += 5;
  if (content.origin.contact_name) {
    pdf.text(`Contacto: ${content.origin.contact_name}`, 20, y);
    y += 5;
  }
  if (content.origin.phone) {
    pdf.text(`Tel: ${content.origin.phone}`, 20, y);
    y += 5;
  }
  const departureDate = new Date(doc.departure_date);
  pdf.text(
    `Fecha salida: ${departureDate.toLocaleDateString("es-ES")} ${departureDate.toLocaleTimeString("es-ES")}`,
    20,
    y
  );
  y += 10;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("DESTINO", 20, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(content.destination.name, 20, y);
  y += 5;
  pdf.text(content.destination.address, 20, y);
  y += 5;
  pdf.text(
    `${content.destination.postal_code} ${content.destination.city} (${content.destination.province})`,
    20,
    y
  );
  y += 5;
  if (content.destination.contact_name) {
    pdf.text(`Contacto: ${content.destination.contact_name}`, 20, y);
    y += 5;
  }
  if (content.destination.phone) {
    pdf.text(`Tel: ${content.destination.phone}`, 20, y);
    y += 5;
  }
  y += 5;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("VEHICULO", 20, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Cabeza Tractora: ${content.vehicle.tractor_plate}`, 20, y);
  y += 5;
  if (content.vehicle.trailer_plate) {
    pdf.text(`Remolque: ${content.vehicle.trailer_plate}`, 20, y);
    y += 5;
  }
  y += 5;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("MERCANCIA", 20, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(content.cargo.description, 20, y);
  y += 5;
  pdf.text(`Bultos: ${content.cargo.packages}`, 20, y);
  y += 5;
  pdf.text(`Peso bruto: ${content.cargo.weight_kg.toLocaleString()} kg`, 20, y);
  y += 15;

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.text(
    "Este documento ha sido generado digitalmente por DOKO",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  return pdf.output("arraybuffer");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "documentId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const doc = document as Document;

    const pdfBytes = generatePdfDocument(doc);

    const pdfA1aBytes = await convertToPdfA1a(pdfBytes);

    const fileName = `${doc.id}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("document-pdfs")
      .upload(fileName, pdfA1aBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF", details: uploadError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("document-pdfs")
      .getPublicUrl(fileName);

    const pdfUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("documents")
      .update({ pdf_url: pdfUrl })
      .eq("id", documentId);

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: "Failed to update document with PDF URL",
          details: updateError,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, pdfUrl, format: "PDF/A-1a" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
