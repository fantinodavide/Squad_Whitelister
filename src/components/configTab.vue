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
			backup_list: [] as Array<any>,
			backup_creating: false,
			backup_restoring: '' as string,
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
			if (e.menu === 'backup') {
				this.getBackupList();
			}
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
		getBackupList: async function () {
			await fetch('/api/backup/read/list')
				.then((res) => res.json())
				.then((dt) => {
					this.backup_list = dt || [];
				})
				.catch((err) => {
					console.error(err);
					this.backup_list = [];
				});
		},
		createBackup: function (cbData: any) {
			this.backup_creating = true;
			$.ajax({
				url: '/api/backup/write/create',
				type: 'post',
				data: JSON.stringify({}),
				dataType: 'json',
				contentType: 'application/json',
				timeout: 300000,
				success: (dt: any) => {
					this.backup_creating = false;
					this.getBackupList();
					cbData.closePopup();
				},
				error: (err: any) => {
					this.backup_creating = false;
					cbData.closePopup();
					if (err.status === 429) {
						alert(err.responseJSON?.error || 'A backup has already been created today. Limit: 1 manual backup per day.');
					} else {
						console.error(err);
					}
				},
			});
		},
		restoreBackup: function (backupName: string, cbData: any) {
			this.backup_restoring = backupName;
			$.ajax({
				url: '/api/backup/write/restore',
				type: 'post',
				data: JSON.stringify({ name: backupName }),
				dataType: 'json',
				contentType: 'application/json',
				timeout: 300000,
				success: (dt: any) => {
					this.backup_restoring = '';
					cbData.closePopup();
					location.reload();
				},
				error: (err: any) => {
					this.backup_restoring = '';
					cbData.closePopup();
					console.error(err);
				},
			});
		},
		deleteBackup: function (backupName: string, cbData: any) {
			$.ajax({
				url: '/api/backup/write/delete',
				type: 'post',
				data: JSON.stringify({ name: backupName }),
				dataType: 'json',
				contentType: 'application/json',
				timeout: 60000,
				success: (dt: any) => {
					this.backup_list = this.backup_list.filter((b: any) => b.name !== backupName);
					cbData.closePopup();
				},
				error: (err: any) => {
					cbData.closePopup();
					console.error(err);
				},
			});
		},
		getMin24hFromNow: function () {
			return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
		},
		saveBackupConfig: function (cbData: any) {
			const configToSave = JSON.parse(JSON.stringify(this.currentConfigMenu));
			console.log('configToSave', configToSave)
			if (!configToSave.auto_backup.next_backup && configToSave.auto_backup.enabled && configToSave.auto_backup.schedule) {
				const sched = configToSave.auto_backup.schedule;
				configToSave.auto_backup.next_backup = new Date(new Date().valueOf() + sched.value * sched.option).toISOString();
			} else if (configToSave.auto_backup.next_backup) {
				configToSave.auto_backup.next_backup = configToSave.auto_backup.next_backup;
				console.log(configToSave.auto_backup.next_backup)
			}
			const dt = { category: 'backup', config: configToSave };
			$.ajax({
				url: '/api/dbconfig/write/update',
				type: 'post',
				data: JSON.stringify(dt),
				dataType: 'json',
				contentType: 'application/json',
				timeout: 60000,
				success: (dt: any) => {
					cbData.closePopup();
				},
				error: (err: any) => {
					cbData.closePopup();
					if (err.responseJSON?.error) {
						alert(err.responseJSON.error);
					} else {
						console.error(err);
					}
				},
			});
		},
		formatBackupDate: function (isoString: string) {
			if (!isoString) return 'N/A';
			return new Date(isoString).toLocaleString();
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
		<div v-if="![ 'discord_bot', 'seeding_tracker', 'backup' ].includes(selectedMenu)" class="ct">
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
		<div v-else-if="selectedMenu == 'backup'" class="ct">
			<h3 class="backup-section-header">Automatic Backup</h3>
			<AdvancedInput
				text="Auto Backup"
				name="auto_backup_enabled"
				oTitleKey="title"
				oIdKey="id"
				:inputHidden="true"
				:options="[
					{ id: true, title: 'Enabled' },
					{ id: false, title: 'Disabled' },
				]"
				:optionPreselect="currentConfigMenu.auto_backup?.enabled"
				@valueChanged="currentConfigMenu.auto_backup.enabled = $event.option" />
			<div v-if="currentConfigMenu.auto_backup?.enabled">
				<AdvancedInput
					text="Backup every"
					name="backup_schedule"
					type="number"
					placeholder="Time"
					oTitleKey="title"
					oIdKey="value"
					:options="[
						{ title: 'Days', value: 24 * 60 * 60 * 1000 },
						{ title: 'Weeks', value: 7 * 24 * 60 * 60 * 1000 },
						{ title: 'Months', value: 30 * 24 * 60 * 60 * 1000 },
					]"
					:value="currentConfigMenu.auto_backup?.schedule?.value"
					:optionPreselect="currentConfigMenu.auto_backup?.schedule?.option"
					@valueChanged="currentConfigMenu.auto_backup.schedule = { value: +$event.value, option: $event.option }" />
				<AdvancedInput
					text="Next Backup"
					name="next_backup"
					type="date"
					@valueChanged="currentConfigMenu.auto_backup.next_backup = $event.value"
					:value="currentConfigMenu.auto_backup?.next_backup" />
			</div>
			<AdvancedInput
				text="Max Backup Count"
				name="max_retention_count"
				type="number"
				:value="currentConfigMenu.auto_backup?.max_retention_count"
				@valueChanged="currentConfigMenu.auto_backup.max_retention_count = +$event.value" />
			<AdvancedInput
				text="Include Config File"
				name="include_config_file"
				oTitleKey="title"
				oIdKey="id"
				:inputHidden="true"
				:options="[
					{ id: true, title: 'Yes' },
					{ id: false, title: 'No' },
				]"
				:optionPreselect="currentConfigMenu.include_config_file"
				@valueChanged="currentConfigMenu.include_config_file = $event.option" />
			<button
				style="float: right; padding-left: 30px; padding-right: 30px"
				@click="
					$emit('confirm', {
						title: 'Save backup settings?',
						text: 'Are you sure you want to update the backup configuration?',
						callback: saveBackupConfig,
					})
				">
				Save
			</button>

			<h3 class="backup-section-header" style="clear: both; padding-top: 20px;">Manual Backup</h3>
			<button
				:disabled="backup_creating"
				class="backup-create-btn"
				@click="
					$emit('confirm', {
						title: 'Create backup now?',
						text: 'This will create a full backup of the database' + (currentConfigMenu.include_config_file ? ' and configuration file' : '') + '.',
						callback: createBackup,
					})
				">
				{{ backup_creating ? 'Creating backup...' : 'Create Backup Now' }}
			</button>

			<h3 class="backup-section-header">Existing Backups</h3>
			<div v-if="backup_list.length === 0" style="color: #aaa; padding: 10px;">No backups found.</div>
			<div v-for="b of backup_list" :key="b.name" class="backup-entry">
				<div class="backup-info">
					<strong>{{ b.name }}</strong>
					<span style="color: #aaa; margin-left: 10px; font-size: 0.85em;">{{ formatBackupDate(b.timestamp) }}</span>
					<span v-if="b.includesConfig" style="color: #8f8; margin-left: 10px; font-size: 0.8em;">[+config]</span>
				</div>
				<div class="backup-actions">
					<button
						:disabled="backup_restoring === b.name"
						class="backup-restore-btn"
						@click="
							$emit('confirm', {
								title: 'Restore from backup?',
								text: 'WARNING: This will overwrite ALL current data with the backup. This action cannot be undone.',
								callback: (cbData) => restoreBackup(b.name, cbData),
							})
						">
						{{ backup_restoring === b.name ? 'Restoring...' : 'Restore' }}
					</button>
					<button
						class="backup-delete-btn"
						@click="
							$emit('confirm', {
								title: 'Delete backup?',
								text: 'Are you sure you want to permanently delete this backup?',
								callback: (cbData) => deleteBackup(b.name, cbData),
							})
						">
						Delete
					</button>
				</div>
			</div>
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

.backup-section-header {
	margin-bottom: 15px;
	border-bottom: 2px solid #fff2;
	padding-bottom: 5px;
	margin-top: 20px;
}

.backup-section-header:first-child {
	margin-top: 0;
}

.backup-create-btn {
	padding: 10px 30px;
	margin-bottom: 20px;
}

.backup-entry {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 15px;
	margin-bottom: 5px;
	background: #fff1;
	border-radius: 8px;
}

.backup-info {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 5px;
}

.backup-actions {
	display: flex;
	flex-shrink: 0;
	gap: 5px;
}

.backup-restore-btn {
	background: #e8a33a;
	color: #000;
	padding: 5px 15px;
	border-radius: 5px;
}

.backup-delete-btn {
	background: #c44;
	color: #fff;
	padding: 5px 15px;
	border-radius: 5px;
}
</style>
