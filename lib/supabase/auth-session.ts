import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

function createServerAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing Supabase anon environment variables");
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function signInStudentSession(studentId: string, password: string) {
  const supabase = createServerAnonClient();
  const domain = process.env.SCHOOL_AUTH_DOMAIN || "foundu.school";
  const normalizedId = studentId.replace(/\D/g, "").padStart(5, "0").slice(-5);
  const email = `${normalizedId}@students.${domain}`;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(error?.message || "ไม่สามารถสร้าง session ได้");
  }
  return data.session;
}

export async function setClientSession(tokens: { access_token: string; refresh_token: string }) {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.setSession(tokens);
  if (error) {
    throw error;
  }
  return data.session;
}
