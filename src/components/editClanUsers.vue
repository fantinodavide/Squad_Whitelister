<script setup lang="ts">
	import $ from 'jquery';
	import { render } from 'vue';
	import popup from './popup.vue';
	import SelectMultiple from './selectMultiple.vue';
</script>

<script lang="ts">
	export default {
		data() {
			return {
				clan_users: [] as Array<any>,
				clan_admins: [] as Array<any>,
				extRet: {
					clan_admins: [] as Array<any>,
				},
			};
		},
		props: {
			clan_data: {
				required: true,
				type: Object,
			},
		},
		methods: {
			confirmBtnClick(dt: any) {
				console.log('Setting admins:', dt);
				$.ajax({
					url: '/api/clans/editClanAdmins',
					type: 'post',
					data: JSON.stringify({ _id: this.clan_data._id, ...dt }),
					dataType: 'json',
					contentType: 'application/json',
					success: (srvDt) => {
						console.log(srvDt);
						this.$emit('clan_users_edited', srvDt);
						this.$emit('cancelBtnClick');
					},
					error: (err) => {
						console.error(err);
						const compPopup: any = this.$refs.popupLogin;
						compPopup.blinkAll();
						//.blinkBgColor(this.$refs.popupLogin.getInputs());
					},
				});
			},
			getClanUsers: function () {
				$.ajax({
					url: '/api/clans/getClanUsers',
					type: 'get',
					data: this.clan_data,
					dataType: 'json',
					success: (srvDt) => {
						this.clan_users = srvDt;
					},
					error: (err) => {
						console.error(err);
						const compPopup: any = this.$refs.popupLogin;
						compPopup.blinkAll();
						//.blinkBgColor(this.$refs.popupLogin.getInputs());
					},
				});
			},
			getClanAdmins: function () {
				$.ajax({
					url: '/api/clans/getClanAdmins',
					type: 'get',
					data: this.clan_data,
					dataType: 'json',
					success: (srvDt) => {
						this.clan_admins = srvDt;
					},
					error: (err) => {
						console.error('clan admins', err);
						const compPopup: any = this.$refs.popupLogin;
						compPopup.blinkAll();
						//.blinkBgColor(this.$refs.popupLogin.getInputs());
					},
				});
			},
		},
		components: { popup, SelectMultiple },
		created() {
			console.log('clan_data', this.clan_data);
			console.log('clan_admins', this.clan_admins);
			this.getClanUsers();
			this.getClanAdmins();
		},
	};
</script>

<template>
	<popup ref="popupLogin" title="Clan Managers" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick" :extRetProp="extRet">
		<SelectMultiple :elements="clan_users.sort()" oIdKey="_id" oTitleKey="username" title="Registered Clan Members" :preselect="clan_admins" @selectChanged="extRet.clan_admins = $event" />
		<!-- <select name="clan_admins" placeholder="Clan Users" multiple optional>
			<option v-for="p in clan_users.sort()" :value="p._id" :selected="clan_admins.includes(p._id)">{{ p.username }}</option>
		</select> -->
	</popup>
</template>

<style scoped></style>
