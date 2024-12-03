<script setup lang="ts">
	import { assertExpressionStatement } from '@babel/types';
	import $ from 'jquery';
	import MarqueeText from 'vue-marquee-text-component';
</script>

<script lang="ts">
	import managerIcon from '../assets/manage_accounts.svg';
	export default {
		data() {
			return {
				onHover: false,
				hoverMenuLeft: 0,
			};
		},
		props: {
			wl_data: {
				required: true,
				type: Object,
			},
			hoverMenuVisible: {
				required: false,
				type: Boolean,
				default: true,
			},
		},
		methods: {
			setApprovalStatus: function (status: Boolean, successCB: any) {
				console.log('Removing', this.$props.wl_data);
				$.ajax({
					url: '/api/approval/write/setApprovedStatus',
					type: 'post',
					data: { approve_update: status, ...this.$props.wl_data },
					dataType: 'json',
					success: (dt) => {
						console.log(dt);
						if (successCB) successCB();
						this.$emit('removedPlayer', this.$props.wl_data);
					},
				});
			},
			updateHoverMenuLeft: function (e: any) {
				this.hoverMenuLeft = e.target.scrollLeft;
			},
			rejectApproval: function () {
				this.setApprovalStatus(false, () => {});
			},
			approveApproval: function () {
				this.setApprovalStatus(true, () => {});
			},
		},
		created() {
			console.log('wl_data', this.wl_data);
		},
	};
</script>

<template>
	<div class="gameGroupCard shadow">
		<span class="dot" :class="{ fill: wl_data.approved }"></span>
		<div class="groupName tag">{{ wl_data.username }}</div>
		<!--<div class="clanTag"></div>-->
		<div class="mainGroupContainer" @scroll="updateHoverMenuLeft">
			<!-- <marquee-text :duration="10" :paused="false"></marquee-text> -->
			<span class="tag">{{ wl_data.group_full_data[0].group_name }}</span>
			<span class="tag noBg redTrans">{{ wl_data.steamid64 }}</span>
			<span class="tag noBg redTrans" v-if="wl_data.discord_username != ''">{{ wl_data.discord_username }}</span>
			<span class="tag"><img :src="managerIcon" />{{ wl_data.inserted_by[0].username }}</span>

			<div class="align-self: flex-end;">
				<button @click="rejectApproval">Reject</button>
				<button @click="approveApproval">Approve</button>
			</div>
			<!-- <span class="steamid64">{{ wl_data.steamid64 }}</span> -->
		</div>
		<!-- <div class="btnContainer"><button @click="hoverMenuVisible = !hoverMenuVisible">Edit</button></div> -->
	</div>
</template>

<style scoped>
	.hoverMenu {
		bottom: -100%;
		left: v-bind(hoverMenuLeft + 'px');
		width: 100%;
		height: calc(100% - 5px);
		background: #222;
		border-top-left-radius: 15px;
		border-top-right-radius: 15px;
		visibility: visible;
	}

	.dot {
		width: 20px;
		height: 20px;
		border-radius: 20px;
		border: 3px solid var(--accent-color);
		background: #0000;
		margin: 10px;
	}

	.dot.fill {
		background: var(--accent-color);
	}

	.groupName.tag {
		margin-left: 0px;
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

	.mainGroupContainer {
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
</style>
