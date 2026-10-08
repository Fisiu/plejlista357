import { spotifyClient } from "@/api/spotifyClient";
import type { SpotifyTrack } from "@/types/spotify";

export interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  external_urls: { spotify: string };
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
}

export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  if (!spotifyClient) throw new Error("Brak konfiguracji Spotify dla tej aplikacji");

  const results = await spotifyClient.search(query, ["track"], undefined, 1);
  return results.tracks.items;
}

export async function getSpotifyUserProfile(): Promise<SpotifyUserProfile> {
  if (!spotifyClient) throw new Error("Brak konfiguracji Spotify dla tej aplikacji");
  const profile = await spotifyClient.currentUser.profile();
  return { id: profile.id, display_name: profile.display_name };
}

export async function createSpotifyPlaylist(
  userId: string,
  name: string,
  description: string,
): Promise<SpotifyPlaylistSummary> {
  if (!spotifyClient) throw new Error("Brak konfiguracji Spotify dla tej aplikacji");
  const playlist = await spotifyClient.playlists.createPlaylist(userId, {
    name,
    description,
    public: false,
    collaborative: false,
  });
  return { id: playlist.id, name: playlist.name, external_urls: playlist.external_urls };
}

export async function addSpotifyPlaylistTracks(playlistId: string, uris: string[]): Promise<void> {
  if (!spotifyClient) throw new Error("Brak konfiguracji Spotify dla tej aplikacji");
  await spotifyClient.playlists.addItemsToPlaylist(playlistId, uris);
}
