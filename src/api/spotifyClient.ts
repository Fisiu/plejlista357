import { SpotifyApi } from "@spotify/web-api-ts-sdk";

import { createSpotifyRateLimitedFetch, createSpotifyResponseValidator } from "@/api/spotifyHttp";

const scopes = ["playlist-modify-private", "playlist-modify-public", "user-read-private"];
const fetchWithRateLimitRetry = createSpotifyRateLimitedFetch();

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const origin = typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:5173";
const redirectUri = `${origin}/spotify-callback`;

export const spotifyClient = clientId
  ? SpotifyApi.withUserAuthorization(clientId, redirectUri, scopes, {
      fetch: fetchWithRateLimitRetry,
      responseValidator: createSpotifyResponseValidator(),
    })
  : undefined;
