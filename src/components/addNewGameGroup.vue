<script setup lang="ts">
import { assertExpressionStatement } from "@babel/types";
import $ from 'jquery';
import popup from "./popup.vue";
</script>

<script lang="ts">
export default {
	data() {
		return {
			permissions: ["startvote", "changemap", "pause", "cheat", "private", "balance", "chat", "kick", "ban", "config", "cameraman", "immune", "manageserver", "featuretest", "reserve", "demos", "clientdemos", "debug", "teamchange", "forceteamchange", "canseeadminchat"]
		}
	},
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
	<popup ref="popupLogin" title="New Group" @cancelBtnClick="$emit('cancelBtnClick', $event)"
		@confirmBtnClick="confirmBtnClick">
		<input name="group_name" type="text" placeholder="Group Name" />
		<select name="group_permissions" multiple>
			<option v-for="p in permissions" :value="p">{{ p }}</option>
		</select>
		<label>Require Approval<input name="confirmation_ovrd" type="checkbox"
				placeholder="Confirmation Override" /></label>
	</popup>
</template>

<style scoped>
</style>
