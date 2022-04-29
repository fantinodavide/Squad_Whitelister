<script setup lang="ts">
</script>

<script lang="ts">
export default {
    props: {
        title: {
            default: "Button",
            type: String
        }
    }
}
</script>

<template>
    <button @click="$emit('updateTab',title)">{{ title }}</button>
</template>

<style scoped>
button {
    background: #ffffff09;
    border-radius: 0;
    border-radius: 10px 10px 0 0;
    border-bottom: 3px solid inherit;
    color: #ddd;
    padding: 10px 10px;
    max-width: 200px;
    flex-grow: 1;
    margin-bottom: 0;
}
button.active{
    border-bottom: 3px solid var(--accent-color);
}
</style>
