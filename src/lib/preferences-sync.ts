import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";
import {
  usePreferences,
  DEFAULT_PREFERENCES,
  type Preferences,
} from "./preferences-store";

// Load preferences from profiles.preferences on login, and push local changes
// back to the cloud. No localStorage involved.
export function usePreferencesSync() {
  const { user } = useAuth();
  const hydratedRef = useRef<string | null>(null);
  const lastPushedRef = useRef<string>("");
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from cloud on login
  useEffect(() => {
    if (!user) {
      hydratedRef.current = null;
      lastPushedRef.current = "";
      // Reset store to defaults on sign-out
      usePreferences.getState().hydrate({});
      return;
    }
    if (hydratedRef.current === user.id) return;
    hydratedRef.current = user.id;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferences, display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[prefs-sync] load", error);
        usePreferences.getState().hydrate({});
        return;
      }

      const remote = (data?.preferences ?? {}) as Partial<Preferences>;

      // Fill sensible fallbacks from the auth profile the first time
      const fallbackName =
        remote.userName ||
        data?.display_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split("@")[0] ||
        "";
      const fallbackEmail = remote.userEmail || user.email || "";

      const merged: Preferences = {
        ...DEFAULT_PREFERENCES,
        ...remote,
        userName: fallbackName,
        userEmail: fallbackEmail,
      };

      usePreferences.getState().hydrate(merged);
      lastPushedRef.current = JSON.stringify(merged);
    })();
  }, [user]);

  // Push local changes to cloud (debounced)
  useEffect(() => {
    if (!user) return;
    const unsub = usePreferences.subscribe((state) => {
      if (!state._loaded) return;
      const { _loaded, update, reset, hydrate, ...prefs } = state;
      void _loaded;
      void update;
      void reset;
      void hydrate;
      const serialized = JSON.stringify(prefs);
      if (serialized === lastPushedRef.current) return;

      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        const { error } = await supabase
          .from("profiles")
          .update({ preferences: prefs })
          .eq("id", user.id);
        if (error) {
          console.error("[prefs-sync] push", error);
          return;
        }
        lastPushedRef.current = serialized;
      }, 600);
    });
    return () => {
      unsub();
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [user]);
}
