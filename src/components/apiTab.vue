<script setup lang="ts">
	import levenshtein from 'js-levenshtein';
</script>

<script lang="ts">
	import whitelistUserCard from './whitelistUserCard.vue';
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
			};
		},
		props: {
			user_session: {
				required: true,
				default: {} as any,
			},
		},
		methods: {
			log: console.log,
		},
		async created() {
			this.app_roles = await App.methods?.getRolesRet();
		},
		components: { whitelistUserCard },
	};
</script>

<template>
	<div></div>
	<!-- <input type="search" placeholder="Search Player" name="plrSearch" v-model="models.search" /> -->

	<!-- <button class="addHorizontal" @click="$emit('addNewApiKey', { callback: appendPlayer })"></button> -->
	<!-- <whitelistUserCard v-for="w of wl_players" v-show="w.username.toLowerCase().startsWith(models.search.toLowerCase()) || levenshtein(w.username.toLowerCase(), models.search.toLowerCase()) <= 2 || models.search == ''" :ref="(r:any)=>{record_refs.push(r)}" :wl_data="w" :hoverMenuVisible="editor" @confirm="$emit('confirm', $event)" @removedPlayer="removePlayer" /> -->
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
