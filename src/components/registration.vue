<script setup lang="ts">
import { assertExpressionStatement } from "@babel/types";
import $ from 'jquery';
import popup from "./popup.vue";
</script>

<script lang="ts">
export default {
	methods: {
		confBtnClick(dt: any) {
			console.log("attempting signup", dt)
			$.ajax({
				url: "/api/signup",
				type: "post",
				data: dt,
				dataType: "json",
				success: (dt) => {
					console.log(dt);
					this.$emit("login_done")
					location.reload();
				},
				error: (err) => {
					console.error(err);
					const compPopup: any = this.$refs.popupLogin;
					compPopup.blinkAll()
					//.blinkBgColor(this.$refs.popupLogin.getInputs());
				}
			})
		}
	},
	components: { popup }
}
</script>

<template>
	<popup ref="popupLogin" title="Sign Up" confirm-text="Sign Up" @cancelBtnClick="$emit('cancelBtnClick', $event)"
		@confirmBtnClick="confBtnClick" :hide-cancel="false">
		<input name="username" type="text" placeholder="Username" />
		<input name="password" type="password" placeholder="Password" />
		<input name="conf_password" type="password" placeholder="Confirm Password" />
		<input name="clan_code" type="text" placeholder="Clan Code" />
	</popup>
</template>

<style scoped>
</style>
