<script setup lang="ts">
	import { assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import popup from './popup.vue';
</script>

<script lang="ts">
	export default {
		data() {
			return {
				permissions: ['startvote', 'changemap', 'pause', 'cheat', 'private', 'balance', 'chat', 'kick', 'ban', 'config', 'cameraman', 'immune', 'manageserver', 'featuretest', 'reserve', 'demos', 'clientdemos', 'debug', 'teamchange', 'forceteamchange', 'canseeadminchat'],
				discord_roles: [] as Array<any>,
			};
		},
		methods: {
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
		components: { popup },
		created() {
			this.getAllDiscordRoles();
		},
	};
</script>

<template>
	<popup ref="popupComp" title="New Group" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick">
		<input name="group_name" type="text" placeholder="Group Name" regex="^[a-zA-Z\d]{2,}$" />
		<select name="group_permissions" multiple>
			<option v-for="p in permissions.sort()" :value="p">{{ p }}</option>
		</select>
		<select name="discord_role">
			<option hidden selected>Bound discord role</option>
			<option v-for="p in discord_roles" :value="p.id">{{ p.name }}</option>
		</select>
		<label>Require Approval<input name="require_appr" type="checkbox" placeholder="Require Approval" /></label>
	</popup>
</template>

<style scoped></style>
