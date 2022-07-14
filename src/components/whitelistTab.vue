<script setup lang="ts">
	import levenshtein from 'js-levenshtein';
</script>

<script lang="ts">
	import { anyTypeAnnotation } from '@babel/types';
	import { stringifyStyle } from '@vue/shared';
	import $ from 'jquery';

	import whitelistUserCard from './whitelistUserCard.vue';

	export default {
		data() {
			return {
				models: {
					searchPlayer: '',
				},
				whitelist_clans: [] as Array<any>,
				sel_clan: {} as any,
				sel_clan_obj: {} as any,
				wl_players: [] as Array<any>,
				editor: false,
				record_refs: [] as Array<any>,
				user_session: null as any,
			};
		},
		methods: {
			log: console.log,
			getWhitelistTabClans: function () {
				fetch('/api/whitelist/read/getAllClans')
					.then((res) => res.json())
					.then((dt) => {
						this.whitelist_clans = dt;
						console.log('All clans:', dt);

						fetch('/api/checkSession')
							.then((res) => res.json())
							.then((dt) => {
								this.user_session = dt.userSession;
								console.log(dt);
								this.sel_clan = dt.userSession.clan_code ? this.whitelist_clans.filter((c) => c.clan_code == dt.userSession.clan_code)[0]._id : this.whitelist_clans[0]._id;
								this.getClanWhitelist();
							});
					});
			},
			selectClanChanged: function (e: any, not_event = false) {
				this.record_refs = [];
				this.sel_clan = not_event ? e : e.target.value;
				this.getClanWhitelist();
			},
			getElmByName(name: string) {
				return this.$el.querySelector('input[name="' + name + '"]');
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
				// console.log('removing player', e, this.wl_players);
				this.wl_players = this.wl_players.filter((p) => p._id != e._id);
			},
			appendPlayer: function (e: any) {
				this.wl_players.push(e);
			},
			removeAllPlayers: function () {
				const delay = 50;
				let c = 0;
				for (let p of this.wl_players) {
					setTimeout(() => {
						this.removePlayer(p);
					}, delay * c++);
				}
			},
			clearAllList: function () {
				// const delay = 50;
				// let c = 0;
				// for (let pr of this.record_refs) {
				// 	setTimeout(() => {
				// 		pr.deleteRecord(() => {
				// 			this.removePlayer(pr.wl_data);
				// 		}, true);
				// 	}, delay * c++);
				// }
				$.ajax({
					url: '/api/whitelist/write/clearList',
					type: 'post',
					data: JSON.stringify({ sel_clan_id: this.sel_clan }),
					dataType: 'json',
					contentType: 'application/json',
					success: (dt) => {
						this.wl_players = [];
					},
					error: (err) => {
						console.error(err);
					},
				});
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
		<select name="list_selector">
			<option value="wl">Main</option>
			<!-- <option v-for="c of whitelist_clans" :value="c._id" :selected="user_session && user_session.clan_code && user_session.clan_code == c.clan_code">{{ c.full_name }}</option> -->
		</select>
		<button v-if="editor" style="font-size: 25px">+</button>
	</div>
	<div class="selectorContainer">
		<select name="clan_selector" :disabled="whitelist_clans.length == 1" @change="selectClanChanged">
			<option v-for="c of whitelist_clans" :value="c._id" :selected="user_session && user_session.clan_code && user_session.clan_code == c.clan_code">{{ c.full_name }}</option>
		</select>
		<button v-if="editor" @click="$emit('import_whitelist', { sel_clan: sel_clan, callback: appendPlayer })">Import</button>
		<button v-if="editor" @click="$emit('confirm_clearing', { callback: clearAllList })">Clear</button>
		<span class="playerCounter">{{ wl_players.length }}/ {{ sel_clan_obj.player_limit && sel_clan_obj.player_limit != '' ? sel_clan_obj.player_limit : '&infin;' }}</span>
	</div>
	<input type="search" placeholder="Search Player" name="plrSearch" v-model="models.searchPlayer" />

	<button v-if="editor" class="addHorizontal" @click="$emit('addNewWhitelistUser', { sel_clan: sel_clan, callback: appendPlayer })"></button>
	<whitelistUserCard v-for="w of wl_players" v-show="w.username.toLowerCase().startsWith(models.searchPlayer.toLowerCase()) || levenshtein(w.username.toLowerCase(), models.searchPlayer.toLowerCase()) <= 2 || models.searchPlayer == ''" :ref="(r:any)=>{record_refs.push(r)}" :wl_data="w" :hoverMenuVisible="editor" @confirm="$emit('confirm', $event)" @removedPlayer="removePlayer" />
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
