import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { spotifyClient } from "@/api/spotifyClient";

const returnPathStorageKey = "spotify:return-path";

export const useSpotifyStore = defineStore("spotify", () => {
  const sdk = spotifyClient;

  const isAuthenticated = ref(false);
  const displayName = ref<string>();
  const isLoading = ref(false);
  const error = ref<string>();
  const isConfigured = computed(() => Boolean(sdk));

  async function loadProfile(): Promise<void> {
    if (!sdk) return;

    const profile = await sdk.currentUser.profile();
    displayName.value = profile.display_name ?? profile.id;
    isAuthenticated.value = true;
  }

  /**
   * Checks for an existing cached access token on app load.
   * Call this in SpotifyAuthButton or App.vue on mount.
   */
  async function restoreSession(): Promise<void> {
    if (!sdk || isLoading.value || isAuthenticated.value) return;

    isLoading.value = true;
    error.value = undefined;

    try {
      const token = await sdk.getAccessToken();
      if (token) {
        await loadProfile();
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Nie udało się przywrócić sesji Spotify";
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Exchanges the OAuth callback code for access tokens.
   * Call this exclusively from pages/spotify-callback.vue.
   */
  async function handleCallback(): Promise<void> {
    if (!sdk) {
      throw new Error("Brak konfiguracji Spotify dla tej aplikacji");
    }

    isLoading.value = true;
    error.value = undefined;

    try {
      const result = await sdk.authenticate();
      if (result.authenticated) {
        if (typeof window !== "undefined" && window.history.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState(window.history.state, document.title, cleanUrl);
        }
        await loadProfile();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Błąd autoryzacji Spotify";
      error.value = msg;
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Initiates the Spotify authorization flow.
   */
  async function connect(): Promise<void> {
    if (!sdk) {
      error.value = "Brak konfiguracji Spotify dla tej aplikacji";
      return;
    }

    isLoading.value = true;
    error.value = undefined;

    try {
      const currentUrl = new URL(window.location.href);
      sessionStorage.setItem(
        returnPathStorageKey,
        `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
      );
      await sdk.authenticate();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Nie udało się połączyć ze Spotify";
      isLoading.value = false;
    }
  }

  function disconnect(): void {
    sdk?.logOut();
    isAuthenticated.value = false;
    displayName.value = undefined;
    error.value = undefined;
  }

  return {
    displayName,
    error,
    disconnect,
    connect,
    restoreSession,
    handleCallback,
    isAuthenticated,
    isConfigured,
    isLoading,
    returnPathStorageKey,
  };
});
