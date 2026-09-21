<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { useColorMode } from '@vueuse/core';
import { computed } from 'vue';


const colorMode = useColorMode();
const themeColor = computed(() => colorMode.value === 'dark' ? '#18181b' : '#ffffff')

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
          <UNavigation>
            <UNavigationMenu :items="navigationItems">
              <template #item="{ item }: { item: NavigationItem }">
                {{ item.shortLabel }}
              </template>
            </UNavigationMenu>
          </UNavigation>
        </template>

        <template #right>
          <UColorModeButton />

          <!-- Reserved container for Spotify Auth (Login / User Profile Avatar) -->
          <div class="flex items-center gap-2">
            <!-- Future: <SpotifyAuthButton /> -->
          </div>
          <UButton to="https://github.com/nuxt-ui-templates/starter-vue" target="_blank" icon="simple-icons:github"
            aria-label="GitHub" color="neutral" variant="ghost" />
        </template>
      </UHeader>

      <UMain class="flex-1 min-h-0!">
        <RouterView />
      </UMain>

      <USeparator icon="simple-icons:vuedotjs" />

      <UFooter>
        <template #left>
          <p class="text-sm text-muted">
            Built with Nuxt UI • © {{ new Date().getFullYear() }}
          </p>
        </template>

        <template #right>
          <UButton to="https://github.com/nuxt-ui-templates/starter-vue" target="_blank" icon="simple-icons:github"
            aria-label="GitHub" color="neutral" variant="ghost" />
        </template>
      </UFooter>
    </div>
  </UApp>
</template>

<style scoped></style>
