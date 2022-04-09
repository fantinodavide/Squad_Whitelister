<script setup lang="ts">
import blackoutBackground from "./blackoutBackground.vue";
defineProps({
    title: {
        default: "Popup",
        type: String
    },
    hideConfirm: {
        default: false,
        type: Boolean
    },
    hideCancel: {
        default: false,
        type: Boolean
    },
    confirmText: {
        default: "Confirm",
        type: String
    },
    cancelText: {
        default: "Cancel",
        type: String
    }
})
</script>

<template>
    <blackoutBackground></blackoutBackground>
    <div class="popupContainer">
        <h1>{{ title }}</h1>
        <slot />
        <div class="btnContainer">
            <button v-if="!hideCancel">{{cancelText}}</button>
            <button v-if="!hideConfirm">{{confirmText}}</button>
        </div>
    </div>
</template>

<style scoped>
.btnContainer{
    display: flex;
    flex-direction: row;
}
.popupContainer {
    position: fixed;
    top: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #222;
    width: fit-content;
    padding: 20px 30px;
    border-radius: 10px;
}
</style>
