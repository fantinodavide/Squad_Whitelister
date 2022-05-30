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
	props: {
		group_data: {
			type: Object,
			default: {}
		}
	},
	methods: {
		confirmBtnClick(dt: any) {
			console.log(dt)
			$.ajax({
				url: "/api/gameGroups/write/editGroup",
				type: "post",
				dataType: "json",
				data: JSON.stringify({ _id: this.group_data._id, ...dt }),
				contentType: 'application/json',
				success: (dt) => {
					console.log(dt);
					this.$emit("edited",dt)
					this.$emit("cancelBtnClick")
				},
				error: (err) => {
					console.error(err);
					const compPopup: any = this.$refs.popupComp;
					compPopup.blinkAll()
					//.blinkBgColor(this.$refs.popupLogin.getInputs());
				}
			})
		}
	},
	created() {
		console.log(this.group_data);
	},
	components: { popup }
}
</script>

<template>
	<popup ref="popupComp" title="Edit Group" @cancelBtnClick="$emit('cancelBtnClick', $event)"
		@confirmBtnClick="confirmBtnClick">
		<input name="group_name" type="text" placeholder="Group Name" :value="group_data.group_name"/>
		<select name="group_permissions" multiple>
			<option v-for="p in permissions.sort()" :value="p" :selected="group_data.group_permissions.includes(p)">{{ p }}</option>
		</select>
		<label>Require Approval<input name="require_appr" type="checkbox"
				placeholder="Require Approval" :checked="group_data.require_appr"/></label>
	</popup>
</template>

<style scoped>
</style>
