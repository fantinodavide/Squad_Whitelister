<script setup lang="ts">
import { assertExpressionStatement } from "@babel/types";
import $ from 'jquery';
import popup from "./popup.vue";
</script>

<script lang="ts">
export default {
	data() {
		return {
			game_groups: [] as Array<any>
		}
	},
	methods: {
		confBtnClick: function (dt: any) {
			const compPopup: any = this.$refs.popupLogin;
			$.ajax({
				url: "/api/whitelist/write/addPlayer",
				type: "post",
				data: JSON.stringify(dt),
				dataType: "json",
				contentType: 'application/json',
				timeout: 60000,
				success: (dt) => {
					console.log(dt);
				},
				error: (err) => {
					console.error(err);
					compPopup.blinkAll()
				}
			})
		},
		getGameGroups() {
			fetch("/api/gameGroups/read/getAllGroups").then(res => res.json()).then(dt => {
				this.game_groups = dt;
			});
		}
	},
	created() {
		this.getGameGroups();
	},
	components: { popup }
}
</script>

<template>
	<popup ref="popupLogin" title="Add Player" @cancelBtnClick="$emit('cancelBtnClick', $event)"
		@confirmBtnClick="confBtnClick" :hide-cancel="false">
		<input name="username" type="text" placeholder="Username" />
		<input name="steamid64" type="text" placeholder="SteamID64" />
		<select name="group">
			<option hidden selected>Select a group</option>
			<option v-for="g of game_groups" :value="g._id">{{ g.group_name }}</option>
		</select>
		<input name="discordUsername" type="text" placeholder="Discord Username" optional />
	</popup>
</template>

<style scoped>
</style>
