<script setup lang="ts">
import login from "./components/login.vue";

</script>

<script lang="ts">
export default {
  data() {
    return {
      loginRequired: true,
      app_title: "Squad Whitelister",
      accent_color: "#ffc40b"
    }
  },
  methods: {
    getAppPersonalization: function(){
      fetch("/api/getAppPersonalization").then(res=>res.json()).then(dt=>{
        console.log(dt);
        this.app_title = dt.name;
        this.accent_color = dt.accent_color;

      });
    }
  },
  created(){
    this.getAppPersonalization();
  }
}
</script>

<template>
  <title>{{app_title}}</title>
  <header>
    <img alt="Squad Whitelister Logo" class="logo" src="./assets/logo.svg" width="125" height="125" />
  </header>

  <main>
    <login v-if="loginRequired" @cancelBtnClick="loginRequired = false" />
    <button @click="loginRequired = !loginRequired">Toggle</button>
  </main>
</template>

<style>
@import "./assets/base.css";

#app *{
  --accent-color: v-bind(accent_color);
}

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
