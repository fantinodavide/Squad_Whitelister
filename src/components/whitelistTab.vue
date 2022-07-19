<script setup lang="ts">
	import levenshtein from 'js-levenshtein';
</script>

<script lang="ts">
	import { anyTypeAnnotation } from '@babel/types';
	import { stringifyStyle } from '@vue/shared';
	import $ from 'jquery';

	import whitelistUserCard from './whitelistUserCard.vue';

	import newTabIcon from '../assets/open-new-tab.svg';
	import binIcon from '../assets/bin.svg';
	import penIcon from '../assets/edit_pen.svg';

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
				editor_lists: false,
				record_refs: [] as Array<any>,
				// user_session: null as any,
				lists: [] as Array<any>,
				sel_list_id: null as any,
				sel_list_obj: {} as any,
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
			getWhitelistTabClans: function (callback: any) {
				fetch('/api/whitelist/read/getAllClans')
					.then((res) => res.json())
					.then((dt) => {
						this.whitelist_clans = dt;
						console.log('All clans:', dt);
						if (callback) callback();
					});
			},
			selectClanChanged: function (e: any, not_event = false) {
				this.record_refs = [];
				this.sel_clan = not_event ? e : e.target.value;
				this.getClanWhitelist();
			},
			selectListChanged: function (e: any, not_event = false) {
				this.record_refs = [];
				this.sel_list_id = e.target.value;
				this.sel_list_obj = this.lists.filter((l) => l._id == this.sel_list_id)[0];
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
					data: { sel_list_id: this.sel_list_id, sel_clan_id: this.sel_clan },
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
			getLists: function (callback: any = null, selectLast = false) {
				$.ajax({
					url: '/api/lists/read/getAll',
					type: 'get',
					dataType: 'json',
					success: (dt) => {
						console.log('Lists', dt);
						this.lists = dt;
						this.record_refs = [];
						this.sel_list_obj = selectLast ? dt[dt.length - 1] : dt[0];
						this.sel_list_id = this.sel_list_obj._id;
						const clan_id = this.user_session.clan_code ? this.whitelist_clans.filter((c) => c.clan_code == this.user_session.clan_code)[0]._id : this.whitelist_clans[0]._id;

						this.selectClanChanged(clan_id, true);
						// this.getClanWhitelist();

						if (callback) callback();
					},
					error: (err) => {
						console.error(err);
					},
				});
			},
			checkPerms: function (callback: any = null) {
				fetch('/api/whitelist/write/checkPerm')
					.then((res) => res.json())
					.then((dt) => {
						console.log('editor?', dt);
						this.editor = true;
						if (callback) callback();
					});
			},
			checkPermsLists: function (callback: any = null) {
				fetch('/api/lists/write/checkPerm')
					.then((res) => res.json())
					.then((dt) => {
						console.log('editor lists?', dt);
						this.editor_lists = true;
						if (callback) callback();
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
			clearAllList: function (cbData: any) {
				// const delay = 50;
				// let c = 0;
				// for (let pr of this.record_refs) {
				// 	setTimeout(() => {
				// 		pr.deleteRecord(() => {
				// 			this.removePlayer(pr.wl_data);
				// 		}, true);
				// 	}, delay * c++);
				// }
				// if (cbData && cbData.closePopup) cbData.closePopup();
				$.ajax({
					url: '/api/whitelist/write/clearList',
					type: 'post',
					data: JSON.stringify({ sel_list_id: this.sel_list_id, sel_clan_id: this.sel_clan }),
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
			deleteList: function (cbData: any) {
				$.ajax({
					url: '/api/lists/write/deleteList',
					type: 'post',
					data: JSON.stringify({ sel_list_id: this.sel_list_id }),
					dataType: 'json',
					contentType: 'application/json',
					success: (dt) => {
						this.getLists(this.getWhitelistTabClans);
						if (cbData && cbData.closePopup) cbData.closePopup();
					},
					error: (err) => {
						console.error(err);
					},
				});
			},
			newListCreated: function () {
				this.getLists(this.getWhitelistTabClans, true);
			},
			openNewTab: function (url: string) {
				window.open(url, '_blank');
			},
			openListOutput: function () {
				this.openNewTab(window.location.origin + '/' + this.lists.filter((l) => l._id == this.sel_list_id)[0].output_path);
			},
			openClanOutput: function () {
				this.openNewTab(window.location.origin + '/' + this.lists.filter((l) => l._id == this.sel_list_id)[0].output_path + '/' + this.sel_clan_obj.clan_code);
			},
			listEdited: function () {
				this.getLists(this.getWhitelistTabClans);
			},
			// getSession: function (callback: any) {
			// 	fetch('/api/checkSession')
			// 		.then((res) => res.json())
			// 		.then((dt) => {
			// 			this.user_session = dt.userSession;
			// 			console.log(dt);
			// 			if (callback) callback();
			// 			// this.getClanWhitelist();
			// 			// this.selectClanChanged(clan_id, true);
			// 		});
			// },
		},
		created() {
			this.checkPerms();
			this.checkPermsLists();
			this.getWhitelistTabClans(this.getLists);
			// this.getSession(() => {
			// });
		},
		components: { whitelistUserCard },
	};
</script>

<template>
	<div class="selectorContainer">
		<select name="list_selector" :disabled="lists.length <= 1" @change="selectListChanged">
			<option v-for="l of lists" :value="l._id" :selected="sel_list_id == l._id">{{ l.title }}</option>
			<!-- <option v-for="c of whitelist_clans" :value="c._id" :selected="user_session && user_session.clan_code && user_session.clan_code == c.clan_code">{{ c.full_name }}</option> -->
		</select>
		<button v-if="editor_lists" style="font-size: 25px" @click="$emit('addNewList', { callback: newListCreated })">+</button>
		<button v-if="editor_lists" style="padding: 10px" @click="$emit('editList', { list_obj: sel_list_obj, callback: listEdited })"><img :src="penIcon" /></button>
		<button v-if="editor_lists" style="padding: 10px" @click="openListOutput"><img :src="newTabIcon" /></button>
		<button v-if="editor_lists" style="padding: 10px" @click="$emit('confirm_standard', { title: `Confirm list deletion?`, text: `Do you really want to delete list ${sel_list_obj.title}?`, callback: deleteList })"><img :src="binIcon" /></button>
	</div>
	<div class="selectorContainer">
		<select name="clan_selector" :disabled="whitelist_clans.length <= 1" @change="selectClanChanged">
			<option v-for="c of whitelist_clans" :value="c._id" :selected="user_session && user_session.clan_code && user_session.clan_code == c.clan_code">{{ c.full_name }}</option>
		</select>
		<button v-if="editor" @click="$emit('import_whitelist', { sel_list_id: sel_list_id, sel_clan: sel_clan, callback: appendPlayer })">Import</button>
		<button v-if="editor" @click="$emit('confirm_clearing', { callback: clearAllList })">Clear</button>
		<button v-if="editor" style="padding: 10px" @click="openClanOutput"><img :src="newTabIcon" /></button>
		<span class="playerCounter">{{ wl_players.length }}/ {{ sel_clan_obj?.player_limit && sel_clan_obj?.player_limit != '' ? sel_clan_obj.player_limit : '&infin;' }}</span>
	</div>
	<input type="search" placeholder="Search Player" name="plrSearch" v-model="models.searchPlayer" />

	<button v-if="editor" class="addHorizontal" @click="$emit('addNewWhitelistUser', { sel_list_id: sel_list_id, sel_clan: sel_clan, callback: appendPlayer })"></button>
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
