<script setup lang="ts"></script>

<script lang="ts">
	export default {
		props: {
			text: {
				required: true,
				type: String,
			},
			name: {
				required: true,
				type: String,
			},
			type: {
				type: String,
				default: 'text',
			},
			value: {
				default: '',
			},
			placeholder: {
				type: String,
				default: '',
			},
		},
	};
</script>

<template>
	<label>{{ text }}<input :type="type" :value="value" :placeholder="placeholder" /><select></select></label>
</template>

<style scoped>
	label {
		height: 40px;
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		align-content: center;
		word-break: keep-all;
		white-space: nowrap;
		border-radius: 10px;
		padding-left: 10px;
		/* overflow: hidden; */
		background: #444;
	}
	label input {
		margin: 0;
		margin-left: 10px;
		flex-grow: 100;
		background: #333;
		border-radius: 0;
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
	}
</style>
