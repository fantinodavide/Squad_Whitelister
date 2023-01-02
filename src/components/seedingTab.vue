<script setup lang="ts">
	import levenshtein from 'js-levenshtein';
</script>

<script lang="ts">
	import $ from 'jquery';
	import AdvancedInput from './advancedInput.vue';
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
					reward_enabled: null as any,
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
						console.log(dt);
						return (this.game_groups = dt);
						// return (this.game_groups = [{ _id: '', group_name: 'None', group_permissions: [], require_appr: false }, ...dt]);
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
						location.reload();
					},
					error: (err) => {
						console.error(err);
					},
				});
			},
			getPlayers: async function () {
				await fetch('/api/seeding/read/getPlayers')
					.then((res) => res.json())
					.then((dt) => {
						dt = dt
							.map((original: any) => ({
								...original,
								approved: this.seeding_config.reward_enabled == 'true' && original.seeding_points >= (this.seeding_config.reward_needed_time.value * this.seeding_config.reward_needed_time.option) / 1000 / 60,
								percentageCompleted: Math.min(Math.round((original.seeding_points * 100) / ((this.seeding_config.reward_needed_time.value * this.seeding_config.reward_needed_time.option) / 1000 / 60))),
							}))
							.sort((a: any, b: any) => b.percentageCompleted - a.percentageCompleted);
						console.log(dt);
						return (this.wl_players = dt);
					});
			},
		},
		async created() {
			await this.getGameGroups();
			await this.getConfig();
			await this.getPlayers();
		},
		components: { AdvancedInput },
	};
</script>

<template>
	<input type="search" placeholder="Search Player" name="plrSearch" v-model="models.searchPlayer" />
	<whitelistUserCard v-for="w of wl_players" :key="w" v-show="w.username.toLowerCase().startsWith(models.searchPlayer.toLowerCase()) || w.username.toLowerCase().includes(models.searchPlayer.toLowerCase()) || levenshtein(w.username.toLowerCase(), models.searchPlayer.toLowerCase()) <= 2 || models.searchPlayer == ''" :ref="(r:any)=>{record_refs.push(r)}" :wl_data="w" :hoverMenuVisible="false" :extra-tags="[`${w.percentageCompleted}%`]" />
</template>

<style scoped>
	button {
		margin: 0;
		margin-right: 10px;
		margin-bottom: 10px;
	}
</style>
