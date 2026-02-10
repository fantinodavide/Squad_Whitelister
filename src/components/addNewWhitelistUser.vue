<script setup lang="ts">
	import $ from 'jquery';
	import popup from './popup.vue';
	import AdvancedInput from './advancedInput.vue';
</script>

<script lang="ts">
	export default {
		data() {
			return {
				game_groups: [] as Array<any>,
				extRet: {
					durationHours: null as any,
				},
			};
		},
		props: {
			add_data: {
				required: true,
				type: Object,
			},
		},
		methods: {
			confBtnClick: function (dt: any) {
				dt.sel_clan_id = this.add_data.sel_clan;
				dt.sel_list_id = this.add_data.sel_list_id;
				const compPopup: any = this.$refs.popupLogin;
				$.ajax({
					url: '/api/whitelist/write/addPlayer',
					type: 'post',
					data: JSON.stringify(dt),
					dataType: 'json',
					contentType: 'application/json',
					timeout: 60000,
					success: (dt) => {
						if (dt.status == 'inserted_new_player') {
							const plDt = { ...dt.player, group_full_data: this.game_groups.filter((g) => g._id == dt.player.id_group) };
							console.log(plDt);
							this.add_data.callback(plDt);
							this.$emit('cancelBtnClick');
						} else {
							console.error(dt);
							compPopup.blinkAll();
						}
					},
					error: (err) => {
						console.error(err);
						compPopup.blinkAll();
					},
				});
			},
			getGameGroups() {
				fetch('/api/gameGroups/read/getAllGroups')
					.then((res) => res.json())
					.then((dt) => {
						this.game_groups = dt;
						console.log('game groups', this.game_groups);
					});
			},
		},
		created() {
			console.log('Adding new whitelist user for', this.add_data.sel_clan, 'clan', this.add_data);
			this.getGameGroups();
		},
		components: { popup },
	};
</script>

<template>
	<popup ref="popupLogin" title="Add Player" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confBtnClick" :hide-cancel="false" :extRetProp="extRet">
		<input name="username" type="text" placeholder="Username" />
		<input name="steamid64" type="text" regex="^\d{17}$" placeholder="SteamID64" optional/>
		<input name="eosID" type="text" regex="^[a-z\d]{32}$" placeholder="EOS ID" optional/>
		<select name="group">
			<option hidden selected value>Select a group</option>
			<option v-for="g of game_groups" :value="g._id" :key="g">{{ g.group_name }}</option>
		</select>
		<!-- <label>Duration (hours)<input name="durationHours" type="number" placeholder="Unlimited" style="width: 100px" optional /></label> -->
		<AdvancedInput
			style="margin: 5px 0; height: 30px"
			text="Duration"
			name="durationHoursAdv"
			type="number"
			:regex="/^(?!-)/"
			placeholder="Unlimited"
			oTitleKey="title"
			oIdKey="value"
			:options="[
				{ title: 'Hours', value: 1 },
				{ title: 'Days', value: 24 },
				{ title: 'Weeks', value: 7 * 24 },
				{ title: 'Months', value: 30 * 24 },
			]"
			@valueChanged="extRet.durationHours = +$event.value * $event.option"
			optional
		/>
		<input name="discordUsername" type="text" placeholder="Discord Username (Note only)" optional regex="^[^\s]+$" />
	</popup>
</template>

<style scoped></style>
