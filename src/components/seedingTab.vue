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
					reset_seeding_time: null as any,
					reward_needed_time: null as any,
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
			getGameGroups: function () {
				fetch('/api/gameGroups/read/getAllGroups')
					.then((res) => res.json())
					.then((dt) => {
						this.game_groups = dt;
					});
			},
		},
		created() {
			this.getGameGroups();
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
			@valueChanged="seeding_config.reset_seeding_time = $event.value * $event.option.value"
		/>
		<AdvancedInput
			text="Reward needed time"
			name="resetseedingtime"
			type="number"
			placeholder="Time"
			oTitleKey="title"
			oIdKey="value"
			:options="[
				{ title: 'Hours', value: 60 * 60 * 1000 },
				{ title: 'Days', value: 24 * 60 * 60 * 1000 },
			]"
			@valueChanged="seeding_config.reward_needed_time = $event.value * $event.option.value"
		/>
		<AdvancedInput text="Reward Group" name="rewardgroup" oTitleKey="group_name" oIdKey="_id" :inputHidden="true" :options="game_groups" @valueChanged="seeding_config.reward_needed_time = $event.value * $event.option.value" />
	</div>
</template>

<style scoped></style>
