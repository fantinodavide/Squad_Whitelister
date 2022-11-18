<script setup lang="ts">
	import levenshtein from 'js-levenshtein';
</script>

<script lang="ts">
	import $ from 'jquery';
	import AdvancedInput from './advancedInput.vue';

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
				seeding_config: {
					reset_seeding_time: { value: null, option: null } as any,
					reward_needed_time: { value: null, option: null } as any,
					reward_group_id: null as any,
					seeding_player_threshold: 40 as number,
					next_reset: null as any,
				},
				game_groups: [] as Array<any>,
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
			getGameGroups: async function () {
				await fetch('/api/gameGroups/read/getAllGroups')
					.then((res) => res.json())
					.then((dt) => {
						console.log(this.game_groups);
						return (this.game_groups = dt);
					});
			},
			getConfig: async function () {
				await fetch(`/api/dbconfig/read/seeding_tracker`)
					.then((res) => res.json())
					.then((dt) => {
						console.log(this.seeding_config);
						return (this.seeding_config = dt);
					});
			},
			pushConfigToDb: function () {
				console.log(this.seeding_config);
				const resetInterval = this.seeding_config.reset_seeding_time;
				if (!this.seeding_config.next_reset && resetInterval) {
					this.seeding_config.next_reset = new Date(new Date().valueOf() + resetInterval.value * resetInterval.option).toISOString().split('T')[0];
				}
				const dt = {
					category: 'seeding_tracker',
					config: this.seeding_config,
				};
				$.ajax({
					url: '/api/dbconfig/write/update',
					type: 'post',
					data: JSON.stringify(dt),
					dataType: 'json',
					contentType: 'application/json',
					timeout: 60000,
					success: (dt) => {
						console.log(dt);
					},
					error: (err) => {
						console.error(err);
					},
				});
			},
		},
		async created() {
			await this.getGameGroups();
			await this.getConfig();
		},
		components: { AdvancedInput },
	};
</script>

<template>
	<div class="flex row wrap">
		<AdvancedInput
			text="Reset seeding time every"
			name="resetseedingtime"
			type="number"
			placeholder="Time"
			oTitleKey="title"
			oIdKey="value"
			:options="[
				{ title: 'Days', value: 24 * 60 * 60 * 1000 },
				{ title: 'Weeks', value: 7 * 24 * 60 * 60 * 1000 },
				{ title: 'Months', value: 30 * 24 * 60 * 60 * 1000 },
			]"
			:value="seeding_config.reset_seeding_time.value"
			:optionPreselect="seeding_config.reset_seeding_time.option"
			@valueChanged="seeding_config.reset_seeding_time = { value: +$event.value, option: $event.option }"
		/>
		<AdvancedInput
			text="Reward needed time"
			name="resetseedingtime"
			type="number"
			placeholder="Time"
			oTitleKey="title"
			oIdKey="value"
			:value="seeding_config.reward_needed_time.value"
			:optionPreselect="seeding_config.reward_needed_time.option"
			:options="[
				{ title: 'Hours', value: 60 * 60 * 1000 },
				{ title: 'Days', value: 24 * 60 * 60 * 1000 },
			]"
			@valueChanged="seeding_config.reward_needed_time = { value: +$event.value, option: $event.option }"
		/>
		<AdvancedInput text="Reward Group" name="rewardgroup" oTitleKey="group_name" oIdKey="_id" :inputHidden="true" :options="game_groups" @valueChanged="seeding_config.reward_group_id = $event.option" :optionPreselect="seeding_config.reward_group_id" />
		<AdvancedInput text="Seeding Players Threshold" name="seeding_player_threshold" type="number" @valueChanged="seeding_config.seeding_player_threshold = $event.value" :value="seeding_config.seeding_player_threshold" />
		<AdvancedInput text="Next Reset" name="next_reset" type="date" @valueChanged="seeding_config.next_reset = $event.value" :value="seeding_config.next_reset" />
		<button @click="pushConfigToDb">Save</button>
	</div>
</template>

<style scoped>
	button {
		margin: 0;
		margin-right: 10px;
		margin-bottom: 10px;
	}
</style>
