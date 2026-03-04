import { supabase } from "./client";

export type CreateStaffUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "jury";
};

export type CreateStaffUserResult = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "jury";
  password: string;
};

async function getAccessTokenOrThrow(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error("No active session. Please sign in again.");
  }

  return token;
}

export async function createStaffUser(
  input: CreateStaffUserInput,
): Promise<CreateStaffUserResult> {
  const accessToken = await getAccessTokenOrThrow();

  const response = await supabase.functions.invoke<CreateStaffUserResult>(
    "create_staff_user",
    {
      body: {
        ...input,
        accessToken,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.error) {
    let message: string | undefined;
    const httpError = response.error as { context?: Response };
    if (httpError.context) {
      try {
        const body = (await httpError.context.json()) as { error?: string };
        message = body?.error;
      } catch {
        // body not parseable as JSON — fall through
      }
    }
    throw new Error(message ?? response.error.message);
  }

  if (!response.data) {
    throw new Error("Empty response from create_staff_user");
  }

  return response.data;
}
