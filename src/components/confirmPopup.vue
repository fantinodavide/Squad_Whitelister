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
			callback: ()=>{}
		}
	},
	methods: {
	},
	components: { popup }
}
</script>

<template>
	<popup :title="title" @cancelBtnClick="$emit('cancelBtnClick', $event)">
		<span v-if="text!=''">{{text}}</span>
	</popup>
</template>

<style scoped>
</style>
