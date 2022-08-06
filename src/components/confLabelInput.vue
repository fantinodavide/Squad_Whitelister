<script setup lang="ts"></script>

<script lang="ts">
	import { anyTypeAnnotation } from '@babel/types';
	import { stringifyStyle } from '@vue/shared';

	export default {
		data() {
			return {
				content: this.value,
				config_tr: {
					web_server: 'Web Server',
					app_personalization: 'Personalization',
				} as any,
			};
		},
		name: 'confLabelInput',
		props: {
			value: null as any,
			confKey: {
				required: true,
				type: String,
			},
		},
		methods: {
			handleInput: function (e: any) {
				this.$emit('input', this.content);
			},
			getInputType: function (o: any) {
				const tmpType = {
					string: 'text',
					number: 'number',
					boolean: 'checkbox',
				} as any;
				return o.toString().startsWith('#') ? 'color' : tmpType[typeof o];
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
		},
		created() {
			console.log('conf data', this.confKey, this.value);
		},
	};
</script>

<template>
	<div v-if="typeof content == 'object'">
		<h3>{{ toUpperFirstChar(confKey) }}</h3>
		<confLabelInput v-for="k of Object.keys(content)" :key="k" :confKey="k" :value="content[k]" @input="(e:any) => (content[k] = e.target.value)" />
	</div>
	<label v-else>{{ getTranslation(confKey) }}<input :type="getInputType(content)" v-model="content" @input="handleInput" /></label>
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
	h2,
	h3 {
		margin-bottom: 20px;
		border-bottom: 2px solid;
	}
</style>
