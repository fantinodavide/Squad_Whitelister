<script setup lang="ts">
	import { assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import popup from './popup.vue';
</script>

<script lang="ts">
	export default {
		data() {
			return {};
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
		},
		components: { popup },
	};
</script>

<template>
	<popup id="popup" ref="popupComp" title="Import Whitelist" confirmText="Import" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick">
		<textarea placeholder="Paste here your whitelist"></textarea>
	</popup>
</template>

<style scoped>
	#popup {
		width: 700px !important;
		height: 900px !important;
		max-height: calc(100% - 30px);
	}
	#popup textarea {
		flex-grow: 1;
		white-space: nowrap;
	}
</style>
