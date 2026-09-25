import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router"; // 1. Import router helpers

const mocks = vi.hoisted(() => ({
  spotify: {
    displayName: undefined as string | undefined,
    error: undefined as string | undefined,
    isAuthenticated: false,
    isConfigured: true,
    isLoading: false,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    restoreSession: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/stores/spotify", () => ({
  useSpotifyStore: () => mocks.spotify,
}));

import SpotifyAuthButton from "@/components/SpotifyAuthButton.vue";

function mountButton() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { template: "<div />" } }],
  });

  return mount(SpotifyAuthButton, {
    attachTo: document.body,
    global: {
      plugins: [router],
    },
  });
}

describe("SpotifyAuthButton", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    mocks.spotify.displayName = undefined;
    mocks.spotify.error = undefined;
    mocks.spotify.isAuthenticated = false;
    mocks.spotify.isConfigured = true;
    mocks.spotify.isLoading = false;
    mocks.spotify.connect.mockReset();
    mocks.spotify.disconnect.mockReset();
    mocks.spotify.restoreSession.mockReset();
  });

  it("starts Spotify login when the connect button is clicked", async () => {
    const wrapper = mountButton();

    await wrapper.get("button").trigger("click");

    expect(mocks.spotify.connect).toHaveBeenCalledOnce();
    expect(mocks.spotify.restoreSession).toHaveBeenCalledOnce();
  });

  it("exposes logout from the authenticated account menu", async () => {
    mocks.spotify.isAuthenticated = true;
    mocks.spotify.displayName = "Ada";

    const wrapper = mountButton();
    await flushPromises();

    expect(wrapper.text()).toContain("Ada");

    // 1. Click the real trigger button to open Reka UI's menu
    const triggerBtn = wrapper.get('button[aria-label="Menu konta Spotify"]');
    await triggerBtn.trigger("click");
    await flushPromises();

    // 2. Query the teleported item from document.body
    const logoutItem = document.body.querySelector<HTMLElement>('[role="menuitem"]');
    expect(logoutItem).not.toBeNull();
    expect(logoutItem?.textContent).toContain("Wyloguj ze Spotify");

    // 3. Trigger the click event on the teleported menu item
    logoutItem?.click();
    await flushPromises();

    expect(mocks.spotify.disconnect).toHaveBeenCalledOnce();
  });
});
