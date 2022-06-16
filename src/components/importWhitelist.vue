<script setup lang="ts">
	import { assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import popup from './popup.vue';
</script>

<script lang="ts">
	export default {
		data() {
			return {
				importSteps: [
					{
						title: 'Loading List',
						confBtnText: 'Next',
					},
					{
						title: 'Setup Groups',
						confBtnText: 'Next',
					},
					{
						title: 'Player Names',
						confBtnText: 'Import',
					},
				],
				currentStep: 0,
				importFoundGroups: [] as Array<any>,
				parListImport: [] as Array<any>,
				game_groups: [] as Array<any>,
				conv_gameGroups: {} as any,
				player_name_conv: {} as any,
			};
		},
		props: {
			add_data: {
				required: true,
				type: Object,
			},
		},
		methods: {
			confirmBtnClick: function (dt: any) {
				if (this.currentStep == 0) {
					const listImport = this.$el
						.querySelector('textarea')
						.value.split('\n')
						.filter((a: any) => a != '' && a.startsWith('Admin'));
					const reg = /^Admin=(?<steamid>\d{17}):(?<group>.[a-zA-Z_]{1,})((\s\/{2}\s?)(?<comment>.{1,}))?/gm;

					listImport.forEach((elm: any, key: any) => {
						const r = elm;
						const regRes = this.regexExec(r, reg) as any;
						const regResGr = regRes.groups;
						this.parListImport.push(regResGr);
						if (!this.importFoundGroups.includes(regResGr.group)) this.importFoundGroups.push(regResGr.group);
					});
					this.parListImport = this.parListImport.filter((a: any) => a != null);
					console.log('List Import', this.parListImport);
					// console.log('Found Groups', this.importFoundGroups);
				} else if (this.currentStep == 1) {
					for (let fg of this.importFoundGroups) {
						this.conv_gameGroups[fg] = dt['sel-' + fg];
					}
					console.log(this.conv_gameGroups);
				} else if (this.currentStep == 2) {
					console.log(dt);
					this.player_name_conv = dt;
				}

				if (this.currentStep + 1 < this.importSteps.length) this.currentStep++;
				else {
					const delay = 50;
					let c = 0;
					for (let p of this.parListImport) {
						const player = {
							username: this.player_name_conv[p.steamid],
							steamid64: p.steamid,
							group: this.conv_gameGroups[p.group],
							sel_clan_id: this.add_data.sel_clan,
						};
						console.log('Importing whitelist', player);

						setTimeout(() => {
							this.requestAddToWhitelist(player);
						}, delay * c++);
					}
				}
				// console.log(dt);
				// $.ajax({
				// 	url: '/api/gameGroups/write/newGroup',
				// 	type: 'post',
				// 	dataType: 'json',
				// 	data: JSON.stringify(dt),
				// 	contentType: 'application/json',
				// 	success: (dt) => {
				// 		console.log(dt);
				// 		this.$emit('new_game_group', dt);
				// 	},
				// 	error: (err) => {
				// 		console.error(err);
				// 		const compPopup: any = this.$refs.popupComp;
				// 		compPopup.blinkAll();
				// 		//.blinkBgColor(this.$refs.popupLogin.getInputs());
				// 	},
				// });
			},
			requestAddToWhitelist: function (dt: any) {
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
							this.$emit('cancelBtnClick');
						}
					},
					error: (err) => {
						console.error(err);
						this.$emit('cancelBtnClick');
					},
				});
			},
			regexExec: function (str: string, regex: RegExp) {
				if (str.match(regex)) {
					const r = regex.exec(str);
					if (r == null) this.regexExec(str, regex);
					else return r;
				} else return null;
			},
			getGameGroups: function () {
				fetch('/api/gameGroups/read/getAllGroups')
					.then((res) => res.json())
					.then((dt) => {
						console.log('Game Groups', dt);
						this.game_groups = dt;
					});
			},
		},
		created() {
			this.getGameGroups();
		},
		components: { popup },
	};
</script>

<template>
	<popup id="popup" :class="{ big: currentStep == 0 }" ref="popupComp" title="Import List" :confirmText="importSteps[currentStep].confBtnText" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick">
		<h3>{{ importSteps[currentStep].title }}</h3>
		<textarea ref="txtList" v-show="currentStep == 0" placeholder="Paste here your whitelist"></textarea>
		<div v-if="currentStep == 1">
			<div v-for="g of importFoundGroups" class="grTranslation">
				<span class="tag">{{ g }}</span>
				<select :name="'sel-' + g">
					<option v-for="allG of game_groups" :value="allG._id">{{ allG.group_name }}</option>
				</select>
			</div>
		</div>
		<div v-if="currentStep == 2" class="overflow">
			<div v-for="p of parListImport" class="grTranslation">
				<input :name="p.steamid" type="text" :value="p.comment.split(' ')[0]" /><span class="tag">{{ game_groups.filter((g) => g._id == conv_gameGroups[p.group])[0].group_name }}</span
				><span class="tag">{{ p.steamid }}</span>
			</div>
		</div>
	</popup>
</template>

<style scoped>
	#popup {
		width: auto;
		height: auto;
		max-height: calc(100% - 30px);
	}

	#popup.big {
		width: 700px !important;
		height: 900px !important;
	}

	#popup textarea {
		flex-grow: 1;
		white-space: nowrap;
	}
	.grTranslation {
		display: flex;
		flex-wrap: nowrap;
		flex-direction: row;
		align-items: center;
		justify-content: center;
	}
</style>
