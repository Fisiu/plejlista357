import "./assets/css/main.css";

import ui from "@nuxt/ui/vue-plugin";
import { createHead } from "@unhead/vue/client";
import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);
const head = createHead();

app.use(createPinia());
app.use(router);
app.use(head);
app.use(ui);

app.mount("#app");
