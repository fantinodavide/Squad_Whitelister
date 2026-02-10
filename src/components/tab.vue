<script setup lang="ts"></script>

<script lang="ts">
	import { stringifyStyle } from '@vue/shared';

	export default {
		props: {
			visible: {
				type: Boolean,
			},
			horizontal: {
				type: Boolean,
				default: false,
			},
			currentTab: {
				type: String,
				default: '',
			},
			complex: {
				type: Boolean,
				default: false,
			},
		},
	};
</script>

<template>
	<div class="tab" :class="{ horizontal: horizontal, [currentTab]: true, complex: complex }">
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
		margin: 20px;
	}

	.tab.horizontal {
		flex-direction: row;
	}

	.tab.Clans {
		justify-content: center;
		align-content: baseline;
	}

	.tab.complex {
		border-radius: 0;
		background: #0000;
		flex-grow: 1;
		padding: 0px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		margin: 10px;
	}
	.tab.complex > .tab {
		margin: 10px;
		flex-grow: 99999999;
	}
</style>
