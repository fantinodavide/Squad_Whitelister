<script setup lang="ts">
</script>

<template>
	<div id="tabBrowser">
		<slot />
	</div>
</template>

<style scoped>
#tabBrowser {
	width: 100%;
	margin-top: 10px;
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	overflow-x: auto;
}

#tabBrowser .centerer {
	margin: auto;
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
}
</style>
