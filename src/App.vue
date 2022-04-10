<script setup lang="ts">
import login from "./components/login.vue";
</script>

<script lang="ts">
var loginRequired = true;

</script>

<template>
  <title>Squad Whitelister</title>
  <header>
    <img alt="Squad Whitelister Logo" class="logo" src="./assets/logo.svg" width="125" height="125" />
  </header>

  <main>
    <login :rendered="loginRequired"/>
    <button @click="loginRequired = !loginRequired">Toggle</button>
  </main>
</template>

<style>
@import "./assets/base.css";

header {
  height: 100px;
  padding: 20px;
  z-index: 10000;
}

main {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
</style>
