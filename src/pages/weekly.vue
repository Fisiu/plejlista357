<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { useRoute } from 'vue-router';

const route = useRoute();

useHead({
  title: 'Lista Piosenek 357 | Plejlista 357',
})

</script>

<template>
  <main>
    <h1>Weekly</h1>
    <p>Route: {{ route.fullPath }}</p>
  </main>
</template>
