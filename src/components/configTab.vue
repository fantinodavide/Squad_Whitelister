<script setup lang="ts">
import AdvancedInput from './advancedInput.vue';
</script>

<script lang="ts">
import $ from 'jquery';
import SideMenu from './sideMenu.vue';
import tab from './tab.vue';
import confLabelInput from './confLabelInput.vue';

export default {
	data() {
		return {
			currentConfigMenu: {} as any | any[],
			selectedMenu: '' as string,
			config_tr: {} as any,
			currentConfigType: '' as string,
			discord_servers: [] as Array<any>,
			discord_channels: [] as Array<any>,
			discord_invite_link: '' as string,
			game_groups: [] as Array<any>,
			subcomponent_status: {
				squadjs: [],
			},
		};
	},
	methods: {
		log: console.log,
		getInputType: function (o: any) {
			const tmpType = {
				string: 'text',
				number: 'number',
				boolean: 'checkbox',
			} as any;
			return o.toString().startsWith('#') ? 'color' : tmpType[ typeof o ];
		},
		configMenuChanged: function (e: any) {
			let cpe = e.config.config;
			delete cpe.selected;
			this.selectedMenu = e.menu;
			this.currentConfigType = e.config.type;
			this.currentConfigMenu = cpe;
			// console.log(this.currentConfigMenu instanceof Array);
		},
		getTranslation: function (t: string) {
			const trC = this.config_tr[ t ];
			return trC ? trC : this.toUpperFirstChar(t.replace(/\_/g, ' '));
		},
		toUpperFirstChar: function (string: string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
		},
		convHex6digs: function (hex: any) {
			if (hex.toString().startsWith('#')) {
				return '#' + hex[ 1 ] + hex[ 1 ] + hex[ 2 ] + hex[ 2 ] + hex[ 3 ] + hex[ 3 ];
			} else return hex;
		},
		sendConfigToServer: function (popup: any) {
			const dt = { category: this.selectedMenu, config: this.currentConfigMenu };
			console.log('Saving_config:', this.selectedMenu, this.currentConfigType, this.currentConfigMenu);
			let rp = {};
			switch (this.currentConfigType) {
				case 'file':
					rp = {
						url: '/api/config/write/update',
					};
					break;
				case 'db':
					rp = {
						url: '/api/dbconfig/write/update',
					};
					break;
			}
			console.log('sending update to:', rp);
			$.ajax({
				...rp,
				type: 'post',
				data: JSON.stringify(dt),
				dataType: 'json',
				contentType: 'application/json',
				timeout: 60000,
				success: (dt) => {
					if (dt.status == 'config_updated') {
						if (dt.action == 'reload') location.reload();
					} else {
						console.error(dt);
					}
					popup.closePopup();
				},
				error: (err) => {
					popup.closePopup();
					console.error(err);
				},
			});
		},
		getDiscordServers: function () {
			fetch('/api/discord/read/getServers')
				.then((res) => res.json())
				.then((dt) => {
					console.log(dt);
					this.discord_servers = dt;
				});
		},
		getDiscordChannels: function () {
			fetch('/api/discord/read/getChannels')
				.then((res) => res.json())
				.then((dt) => {
					console.log(dt);
					this.discord_channels = dt;
				});
		},
		getDiscordInviteLink: function () {
			fetch('/api/discord/read/inviteLink')
				.then((res) => res.json())
				.then((dt) => {
					console.log(dt);
					this.discord_invite_link = dt.url;
				});
		},
		getGameGroups: async function () {
			await fetch('/api/gameGroups/read/getAllGroups')
				.then((res) => res.json())
				.then((dt) => {
					console.log(dt);
					return (this.game_groups = dt);
					// return (this.game_groups = [{ _id: '', group_name: 'None', group_permissions: [], require_appr: false }, ...dt]);
				});
		},
		getSquadJSStatus: async function () {
			await fetch('/api/subcomponent/read/squadjs/status')
				.then((res) => res.json())
				.then((dt) => {
					console.log('SquadJS status', dt);
					return (this.subcomponent_status.squadjs = dt);
					// return (this.game_groups = [{ _id: '', group_name: 'None', group_permissions: [], require_appr: false }, ...dt]);
				});
		},
		openNewTab: function (url: string) {
			window.open(url, '_blank');
		},
		getProxyTarget(obj: any) {
			if (obj && obj.__getTarget) {
				return obj.__getTarget();
			}
			return obj;
		},
		removeProxies(obj: any): any {
			obj = this.getProxyTarget(obj);

			if (typeof obj !== 'object' || obj === null) {
				return obj;
			}

			if (Array.isArray(obj)) {
				return obj.map((item) => this.removeProxies(item));
			}

			const result: any = {};
			for (const key in obj) {
				if (obj.hasOwnProperty(key)) {
					result[ key ] = this.removeProxies(obj[ key ]);
				}
			}
			return result;
		},
		addArrayElement() {
			const duplicatedBaseElement = { ...this.currentConfigMenu[ 0 ] };
			const cleanedDuplicatedElement = this.removeProxies(duplicatedBaseElement);
			this.currentConfigMenu.push({ ...cleanedDuplicatedElement });
		},
	},
	async beforeMount() {
		this.getDiscordServers();
		this.getDiscordChannels();
		this.getDiscordInviteLink();
		this.getGameGroups();
		this.getSquadJSStatus();
	},
	components: { SideMenu, tab, confLabelInput },
};
</script>

<template>
	<SideMenu @menuChanged="configMenuChanged" />
	<tab>
		<div v-if="![ 'discord_bot', 'seeding_tracker' ].includes(selectedMenu)" class="ct">
			<!-- <label v-for="k of Object.keys(currentConfigMenu)">{{ getTranslation(k) }}<input :type="getInputType(currentConfigMenu[k])" v-model="currentConfigMenu[k]" /></label> -->
			<confLabelInput
				v-for="k of Object.keys(currentConfigMenu)"
				:key="k"
				:confKey="k"
				:modelValue="currentConfigMenu[ k ]"
				@update:modelValue="(nv) => (currentConfigMenu[ k ] = nv)"
				:current-config-menu="currentConfigMenu"
				@deleteArrayElement="(index) => currentConfigMenu = currentConfigMenu.filter((e: any, i: number) => i != index)">
				<!-- <h4 v-if="selectedMenu == 'squadjs'">Websocket is {{ subcomponent_status.squadjs ? '' : 'Not ' }} Connected</h4> -->
				<AdvancedInput v-if="selectedMenu == 'squadjs'" text="Status" name="" :value="subcomponent_status.squadjs[ (k as any) ] ? 'Connected' : 'Not Connected'" optional readonly />
			</confLabelInput>

			<button
				style="float: right; width: 100px"
				@click="
					$emit('confirm', {
						title: 'Save server configuration?',
						text: 'Are you sure you want to change the server configuration? Bad configuration may result into multiple failures or temporary data loss.',
						callback: sendConfigToServer,
					})
					">
				Save
			</button>
			<!-- <button v-if="currentConfigMenu instanceof Array" style="float: right; width: 50px" @click="currentConfigMenu.push({ ...currentConfigMenu[0] })">+</button> -->
			<button v-if="currentConfigMenu instanceof Array" style="float: right; width: 50px" @click="addArrayElement">+</button>
		</div>
		<div v-else-if="selectedMenu == 'discord_bot'" class="ct">
			<confLabelInput confKey="token" :modelValue="currentConfigMenu.token" @update:modelValue="(nv) => (currentConfigMenu.token = nv)" />
			<!-- <label>Token<input :type="getInputType(currentConfigMenu.token)" :v-bind="currentConfigMenu.token" placeholder="Token" /> </label> -->
			<label>
				Discord Server
				<select @change="(e: any) => (currentConfigMenu.server_id = e.target.value)">
					<option value="" hidden selected>Select a server</option>
					<option :key="s.id" v-for="s of discord_servers" :value="s.id" :selected="s.id == currentConfigMenu.server_id">
						{{ s.name }}
					</option>
				</select>
			</label>
			<label>
				Whitelist updates channel
				<select @change="(e: any) => (currentConfigMenu.whitelist_updates_channel_id = e.target.value)">
					<option :key="s.id" v-for="s of discord_channels" :value="s.id" :selected="s.id == currentConfigMenu.whitelist_updates_channel_id">
						{{ s.name }}
					</option>
				</select>
			</label>
			<!-- {{ JSON.stringify(currentConfigMenu) }} -->
			<button
				style="float: right; padding-left: 30px; padding-right: 30px"
				@click="
					$emit('confirm', {
						title: 'Save server configuration?',
						text: 'Are you sure you want to change the server configuration? Bad configuration may result into multiple failures or temporary data loss.',
						callback: sendConfigToServer,
					})
					">
				Save
			</button>
			<button :disabled="discord_invite_link == ''" @click="openNewTab(discord_invite_link)" style="background: #5865f2; color: #fff; float: right; padding-left: 30px; padding-right: 30px">
				Invite to Server
			</button>
		</div>
		<div v-else-if="selectedMenu == 'seeding_tracker'" class="ct">
			<AdvancedInput
				text="Reward Enabled"
				name="reward_enabled"
				oTitleKey="title"
				oIdKey="id"
				:inputHidden="true"
				:options="[
					{ id: 'true', title: 'Yes' },
					{ id: 'false', title: 'No' },
				]"
				:optionPreselect="currentConfigMenu.reward_enabled"
				@valueChanged="currentConfigMenu.reward_enabled = $event.option" />
			<AdvancedInput
				text="Discord Seeding Reward Channel"
				name="resetseedingtime"
				type="number"
				placeholder="Time"
				oTitleKey="name"
				oIdKey="id"
				:inputHidden="true"
				:optionPreselect="currentConfigMenu.discord_seeding_reward_channel"
				:options="discord_channels"
				@valueChanged="currentConfigMenu.discord_seeding_reward_channel = $event.option" />
			<AdvancedInput
				text="Discord Seeding Score Channel"
				name="resetseedingscoretime"
				type="number"
				placeholder="Time"
				oTitleKey="name"
				oIdKey="id"
				:inputHidden="true"
				:optionPreselect="currentConfigMenu.discord_seeding_score_channel"
				:options="discord_channels"
				@valueChanged="currentConfigMenu.discord_seeding_score_channel = $event.option" />
			<AdvancedInput
				text="Reward Group"
				name="rewardgroup"
				oTitleKey="group_name"
				oIdKey="_id"
				:inputHidden="true"
				:options="game_groups"
				@valueChanged="currentConfigMenu.reward_group_id = $event.option"
				:optionPreselect="currentConfigMenu.reward_group_id" />
			<AdvancedInput
				text="Live Player Count"
				name="seeding_player_threshold"
				type="number"
				@valueChanged="currentConfigMenu.seeding_player_threshold = $event.value"
				:value="currentConfigMenu.seeding_player_threshold" />
			<AdvancedInput
				text="Seeding Start Player Count"
				name="seeding_player_threshold"
				type="number"
				@valueChanged="currentConfigMenu.seeding_start_player_count = $event.value"
				:value="currentConfigMenu.seeding_start_player_count" />
			<AdvancedInput
				text="Tracking Mode"
				name="tracking_mode"
				oTitleKey="title"
				oIdKey="id"
				:inputHidden="true"
				:optionPreselect="currentConfigMenu.tracking_mode"
				:options="[
					{ id: 'incremental', title: 'Incremental' },
					{ id: 'fixed_reset', title: 'Fixed Reset' },
				]"
				@valueChanged="currentConfigMenu.tracking_mode = $event.option" />
			<AdvancedInput
				text="Reward needed time"
				name="resetseedingtime"
				type="number"
				placeholder="Time"
				oTitleKey="title"
				oIdKey="value"
				:value="currentConfigMenu.reward_needed_time?.value"
				:optionPreselect="currentConfigMenu.reward_needed_time?.option"
				:options="[
					{ title: 'Hours', value: 60 * 60 * 1000 },
					{ title: 'Days', value: 24 * 60 * 60 * 1000 },
				]"
				@valueChanged="currentConfigMenu.reward_needed_time = { value: +$event.value, option: $event.option }" />
			<div v-if="currentConfigMenu.tracking_mode == 'fixed_reset'">
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
					:value="currentConfigMenu.reset_seeding_time?.value"
					:optionPreselect="currentConfigMenu.reset_seeding_time?.option"
					@valueChanged="currentConfigMenu.reset_seeding_time = { value: +$event.value, option: $event.option }" />
				<AdvancedInput text="Next Reset" name="next_reset" type="date" @valueChanged="currentConfigMenu.next_reset = $event.value" :value="currentConfigMenu.next_reset" />
			</div>
			<div v-if="currentConfigMenu.tracking_mode == 'incremental'">
				<AdvancedInput
					text="Minimum Reward Duration"
					name="minimum_reward_duration"
					type="number"
					placeholder="Time"
					oTitleKey="title"
					oIdKey="value"
					:value="currentConfigMenu.minimum_reward_duration?.value"
					:optionPreselect="currentConfigMenu.reward_needed_time?.option"
					:options="[
						{ title: 'Hours', value: 60 * 60 * 1000 },
						{ title: 'Days', value: 24 * 60 * 60 * 1000 },
					]"
					@valueChanged="currentConfigMenu.minimum_reward_duration = { value: +$event.value, option: $event.option }" />
				<AdvancedInput
					text="Non-seeding Time Deduction"
					name="resetseedingtime"
					type="number"
					oTitleKey="title"
					oIdKey="value"
					:options="[
						{ title: 'Point per Minute', value: 'point_minute' },
						{ title: '% per Minute', value: 'perc_minute' },
					]"
					:value="currentConfigMenu.time_deduction?.value || 0.1"
					:optionPreselect="currentConfigMenu.time_deduction?.option"
					@valueChanged="currentConfigMenu.time_deduction = { value: +$event.value, option: $event.option }" />
				<fieldset>
					<legend>Attention</legend>
					<b>Non-seeding Time Deduction</b> applies only during seeding phase.
				</fieldset>
			</div>
			<button
				style="float: right; padding-left: 30px; padding-right: 30px"
				@click="
					$emit('confirm', {
						title: 'Save server configuration?',
						text: 'Are you sure you want to change the server configuration? Bad configuration may result into multiple failures or temporary data loss.',
						callback: sendConfigToServer,
					})
					">
				Save
			</button>
		</div>
	</tab>
</template>

<style scoped>
label {
	flex-wrap: nowrap;
	white-space: nowrap;
}

label>input,
label>select {
	margin-left: 10px;
}

label {
	margin-right: 0;
}

div.ct {
	margin: 0 auto;
}
</style>
