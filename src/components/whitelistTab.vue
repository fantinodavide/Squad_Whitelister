<script setup lang="ts">
</script>

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
			wl_players: [] as Array<any>
		}
	},
	methods: {
		getWhitelistTabClans: function () {
			fetch("/api/whitelist/read/getAllClans").then(res => res.json()).then(dt => {
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
			$.ajax({
				url: "/api/whitelist/read/getAll",
				type: "get",
				data: { sel_clan_id: this.sel_clan },
				dataType: "json",
				contentType: 'application/json',
				success: (dt) => {
					console.log("Whitelist player", dt)
					this.wl_players = dt;
				},
				error: (err) => {
					console.error(err)
				}
			})
		},
		log: console.log
	},
	created() {
		this.getWhitelistTabClans()
	},
	components: { whitelistUserCard }
}
</script>

<template>
	<select name="clan_selector" ref="clan_selector" :disabled="whitelist_clans.length == 1"
		@change="selectClanChanged">
		<option v-for="c of whitelist_clans" :value="c._id">{{ c.full_name }}
		</option>
	</select>
	<button class="addHorizontal" @click="$emit('addNewWhitelistUser', sel_clan)"></button>
	<whitelistUserCard v-for="w of wl_players" :wl_data="w" />
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
</style>
