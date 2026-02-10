<script setup lang="ts">
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
				upd_int: -1 as any,
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
			extraTags: {
				required: false,
				default: [] as Array<any>,
			},
			roles: {
				required: true,
				default: {} as any,
			},
		},
		methods: {
			deleteRecord: function (dbData: any, skipConfirmation = false) {
				console.log('Removing', this.$props.wl_data._id);
				$.ajax({
					url: `/api/keys/${this.$props.wl_data._id}`,
					type: 'delete',
					success: (dt) => {
						if (dbData.closePopup) dbData.closePopup();
						if (!skipConfirmation) this.$emit('removedApiKey', this.$props.wl_data);
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
					const days = Math.round(hours / 24);
					const months = Math.round(days / 30);
					if (hours < 24) {
						const minutes = Math.floor((y - x) / 1000 / 60 - hours * 60);
						const secs = Math.floor((y - x) / 1000 - hours * 60 * 60 - minutes * 60);

						oHours = (hours < 10 ? '0' : '') + hours;
						oMin = (minutes < 10 ? '0' : '') + minutes;
						oSec = (secs < 10 ? '0' : '') + secs;
						if (hours < 0) oHours = '00';
						if (minutes < 0) oMin = '00';
						if (secs < 0) oSec = '00';
						console.log('Expiration', this.wl_data.username, this.wl_data.expiration, hours, minutes, secs, oHours, oMin, oSec);
						return oHours + ':' + oMin + ':' + oSec;
					} else if (months <= 0) {
						return days + ' days';
					} else return months + ' months';
				}
				return '';
			},
			startIntervalExpirTimeouts: function (precision: number = 5) {
				this.expirationTime = this.getHoursLeft(precision);
				this.upd_int = setInterval(() => {
					this.expirationTime = this.getHoursLeft(precision);
				}, precision * 1000);
			},
		},
		created: function () {
			this.startIntervalExpirTimeouts(1);
		},
		unmounted: function () {
			clearInterval(this.upd_int);
		},
	};
</script>

<template>
	<div class="gameGroupCard shadow">
		<span class="dot" :class="{ fill: true }"></span>
		<div class="groupName tag">{{ wl_data.name }}</div>
		<div class="mainGroupContainer" @scroll="updateHoverMenuLeft">
			<span class="tag" v-if="wl_data.inserted_by"><img :src="managerIcon" />{{ wl_data.inserted_by[0].username }}</span>
			<select :disabled="true" name="roleSel" style="width: auto">
				<option v-for="r of roles" :value="r.access_level" :key="r" :selected="wl_data.access_level == r.access_level" :hidden="r.access_level == 0">{{ r.name }}</option>
			</select>
			<span style="color: #ddd !important">
				{{ wl_data.token }}
			</span>
			<div v-if="hoverMenuVisible" class="hoverMenu" :class="{ vis: onHover }">
				<button @click="$emit('confirm', { wl_data: wl_data, callback: deleteRecord, title: 'Confirm deletion?', message: `Do you really want to delete the api key ${wl_data.name}?` })">
					Delete
				</button>
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
		flex-shrink: 0;
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
		width: -webkit-fill-available;
		overflow-x: auto;
		/* padding: 0px 10px; */
	}

	.mainGroupContainer {
		position: relative;
		flex-grow: 1;
		height: 100%;
		display: flex;
		flex-direction: row;
		align-items: center;
		width: 0px;
		overflow: hidden;
		overflow-x: auto;
		margin-right: 10px !important;
		min-width: 100px;
	}

	.groupName {
		margin: 15px;
		padding: 3px 10px;
		background: var(--accent-color);
		color: #2a2a2a;
		border-radius: 13px;
	}
</style>
