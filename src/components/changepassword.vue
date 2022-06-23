<script setup lang="ts">
	import { assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import popup from './popup.vue';
</script>

<script lang="ts">
	export default {
		methods: {
			confBtnClick(dt: any) {
				const compPopup: any = this.$refs.popupLogin;
				if (dt.password == dt.conf_password) {
					console.log('attempting signup', dt);
					$.ajax({
						url: '/api/changepassword',
						type: 'post',
						data: dt,
						dataType: 'json',
						success: (dt) => {
							console.log(dt);
							this.$emit('password_changed');
							location.reload();
						},
						error: (err) => {
							console.error(err);
							compPopup.blinkAll();
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
	<popup ref="popupLogin" title="Change Password" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confBtnClick" :hide-cancel="false">
		<input name="old_password" type="password" placeholder="Old Password" />
		<input name="new_password" type="password" placeholder="New Password" />
		<input name="conf_password" type="password" placeholder="Confirm New Password" />
	</popup>
</template>

<style scoped></style>
