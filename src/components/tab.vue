<script setup lang="ts">
</script>

<script lang="ts">
export default {
	props: {
		visible: {
			type: Boolean
		},
		horizontal: {
			type: Boolean,
			default: false
		}
	}
}
</script>

<template>
	<div class="tab" :class="{horizontal: horizontal}">
		<slot />
	</div>
</template>

<style scoped>
	.tab{
		border-radius: 20px;
		background: #fff1;
		flex-grow: 1;
		padding: 10px;
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
	}
	.tab.horizontal{
		flex-direction: row;
	}
</style>
