<script setup lang="ts"></script>

<script lang="ts">
	import { anyTypeAnnotation } from '@babel/types';
	import { stringifyStyle } from '@vue/shared';
	import $ from 'jquery';
	import approveUserCard from './approveUserCard.vue';

	export default {
		data() {
			return {
				whitelist_clans: [] as Array<any>,
				sel_clan: {} as any,
				wl_approvals: [] as Array<any>,
				editor: false,
			};
		},
		methods: {
			log: console.log,
			getWhitelistTabClans: function () {
				fetch('/api/whitelist/read/getPendingApprovalClans')
					.then((res) => res.json())
					.then((dt) => {
						this.whitelist_clans = dt;
						console.log('Pending approval clans:', dt);
						this.sel_clan = this.whitelist_clans[0]._id;
						this.getClanWhitelist();
					});
			},
			selectClanChanged: function (e: any) {
				this.sel_clan = e.target.value;
				this.getClanWhitelist();
			},
			getClanWhitelist() {
				$.ajax({
					url: '/api/whitelist/read/getPendingApproval',
					type: 'get',
					data: { sel_clan_id: this.sel_clan },
					dataType: 'json',
					contentType: 'application/json',
					success: (dt) => {
						//console.log('Pending approval clans:', dt);
						this.wl_approvals = dt;
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
				console.log('removing player', e, this.wl_approvals);
				for (let w of this.wl_approvals) w.wl_data = w.wl_data.filter((p: any) => p._id != e._id);
				this.wl_approvals = this.wl_approvals.filter((w) => w.wl_data.length > 0);
			},
			appendPlayer: function (e: any) {
				this.wl_approvals.push(e);
			},
		},
		created() {
			//this.checkPerms();
			this.getWhitelistTabClans();
		},
		components: { approveUserCard },
	};
</script>

<template>
	<select name="clan_selector" ref="clan_selector" :disabled="whitelist_clans.length <= 1" @change="selectClanChanged">
		<option v-for="c of whitelist_clans" :value="c._id">{{ c.full_name }}</option>
	</select>
	<div v-for="list_wl of wl_approvals" class="shadow">
		<h3>{{ list_wl.title }}</h3>
		<approveUserCard v-for="w of list_wl.wl_data" :wl_data="w" :hoverMenuVisible="editor" @confirm="$emit('confirm', $event)" @removedPlayer="removePlayer" />
	</div>
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
	div {
		padding: 5px;
		border-radius: 20px;
		background: #2c2c2c;
		margin: 10px;
	}
	h3 {
		margin-left: 10px;
	}
</style>
