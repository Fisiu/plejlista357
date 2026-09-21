<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { useRouter } from 'vue-router';

const router = useRouter();

useHead({
  title: 'Pusta strona | Plejlista 357',
});
</script>

<template>
  <main>
    <h1>404</h1>
    <p>Nie znaleziono strony.</p>
    <UButton @click="router.push('/weekly')">
      Wróć do listy piosenek
    </UButton>
  </main>
</template>
