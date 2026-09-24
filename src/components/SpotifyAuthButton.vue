<script setup lang="ts">
import { onMounted } from "vue";
import { useSpotifyStore } from "@/stores/spotify";

const spotify = useSpotifyStore();

const accountMenuItems = [[
  {
    label: "Wyloguj ze Spotify",
    icon: "i-lucide-log-out",
    class: "cursor-pointer",
    onSelect: () => spotify.disconnect(),
  },
]];

onMounted(async () => {
  await spotify.restoreSession();
});
</script>

<template>
  <UDropdownMenu v-if="spotify.isAuthenticated" :items="accountMenuItems">
    <UButton :label="spotify.displayName" icon="simple-icons:spotify" trailing-icon="i-lucide-chevron-down"
      color="neutral" variant="ghost" :loading="spotify.isLoading" aria-label="Menu konta Spotify"
      title="Menu konta Spotify" class="cursor-pointer" />
  </UDropdownMenu>
  <UButton v-else label="Połącz ze Spotify" icon="simple-icons:spotify" color="success" variant="soft"
    :loading="spotify.isLoading" :disabled="!spotify.isConfigured" :class="{ 'cursor-pointer': spotify.isConfigured }"
    @click="spotify.connect" />
  <span v-if="spotify.error" class="sr-only" role="alert">{{ spotify.error }}</span>
</template>
