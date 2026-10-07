<script setup lang="ts">
import { computed, ref } from 'vue';

import { useSpotifyStore } from '@/stores/spotify';

defineProps<{
  chartTitle: string;
}>();

const spotify = useSpotifyStore();
const isOpen = ref(false);
const isDisabled = computed(() => !spotify.isAuthenticated);
</script>

<template>
  <UButton label="Utwórz playlistę na Spotify" icon="simple-icons:spotify" color="success" variant="soft" size="sm"
    :disabled="isDisabled" :class="{ 'cursor-pointer': !isDisabled }" @click="isOpen = true" />

  <UModal v-model:open="isOpen" title="Utwórz playlistę na Spotify" :ui="{ overlay: 'bg-black/30' }">
    <template #body>
      <div class="min-h-24">
        <p class="font-medium text-highlighted">{{ chartTitle }}</p>
      </div>
    </template>
  </UModal>
</template>
