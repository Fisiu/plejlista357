import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addSpotifyPlaylistTracks,
  createSpotifyPlaylist,
  getSpotifyUserProfile,
  searchSpotifyTracks,
} from "@/api/spotify";
import { SpotifyApiError } from "@/api/spotifyErrors";
import { useSpotifyPlaylist } from "@/composables/useSpotifyPlaylist";
import type { ChartItem } from "@/types/radioChart";
import type { SpotifyTrack } from "@/types/spotify";

vi.mock("@/api/spotify", () => ({
  addSpotifyPlaylistTracks: vi.fn<typeof addSpotifyPlaylistTracks>(),
  createSpotifyPlaylist: vi.fn<typeof createSpotifyPlaylist>(),
  getSpotifyUserProfile: vi.fn<typeof getSpotifyUserProfile>(),
  searchSpotifyTracks: vi.fn<typeof searchSpotifyTracks>(),
}));

function chartItem(id: number, position: number): ChartItem {
  return {
    id,
    position,
    artist: `Artist ${id}`,
    name: `Song ${id}`,
    is_new: false,
    last_position: position,
    times_on_chart: 1,
    change: 0,
  };
}

const replacementTrack: SpotifyTrack = {
  id: "replacement-1",
  name: "Replacement song",
  uri: "spotify:track:replacement-1",
  artists: [{ name: "Replacement artist" }],
};

function mountPlaylist() {
  let playlist!: ReturnType<typeof useSpotifyPlaylist>;
  const harness = defineComponent({
    setup() {
      playlist = useSpotifyPlaylist();
      return () => h("div");
    },
  });

  const wrapper = mount(harness);
  return { playlist, wrapper };
}

describe("useSpotifyPlaylist matching", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("limits track searches to two concurrent requests and keeps source order", async () => {
    let activeRequests = 0;
    let maxConcurrentRequests = 0;
    vi.mocked(searchSpotifyTracks).mockImplementation(async () => {
      activeRequests += 1;
      maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);
      await Promise.resolve();
      activeRequests -= 1;
      return [];
    });

    const { playlist } = mountPlaylist();
    await playlist.matchChart([chartItem(3, 3), chartItem(1, 1), chartItem(2, 2)]);

    expect(maxConcurrentRequests).toBe(2);
    expect(searchSpotifyTracks).toHaveBeenNthCalledWith(1, "Artist 3 - Song 3");
    expect(searchSpotifyTracks).toHaveBeenNthCalledWith(2, "Artist 1 - Song 1");
    expect(playlist.matches.value.map(({ position }) => position)).toEqual([3, 1, 2]);
    expect(playlist.completedSearches.value).toBe(3);
    expect(playlist.isSearching.value).toBe(false);
  });

  it("retains successful matches when an individual search fails", async () => {
    vi.mocked(searchSpotifyTracks).mockImplementation(async (query) => {
      if (query.toLowerCase().includes("song 2")) throw new Error("Search unavailable");
      return [];
    });

    const { playlist } = mountPlaylist();
    await playlist.matchChart([chartItem(1, 1), chartItem(2, 2), chartItem(3, 3)]);

    expect(playlist.matches.value).toHaveLength(3);
    expect(playlist.matches.value[1]).toMatchObject({
      status: "missing",
      searchError: "Search unavailable",
    });
    expect(playlist.completedSearches.value).toBe(3);
  });

  it("uses the first Spotify result without local relevance filtering", async () => {
    const firstResult: SpotifyTrack = {
      id: "unrelated",
      name: "Unrelated song",
      uri: "spotify:track:unrelated",
      artists: [{ name: "Another artist" }],
    };
    vi.mocked(searchSpotifyTracks).mockResolvedValueOnce([firstResult]);

    const { playlist } = mountPlaylist();
    await playlist.matchChart([chartItem(1, 1)]);

    expect(searchSpotifyTracks).toHaveBeenNthCalledWith(1, "Artist 1 - Song 1");
    expect(playlist.matches.value[0]).toMatchObject({
      status: "matched",
      selectedUri: firstResult.uri,
    });
  });

  it("marks an empty Spotify response as missing after one request", async () => {
    vi.mocked(searchSpotifyTracks).mockResolvedValueOnce([]);

    const { playlist } = mountPlaylist();
    await playlist.matchChart([chartItem(1, 1)]);

    expect(searchSpotifyTracks).toHaveBeenCalledOnce();
    expect(searchSpotifyTracks).toHaveBeenCalledWith("Artist 1 - Song 1");
    expect(playlist.matches.value[0]).toMatchObject({
      status: "missing",
      confidence: "missing",
    });
  });

  it("stops queuing automatic searches after Spotify authorization expires", async () => {
    vi.mocked(searchSpotifyTracks).mockRejectedValue(new SpotifyApiError(401, "Expired"));

    const { playlist } = mountPlaylist();
    await playlist.matchChart([chartItem(1, 1), chartItem(2, 2), chartItem(3, 3), chartItem(4, 4)]);

    expect(searchSpotifyTracks).toHaveBeenCalledTimes(2);
    expect(
      playlist.matches.value.filter(({ searchErrorStatus }) => searchErrorStatus === 401),
    ).toHaveLength(2);
    expect(playlist.isSearching.value).toBe(false);
  });

  it("preserves authorization status from a manual search failure", async () => {
    const initialMatch: SpotifyTrack = {
      id: "initial-1",
      name: "Song 1",
      uri: "spotify:track:initial-1",
      artists: [{ name: "Artist 1" }],
    };
    vi.mocked(searchSpotifyTracks)
      .mockResolvedValueOnce([initialMatch])
      .mockRejectedValueOnce(new SpotifyApiError(401, "Expired"));

    const { playlist } = mountPlaylist();
    await playlist.matchChart([chartItem(1, 1)]);
    await playlist.searchCandidates(1, "Replacement");

    expect(playlist.manualSearchErrorStatuses.value[1]).toBe(401);
  });

  it("supports a manual candidate search and selection", async () => {
    const initialMatch: SpotifyTrack = {
      id: "initial-1",
      name: "Song 1",
      uri: "spotify:track:initial-1",
      artists: [{ name: "Artist 1" }],
    };
    vi.mocked(searchSpotifyTracks)
      .mockResolvedValueOnce([initialMatch])
      .mockResolvedValueOnce([replacementTrack]);

    const { playlist } = mountPlaylist();
    await playlist.matchChart([chartItem(1, 1)]);
    await playlist.searchCandidates(1, "Replacement artist Replacement song");

    expect(searchSpotifyTracks).toHaveBeenLastCalledWith("Replacement artist Replacement song");
    expect(playlist.manualSearchResults.value[1]).toEqual([replacementTrack]);

    playlist.selectCandidate(1, replacementTrack);

    expect(playlist.matches.value[0]).toMatchObject({
      status: "matched",
      confidence: "manual",
      selectedUri: replacementTrack.uri,
      skipped: false,
    });
  });

  it("allows an item to be skipped and restored", async () => {
    vi.mocked(searchSpotifyTracks).mockResolvedValue([]);

    const { playlist } = mountPlaylist();
    await playlist.matchChart([chartItem(1, 1)]);
    playlist.toggleSkipped(1);

    expect(playlist.matches.value[0]?.skipped).toBe(true);

    playlist.toggleSkipped(1);

    expect(playlist.matches.value[0]?.skipped).toBe(false);
  });

  it("requires unresolved tracks to be selected or skipped before playlist creation", async () => {
    vi.mocked(searchSpotifyTracks).mockResolvedValue([]);

    const { playlist, wrapper } = mountPlaylist();
    await playlist.matchChart([chartItem(1, 1)]);

    await expect(playlist.createPlaylist("Lista 357")).rejects.toThrow("Wybierz utwór");
    expect(getSpotifyUserProfile).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("creates a private playlist and adds selected tracks in order in batches of 100", async () => {
    vi.mocked(searchSpotifyTracks).mockImplementation(async (query) => {
      const id = Number(query.match(/song (\d+)/i)?.[1]);
      return [
        {
          id: `track-${id}`,
          name: `Song ${id}`,
          uri: `spotify:track:${id}`,
          artists: [{ name: `Artist ${id}` }],
        },
      ];
    });
    vi.mocked(getSpotifyUserProfile).mockResolvedValue({ id: "user-1", display_name: "Ada" });
    vi.mocked(createSpotifyPlaylist).mockResolvedValue({
      id: "playlist-1",
      name: "Lista 357 #123",
      external_urls: { spotify: "https://open.spotify.com/playlist/playlist-1" },
    });
    vi.mocked(addSpotifyPlaylistTracks).mockResolvedValue(undefined);

    const { playlist, wrapper } = mountPlaylist();
    const items = Array.from({ length: 205 }, (_, index) => {
      const id = index + 1;
      return chartItem(id, id);
    }).reverse();
    await playlist.matchChart(items);
    await playlist.createPlaylist("Lista 357 #123", "Notowanie 123");

    expect(getSpotifyUserProfile).toHaveBeenCalledOnce();
    expect(createSpotifyPlaylist).toHaveBeenCalledWith("user-1", "Lista 357 #123", "Notowanie 123");
    expect(addSpotifyPlaylistTracks).toHaveBeenCalledTimes(3);
    expect(vi.mocked(addSpotifyPlaylistTracks).mock.calls.map(([, uris]) => uris.length)).toEqual([
      100, 100, 5,
    ]);
    expect(vi.mocked(addSpotifyPlaylistTracks).mock.calls[0]?.[1][0]).toBe("spotify:track:205");
    expect(vi.mocked(addSpotifyPlaylistTracks).mock.calls[2]?.[1][4]).toBe("spotify:track:1");
    expect(playlist.addedTrackCount.value).toBe(205);
    wrapper.unmount();
  });

  it("requires explicit confirmation before creating an empty playlist", async () => {
    vi.mocked(getSpotifyUserProfile).mockResolvedValue({ id: "user-1", display_name: "Ada" });
    vi.mocked(createSpotifyPlaylist).mockResolvedValue({
      id: "empty-playlist",
      name: "Empty",
      external_urls: { spotify: "https://open.spotify.com/playlist/empty-playlist" },
    });
    vi.mocked(addSpotifyPlaylistTracks).mockResolvedValue(undefined);

    const { playlist, wrapper } = mountPlaylist();
    await playlist.matchChart([]);

    await expect(playlist.createPlaylist("Empty")).rejects.toThrow("Pusta playlista");
    await expect(playlist.createPlaylist("Empty", "", true)).resolves.toMatchObject({
      id: "empty-playlist",
    });
    expect(addSpotifyPlaylistTracks).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("ignores results from an older search after a newer search starts", async () => {
    let resolveOldSearch!: (tracks: never[]) => void;
    vi.mocked(searchSpotifyTracks)
      .mockReturnValueOnce(new Promise((resolve) => (resolveOldSearch = resolve)))
      .mockResolvedValueOnce([]);

    const { playlist, wrapper } = mountPlaylist();
    const oldSearch = playlist.matchChart([chartItem(1, 1)]);
    await playlist.matchChart([chartItem(2, 2)]);
    resolveOldSearch([]);
    await oldSearch;
    await flushPromises();

    expect(playlist.matches.value.map(({ chartItemId }) => chartItemId)).toEqual([2]);
    wrapper.unmount();
  });
});
