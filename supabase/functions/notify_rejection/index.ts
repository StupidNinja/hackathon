import nodemailer from "npm:nodemailer@6.9.16";
import { createClient } from "jsr:@supabase/supabase-js@2";

type CheckpointCode = "cp0" | "cp1" | "cp2" | "cp3";
type AppRole = "team" | "admin" | "jury";

type NotifyRejectionRequest = {
  teamId?: unknown;
  teamName?: unknown;
  cpCode?: unknown;
  reasonCode?: unknown;
  reasonLabel?: unknown;
  adminComment?: unknown;
  accessToken?: unknown;
};

type TeamCaptainRow = {
  captain_id: string | null;
};

type CaptainProfileRow = {
  email: string | null;
};

type RejectionTemplateRow = {
  label: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DIRECT_DISQUALIFICATION_REASON_LABELS: Record<string, string> = {
  invalid_data: "Некорректные данные",
  spam: "Спам",
  duplicate_team: "Дубликат команды",
  other: "Другое",
};

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

const normalizeEmail = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }

  return normalized;
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

const asAppRole = (value: unknown): AppRole | null => {
  if (value === "team" || value === "admin" || value === "jury") {
    return value;
  }

  return null;
};

const isCheckpointCode = (value: unknown): value is CheckpointCode =>
  value === "cp0" || value === "cp1" || value === "cp2" || value === "cp3";

const parseSmtpSecure = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return null;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderRejectionHtml = (params: {
  teamName: string;
  checkpointLabel: string;
  reasonLabel: string;
  adminComment: string;
}): string => {
  const teamName = escapeHtml(params.teamName);
  const checkpointLabel = escapeHtml(params.checkpointLabel);
  const reasonLabel = escapeHtml(params.reasonLabel);
  const adminComment = escapeHtml(params.adminComment);

  return `<!doctype html>
<html lang="ru">
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;">Уведомление о дисквалификации</h1>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">
                  Команда <strong>${teamName}</strong> была дисквалифицирована.
                </p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#4b5563;">
                  Checkpoint:
                </p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;"><strong>${checkpointLabel}</strong></p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#4b5563;">
                  Причина:
                </p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;"><strong>${reasonLabel}</strong></p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#4b5563;">
                  Комментарий администратора:
                </p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">${adminComment}</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                  Если у вас есть вопросы, свяжитесь с организаторами хакатона.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: NotifyRejectionRequest;
  try {
    body = (await req.json()) as NotifyRejectionRequest;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const teamId = asNonEmptyString(body.teamId);
  if (!teamId) {
    return json(400, { error: "teamId is required" });
  }

  const teamName = asNonEmptyString(body.teamName);
  if (!teamName) {
    return json(400, { error: "teamName is required" });
  }

  if (!(body.cpCode === null || isCheckpointCode(body.cpCode))) {
    return json(400, { error: "cpCode must be cp0/cp1/cp2/cp3 or null" });
  }
  const cpCode = body.cpCode;

  const reasonCode = asNonEmptyString(body.reasonCode);
  if (!reasonCode) {
    return json(400, { error: "reasonCode is required" });
  }

  const reasonLabelFromBody = asNonEmptyString(body.reasonLabel);

  const adminComment = asNonEmptyString(body.adminComment);
  if (!adminComment) {
    return json(400, { error: "adminComment is required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "Missing Supabase environment configuration" });
  }

  const smtpHostname = asNonEmptyString(Deno.env.get("SMTP_HOSTNAME"));
  const smtpPortRaw = asNonEmptyString(Deno.env.get("SMTP_PORT"));
  const smtpSecureRaw = asNonEmptyString(Deno.env.get("SMTP_SECURE"));
  const smtpUsername = asNonEmptyString(Deno.env.get("SMTP_USERNAME"));
  const smtpPassword = asNonEmptyString(Deno.env.get("SMTP_PASSWORD"));
  const smtpFrom = asNonEmptyString(Deno.env.get("SMTP_FROM"));

  const missingSmtpKeys = [
    !smtpHostname ? "SMTP_HOSTNAME" : null,
    !smtpPortRaw ? "SMTP_PORT" : null,
    !smtpSecureRaw ? "SMTP_SECURE" : null,
    !smtpUsername ? "SMTP_USERNAME" : null,
    !smtpPassword ? "SMTP_PASSWORD" : null,
    !smtpFrom ? "SMTP_FROM" : null,
  ].filter((value): value is string => value !== null);

  if (missingSmtpKeys.length > 0) {
    return json(500, {
      error: `Missing SMTP configuration keys: ${missingSmtpKeys.join(", ")}`,
    });
  }

  const smtpPort = Number.parseInt(smtpPortRaw, 10);
  if (!Number.isInteger(smtpPort) || smtpPort <= 0) {
    return json(500, { error: "SMTP_PORT must be a positive integer" });
  }

  const smtpSecure = parseSmtpSecure(smtpSecureRaw);
  if (smtpSecure === null) {
    return json(500, { error: "SMTP_SECURE must be true or false" });
  }

  const accessToken =
    extractBearerToken(req.headers.get("Authorization")) ??
    asNonEmptyString(body.accessToken);
  if (!accessToken) {
    return json(401, { error: "Missing access token" });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser(accessToken);
  if (callerError || !caller) {
    return json(401, { error: "Unauthorized user" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const metadataRole = asAppRole(
    (caller.app_metadata as { role?: unknown } | undefined)?.role,
  );

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();
  if (callerProfileError) {
    return json(500, { error: callerProfileError.message });
  }

  const profileRole = asAppRole(callerProfile?.role);
  const callerRole = metadataRole ?? profileRole;
  if (callerRole !== "admin") {
    return json(403, {
      error: "Only admin users can send rejection notifications",
    });
  }

  const { data: team, error: teamError } = await adminClient
    .from("teams")
    .select("captain_id")
    .eq("id", teamId)
    .maybeSingle();
  if (teamError) {
    return json(500, { error: teamError.message });
  }
  if (!team) {
    return json(404, { error: "Team not found" });
  }

  const typedTeam = team as TeamCaptainRow;
  if (!typedTeam.captain_id) {
    return json(404, { error: "Captain not found for team" });
  }

  const { data: captainProfile, error: captainProfileError } = await adminClient
    .from("profiles")
    .select("email")
    .eq("id", typedTeam.captain_id)
    .maybeSingle();
  if (captainProfileError) {
    return json(500, { error: captainProfileError.message });
  }
  if (!captainProfile) {
    return json(404, { error: "Captain profile not found" });
  }

  const captainEmail = normalizeEmail(
    (captainProfile as CaptainProfileRow).email ?? "",
  );
  if (!captainEmail) {
    return json(404, { error: "Captain email is missing or invalid" });
  }

  let reasonLabel =
    reasonLabelFromBody ??
    DIRECT_DISQUALIFICATION_REASON_LABELS[reasonCode] ??
    reasonCode;
  if (cpCode) {
    const { data: templateRow, error: templateError } = await adminClient
      .from("checkpoint_rejection_templates")
      .select("label")
      .eq("checkpoint_code", cpCode)
      .eq("code", reasonCode)
      .maybeSingle();

    if (templateError) {
      return json(500, { error: templateError.message });
    }

    reasonLabel =
      (templateRow as RejectionTemplateRow | null)?.label ?? reasonLabel;
  }

  const checkpointLabel = cpCode
    ? cpCode.toUpperCase()
    : "Прямая дисквалификация";

  const transporter = nodemailer.createTransport({
    host: smtpHostname,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUsername,
      pass: smtpPassword,
    },
  });

  const subject = cpCode
    ? `AITalents: команда дисквалифицирована на ${cpCode.toUpperCase()}`
    : "AITalents: команда дисквалифицирована";

  const html = renderRejectionHtml({
    teamName,
    checkpointLabel,
    reasonLabel,
    adminComment,
  });

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: captainEmail,
      subject,
      html,
      text: [
        "Команда дисквалифицирована.",
        `Команда: ${teamName}`,
        `Checkpoint: ${checkpointLabel}`,
        `Причина: ${reasonLabel}`,
        `Комментарий администратора: ${adminComment}`,
      ].join("\n"),
    });
  } catch (error) {
    console.error("notify_rejection sendMail failed:", error);
    return json(502, {
      error:
        error instanceof Error
          ? error.message
          : "Failed to send notification email",
    });
  }

  return json(200, { ok: true });
});
