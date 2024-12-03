<script setup lang="ts">
import { assertExpressionStatement } from "@babel/types";
import $ from 'jquery';
import popup from "./popup.vue";
</script>

<script lang="ts">
export default {
	data() {
		return {
			title: "",
			text: "",
			confirmBtnText: "Confirm",
			confirmBtnShow: true,
			rejectBtnText: "Reject",
			rejectBtnShow: true,
			callback: () => { }
		}
	},
	methods: {
		setProps: function (title: string, text: string) {
			this.title = title;
			this.text = text;
		},
		setCallback: function (cb = ()=>{}) {
			this.callback = cb
		}
	},
	components: { popup }
}
</script>

<template>
	<popup ref="confirmPopup" :title="title" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="callback">
		<span v-if="text != ''">{{ text }}</span>
	</popup>
</template>

<style scoped>
</style>
