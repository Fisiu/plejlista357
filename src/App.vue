<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { useColorMode } from '@vueuse/core';
import { computed, onMounted, onUnmounted, ref } from 'vue';


const colorMode = useColorMode();
const themeColor = computed(() => colorMode.value === 'dark' ? '#18181b' : '#ffffff')
const showScrollTop = ref(false);

const updateScrollTopVisibility = () => {
  showScrollTop.value = window.scrollY > 240;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

onMounted(() => {
  updateScrollTopVisibility();
  window.addEventListener('scroll', updateScrollTopVisibility, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollTopVisibility);
});

interface NavigationItem {
  label: string
  to: string
  shortLabel: string
}

const navigationItems: NavigationItem[] = [
  { label: 'Lista Piosenek 357', to: '/weekly', shortLabel: 'Lista 357' },
  { label: 'Top Radia 357', to: '/top', shortLabel: 'Top' },
  { label: 'Polski Top Radia 357', to: '/top-pl', shortLabel: 'Polski Top' },
]

useHead({
  meta: [
    { name: 'theme-color', content: () => themeColor.value }
  ],
  htmlAttrs: {
    lang: 'pl'
  }
})
</script>

<template>
  <UApp>
    <div class="min-h-screen flex flex-col">
      <UHeader>
        <template #left>
          <RouterLink to="/" aria-label="Strona główna"
            class="focus-visible:outline-3 outline-primary/25 rounded-md p-1 -ms-1">
            <AppLogo class="w-auto h-6 shrink-0" />
          </RouterLink>
        </template>

        <template #default>
          <UNavigationMenu :items="navigationItems" />
        </template>

        <template #body>
          <UNavigationMenu :items="navigationItems" orientation="vertical" class="w-full" />
        </template>

        <template #right>
          <UColorModeButton />

          <!-- Reserved container for Spotify Auth (Login / User Profile Avatar) -->
          <div class="flex items-center gap-2">
            <SpotifyAuthButton />
          </div>
        </template>
      </UHeader>

      <UMain class="flex-1 min-h-0!">
        <RouterView />
      </UMain>

      <UButton v-if="showScrollTop" icon="i-lucide-arrow-up" aria-label="Wróć na górę" title="Wróć na górę"
        color="neutral" variant="solid" class="fixed right-4 bottom-4 z-50 cursor-pointer shadow-lg"
        @click="scrollToTop" />

      <USeparator icon="simple-icons:vuedotjs" />

      <UFooter>
        <template #left>
          <p class="text-sm text-muted">
            Plejlista 357 • © {{ new Date().getFullYear() }}
          </p>
        </template>
      </UFooter>
    </div>
  </UApp>
</template>

<style scoped></style>
