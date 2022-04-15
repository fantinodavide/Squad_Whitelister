<script setup lang="ts">
import popup from "./popup.vue";
</script>

<script lang="ts">
export default {
  methods: {
    cancelClick: function (dt:any) {
      console.log("tomare",dt);
    }
  }
}
</script>

<template>
  <popup title="Login" confirm-text="Login" @cancelBtnClick="$emit('cancelBtnClick',$event)" :hide-cancel="true">
    <input type="email" placeholder="Email" />
    <input type="password" placeholder="Password" />
  </popup>
</template>

<style scoped>
</style>
