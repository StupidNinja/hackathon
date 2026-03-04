import { createClient } from "jsr:@supabase/supabase-js@2";

type StaffRole = "admin" | "jury";

type CreateStaffInviteRequest = {
  email?: unknown;
  role?: unknown;
  expiresInHours?: unknown;
  accessToken?: unknown;
};

const DEFAULT_TTL_HOURS = 72;
const MIN_TTL_HOURS = 1;
const MAX_TTL_HOURS = 168;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) {
    return null;
  }

  // Basic backend safety check.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
};

const parseRole = (value: unknown): StaffRole | null => {
  if (value === "admin" || value === "jury") {
    return value;
  }

  return null;
};

const parseTtlHours = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_TTL_HOURS;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TTL_HOURS;
  }

  const rounded = Math.floor(value);
  if (rounded < MIN_TTL_HOURS) {
    return MIN_TTL_HOURS;
  }
  if (rounded > MAX_TTL_HOURS) {
    return MAX_TTL_HOURS;
  }

  return rounded;
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractBearerToken = (headerValue: string | null): string | null => {
  if (!headerValue) {
    return null;
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  return token.length > 0 ? token : null;
};

const resolveSiteUrl = (request: Request): string | null => {
  const rawUrl =
    Deno.env.get("PUBLIC_SITE_URL") ??
    Deno.env.get("SITE_URL") ??
    request.headers.get("origin");

  if (!rawUrl) {
    return null;
  }

  return rawUrl.replace(/\/+$/, "");
};

const isSuperAdmin = (value: unknown): boolean => value === true;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: CreateStaffInviteRequest;
  try {
    body = (await req.json()) as CreateStaffInviteRequest;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return json(400, { error: "A valid email is required" });
  }

  const requestedRole = parseRole(body.role) ?? "jury";
  const expiresInHours = parseTtlHours(body.expiresInHours);
  const siteUrl = resolveSiteUrl(req);

  if (!siteUrl) {
    return json(500, { error: "Missing PUBLIC_SITE_URL/SITE_URL configuration" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "Missing Supabase environment configuration" });
  }

  const accessToken =
    extractBearerToken(req.headers.get("Authorization")) ??
    asNonEmptyString(body.accessToken);

  if (!accessToken) {
    return json(401, { error: "Missing access token" });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: callerError,
  } = await callerClient.auth.getUser(accessToken);

  if (callerError || !user) {
    return json(401, { error: "Unauthorized user" });
  }

  const callerRole = (user.app_metadata as { role?: unknown } | undefined)?.role;
  const callerIsSuperAdmin = isSuperAdmin(
    (user.app_metadata as { is_super_admin?: unknown } | undefined)?.is_super_admin,
  );

  if (callerRole !== "admin") {
    return json(403, { error: "Only admin users can send staff invites" });
  }

  if (requestedRole === "admin" && !callerIsSuperAdmin) {
    return json(403, { error: "Only superadmin can invite admin role" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const now = new Date();
  const nowIso = now.toISOString();

  // Mark stale invites as expired for this email.
  await adminClient
    .from("staff_invites")
    .update({ status: "expired" })
    .eq("email", email)
    .eq("status", "pending")
    .lt("expires_at", nowIso);

  const { data: existingPending, error: existingPendingError } = await adminClient
    .from("staff_invites")
    .select("id,expires_at")
    .eq("email", email)
    .eq("role", requestedRole)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPendingError) {
    return json(500, { error: existingPendingError.message });
  }

  if (existingPending) {
    return json(409, {
      error: "An active invite already exists for this email and role",
      inviteId: existingPending.id,
      expiresAt: existingPending.expires_at,
    });
  }

  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString();

  const { data: invite, error: inviteInsertError } = await adminClient
    .from("staff_invites")
    .insert({
      email,
      role: requestedRole,
      status: "pending",
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select("id,email,role,status,expires_at,created_at")
    .single();

  if (inviteInsertError || !invite) {
    return json(500, { error: inviteInsertError?.message ?? "Failed to create invite" });
  }

  const redirectTo = `${siteUrl}/auth/callback?staff_invite_id=${invite.id}`;
  const { error: authInviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      staff_invite_id: invite.id,
      invited_role: requestedRole,
    },
  });

  if (authInviteError) {
    await adminClient
      .from("staff_invites")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", invite.id)
      .eq("status", "pending");

    const message = authInviteError.message ?? "Failed to send invite email";
    const isExistingUser = /already|exists|registered|taken/i.test(message);
    return json(isExistingUser ? 409 : 500, { error: message });
  }

  return json(200, {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
  });
});
