<script setup lang="ts"></script>

<script lang="ts">
	import { anyTypeAnnotation } from '@babel/types';
	import { stringifyStyle } from '@vue/shared';
	import $ from 'jquery';
	import whitelistUserCard from './whitelistUserCard.vue';

	export default {
		data() {
			return {
				whitelist_clans: [] as Array<any>,
				sel_clan: {} as any,
				sel_clan_obj: {} as any,
				wl_players: [] as Array<any>,
				editor: false,
			};
		},
		methods: {
			log: console.log,
			getWhitelistTabClans: function () {
				fetch('/api/whitelist/read/getAllClans')
					.then((res) => res.json())
					.then((dt) => {
						this.whitelist_clans = dt;
						this.sel_clan = this.whitelist_clans[0]._id;
						this.getClanWhitelist();
					});
			},
			selectClanChanged: function (e: any) {
				this.sel_clan = e.target.value;
				this.getClanWhitelist();
			},
			getClanWhitelist() {
				this.sel_clan_obj = this.whitelist_clans.filter((a: any) => a._id == this.sel_clan)[0];
				console.log('Sel clan', this.sel_clan, this.sel_clan_obj);
				$.ajax({
					url: '/api/whitelist/read/getAll',
					type: 'get',
					data: { sel_clan_id: this.sel_clan },
					dataType: 'json',
					contentType: 'application/json',
					success: (dt) => {
						console.log('Whitelist player', dt);
						this.wl_players = dt;
					},
					error: (err) => {
						console.error(err);
					},
				});
			},
			checkPerms: function () {
				fetch('/api/whitelist/write/checkPerm')
					.then((res) => res.json())
					.then((dt) => {
						console.log('editor?', dt);
						this.editor = true;
					});
			},
			removePlayer: function (e: any) {
				console.log('removing player', e, this.wl_players);
				this.wl_players = this.wl_players.filter((p) => p._id != e._id);
			},
			appendPlayer: function (e: any) {
				this.wl_players.push(e);
			},
		},
		created() {
			this.checkPerms();
			this.getWhitelistTabClans();
		},
		components: { whitelistUserCard },
	};
</script>

<template>
	<div class="selectorContainer">
		<select name="clan_selector" ref="clan_selector" :disabled="whitelist_clans.length == 1" @change="selectClanChanged">
			<option v-for="c of whitelist_clans" :value="c._id">{{ c.full_name }}</option>
		</select>
		<button v-if="editor" @click="$emit('import_whitelist')">Import</button>
		<span class="playerCounter">{{ sel_clan_obj.player_count }}/ {{ sel_clan_obj.player_limit && sel_clan_obj.player_limit != '' ? sel_clan_obj.player_limit : '&infin;' }}</span>
	</div>

	<button v-if="editor" class="addHorizontal" @click="$emit('addNewWhitelistUser', { sel_clan: sel_clan, callback: appendPlayer })"></button>
	<whitelistUserCard v-for="w of wl_players" :wl_data="w" :hoverMenuVisible="editor" @confirm="$emit('confirm', $event)" @removedPlayer="removePlayer" />
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
	}

	.selectorContainer button:hover {
		background: #555;
	}

	.selectorContainer .playerCounter {
		display: flex;
		flex-direction: row;
		align-items: center;
		border: 0px;
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
		background: #333;
		padding: 5px 10px;
		white-space: nowrap;
	}
</style>
