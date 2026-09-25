import { createHead } from "@unhead/vue/client";
import { createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import App from "../App.vue";
import router from "../router";

describe("App", () => {
  let scrollToSpy: MockInstance;
  beforeEach(() => {
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("shows a button to return to the top after scrolling", async () => {
    await router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router, createHead(), createPinia()],
      },
    });

    Object.defineProperty(window, "scrollY", { configurable: true, value: 300 });
    window.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();

    const scrollTopButton = wrapper.get('button[aria-label="Wróć na górę"]');

    await scrollTopButton.trigger("click");
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("renders the application shell", async () => {
    await router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router, createHead(), createPinia()],
      },
    });

    expect(wrapper.text()).toContain("Plejlista 357");
  });
});
