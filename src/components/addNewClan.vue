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
				url: "/api/",
				type: "post",
				data: dt,
				dataType: "json",
				success: (dt) => {
					console.log(dt);
					this.$emit("")
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
		<input name="clan_full_name" type="text" placeholder="Full Clan Name" />
		<input name="clan_tag" type="text" placeholder="Clan Tag" />
	</popup>
</template>

<style scoped>
</style>
