import { createHead } from "@unhead/vue/client";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import App from "../App.vue";
import router from "../router";

describe("App", () => {
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
