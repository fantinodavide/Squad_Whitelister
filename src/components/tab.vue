<script setup lang="ts">
</script>

<script lang="ts">
export default {
	props: {
		visible: {
			type: Boolean
		}
	}
}
</script>

<template>
	<div class="tab">
		<slot />
	</div>
</template>

<style scoped>
	.tab{
		border-radius: 20px;
		background: #fff1;
		flex-grow: 1;
	}
</style>
