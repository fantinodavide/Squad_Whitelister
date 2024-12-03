<template>
	<popup ref="popupLogin" title="Login" confirm-text="Login" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="loginBtnClick" :hide-cancel="false">
		<input name="username" type="text" placeholder="Username" />
		<input name="password" type="password" placeholder="Password" />
	</popup>
</template>

<script setup lang="ts">
	import { assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import popup from './popup.vue';
</script>

<script lang="ts">
	export default {
		methods: {
			loginBtnClick(dt: any) {
				console.log('attempting login', dt);
				$.ajax({
					url: '/api/login',
					type: 'post',
					data: dt,
					dataType: 'json',
					success: (dt) => {
						console.log(dt);
						this.$emit('login_done');
						location.reload();
					},
					error: (err) => {
						console.error(err);
						const compPopup: any = this.$refs.popupLogin;
						compPopup.blinkAll();
						//.blinkBgColor(this.$refs.popupLogin.getInputs());
					},
				});
			},
		},
		components: { popup },
	};
</script>

<style scoped></style>
