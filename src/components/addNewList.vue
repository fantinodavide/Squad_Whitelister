<script setup lang="ts">
	import { assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import { render } from 'vue';
	import popup from './popup.vue';
</script>

<script lang="ts">
	export default {
		data() {
			return {};
		},
		props: {
			add_data: {
				required: true,
				type: Object,
			},
		},
		methods: {
			confirmBtnClick: function (dt: any) {
				dt.sel_clan_id = this.add_data.sel_clan;
				dt.sel_list_id = this.add_data.sel_list_id;
				const compPopup: any = this.$refs.popupLogin;
				$.ajax({
					url: '/api/lists/write/addPlayer',
					type: 'post',
					data: JSON.stringify(dt),
					dataType: 'json',
					contentType: 'application/json',
					timeout: 60000,
					success: (dt) => {
						if (dt.status == 'inserted_new_list') {
							this.add_data.callback();
							this.$emit('cancelBtnClick');
						} else {
							console.error(dt);
							compPopup.blinkAll();
						}
					},
					error: (err) => {
						console.error(err);
						compPopup.blinkAll();
					},
				});
			},
		},
		components: { popup },
		created() {},
	};
</script>

<template>
	<popup ref="popupLogin" title="New Clan" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick">
		<input name="title" type="text" placeholder="Title" />
		<input name="output_path" type="text" placeholder="Output Path" />
	</popup>
</template>

<style scoped></style>
