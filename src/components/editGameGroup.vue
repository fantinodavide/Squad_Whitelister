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
				permissions: ['startvote', 'changemap', 'pause', 'cheat', 'private', 'balance', 'chat', 'kick', 'ban', 'config', 'cameraman', 'immune', 'manageserver', 'featuretest', 'reserve', 'demos', 'clientdemos', 'debug', 'teamchange', 'forceteamchange', 'canseeadminchat'],
				discord_roles: [] as Array<any>,
				extRet: {
					discord_roles: [] as Array<any>,
				},
			};
		},
		props: {
			group_data: {
				type: Object,
				default: {},
			},
		},
		methods: {
			confirmBtnClick(dt: any) {
				console.log(dt);
				$.ajax({
					url: '/api/gameGroups/write/editGroup',
					type: 'post',
					dataType: 'json',
					data: JSON.stringify({ _id: this.group_data._id, ...dt }),
					contentType: 'application/json',
					success: (dt) => {
						console.log(dt);
						this.$emit('edited', dt);
						this.$emit('cancelBtnClick');
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
		created() {
			this.getAllDiscordRoles();
			console.log(this.group_data);
		},
		components: { popup, SelectMultiple },
	};
</script>

<template>
	<popup ref="popupComp" title="Edit Group" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick" :extRetProp="extRet">
		<input name="group_name" type="text" placeholder="Group Name" :value="group_data.group_name" regex="^[a-zA-Z\d]{2,}$" />
		<select name="group_permissions" multiple>
			<option v-for="p in permissions.sort()" :value="p" :selected="group_data.group_permissions.includes(p)">{{ p }}</option>
		</select>
		<SelectMultiple :elements="discord_roles" oIdKey="id" oTitleKey="name" title="Discord Roles" :preselect="group_data.discord_roles" @selectChanged="extRet.discord_roles = $event" />

		<label>Require Approval<input name="require_appr" type="checkbox" placeholder="Require Approval" :checked="group_data.require_appr" /></label>
	</popup>
</template>

<style scoped></style>
