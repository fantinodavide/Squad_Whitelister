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
		},
		created() {},
		components: { AdvancedInput },
	};
</script>

<template>
	<div class="flex row">
		<AdvancedInput text="Testone superone" name="tstone" placeholder="Text here" oTitleKey="title" oIdKey="value" :options="[{ title: '1 - Test', value: 1 }, 'ciao', 3]" />
		<AdvancedInput text="Testone 2" name="tst2one" placeholder="Text lool" />
	</div>
</template>

<style scoped></style>
