<script setup lang="ts">
import $ from 'jquery'
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
        },
        noBlackBg: {
            default: false,
            type: Boolean
        },
    },
    methods: {
        checkInputs(evt: any) {
            let inputs = this.getInputs();
            let valid = true;
            let dt: { [key: string]: any } = {};
            for (let i of inputs) {
                if (i.value == "") {
                    this.blinkBgColor(i);
                    valid = false;
                } else {
                    let cName = i.name;
                    dt[cName] = i.value
                }
            }
            if (valid) this.$emit("confirmBtnClick", dt)
        },
        blinkBgColor(elm: any, color: string = "#a228") {
            if (elm instanceof Array) for (let _e of elm) this.rawBlink(_e, color)
            else this.rawBlink(elm, color)

        },
        rawBlink(e: any, color: string) {
            e.style.backgroundColor = color;
            setTimeout(() => { e.style.backgroundColor = "" }, 2000);
        },
        getInputs() {
            return this.$el.querySelectorAll("input");
        },
        blinkAll(color: string = "#a228") {
            for(let e of this.getInputs()) this.rawBlink(e,color);
        }
    },
}
</script>

<template>
    <div >
        <div class="popupContainer" @keyup.enter="checkInputs">
            <h1>{{ title }}</h1>
            <slot />
            <div class="btnContainer">
                <button id="btnCancel" v-if="!hideCancel" @click="$emit('cancelBtnClick')">{{ cancelText }}</button>
                <button id="btnConfirm" v-if="!hideConfirm" @click="checkInputs">{{ confirmText }}</button>
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
    position: relative;
    /* top: 150px; */
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #222;
    width: fit-content;
    padding: 20px 30px;
    border-radius: 10px;
    margin-bottom: 10px;
}
</style>
