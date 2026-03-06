import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAdminProfile(
  adminClient: ReturnType<typeof createClient>,
  req: Request
) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") return null;
  return profile;
}

async function handleInfo(
  adminClient: ReturnType<typeof createClient>,
  body: { access_token: string }
) {
  const { access_token } = body;
  if (!access_token) {
    return jsonResponse({ error: "access_token is required" }, 400);
  }

  const { data: link } = await adminClient
    .from("driver_company_links")
    .select("driver_id, company_id, is_active")
    .eq("access_token", access_token)
    .maybeSingle();

  if (!link) {
    return jsonResponse({ error: "Enlace no encontrado" }, 404);
  }

  const { data: driver } = await adminClient
    .from("profiles")
    .select("full_name")
    .eq("id", link.driver_id)
    .maybeSingle();

  const { data: company } = await adminClient
    .from("companies")
    .select("name")
    .eq("id", link.company_id)
    .maybeSingle();

  return jsonResponse({
    driver_name: driver?.full_name || "",
    company_name: company?.name || "",
    is_active: link.is_active,
  });
}

async function handleLogin(
  adminClient: ReturnType<typeof createClient>,
  body: { access_token: string; pin: string }
) {
  const { access_token, pin } = body;
  if (!access_token || !pin) {
    return jsonResponse(
      { error: "access_token and pin are required" },
      400
    );
  }

  const { data: linkRows, error: verifyError } = await adminClient.rpc(
    "verify_driver_pin",
    { p_access_token: access_token, p_pin: pin }
  );

  if (verifyError || !linkRows || linkRows.length === 0) {
    return jsonResponse({ error: "PIN incorrecto o enlace inactivo" }, 401);
  }

  const link = linkRows[0];

  const { data: profile } = await adminClient
    .from("profiles")
    .select("email")
    .eq("id", link.driver_id)
    .maybeSingle();

  if (!profile) {
    return jsonResponse({ error: "Perfil de conductor no encontrado" }, 500);
  }

  await adminClient
    .from("profiles")
    .update({ company_id: link.company_id })
    .eq("id", link.driver_id);

  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });

  if (linkError || !linkData) {
    return jsonResponse({ error: "Error al generar sesion" }, 500);
  }

  return jsonResponse({
    token_hash: linkData.properties.hashed_token,
    email: profile.email,
  });
}

async function handleCreate(
  adminClient: ReturnType<typeof createClient>,
  req: Request,
  body: { full_name: string; pin: string; dni?: string }
) {
  const adminProfile = await getAdminProfile(adminClient, req);
  if (!adminProfile) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const { full_name, pin, dni } = body;
  if (!full_name || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return jsonResponse(
      { error: "Se requiere nombre y PIN de 4 digitos" },
      400
    );
  }

  const internalEmail = `driver-${crypto.randomUUID().slice(0, 12)}@doko.internal`;
  const internalPassword = crypto.randomUUID() + crypto.randomUUID();

  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email: internalEmail,
      password: internalPassword,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return jsonResponse(
      {
        error: "Error al crear usuario",
        details: authError?.message,
      },
      500
    );
  }

  const profileInsert: Record<string, unknown> = {
    id: authData.user.id,
    company_id: adminProfile.company_id,
    role: "driver",
    full_name,
    email: internalEmail,
  };
  if (dni) profileInsert.dni = dni;

  const { error: profileError } = await adminClient.from("profiles").insert(profileInsert);

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return jsonResponse(
      {
        error: "Error al crear perfil",
        details: profileError.message,
      },
      500
    );
  }

  const { data: accessToken, error: linkError } = await adminClient.rpc(
    "create_driver_link",
    {
      p_driver_id: authData.user.id,
      p_company_id: adminProfile.company_id,
      p_pin: pin,
    }
  );

  if (linkError || !accessToken) {
    return jsonResponse(
      {
        error: "Error al crear enlace de acceso",
        details: linkError?.message,
      },
      500
    );
  }

  return jsonResponse({
    success: true,
    driver_id: authData.user.id,
    access_token: accessToken,
    full_name,
  });
}

async function handleChangePin(
  adminClient: ReturnType<typeof createClient>,
  req: Request,
  body: { link_id: string; new_pin: string }
) {
  const adminProfile = await getAdminProfile(adminClient, req);
  if (!adminProfile) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const { link_id, new_pin } = body;
  if (!link_id || !new_pin || new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) {
    return jsonResponse({ error: "Se requiere link_id y PIN de 4 digitos" }, 400);
  }

  const { data: result, error } = await adminClient.rpc("change_driver_pin", {
    p_link_id: link_id,
    p_new_pin: new_pin,
    p_company_id: adminProfile.company_id,
  });

  if (error || !result) {
    return jsonResponse({ error: "Error al cambiar PIN" }, 500);
  }

  return jsonResponse({ success: true });
}

async function handleToggleAccess(
  adminClient: ReturnType<typeof createClient>,
  req: Request,
  body: { link_id: string; is_active: boolean }
) {
  const adminProfile = await getAdminProfile(adminClient, req);
  if (!adminProfile) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const { link_id, is_active } = body;
  if (!link_id || typeof is_active !== "boolean") {
    return jsonResponse({ error: "Se requiere link_id e is_active" }, 400);
  }

  const { data: result, error } = await adminClient.rpc("toggle_driver_link", {
    p_link_id: link_id,
    p_is_active: is_active,
    p_company_id: adminProfile.company_id,
  });

  if (error || !result) {
    return jsonResponse({ error: "Error al cambiar estado" }, 500);
  }

  return jsonResponse({ success: true });
}

async function handleCreateAdmin(
  adminClient: ReturnType<typeof createClient>,
  req: Request,
  body: { full_name: string; email: string; password: string; dni?: string }
) {
  const callerProfile = await getAdminProfile(adminClient, req);
  if (!callerProfile) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const { full_name, email, password, dni } = body;
  if (!full_name || !email || !password || password.length < 6) {
    return jsonResponse(
      { error: "Se requiere nombre, email y contraseña de al menos 6 caracteres" },
      400
    );
  }

  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    if (authError?.message?.includes("already registered")) {
      return jsonResponse({ error: "Ya existe un usuario con ese email" }, 400);
    }
    return jsonResponse(
      { error: "Error al crear usuario", details: authError?.message },
      500
    );
  }

  const { data: profileOk, error: profileError } = await adminClient.rpc(
    "create_admin_profile",
    {
      p_id: authData.user.id,
      p_company_id: callerProfile.company_id,
      p_role: "admin",
      p_full_name: full_name,
      p_email: email,
      p_dni: dni ?? "",
    }
  );

  if (profileError || !profileOk) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return jsonResponse(
      { error: "Error al crear perfil", details: profileError?.message },
      500
    );
  }

  return jsonResponse({ success: true, admin_id: authData.user.id, full_name });
}

async function handleDeleteAdmin(
  adminClient: ReturnType<typeof createClient>,
  req: Request,
  body: { profile_id: string }
) {
  const callerProfile = await getAdminProfile(adminClient, req);
  if (!callerProfile) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const { profile_id } = body;
  if (!profile_id) {
    return jsonResponse({ error: "Se requiere profile_id" }, 400);
  }

  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("id, company_id, role")
    .eq("id", profile_id)
    .maybeSingle();

  if (!targetProfile) {
    return jsonResponse({ error: "Perfil no encontrado" }, 404);
  }

  if (targetProfile.company_id !== callerProfile.company_id) {
    return jsonResponse({ error: "No autorizado" }, 403);
  }

  if (targetProfile.role !== "admin") {
    return jsonResponse({ error: "El perfil no es un administrador" }, 400);
  }

  await adminClient.from("profiles").delete().eq("id", profile_id);
  await adminClient.auth.admin.deleteUser(profile_id);

  return jsonResponse({ success: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
    });

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "info":
        return await handleInfo(adminClient, body);
      case "login":
        return await handleLogin(adminClient, body);
      case "create":
        return await handleCreate(adminClient, req, body);
      case "change_pin":
        return await handleChangePin(adminClient, req, body);
      case "toggle_access":
        return await handleToggleAccess(adminClient, req, body);
      case "create_admin":
        return await handleCreateAdmin(adminClient, req, body);
      case "delete_admin":
        return await handleDeleteAdmin(adminClient, req, body);
      default:
        return jsonResponse({ error: "Accion no valida" }, 400);
    }
  } catch (error) {
    return jsonResponse(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});
