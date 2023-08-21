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
			add_data: {
				required: true,
				type: Object,
			},
			editing: {
				required: false,
				type: Boolean,
				default: false,
			},
			roles: {
				required: true,
				type: Object,
			},
		},
		methods: {
			confirmBtnClick: function (dt: any) {
				const postUrl = this.editing ? '/api/api_keys/write/edit' : '/api/api_keys/write/create';
				dt = { ...dt, ...this.add_data };

				const compPopup: any = this.$refs.popupLogin;
				console.log(this.$refs);
				$.ajax({
					url: postUrl,
					type: 'post',
					data: JSON.stringify(dt),
					dataType: 'json',
					contentType: 'application/json',
					timeout: 3000,
					success: (dt) => {
						if (dt.status == 'inserted_new_api-key') {
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
		components: { popup, SelectMultiple },
		created() {
			delete this.roles[0];
		},
	};
</script>

<template>
	<popup ref="popupLogin" title="New Api Key" @cancelBtnClick="$emit('cancelBtnClick', $event)" @confirmBtnClick="confirmBtnClick" :extRetProp="extRet">
		<input name="name" type="text" placeholder="Name" />
		<select name="role">
			<option hidden selected value>Select a role</option>
			<option v-for="r of roles" :value="r.access_level" :key="r">{{ r.name }}</option>
		</select>
	</popup>
</template>

<style scoped></style>
