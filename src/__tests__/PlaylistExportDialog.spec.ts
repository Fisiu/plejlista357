import { mount } from "@vue/test-utils";
import ui from "@nuxt/ui/vue-plugin";
import { createPinia } from "pinia";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";

import PlaylistExportDialog from "@/components/PlaylistExportDialog.vue";
import { useSpotifyStore } from "@/stores/spotify";

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
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        { "data-playlist-dialog": props.open ? "open" : "closed" },
        props.open ? [h("h2", props.title), slots.body?.()] : undefined,
      );
  },
});

function mountDialog(authenticated: boolean) {
  const pinia = createPinia();
  const spotify = useSpotifyStore(pinia);
  spotify.isAuthenticated = authenticated;

  return mount(PlaylistExportDialog, {
    props: { chartTitle: "Najlepsze utwory tygodnia" },
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
}

describe("PlaylistExportDialog", () => {
  it("disables playlist creation when Spotify is not authenticated", () => {
    const wrapper = mountDialog(false);

    expect(wrapper.get("button").element).toHaveProperty("disabled", true);
  });

  it("opens an empty dialog for authenticated users", async () => {
    const wrapper = mountDialog(true);

    await wrapper.get("button").trigger("click");

    expect(wrapper.get('[data-playlist-dialog="open"]').text()).toContain(
      "Utwórz playlistę na Spotify",
    );
    expect(wrapper.get('[data-playlist-dialog="open"]').text()).toContain(
      "Najlepsze utwory tygodnia",
    );
  });
});
