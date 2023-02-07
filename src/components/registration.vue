<script setup lang="ts">
	import { assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import popup from './popup.vue';
</script>

<script lang="ts">
	export default {
		props: {
			root_user_registration: {
				required: false,
				type: Boolean,
				default: false,
			},
		},
		methods: {
			confBtnClick(dt: any) {
				const compPopup: any = this.$refs.popupLogin;
				if (dt.password == dt.conf_password) {
					console.log('attempting signup', dt);
					$.ajax({
						url: '/api/signup',
						type: 'post',
						data: dt,
						dataType: 'json',
						success: (dt) => {
							console.log(dt);
							this.$emit('registration_done');
							location.reload();
						},
						error: (err: any) => {
							if (err.responseJSON.field) compPopup.blinkName(err.responseJSON.field);
							else compPopup.blinkAll();
							console.error('error', err);
							//.blinkBgColor(this.$refs.popupLogin.getInputs());
						},
					});
				} else {
					compPopup.blinkName('password');
					compPopup.blinkName('conf_password');
				}
			},
		},
		components: { popup },
	};
</script>

<template>
	<popup ref="popupLogin" :class="{ rootRegistration: root_user_registration }" :title="root_user_registration ? 'Register Root User' : 'Sign Up'" confirm-text="Sign Up" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confBtnClick" :hide-cancel="root_user_registration">
		<input name="username" type="text" placeholder="Username" />
		<input name="password" type="password" placeholder="Password" />
		<input name="conf_password" type="password" placeholder="Confirm Password" />
		<input v-if="!root_user_registration" name="clan_code" type="text" placeholder="Clan Code" optional />
		<input v-if="!root_user_registration" name="discord_username" type="text" placeholder="Discord Username" optional regex="^.{3,32}#[0-9]{4}$" />
	</popup>
</template>

<style scoped>
	.rootRegistration {
		margin: auto;
	}
	.rootRegistration input {
		height: auto;
		border-radius: 20px;
		margin: 5px;
	}
</style>
