<script setup lang="ts">
	import { assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import popup from './popup.vue';
	import SelectMultiple from './selectMultiple.vue';
</script>

<script lang="ts">
	export default {
		data() {
			return {
				permissions: [
					{ id: 'balance', name: 'Balance' },
					{ id: 'ban', name: 'Ban' },
					{ id: 'cameraman', name: 'Cameraman' },
					{ id: 'canseeadminchat', name: 'Can see Admin Chat' },
					{ id: 'changemap', name: 'Change Map' },
					{ id: 'chat', name: 'Chat' },
					{ id: 'cheat', name: 'Cheat' },
					{ id: 'clientdemos', name: 'Client Demos' },
					{ id: 'config', name: 'Config' },
					{ id: 'debug', name: 'Debug' },
					{ id: 'demos', name: 'Demos' },
					{ id: 'featuretest', name: 'Feature Test' },
					{ id: 'forceteamchange', name: 'Force Team Change' },
					{ id: 'immune', name: 'Immune' },
					{ id: 'kick', name: 'Kick' },
					{ id: 'manageserver', name: 'Manage Server' },
					{ id: 'pause', name: 'Pause' },
					{ id: 'private', name: 'Private' },
					{ id: 'reserve', name: 'Reserve' },
					{ id: 'startvote', name: 'Start Vote' },
					{ id: 'teamchange', name: 'Team Change' },
				],
				discord_roles: [] as Array<any>,
				extRet: {
					discord_roles: [] as Array<any>,
					group_permissions: [] as Array<any>,
				},
			};
		},
		methods: {
			log: console.log,
			confirmBtnClick(dt: any) {
				console.log(dt);
				$.ajax({
					url: '/api/gameGroups/write/newGroup',
					type: 'post',
					dataType: 'json',
					data: JSON.stringify(dt),
					contentType: 'application/json',
					success: (dt) => {
						console.log(dt);
						this.$emit('new_game_group', dt);
					},
					error: (err) => {
						console.error(err);
						const compPopup: any = this.$refs.popupComp;
						compPopup.blinkAll();
						//.blinkBgColor(this.$refs.popupLogin.getInputs());
					},
				});
			},
			getAllDiscordRoles: function () {
				fetch('/api/discord/read/getRoles')
					.then((res) => res.json())
					.then((dt) => {
						this.discord_roles = dt;
					});
			},
		},
		components: { popup, SelectMultiple },
		created() {
			this.getAllDiscordRoles();
		},
	};
</script>

<template>
	<popup ref="popupComp" title="New Group" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick" :extRetProp="extRet">
		<input name="group_name" type="text" placeholder="Group Name" regex="^[a-zA-Z\d]{2,}$" />
		<!-- <select name="group_permissions" multiple>
			<option v-for="p in permissions.sort()" :value="p">{{ p }}</option>
		</select> -->
		<!-- <select name="discord_role">
			<option hidden selected multiple>Bound discord role</option>
			<option v-for="p in discord_roles" :value="p.id">{{ p.name }}</option>
		</select> -->
		<SelectMultiple :elements="permissions" oIdKey="id" oTitleKey="name" title="Permissions" @selectChanged="extRet.group_permissions = $event" />
		<SelectMultiple :elements="discord_roles" oIdKey="id" oTitleKey="name" title="Discord Roles" @selectChanged="extRet.discord_roles = $event" />
		<label>Require Approval<input name="require_appr" type="checkbox" placeholder="Require Approval" /></label>
	</popup>
</template>

<style scoped></style>
