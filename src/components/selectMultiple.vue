<script setup lang="ts"></script>

<script lang="ts">
	export default {
		data() {
			return {
				models: {
					searchOption: '',
				},
			};
		},
		props: {
			elements: {
				required: true,
				default: [] as Array<any>,
			},
			title: {
				required: false,
				type: String,
				default: '',
			},
			oIdKey: {
				required: true,
				type: String,
			},
			oTitleKey: {
				required: true,
				type: String,
			},
		},
		methods: {
			log: console.log,
			compare: function (str1: string, str2: string) {
				return str1.includes(str2);
			},
		},
	};
</script>

<template>
	<div id="multipleSelectContainer">
		<div id="multipleSelectHeader">
			<h4 v-if="title != ''">{{ title }}</h4>
			<input type="text" v-model="models.searchOption" placeholder="Search" />
		</div>
		<div id="optionsContainer">
			<label v-for="elm of elements" :key="elm[oIdKey]" v-show="models.searchOption == '' || elm[oTitleKey].toLowerCase().includes(models.searchOption.toLowerCase())"><input type="checkbox" :name="elm[oIdKey]" />{{ elm[oTitleKey] }}</label>
		</div>
	</div>
</template>

<style scoped>
	#multipleSelectContainer {
		background: #333;
		border-radius: 15px;
		margin: 5px;
		border: none;
		font-size: 15px;
		color: #fff;
		/* transition: all 0.1s ease-in-out; */
		width: 100%;
		overflow: hidden;
	}
	#optionsContainer {
		margin: 5px 10px;
		max-height: 150px;
		overflow: auto;
	}
	#multipleSelectHeader {
		padding: 2px 10px;
		background: #0002;
		display: flex;
		flex-direction: column;
	}
	label {
		user-select: none;
	}
	#multipleSelectHeader input {
		width: auto;
		flex-grow: 1;
		margin: 5px 0;
		border-radius: 5px;
	}
</style>
