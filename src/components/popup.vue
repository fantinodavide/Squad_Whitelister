<script setup lang="ts">
import blackoutBackground from "./blackoutBackground.vue";
</script>

<script lang="ts">
export default {
    props: {
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
    }
}

var rendered = false;
</script>

<template>
    <div v-if="rendered">
        <blackoutBackground></blackoutBackground>
        <div class="popupContainer">
            <h1>{{ title }}</h1>
            <slot />
            <div class="btnContainer">
                <button id="btnCancel" v-if="!hideCancel" @click="$emit('closePopup')">{{ cancelText }}</button>
                <button id="btnConfirm" v-if="!hideConfirm">{{ confirmText }}</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.btnContainer {
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
