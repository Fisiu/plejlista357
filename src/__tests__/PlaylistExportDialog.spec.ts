import { flushPromises, mount } from "@vue/test-utils";
import ui from "@nuxt/ui/vue-plugin";
import { createPinia } from "pinia";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addSpotifyPlaylistTracks,
  createSpotifyPlaylist,
  getSpotifyUserProfile,
  searchSpotifyTracks,
} from "@/api/spotify";
import { SpotifyApiError } from "@/api/spotifyErrors";
import PlaylistExportDialog from "@/components/PlaylistExportDialog.vue";
import { useSpotifyStore } from "@/stores/spotify";

vi.mock("@/api/spotify", () => ({
  addSpotifyPlaylistTracks: vi.fn<typeof addSpotifyPlaylistTracks>(),
  createSpotifyPlaylist: vi.fn<typeof createSpotifyPlaylist>(),
  getSpotifyUserProfile: vi.fn<typeof getSpotifyUserProfile>(),
  searchSpotifyTracks: vi.fn<typeof searchSpotifyTracks>(),
}));

const chart = {
  results: {
    mainChart: {
      items: [
        {
          id: 1,
          name: "Początek",
          artist: "Męskie Granie Orkiestra",
          position: 1,
          is_new: false,
          last_position: 1,
          times_on_chart: 1,
          change: 0,
        },
      ],
    },
    waitingRoom: { items: [], label: "Poczekalnia" },
  },
  summary: { new: 0, up: 0, down: 0, same: 1, max_times_on_chart: 1 },
  name: "Lista Piosenek 357",
  no: "123",
  previous_no: "122",
  next_no: "124",
  published_at_date: "2026-09-22",
  document: "chart.pdf",
  title: "Lista Piosenek #123",
  title_template: "Lista Piosenek #{no}",
};

const buttonStub = defineComponent({
  props: {
    disabled: { type: Boolean, default: false },
    label: { type: String, default: "" },
  },
  emits: ["click"],
  setup(props, { emit }) {
    return () =>
      h("button", { disabled: props.disabled, onClick: () => emit("click") }, props.label);
  },
});

const modalStub = defineComponent({
  name: "UModal",
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: "" },
  },
  emits: ["update:open"],
  setup(props, { slots, emit }) {
    return () =>
      h(
        "div",
        { "data-playlist-dialog": props.open ? "open" : "closed" },
        props.open
          ? [
              h("h2", props.title),
              slots.body?.(),
              h("button", {
                "aria-label": "Close dialog",
                onClick: () => emit("update:open", false),
              }),
            ]
          : undefined,
      );
  },
});

function mountDialog(authenticated: boolean) {
  const pinia = createPinia();
  const spotify = useSpotifyStore(pinia);
  spotify.isAuthenticated = authenticated;

  const wrapper = mount(PlaylistExportDialog, {
    props: { chart },
    global: {
      plugins: [ui, pinia],
      stubs: {
        UButton: buttonStub,
        Button: buttonStub,
        UModal: modalStub,
        Modal: modalStub,
      },
    },
  });
  return { spotify, wrapper };
}

describe("PlaylistExportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts Spotify login when the action is clicked without an authenticated session", async () => {
    const { spotify, wrapper } = mountDialog(false);
    const connect = vi.spyOn(spotify, "connect").mockResolvedValue(undefined);
    const configured = spotify.isConfigured;

    if (configured) await wrapper.get("button").trigger("click");

    expect(wrapper.get("button").element).toHaveProperty("disabled", !configured);
    expect(connect).toHaveBeenCalledTimes(configured ? 1 : 0);
  });

  it("shows a read-only match summary for the active chart", async () => {
    vi.mocked(searchSpotifyTracks).mockResolvedValue([]);
    const { wrapper } = mountDialog(true);

    await wrapper.get("button").trigger("click");
    await vi.waitFor(() =>
      expect(wrapper.get('[data-playlist-dialog="open"]').text()).toContain("Brak wyników"),
    );

    expect(wrapper.get('[data-playlist-dialog="open"]').text()).toContain(
      "Utwórz playlistę na Spotify",
    );
    expect(wrapper.get('[data-playlist-dialog="open"]').text()).toContain("Lista Piosenek #123");
    expect(wrapper.get('[data-playlist-dialog="open"]').text()).toContain("Brak wyników");
  });

  it("keeps the reviewed chart issue fixed if the active chart changes", async () => {
    vi.mocked(searchSpotifyTracks).mockResolvedValue([]);
    const { wrapper } = mountDialog(true);

    await wrapper.get("button").trigger("click");
    await wrapper.setProps({ chart: { ...chart, no: "124", title: "Lista Piosenek #124" } });
    await flushPromises();

    expect(wrapper.get('[data-playlist-dialog="open"]').text()).toContain("Lista Piosenek #123");
    expect(wrapper.get('[data-playlist-dialog="open"]').text()).not.toContain("Notowanie 124");
  });

  it("ignores search results from a review closed before the request finishes", async () => {
    let resolveOldSearch!: (
      tracks: Array<{
        id: string;
        name: string;
        uri: string;
        artists: Array<{ name: string }>;
      }>,
    ) => void;
    vi.mocked(searchSpotifyTracks)
      .mockReturnValueOnce(new Promise((resolve) => (resolveOldSearch = resolve)))
      .mockResolvedValue([]);
    const { wrapper } = mountDialog(true);

    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(searchSpotifyTracks).toHaveBeenCalledOnce());
    await wrapper
      .get('[data-playlist-dialog="open"] button[aria-label="Close dialog"]')
      .trigger("click");
    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(searchSpotifyTracks).toHaveBeenCalledTimes(2));
    await flushPromises();

    resolveOldSearch([
      {
        id: "stale-track",
        name: "Stale result",
        uri: "spotify:track:stale-track",
        artists: [{ name: "Stale artist" }],
      },
    ]);
    await flushPromises();

    expect(wrapper.get('[data-playlist-dialog="open"]').text()).not.toContain("Stale result");
  });

  it("shows insertion progress before displaying the Spotify playlist link", async () => {
    vi.mocked(searchSpotifyTracks).mockResolvedValue([
      {
        id: "track-1",
        name: "Poczatek",
        uri: "spotify:track:track-1",
        artists: [{ name: "Meskie Granie Orkiestra" }],
      },
    ]);
    vi.mocked(getSpotifyUserProfile).mockResolvedValue({ id: "user-1", display_name: "Ada" });
    vi.mocked(createSpotifyPlaylist).mockResolvedValue({
      id: "playlist-1",
      name: "Lista Piosenek 357 #123",
      external_urls: { spotify: "https://open.spotify.com/playlist/playlist-1" },
    });
    let resolveAdd!: () => void;
    vi.mocked(addSpotifyPlaylistTracks).mockReturnValue(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );
    const { wrapper } = mountDialog(true);

    await wrapper.get("button").trigger("click");
    await flushPromises();
    const createButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Utwórz prywatną playlistę"));
    await createButton?.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Dodano 0 z 1 utworów");
    expect(wrapper.text()).not.toContain("Otwórz w Spotify");

    resolveAdd();
    await flushPromises();

    expect(wrapper.text()).toContain("Playlista została utworzona");
    expect(wrapper.text()).toContain("Otwórz w Spotify");
  });

  it("clears expired Spotify authentication after a 401", async () => {
    vi.mocked(searchSpotifyTracks).mockResolvedValue([
      {
        id: "track-1",
        name: "Poczatek",
        uri: "spotify:track:track-1",
        artists: [{ name: "Meskie Granie Orkiestra" }],
      },
    ]);
    vi.mocked(getSpotifyUserProfile).mockRejectedValue(
      new SpotifyApiError(401, "Sesja Spotify wygasła"),
    );
    const { spotify, wrapper } = mountDialog(true);
    const disconnect = vi.spyOn(spotify, "disconnect");

    await wrapper.get("button").trigger("click");
    await flushPromises();
    const createButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Utwórz prywatną playlistę"));
    await createButton?.trigger("click");
    await flushPromises();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain("Połącz ponownie ze Spotify");
  });

  it("returns to the login state when chart matching receives a 401", async () => {
    vi.mocked(searchSpotifyTracks).mockRejectedValue(new SpotifyApiError(401, "Expired"));
    const { spotify, wrapper } = mountDialog(true);
    const disconnect = vi.spyOn(spotify, "disconnect");

    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(disconnect).toHaveBeenCalledOnce());

    expect(wrapper.text()).toContain("Połącz ponownie ze Spotify");
    expect(wrapper.text()).toContain("Sesja Spotify wygasła");
  });
});
