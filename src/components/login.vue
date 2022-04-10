<script setup lang="ts">
import popup from "./popup.vue";
</script>

<script lang="ts">
export default {
  props: {
  }
}
var rendered = false;
</script>

<template>
  <popup :rendered="rendered" title="Login" confirm-text="Login">
    <input type="email" placeholder="Email" />
    <input type="password" placeholder="Password" />
  </popup>
</template>

<style scoped>
</style>
