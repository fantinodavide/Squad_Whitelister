<script setup lang="ts">
	import { anyTypeAnnotation, assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import bin_icon from '@/assets/bin.svg';
	import crown_icon from '@/assets/crown.svg';
</script>

<script lang="ts">
	export default {
		data() {
			return {
				refs: {
					roleSel: {} as any,
				},
			};
		},
		props: {
			user_data: {
				required: true,
				type: Object,
			},
			roles: {
				required: true,
				type: Object,
			},
		},
		methods: {
			deleteRecord: function (successCB: any, skipConfirmation = false) {
				console.log('Removing', this.$props.user_data);
				$.ajax({
					url: '/api/users/write/remove',
					type: 'post',
					data: this.$props.user_data,
					dataType: 'json',
					success: (dt) => {
						console.log(dt);
						if (successCB) successCB();
						if (!skipConfirmation) this.$emit('removedUser', this.$props.user_data);
					},
				});
			},
			updateAccessLevel: function (successCB: any, skipConfirmation = false) {
				console.log('updating', this.$props.user_data);
				$.ajax({
					url: '/api/users/write/updateAccessLevel',
					type: 'post',
					data: { upd: this.refs.roleSel.value, ...this.user_data },
					dataType: 'json',
					success: (dt) => {
						console.log(dt);
						this.rawBlink(this.refs.roleSel, '#252');
					},
				});
			},
			rawBlink: function (e: any, color: string) {
				e.style.backgroundColor = color;
				setTimeout(() => {
					e.style.backgroundColor = '';
				}, 2000);
			},
		},
	};
</script>

<template>
	<div class="gameGroupCard shadow" v-if="user_data.username != 'admin'">
		<div class="groupName tag">{{ user_data.username }}</div>
		<div class="mainContainer">
			<span v-if="user_data.clan_data.length > 0" class="tag"><img v-if="user_data.clan_data[0].admins.length > 0 && user_data.clan_data[0] && user_data.clan_data[0].admins.includes(user_data._id)" :src="crown_icon" alt="" />{{ user_data.clan_data[0] ? user_data.clan_data[0].tag : '' }}</span>
			<select
				:ref="
					(e) => {
						refs.roleSel = e;
					}
				"
				name="roleSel"
				@change="updateAccessLevel"
			>
				<option v-for="r in roles" :value="r.access_level" :selected="user_data.access_level == r.access_level">{{ r.name }}</option>
			</select>
			<button class="redBG round" @click="$emit('deleteRecord', { _id: user_data._id, username: user_data.username, callback: deleteRecord })"><img :src="bin_icon" /></button>
		</div>
	</div>
</template>

<style scoped>
	.hoverMenu {
		bottom: -100%;
		/* left: v-bind(hoverMenuLeft + 'px'); */
		width: 100%;
		height: calc(100% - 5px);
		background: #222;
		border-top-left-radius: 15px;
		border-top-right-radius: 15px;
		visibility: visible;
	}

	.gameGroupCard:hover .hoverMenu,
	.hoverMenu.vis {
		bottom: 0;
	}

	.gameGroupCard:hover .hoverMenu {
		opacity: 1;
		pointer-events: all;
	}

	.hoverMenu button {
		border: 5px solid #fff2;
		border-radius: 10px;
		margin: 5px;
		flex-grow: 1;
		background: #0000;
		color: #fff2;
		transition: all 100ms ease-in-out;
		max-width: 250px;
	}

	.hoverMenu button:hover {
		color: var(--accent-color);
		border-color: var(--accent-color);
	}

	.gameGroupCard {
		border: none;
		background: #2f2f2f;
	}

	.mainContainer {
		position: relative;
		flex-grow: 1;
		height: 100%;
		display: flex;
		flex-direction: row;
		align-items: center;
		overflow: hidden;
		width: 0px;
		overflow-x: auto;
		margin-right: 10px;
	}

	.groupName {
		margin: 15px;
		padding: 3px 10px;
		background: var(--accent-color);
		color: #2a2a2a;
		border-radius: 13px;
	}
	select {
		margin: 5px !important;
		background: #383838;
	}
</style>
