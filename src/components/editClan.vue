<script setup lang="ts">
	import $ from 'jquery';
	import { render } from 'vue';
	import popup from './popup.vue';
	import SelectMultiple from './selectMultiple.vue';
</script>

<script lang="ts">
	export default {
		data() {
			return {
				available_game_groups: [] as Array<any>,
				discord_roles: [] as Array<any>,
				extRet: {
					available_groups: [] as Array<any>,
				},
			};
		},
		props: {
			clan_data: {
				type: Object,
				default: {},
			},
		},
		methods: {
			confirmBtnClick(dt: any) {
				$.ajax({
					url: '/api/clans/editClan',
					type: 'post',
					data: JSON.stringify({ _id: this.clan_data._id, ...dt }),
					dataType: 'json',
					contentType: 'application/json',
					success: (srvDt) => {
						console.log(srvDt);
						this.$emit('clan_edited', srvDt);
						this.$emit('cancelBtnClick');
					},
					error: (err) => {
						console.error(err);
						const compPopup: any = this.$refs.popupLogin;
						compPopup.blinkAll();
						//.blinkBgColor(this.$refs.popupLogin.getInputs());
					},
				});
			},
			getGameGroups() {
				fetch('/api/gameGroups/read/getAllGroups')
					.then((res) => res.json())
					.then((dt) => {
						console.log(dt);
						this.available_game_groups = dt;
					});
			},
		},
		components: { popup, SelectMultiple },
		created() {
			this.getGameGroups();
			console.log(this.clan_data);
		},
	};
</script>

<template>
	<popup ref="popupLogin" title="Edit Clan" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick" :extRetProp="extRet">
		<input name="full_name" type="text" placeholder="Full Clan Name" :value="clan_data.full_name" />
		<input name="tag" type="text" placeholder="Clan Tag" :value="clan_data.tag" />
		<!-- <select name="available_groups" placeholder="Available Groups" multiple optional>
			<option v-for="p in available_game_groups.sort()" :value="p._id" :selected="clan_data.available_groups.includes(p._id)">{{ p.group_name }}</option>
		</select> -->
		<SelectMultiple :elements="available_game_groups.sort()" oIdKey="_id" oTitleKey="group_name" title="Available groups" :preselect="clan_data.available_groups" @selectChanged="extRet.available_groups = $event" />
		<label>Player Limit<input name="player_limit" type="number" placeholder="Unlimited" style="width: 100px" :value="clan_data.player_limit" optional /></label>
		<label>Always Require Approval<input name="confirmation_ovrd" type="checkbox" :checked="clan_data.confirmation_ovrd" placeholder="Confirmation Override" /></label>
	</popup>
</template>

<style scoped></style>
