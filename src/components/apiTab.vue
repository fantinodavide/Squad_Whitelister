<script setup lang="ts">
	import levenshtein from 'js-levenshtein';
</script>

<script lang="ts">
	import apiKeyCard from './apiKeyCard.vue';
	import App from '@/App.vue';
	import addEditApiKey from './addEditApiKey.vue';

	import newTabIcon from '../assets/open-new-tab.svg';
	import binIcon from '../assets/bin.svg';
	import penIcon from '../assets/edit_pen.svg';

	export default {
		data() {
			return {
				models: {
					search: '',
				},
				elements: [] as Array<any>,
				app_roles: [] as any,
				editor: false,
			};
		},
		props: {
			user_session: {
				required: true,
				default: {} as any,
			},
			roles: {
				required: true,
				default: [] as any,
			},
		},
		methods: {
			log: console.log,
			appendAfterDone: function (e: any) {
				console.log(e);
				this.elements.unshift(e);
			},
			removeElement(removedElm: any) {
				this.elements = this.elements.filter((e) => e._id != removedElm._id);
			},
			checkPerms: function (callback: any = null) {
				fetch('/api/keys/checkPerm')
					.then((res) => res.json())
					.then((dt) => {
						console.log('editor?', dt);
						this.editor = true;
						if (callback) callback();
					});
			},
			async getAllApiKeys() {
				try {
					this.elements = await (await fetch('/api/keys')).json();
				} catch (error) {}
			},
		},
		async created() {
			this.checkPerms();
			this.getAllApiKeys();
		},
		components: { apiKeyCard },
	};
</script>

<template>
	<div></div>
	<input type="search" placeholder="Search Key" name="searchKey" v-model="models.search" />

	<button class="addHorizontal" @click="$emit('addNewApiKey', { callback: appendAfterDone })"></button>
	<apiKeyCard
		v-for="w of elements"
		v-show="w.name.toLowerCase().startsWith(models.search.toLowerCase()) || levenshtein(w.name.toLowerCase(), models.search.toLowerCase()) <= 2 || models.search == ''"
		:wl_data="w"
		:roles="roles"
		:key="w"
		:hoverMenuVisible="editor"
		@confirm="$emit('confirm', $event)"
		@removedApiKey="removeElement"
	/>
</template>

<style scoped>
	.tab {
		border-radius: 20px;
		background: #fff1;
		flex-grow: 1;
		padding: 10px;
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
	}

	.tab.horizontal {
		flex-direction: row;
	}

	.tab.Clans {
		justify-content: center;
		align-content: baseline;
	}

	.selectorContainer {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		margin-bottom: 10px;
		height: 40px;
		/* overflow: hidden; */
	}

	.selectorContainer > * {
		margin: 0;
	}

	.selectorContainer select {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	.selectorContainer button {
		border-radius: 0;
		background: #444;
		color: #ddd;
		flex-shrink: 0;
	}
	.selectorContainer button img {
		height: 100%;
		width: 100%;
	}

	.selectorContainer button:hover {
		background: #555;
	}

	.selectorContainer .playerCounter {
		display: flex;
		flex-direction: row;
		align-items: center;
		border: 0px;
		background: #333;
		padding: 5px 10px;
		white-space: nowrap;
	}
	.selectorContainer > *:last-child {
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
	}
</style>
