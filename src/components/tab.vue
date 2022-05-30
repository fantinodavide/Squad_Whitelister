<script setup lang="ts">
</script>

<script lang="ts">
import { anyTypeAnnotation } from '@babel/types';
import { stringifyStyle } from '@vue/shared';

export default {
	props: {
		visible: {
			type: Boolean
		},
		horizontal: {
			type: Boolean,
			default: false
		},
		currentTab: {
			type: String,
			default: ""
		},
	}
}
</script>

<template>
	<div class="tab" :class="{ horizontal: horizontal, [currentTab]: true }">
		<slot />
	</div>
</template>

<style scoped>
.tab {
	border-radius: 20px;
	background: #fff1;
	flex-grow: 1;
	padding: 10px;
	display: flex;
	flex-direction: column;
	flex-wrap: wrap;
}

.tab.horizontal {
	flex-direction: row;
}

.tab.Clans {
	justify-content: center;
	align-content: baseline;
}
</style>
