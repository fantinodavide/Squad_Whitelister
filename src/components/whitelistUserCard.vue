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
				expirationTime: '',
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
			deleteRecord: function (successCB: any, skipConfirmation = false) {
				console.log('Removing', this.$props.wl_data);
				$.ajax({
					url: '/api/whitelist/write/removePlayer',
					type: 'post',
					data: this.$props.wl_data,
					dataType: 'json',
					success: (dt) => {
						console.log(dt);
						if (successCB) successCB();
						if (!skipConfirmation) this.$emit('removedPlayer', this.$props.wl_data);
					},
				});
			},
			updateHoverMenuLeft: function (e: any) {
				this.hoverMenuLeft = e.target.scrollLeft;
			},
			getHoursLeft: function (precision: number = 5) {
				let oHours = '00',
					oMin = '00',
					oSec = '00';
				const y: any = new Date(this.wl_data.expiration);
				const x: any = new Date();
				if (y - x > 0) {
					const hours = Math.floor((y - x) / 1000 / 60 / 60);
					const minutes = Math.floor((y - x) / 1000 / 60 - hours * 60);
					const secs = Math.floor((y - x) / 1000 - (hours < 1 ? 1 : hours) * minutes * 60);

					oHours = (hours < 10 ? '0' : '') + hours;
					oMin = (minutes < 10 ? '0' : '') + minutes;
					oSec = (secs < 10 ? '0' : '') + secs;
					if (hours < 0) oHours = '00';
					if (minutes < 0) oMin = '00';
					if (secs < 0) oSec = '00';
					console.log('Expiration', this.wl_data.username, this.wl_data.expiration, hours, minutes, secs, oHours, oMin, oSec);
				}

				return oHours + ':' + oMin + ':' + oSec;
			},
			startIntervalExpirTimeouts: function (precision: number = 5) {
				this.expirationTime = this.getHoursLeft(precision);
				setInterval(() => {
					this.expirationTime = this.getHoursLeft(precision);
				}, precision * 1000);
			},
		},
		created: function () {
			this.startIntervalExpirTimeouts(1);
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
			<span class="tag noBg redTrans" v-if="wl_data.discord_username">{{ wl_data.discord_username }}</span>
			<span class="tag"><img :src="managerIcon" />{{ wl_data.inserted_by[0].username }}</span>
			<span class="tag" v-if="wl_data.expiration">{{ expirationTime }}</span>
			<!-- <span class="steamid64">{{ wl_data.steamid64 }}</span> -->
			<div v-if="hoverMenuVisible" class="hoverMenu" :class="{ vis: onHover }">
				<button @click="$emit('confirm', { wl_data: wl_data, callback: deleteRecord })">Delete</button>
				<!-- <button @click="$emit('edit', { wl_data: wl_data })">Edit</button> -->
			</div>
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
