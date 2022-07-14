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
			data: {
				required: true,
				type: Object,
			},
		},
		methods: {
			confirmBtnClick: function (dt: any) {
				dt.sel_list_id = this.data.list_obj._id;
				console.log(dt);
				const compPopup: any = this.$refs.popupLogin;
				$.ajax({
					url: '/api/lists/write/editList',
					type: 'post',
					data: JSON.stringify(dt),
					dataType: 'json',
					contentType: 'application/json',
					timeout: 60000,
					success: (dt) => {
						if (dt.status == 'edited_list') {
							console.log(dt);
							this.data.callback();
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
		created() {
			console.log('Editing list', this.data);
		},
	};
</script>

<template>
	<popup ref="popupLogin" title="Edit List" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick">
		<input name="title" type="text" placeholder="Title" :value="data.list_obj.title" />
		<input name="output_path" type="text" placeholder="Output Path" :value="data.list_obj.output_path" regex="^[a-zA-Z\d]{2,}$" />
	</popup>
</template>

<style scoped></style>
