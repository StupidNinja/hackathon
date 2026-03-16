import { createClient } from "jsr:@supabase/supabase-js@2";

type StaffRole = "admin" | "jury";

type CreateStaffUserRequest = {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  role?: unknown;
  accessToken?: unknown;
};

type AppRole = "team" | "admin" | "jury";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function generatePassword(length = 14): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
};

const parseRole = (value: unknown): StaffRole | null => {
  if (value === "admin" || value === "jury") return value;
  return null;
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractBearerToken = (headerValue: string | null): string | null => {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
};

const asAppRole = (value: unknown): AppRole | null => {
  if (value === "team" || value === "admin" || value === "jury") {
    return value;
  }

  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: CreateStaffUserRequest;
  try {
    body = (await req.json()) as CreateStaffUserRequest;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const email = normalizeEmail(body.email);
  if (!email) return json(400, { error: "A valid email is required" });

  const firstName = asNonEmptyString(body.firstName);
  if (!firstName) return json(400, { error: "firstName is required" });

  const lastName = asNonEmptyString(body.lastName);
  if (!lastName) return json(400, { error: "lastName is required" });

  const role = parseRole(body.role);
  if (!role) return json(400, { error: "role must be 'admin' or 'jury'" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "Missing Supabase environment configuration" });
  }

  const accessToken =
    extractBearerToken(req.headers.get("Authorization")) ??
    asNonEmptyString(body.accessToken);

  if (!accessToken) return json(401, { error: "Missing access token" });

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser(accessToken);

  if (callerError || !caller) {
    return json(401, { error: "Unauthorized" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const metadataRole = asAppRole(
    (caller.app_metadata as { role?: unknown } | undefined)?.role,
  );
  const metadataIsSuperAdmin =
    (caller.app_metadata as { is_super_admin?: unknown } | undefined)
      ?.is_super_admin === true;

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("profiles")
    .select("role,is_super_admin")
    .eq("id", caller.id)
    .maybeSingle();

  if (callerProfileError) {
    return json(500, { error: callerProfileError.message });
  }

  const profileRole = asAppRole(callerProfile?.role);
  const callerRole = metadataRole ?? profileRole;
  const callerIsSuperAdmin =
    metadataIsSuperAdmin || callerProfile?.is_super_admin === true;

  // Best-effort self-heal for future requests if metadata is stale.
  if (callerRole && (metadataRole !== callerRole || metadataIsSuperAdmin !== callerIsSuperAdmin)) {
    await adminClient.auth.admin.updateUserById(caller.id, {
      app_metadata: {
        ...(caller.app_metadata ?? {}),
        role: callerRole,
        is_super_admin: callerIsSuperAdmin,
      },
    });
  }

  if (callerRole !== "admin") {
    return json(403, { error: "Only admin users can create staff accounts" });
  }

  if (role === "admin" && !callerIsSuperAdmin) {
    return json(403, { error: "Only super admins can create admin accounts" });
  }

  const password = generatePassword();

  const { data: newUserData, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
    });

  if (createError || !newUserData.user) {
    const message = createError?.message ?? "Failed to create user";
    const isConflict = /already|exists|taken|registered/i.test(message);
    return json(isConflict ? 409 : 500, { error: message });
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: newUserData.user.id,
    first_name: firstName,
    last_name: lastName,
    email,
    role,
    must_change_password: true,
  });

  if (profileError) {
    // Rollback: delete the auth user so no orphaned account exists
    await adminClient.auth.admin.deleteUser(newUserData.user.id);
    return json(500, { error: profileError.message });
  }

  return json(200, {
    id: newUserData.user.id,
    email,
    firstName,
    lastName,
    role,
    password,
  });
});
