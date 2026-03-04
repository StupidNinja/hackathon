import { createClient } from "jsr:@supabase/supabase-js@2";

type StaffRole = "admin" | "jury";

type AcceptStaffInviteRequest = {
  inviteId?: unknown;
  accessToken?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  telegram?: unknown;
  schoolId?: unknown;
  customSchoolName?: unknown;
  grade?: unknown;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const forbiddenStaffFields = [
  "firstName",
  "lastName",
  "phone",
  "telegram",
  "schoolId",
  "customSchoolName",
  "grade",
] as const;

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

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

const isStaffRole = (value: unknown): value is StaffRole =>
  value === "admin" || value === "jury";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: AcceptStaffInviteRequest;
  try {
    body = (await req.json()) as AcceptStaffInviteRequest;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  for (const field of forbiddenStaffFields) {
    if (field in body) {
      return json(400, { error: `Field '${field}' is not allowed for staff profile` });
    }
  }

  const inviteId = asNonEmptyString(body.inviteId);

  if (!inviteId) {
    return json(400, { error: "inviteId is required" });
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

  const userEmail = user.email?.trim().toLowerCase() ?? "";
  if (!userEmail) {
    return json(400, { error: "Authenticated user does not have an email" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: invite, error: inviteError } = await adminClient
    .from("staff_invites")
    .select("id,email,role,status,expires_at")
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError) {
    return json(500, { error: inviteError.message });
  }

  if (!invite) {
    return json(404, { error: "Invite not found" });
  }

  if (!isStaffRole(invite.role)) {
    return json(400, { error: "Invite role is invalid" });
  }

  if (invite.status !== "pending") {
    return json(409, { error: "Invite is not pending" });
  }

  const inviteEmail = String(invite.email ?? "").trim().toLowerCase();
  if (!inviteEmail || inviteEmail !== userEmail) {
    return json(403, { error: "Invite email does not match authenticated user" });
  }

  const expiresAt = new Date(invite.expires_at);
  if (Number.isNaN(expiresAt.getTime())) {
    return json(500, { error: "Invite expiration timestamp is invalid" });
  }

  if (expiresAt <= new Date()) {
    await adminClient
      .from("staff_invites")
      .update({ status: "expired" })
      .eq("id", invite.id)
      .eq("status", "pending");

    return json(410, { error: "Invite has expired" });
  }

  const { data: managedUser, error: managedUserError } = await adminClient.auth.admin.getUserById(
    user.id,
  );

  if (managedUserError || !managedUser.user) {
    return json(500, { error: managedUserError?.message ?? "Failed to load user" });
  }

  const currentMetadata = managedUser.user.app_metadata ?? {};
  const isSuperAdmin = currentMetadata.is_super_admin === true;

  const { error: updateUserError } = await adminClient.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...currentMetadata,
      role: invite.role,
      is_super_admin: isSuperAdmin,
    },
  });

  if (updateUserError) {
    return json(500, { error: updateUserError.message });
  }

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    return json(500, { error: existingProfileError.message });
  }

  const { error: profileUpsertError } = await adminClient.from("profiles").upsert(
    {
      id: user.id,
      first_name: (existingProfile?.first_name as string | null | undefined) ?? null,
      last_name: (existingProfile?.last_name as string | null | undefined) ?? null,
      role: invite.role,
      is_super_admin: isSuperAdmin,
      school_id: null,
      custom_school_name: null,
      phone: null,
      telegram: null,
      grade: null,
    },
    { onConflict: "id" },
  );

  if (profileUpsertError) {
    return json(500, { error: profileUpsertError.message });
  }

  const { error: inviteUpdateError } = await adminClient
    .from("staff_invites")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .eq("status", "pending");

  if (inviteUpdateError) {
    return json(500, { error: inviteUpdateError.message });
  }

  return json(200, {
    inviteId: invite.id,
    role: invite.role,
    isSuperAdmin,
  });
});
