import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type RouterScrollBehavior,
} from "vue-router";

const routes: readonly RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/weekly",
  },
  {
    path: "/weekly",
    name: "weekly",
    component: () => import("@/pages/charts/weekly.vue"),
  },
  {
    path: "/top",
    name: "top",
    component: () => import("@/pages/charts/top.vue"),
  },
  {
    path: "/top-pl",
    name: "top-pl",
    component: () => import("@/pages/charts/top-pl.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/pages/not-found.vue"),
  },
];

const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) {
    return savedPosition;
  }
  if (to.hash) {
    return { el: to.hash, behavior: "smooth" };
  }
  return { top: 0 };
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior,
});

// Recover gracefully if a deployment causes stale dynamic import chunk 404s
router.onError((error, to) => {
  const isChunkLoadFailed =
    error.message.includes("Failed to fetch dynamically imported module") ||
    error.message.includes("Importing a module script failed");

  if (isChunkLoadFailed) {
    window.location.assign(to.fullPath);
  }
});

export default router;
