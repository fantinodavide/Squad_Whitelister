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
	<div id="tabBrowser" :class="{ visible: visible }">
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
	height: 0px;
	overflow-y: hidden;
	/* transition: all 150ms ease-in-out 300ms; */
}

#tabBrowser .centerer {
	margin: auto;
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
}

#tabBrowser.visible {
	height: 45px;
}


#tabBrowser::-webkit-scrollbar {
	height: 0px;
	width: 0px;
}
</style>
