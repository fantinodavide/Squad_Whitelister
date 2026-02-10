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
				extRet: {
					available_groups: [] as Array<any>,
				},
			};
		},
		methods: {
			confirmBtnClick(dt: any) {
				$.ajax({
					url: '/api/clans/newClan',
					type: 'post',
					data: JSON.stringify(dt),
					dataType: 'json',
					contentType: 'application/json',
					success: (dt) => {
						console.log(dt);
						this.$emit('new_clan', dt);
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
		},
	};
</script>

<template>
	<popup ref="popupLogin" title="New Clan" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick" :extRetProp="extRet">
		<input name="full_name" type="text" placeholder="Full Clan Name" />
		<input name="tag" type="text" placeholder="Clan Tag" />
		<SelectMultiple :elements="available_game_groups.sort()" oIdKey="_id" oTitleKey="group_name" title="Available groups" @selectChanged="extRet.available_groups = $event" />
		<label>Player Limit<input name="player_limit" type="number" placeholder="Unlimited" style="width: 100px" optional /></label>
		<label>Always Require Approval<input name="confirmation_ovrd" type="checkbox" placeholder="Confirmation Override" /></label>
	</popup>
</template>

<style scoped></style>
