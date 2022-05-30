<script setup lang="ts">
</script>

<script lang="ts">
export default {
    props: {
        title: {
            default: "Button",
            type: String
        },
        currentTab:{
            default: "Home",
            type: String
        }
    }
}
</script>

<template>
    <button @click="$emit('updateTab',title)" :class="[title==currentTab ? 'active' : '' ]">{{ title }}</button>
</template>

<style scoped>
button {
    background: #ffffff09;
    border-radius: 0;
    border-radius: 10px 10px 0 0;
    border-bottom: 3px solid #fff2;
    color: #ddd;
    padding: 10px 25px;
    max-width: 200px;
    flex-grow: 1;
    margin-bottom: 0;
    height: 40px;
    transition: all 150ms ease-in-out;
}
button.active{
    border-bottom: 3px solid var(--accent-color);
}
</style>
