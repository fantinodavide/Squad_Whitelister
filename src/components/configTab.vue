<script setup lang="ts"></script>

<script lang="ts">
	import { anyTypeAnnotation } from '@babel/types';
	import { stringifyStyle } from '@vue/shared';
	import $ from 'jquery';
	import { type } from 'os';
	import SideMenu from './sideMenu.vue';
	import tab from './tab.vue';
	import confLabelInput from './confLabelInput.vue';

	export default {
		data() {
			return {
				currentConfigMenu: {} as any,
				selectedMenu: '' as string,
				config_tr: {} as any,
				discord_servers: [] as Array<any>,
				discord_channels: [] as Array<any>,
				discord_invite_link: '' as string,
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
				return o.toString().startsWith('#') ? 'color' : tmpType[typeof o];
			},
			configMenuChanged: function (e: any) {
				let cpe = { ...e.config };
				delete cpe.selected;
				this.selectedMenu = e.menu;

				this.currentConfigMenu = cpe;
			},
			getTranslation: function (t: string) {
				const trC = this.config_tr[t];
				return trC ? trC : this.toUpperFirstChar(t.replace(/\_/g, ' '));
			},
			toUpperFirstChar: function (string: string) {
				return string.charAt(0).toUpperCase() + string.slice(1);
			},
			convHex6digs: function (hex: any) {
				if (hex.toString().startsWith('#')) {
					return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
				} else return hex;
			},
			sendConfigToServer: function (popup: any) {
				const dt = { category: this.selectedMenu, config: this.currentConfigMenu };
				console.log('Saving_config:', this.selectedMenu, this.currentConfigMenu);
				$.ajax({
					url: '/api/config/write/update',
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
			openNewTab: function (url: string) {
				window.open(url, '_blank');
			},
		},
		created() {
			this.getDiscordServers();
			this.getDiscordChannels();
			this.getDiscordInviteLink();
		},
		components: { SideMenu, tab, confLabelInput },
	};
</script>

<template>
	<SideMenu @menuChanged="configMenuChanged" />
	<tab>
		<div v-if="selectedMenu != 'discord_bot'" class="ct">
			<!-- <label v-for="k of Object.keys(currentConfigMenu)">{{ getTranslation(k) }}<input :type="getInputType(currentConfigMenu[k])" v-model="currentConfigMenu[k]" /></label> -->
			<confLabelInput v-for="k of Object.keys(currentConfigMenu)" :key="k" :confKey="k" :modelValue="currentConfigMenu[k]" @update:modelValue="(nv) => (currentConfigMenu[k] = nv)" />
			<button style="float: right; width: 100px" @click="$emit('confirm', { title: 'Save server configuration?', text: 'Are you sure you want to change the server configuration? Bad configuration may result into multiple failures or temporary data loss.', callback: sendConfigToServer })">Save</button>
		</div>
		<div v-else class="ct">
			<confLabelInput confKey="token" :modelValue="currentConfigMenu.token" @update:modelValue="(nv) => (currentConfigMenu.token = nv)" />
			<!-- <label>Token<input :type="getInputType(currentConfigMenu.token)" :v-bind="currentConfigMenu.token" placeholder="Token" /> </label> -->
			<label>
				Discord Server
				<select @change="(e:any) => (currentConfigMenu.server_id = e.target.value)">
					<option value="" hidden selected>Select a server</option>
					<option :key="s.id" v-for="s of discord_servers" :value="s.id" :selected="s.id == currentConfigMenu.server_id">
						{{ s.name }}
					</option>
				</select>
			</label>
			<label>
				Whitelist updates channel
				<select @change="(e:any) => (currentConfigMenu.whitelist_updates_channel_id = e.target.value)">
					<option :key="s.id" v-for="s of discord_channels" :value="s.id" :selected="s.id == currentConfigMenu.whitelist_updates_channel_id">
						{{ s.name }}
					</option>
				</select>
			</label>
			<!-- {{ JSON.stringify(currentConfigMenu) }} -->
			<button style="float: right; padding-left: 30px; padding-right: 30px" @click="$emit('confirm', { title: 'Save server configuration?', text: 'Are you sure you want to change the server configuration? Bad configuration may result into multiple failures or temporary data loss.', callback: sendConfigToServer })">Save</button>
			<button v-if="discord_invite_link != ''" @click="openNewTab(discord_invite_link)" style="background: #5865f2; color: #fff; float: right; padding-left: 30px; padding-right: 30px">Invite to Server</button>
		</div>
	</tab>
</template>

<style scoped>
	label {
		flex-wrap: nowrap;
		white-space: nowrap;
	}
	label > input,
	label > select {
		margin-left: 10px;
	}
	div.ct {
		margin: 0 auto;
	}
</style>
