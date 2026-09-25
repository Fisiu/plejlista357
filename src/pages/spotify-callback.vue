<script setup lang="ts">
import { useSpotifyStore } from "@/stores/spotify";
import { useHead } from "@unhead/vue";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

useHead({ title: "Łączenie ze Spotify | Plejlista 357" });

const route = useRoute();
const router = useRouter();
const spotify = useSpotifyStore();
const errorMessage = ref<string>();

onMounted(async () => {
  if (route.query.error) {
    const desc = route.query.error_description ? `: ${route.query.error_description}` : "";
    errorMessage.value = `Błąd autoryzacji Spotify (${route.query.error})${desc}`;
    return;
  }

  try {
    await spotify.handleCallback();
    const returnPath = sessionStorage.getItem(spotify.returnPathStorageKey);
    sessionStorage.removeItem(spotify.returnPathStorageKey);
    const safeReturnPath = returnPath?.startsWith("/") && !returnPath.startsWith("//") && !returnPath.startsWith("/\\")
      ? returnPath
      : "/";
    await router.replace(safeReturnPath);
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : "Nie udało się dokończyć autoryzacji.";
  }
});
</script>

<template>
  <UPage>
    <UPageBody class="flex flex-col items-center justify-center gap-4 py-12">
      <template v-if="errorMessage">
        <UAlert color="error" variant="soft" :title="errorMessage" />
        <UButton to="/" label="Wróć do strony głównej" variant="ghost" />
      </template>
      <template v-else>
        <UProgress class="w-48" animation="carousel" aria-label="Łączenie ze Spotify" />
        <p class="text-sm text-neutral-500">Logowanie do Spotify...</p>
      </template>
    </UPageBody>
  </UPage>
</template>
