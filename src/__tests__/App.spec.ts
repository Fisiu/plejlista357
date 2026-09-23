import { createHead } from "@unhead/vue/client";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import App from "../App.vue";
import router from "../router";

describe("App", () => {
  it("shows a button to return to the top after scrolling", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    await router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router, createHead()],
      },
    });

    Object.defineProperty(window, "scrollY", { configurable: true, value: 300 });
    window.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();

    const scrollTopButton = wrapper.get('button[aria-label="Wróć na górę"]');

    await scrollTopButton.trigger("click");
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    scrollTo.mockRestore();
  });

  it("renders the application shell", async () => {
    await router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router, createHead()],
      },
    });

    expect(wrapper.text()).toContain("Built with Nuxt UI");
  });
});
