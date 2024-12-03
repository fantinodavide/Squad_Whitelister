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
				refs: {
					textarea: null as any,
					replace: {
						from: null as any,
						with: null as any,
					},
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
			confirmBtnClick: async function (dt: any) {
				if (this.currentStep == 0) {
					const listImport = this.$el
						.querySelector('textarea')
						.value.split('\n')
						.filter((a: any) => a != '' && a.startsWith('Admin'));
					const reg = /^Admin=(?<steamid>\d{17}):(?<group>.[a-zA-Z_\d]{1,})((\s\/{2}\s?)(?<comment>.{1,}))?/gm;

					listImport.forEach((elm: any, key: any) => {
						const r = elm;
						const regRes = this.regexExec(r, reg) as any;
						let regResGr = regRes.groups;
						regResGr.discordUsername = this.getDiscord(regResGr.comment);
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
							discordUsername: p.discordUsername,
							group: this.conv_gameGroups[p.group],
							sel_clan_id: this.add_data.sel_clan,
							sel_list_id: this.add_data.sel_list_id,
						};
						console.log('Importing whitelist', player);

						await this.requestAddToWhitelist(player);
						// setTimeout(() => {
						// }, delay * c++);
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
				return $.ajax({
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
			replaceTextArea: function () {
				console.log(this.refs);
				const repFrom = this.refs.replace.from.value.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
				let reg = RegExp(`${repFrom}`, 'g');
				this.refs.textarea.value = this.refs.textarea.value.replace(reg, this.refs.replace.with.value);
			},
			removeTags: function () {
				// const r = /^.{0,}((\s\/{2}\s{0,})(?<comment>.{1,}))/gm;
				// const regRes = this.regexExec(this.refs.textarea.value, r) as any;
				// let tags = [] as Array<string>;
				// let repReg = '^';
				// for (let c of regRes) {
				// 	const tag = c.groups ? c.groups.comment.match(/^\[.{1,}]/g) : null;
				// 	if (tag && !tags.includes(tag[0])) tags.push(tag.replace(/\[/g, '\\[').replace(/\]/g, '\\]'));
				// }
				// repReg += tags.join('|');
				this.refs.textarea.value = this.refs.textarea.value.replace(/\[[^\[\]]{1,}\] */g, '');
				// console.log(regRes, tags, repReg);
			},
			getDiscord: function (comment: string) {
				const m = comment.match(/\@.{3,32}(#(0{1}|\d{4}))/);
				return m ? m[0] : '';
			},
			preventDefault(event: Event) {
				event.preventDefault();
			},
		},
		created() {
			this.getGameGroups();
		},
		components: { popup },
	};
</script>

<template>
	<popup
		id="popup"
		:focus="refs.textarea"
		:class="{ big: currentStep == 0 }"
		ref="popupComp"
		title="Import List"
		:confirmText="importSteps[currentStep].confBtnText"
		@cancelBtnClick="$emit('cancelBtnClick', $event)"
		@confirmBtnClick="confirmBtnClick"
	>
		<h3>{{ importSteps[currentStep].title }}</h3>
		<div v-show="currentStep == 0" style="flex-grow: 1; display: flex; flex-direction: column; width: 100%">
			<textarea :ref="(r) => (refs.textarea = r)" style="flex-grow: 1" placeholder="Paste here your whitelist"></textarea>
			<div class="rowBtnContainer">
				<label>Replace<input :ref="(r) => (refs.replace.from = r)" type="text" placeholder="Replace" optional /></label
				><label>With<input :ref="(r) => (refs.replace.with = r)" type="text" placeholder="With" optional /><button @click="replaceTextArea">Replace</button></label>
			</div>
			<div class="rowBtnContainer">
				<button @click="removeTags">Remove Tags</button>
			</div>
		</div>
		<div v-if="currentStep == 1">
			<div v-for="g of importFoundGroups" :key="g" class="grTranslation">
				<span class="tag">{{ g }}</span>
				<select :name="'sel-' + g">
					<option v-for="allG of game_groups" :key="allG" :value="allG._id" :selected="allG.group_name.toLowerCase() == g.toLowerCase()">{{ allG.group_name }}</option>
				</select>
			</div>
		</div>
		<div v-if="currentStep == 2" class="overflow">
			<div v-for="p of parListImport" class="grTranslation" :key="p.steamid">
				<input :name="p.steamid" type="text" :value="p.comment.replace(/\@.{3,32}(#(0{1}|\d{4}))/, '')" />
				<span class="tag">{{ game_groups.filter((g) => g._id == conv_gameGroups[p.group])[0].group_name }}</span>
				<span class="tag">{{ p.steamid }} </span>
				<span class="tag" v-if="p.discordUsername != ''">{{ p.discordUsername }} </span>
				<!-- <input name="discordUsername" type="text" placeholder="Discord Username" :value="getDiscord(p.comment)" optional hidden /> -->
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
		white-space: pre-wrap;
	}
	.grTranslation {
		display: flex;
		flex-wrap: nowrap;
		flex-direction: row;
		align-items: center;
		justify-content: center;
	}

	.rowBtnContainer {
		display: flex;
		margin: auto;
	}
	.rowBtnContainer > * {
		flex-shrink: 1;
		flex-grow: 0;
	}

	label {
		flex-wrap: nowrap !important;
	}
</style>
