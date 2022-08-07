<script setup lang="ts"></script>

<script lang="ts">
	import { anyTypeAnnotation } from '@babel/types';
	import { stringifyStyle } from '@vue/shared';
	import $ from 'jquery';
	import { type } from 'os';
	import SideMenu from './sideMenu.vue';
	import tab from './tab.vue';
	import confLabelInput from './confLabelInput.vue';

	export default {
		data() {
			return {
				currentConfigMenu: {} as any,
				selectedMenu: '' as string,
				config_tr: {} as any,
			};
		},
		methods: {
			log: console.log,
			getInputType: function (o: any) {
				const tmpType = {
					string: 'text',
					number: 'number',
					boolean: 'checkbox',
				} as any;
				return o.toString().startsWith('#') ? 'color' : tmpType[typeof o];
			},
			configMenuChanged: function (e: any) {
				let cpe = { ...e.config };
				delete cpe.selected;
				this.selectedMenu = e.menu;

				this.currentConfigMenu = cpe;
			},
			getTranslation: function (t: string) {
				const trC = this.config_tr[t];
				return trC ? trC : this.toUpperFirstChar(t.replace(/\_/g, ' '));
			},
			toUpperFirstChar: function (string: string) {
				return string.charAt(0).toUpperCase() + string.slice(1);
			},
			convHex6digs: function (hex: any) {
				if (hex.toString().startsWith('#')) {
					return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
				} else return hex;
			},
			sendConfigToServer: function () {
				console.log('Saving_config:', this.selectedMenu, this.currentConfigMenu);
			},
		},
		created() {},
		components: { SideMenu, tab, confLabelInput },
	};
</script>

<template>
	<SideMenu @menuChanged="configMenuChanged" />
	<tab>
		<!-- {{ JSON.stringify(currentConfigMenu) }} -->
		<div class="ct">
			<!-- <label v-for="k of Object.keys(currentConfigMenu)">{{ getTranslation(k) }}<input :type="getInputType(currentConfigMenu[k])" v-model="currentConfigMenu[k]" /></label> -->
			<confLabelInput v-for="k of Object.keys(currentConfigMenu)" :key="k" :confKey="k" :modelValue="currentConfigMenu[k]" @update:modelValue="(nv) => (currentConfigMenu[k] = nv)" />
			<button style="float: right; width: 100px" @click="$emit('confirm', { title: 'Save server configuration?', text: 'Are you sure you want to change the server configuration? Bad configuration may result into multiple failures or temporary data loss.', callback: sendConfigToServer })">Save</button>
		</div>
	</tab>
</template>

<style scoped>
	label {
		flex-wrap: nowrap;
		white-space: nowrap;
	}
	label > input {
		margin-left: 10px;
	}
	div.ct {
		margin: 0 auto;
	}
</style>
