<script setup lang="ts"></script>

<script lang="ts">
	import { anyTypeAnnotation } from '@babel/types';
	import { stringifyStyle } from '@vue/shared';

	export default {
		data() {
			return {
				config: {} as any,
				config_tr: {
					web_server: 'Web Server',
					app_personalization: 'Personalization',
					squadjs: 'SquadJS',
				} as any,
				keys: [] as Array<string>,
			};
		},
		props: {
			buttons: [] as Array<any>,
		},
		methods: {
			getConfig: function () {
				fetch('/api/config/read/getFull')
					.then((res) => res.json())
					.then((dt) => {
						this.config = dt;
						console.log('config', this.config);
						const cK = Object.keys(this.config);
						this.keys = cK.includes('app_personalization') ? ['app_personalization', ...cK.filter((x) => x != 'app_personalization')] : cK;
						this.selectMenu(this.config[this.keys[0]], this.keys[0]);
					});
			},
			getTranslation: function (t: any) {
				const trC = this.config_tr[t];
				return trC ? trC : this.toUpperFirstChar(t.replace(/\_/g, ' '));
			},
			toUpperFirstChar: function (string: string) {
				return string.charAt(0).toUpperCase() + string.slice(1);
			},
			selectMenu: function (o: any, key: string) {
				for (let c in this.config) this.config[c].selected = false;
				o.selected = true;
				this.$emit('menuChanged', { menu: key, config: o });
			},
		},
		created() {
			this.getConfig();
		},
	};
</script>

<template>
	<div>
		<button v-for="k of keys" :value="k" @click="selectMenu(config[k], k)" :class="{ active: config[k].selected }">
			{{ getTranslation(k) }}
		</button>
	</div>
</template>

<style scoped>
	div {
		display: flex;
		flex-direction: column;
		width: 200px;
		/* margin-right: 20px; */
		padding: 10px;
		background: var(--color-background-soft);
		border-radius: 10px;
		flex-grow: 1;
		margin: 10px;
	}
	div button {
		border-radius: 5px;
		background: #fff1;
		color: #ddd;
		padding: 10px;
		margin: 0;
		margin-bottom: 10px;
		border-left: 5px solid #fff2;
		transition: all 0.15s ease-in-out;
	}
	div button.active {
		border-color: var(--accent-color);
	}
</style>
