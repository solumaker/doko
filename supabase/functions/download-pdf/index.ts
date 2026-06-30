import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const documentId = url.searchParams.get("id");

  if (!documentId) {
    return new Response("Documento no especificado", {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, pdf_url, pdf_original_url")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !doc) {
    return new Response("Documento no encontrado", {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const pdfUrl = doc.pdf_url || doc.pdf_original_url;
  if (!pdfUrl) {
    return new Response("El PDF de este documento aun no esta disponible", {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Extract the storage path from the public URL
  // URL format: https://<ref>.supabase.co/storage/v1/object/public/document-pdfs/<path>
  const bucketPrefix = "/storage/v1/object/public/document-pdfs/";
  const parsedUrl = new URL(pdfUrl);
  const pathIndex = parsedUrl.pathname.indexOf(bucketPrefix);

  if (pathIndex === -1) {
    return new Response("URL de PDF invalida", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const storagePath = decodeURIComponent(
    parsedUrl.pathname.slice(pathIndex + bucketPrefix.length)
  );

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("document-pdfs")
    .download(storagePath);

  if (downloadError || !fileData) {
    return new Response("No se pudo descargar el PDF", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const filename = `DOC-${doc.id.toUpperCase().slice(0, 8)}.pdf`;

  return new Response(fileData, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
});
