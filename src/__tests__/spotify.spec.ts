import { beforeEach, describe, expect, it, vi } from "vitest";

const spotifySdk = vi.hoisted(() => ({
  search: vi.fn<
    (
      query: string,
      types: ["track"],
      market: undefined,
      limit: 1,
    ) => Promise<{
      tracks: {
        items: Array<{ id: string; name: string; uri: string; artists: Array<{ name: string }> }>;
      };
    }>
  >(),
  currentUser: {
    profile: vi.fn<() => Promise<{ id: string; display_name: string | null }>>(),
  },
  playlists: {
    createPlaylist: vi.fn<
      (
        userId: string,
        request: { name: string; description: string; public: false; collaborative: false },
      ) => Promise<{
        id: string;
        name: string;
        external_urls: { spotify: string };
      }>
    >(),
    addItemsToPlaylist: vi.fn<(playlistId: string, uris: string[]) => Promise<void>>(),
  },
}));

vi.mock("@/api/spotifyClient", () => ({ spotifyClient: spotifySdk }));

import {
  addSpotifyPlaylistTracks,
  createSpotifyPlaylist,
  getSpotifyUserProfile,
  searchSpotifyTracks,
} from "@/api/spotify";

describe("Spotify API wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses Spotify's first unfiltered-market candidate", async () => {
    const track = {
      id: "track-1",
      name: "Początek",
      uri: "spotify:track:track-1",
      artists: [{ name: "Męskie Granie Orkiestra" }],
    };
    spotifySdk.search.mockResolvedValue({ tracks: { items: [track] } });

    await expect(searchSpotifyTracks("Katarzyna Groniec - Halo (feat. Organek)")).resolves.toEqual([
      track,
    ]);

    expect(spotifySdk.search).toHaveBeenCalledWith(
      "Katarzyna Groniec - Halo (feat. Organek)",
      ["track"],
      undefined,
      1,
    );
  });

  it("creates a private playlist for the current user and adds the requested URIs", async () => {
    spotifySdk.currentUser.profile.mockResolvedValue({ id: "user-1", display_name: "Ada" });
    spotifySdk.playlists.createPlaylist.mockResolvedValue({
      id: "playlist-1",
      name: "Lista 357",
      external_urls: { spotify: "https://open.spotify.com/playlist/playlist-1" },
    });
    spotifySdk.playlists.addItemsToPlaylist.mockResolvedValue(undefined);

    const profile = await getSpotifyUserProfile();
    const playlist = await createSpotifyPlaylist(profile.id, "Lista 357", "Notowanie 123");
    await addSpotifyPlaylistTracks("playlist-1", ["spotify:track:track-1"]);

    expect(profile).toEqual({ id: "user-1", display_name: "Ada" });
    expect(spotifySdk.playlists.createPlaylist).toHaveBeenCalledWith("user-1", {
      name: "Lista 357",
      description: "Notowanie 123",
      public: false,
      collaborative: false,
    });
    expect(playlist.external_urls.spotify).toBe("https://open.spotify.com/playlist/playlist-1");
    expect(spotifySdk.playlists.addItemsToPlaylist).toHaveBeenCalledWith("playlist-1", [
      "spotify:track:track-1",
    ]);
  });
});
