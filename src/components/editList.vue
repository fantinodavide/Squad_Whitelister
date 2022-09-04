<script setup lang="ts">
	import $ from 'jquery';
	import popup from './popup.vue';
	import SelectMultiple from './selectMultiple.vue';
</script>

<script lang="ts">
	export default {
		data() {
			return {
				discord_roles: [] as Array<any>,
				extRet: {
					discord_roles: [] as Array<any>,
				},
			};
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
			getAllDiscordRoles: function () {
				fetch('/api/discord/read/getRoles')
					.then((res) => res.json())
					.then((dt) => {
						this.discord_roles = dt;
					});
			},
		},
		components: { popup, SelectMultiple },
		created() {
			this.getAllDiscordRoles();
			console.log('Editing list', this.data);
		},
	};
</script>

<template>
	<popup ref="popupLogin" title="Edit List" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick" :extRetProp="extRet">
		<input name="title" type="text" placeholder="Title" :value="data.list_obj.title" />
		<input name="output_path" type="text" placeholder="Output Path" :value="data.list_obj.output_path" regex="^[a-zA-Z\d]{2,}$" />
		<SelectMultiple :elements="discord_roles" oIdKey="id" oTitleKey="name" title="Discord Roles" :preselect="discord_roles" @selectChanged="extRet.discord_roles = $event" />
		<label>Hidden to managers<input name="hidden_managers" type="checkbox" :checked="data.list_obj.hidden_managers" placeholder="Hidden to managers" /></label>
		<label>Require Approval<input name="require_appr" type="checkbox" :checked="data.list_obj.require_appr" placeholder="Require Approval" /></label>
	</popup>
</template>

<style scoped></style>
