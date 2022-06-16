<script setup lang="ts">
	import { assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import popup from './popup.vue';
</script>

<script lang="ts">
	export default {
		data() {
			return {
				importSteps: [
					{
						title: 'Loading List',
						confBtnText: 'Next',
					},
					{
						title: 'Setup Groups',
						confBtnText: 'Next',
					},
					{
						title: 'Import',
						confBtnText: 'Import',
					},
				],
				currentStep: 0,
			};
		},
		methods: {
			confirmBtnClick(dt: any) {
				if (this.currentStep < this.importSteps.length - 1) {
					this.currentStep++;

					if (this.currentStep == 1) {
						const listImport = this.$el
							.querySelector('textarea')
							.value.split('\n')
							.filter((a: any) => a != '' && a.startsWith('Admin'));
						let parListImport = [] as Array<any>;
						const reg = /^Admin=(?<steamid>\d{17}):(?<group>.[a-zA-Z_]{1,})((\s\/{2}\s?)(?<comment>.{1,}))?/gm;

						listImport.forEach((elm: any, key: any) => {
							const r = elm;
							const regRes = reg.exec(r);
							parListImport.push(regRes?.groups);
						});
						console.log('List Import', listImport, parListImport);
					}
				}
				// console.log(dt);
				// $.ajax({
				// 	url: '/api/gameGroups/write/newGroup',
				// 	type: 'post',
				// 	dataType: 'json',
				// 	data: JSON.stringify(dt),
				// 	contentType: 'application/json',
				// 	success: (dt) => {
				// 		console.log(dt);
				// 		this.$emit('new_game_group', dt);
				// 	},
				// 	error: (err) => {
				// 		console.error(err);
				// 		const compPopup: any = this.$refs.popupComp;
				// 		compPopup.blinkAll();
				// 		//.blinkBgColor(this.$refs.popupLogin.getInputs());
				// 	},
				// });
			},
		},
		components: { popup },
	};
</script>

<template>
	<popup id="popup" :class="{ big: currentStep == 0 }" ref="popupComp" title="Import List" :confirmText="importSteps[currentStep].confBtnText" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick">
		<h3>{{ importSteps[currentStep].title }}</h3>
		<textarea ref="txtList" v-show="currentStep == 0" placeholder="Paste here your whitelist"></textarea>
	</popup>
</template>

<style scoped>
	#popup {
		width: auto;
		height: auto;
		max-height: calc(100% - 30px);
	}

	#popup.big {
		width: 700px !important;
		height: 900px !important;
	}

	#popup textarea {
		flex-grow: 1;
		white-space: nowrap;
	}
</style>
