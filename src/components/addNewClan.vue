<script setup lang="ts">
import { assertExpressionStatement } from "@babel/types";
import $ from 'jquery';
import popup from "./popup.vue";
</script>

<script lang="ts">
export default {
	methods: {
		confirmBtnClick(dt: any) {
			$.ajax({
				url: "/api/clans/newClan",
				type: "post",
				data: dt,
				dataType: "json",
				success: (dt) => {
					console.log(dt);
					this.$emit("new_clan",dt)
					this.$emit("cancelBtnClick")
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
	<popup ref="popupLogin" title="New Clan" @cancelBtnClick="$emit('cancelBtnClick', $event)"
		@confirmBtnClick="confirmBtnClick">
		<input name="full_name" type="text" placeholder="Full Clan Name" />
		<input name="tag" type="text" placeholder="Clan Tag" />
		<label>Always Require Approval<input name="confirmation_ovrd" type="checkbox" placeholder="Confirmation Override" /></label>
	</popup>
</template>

<style scoped>
</style>
