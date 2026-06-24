import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const useAuthSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string) => {
    const normalizedEmail = email.trim();
    if (!supabase || !normalizedEmail) {
      return;
    }

    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.href,
      },
    });

    setMessage(error ? error.message : "登录链接已发送，请查收邮箱");
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    setMessage("");
    const { error } = await supabase.auth.signOut();
    setMessage(error ? error.message : "已退出登录，本地数据仍保留");
  };

  return {
    isConfigured: isSupabaseConfigured,
    isLoading,
    message,
    session,
    signInWithEmail,
    signOut,
  };
};
