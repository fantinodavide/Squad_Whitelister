<script setup lang="ts">
</script>

<template>
	<div class="blackoutBackground">
		<slot />
	</div>
</template>

<style scoped>
.blackoutBackground {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: #1118;
	z-index: 11000;
	display: flex;
	width: 100%;
	height: 100%;
    justify-content: center;
    align-items: baseline;
    padding-top: 100px;
}

</style>
