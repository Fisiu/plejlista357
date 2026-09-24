import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  route: {
    query: {} as Record<string, string>,
  },
  spotify: {
    handleCallback: vi.fn(),
  },
}));

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();
  return {
    ...actual,
    useRoute: () => mocks.route,
    useRouter: () => ({ replace: mocks.replace }),
  };
});

vi.mock("@/stores/spotify", () => ({
  useSpotifyStore: () => mocks.spotify,
}));

vi.mock("@unhead/vue", () => ({
  useHead: vi.fn(),
}));

import SpotifyCallback from "@/pages/spotify-callback.vue";

function mountCallback() {
  return mount(SpotifyCallback, {
    global: {
      stubs: {
        UPage: { template: "<div><slot /></div>" },
        UPageBody: { template: "<div><slot /></div>" },
        UProgress: true,
        UAlert: { props: ["title"], template: '<div role="alert">{{ title }}</div>' },
        UButton: { props: ["to", "label"], template: "<button>{{ label }}</button>" },
        RouterLink: true,
      },
    },
  });
}

describe("spotify-callback.vue", () => {
  beforeEach(() => {
    mocks.route.query = {};
    mocks.replace.mockReset();
    mocks.spotify.handleCallback.mockReset();
  });

  it("handles successful callback and navigates to /weekly", async () => {
    mocks.spotify.handleCallback.mockResolvedValueOnce(undefined);

    mountCallback();
    await flushPromises();

    expect(mocks.spotify.handleCallback).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith("/weekly");
  });

  it("displays error alert when Spotify returns an error query parameter", async () => {
    mocks.route.query = {
      error: "access_denied",
      error_description: "The user denied access",
    };

    const wrapper = mountCallback();
    await flushPromises();

    expect(mocks.spotify.handleCallback).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("access_denied");
    expect(wrapper.text()).toContain("The user denied access");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("renders error state when handleCallback throws an exception", async () => {
    mocks.spotify.handleCallback.mockRejectedValueOnce(new Error("Network failure"));

    const wrapper = mountCallback();
    await flushPromises();

    expect(wrapper.text()).toContain("Network failure");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
