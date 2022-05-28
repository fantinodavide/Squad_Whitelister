<script setup lang="ts">
import { assertExpressionStatement } from "@babel/types";
import $ from 'jquery';
import MarqueeText from 'vue-marquee-text-component'
</script>

<script lang="ts">
export default {

	data() {
		return {
			clan_data: {},
			hoverMenuVisible: false,
			hoverMenuLeft: 0
		}
	},
	props: {
		group_data: {
			required: true,
			type: Object
		}
	},
	methods: {
		deleteGroup: function (successCB: any) {
			console.log("Removing", this.$props.group_data)
			$.ajax({
				url: "/api/gameGroups/remove",
				type: "post",
				data: this.$props.group_data,
				dataType: "json",
				success: (dt) => {
					console.log(dt);
					successCB();
					//location.reload();
				}
			})
		},
		updateHoverMenuLeft: function(e:any){
			this.hoverMenuLeft = e.target.scrollLeft
		}
	}
}
</script>

<template>
	<div class="gameGroupCard">
		<div class="groupName tag">{{ group_data.group_name }}
		</div>
		<!--<div class="clanTag"></div>-->
		<div class="mainGroupContainer" @scroll="updateHoverMenuLeft">
			<!-- <marquee-text :duration="10" :paused="false"></marquee-text> -->
				<span class="tag" v-for="p of group_data.group_permissions">{{ p }}</span>
			<!-- <div class="overflow">
			</div> -->
			<div class="hoverMenu" :class="{vis: hoverMenuVisible}">
				<button @click="$emit('confirm', { group_data: group_data, callback: deleteGroup })">Delete</button>
				<button>Permissions</button>
			</div>
		</div>
		<div class="btnContainer"><button @click="hoverMenuVisible = !hoverMenuVisible">Edit</button></div>
	</div>
</template>

<style scoped>
.hoverMenu {
	position: absolute;
	bottom: -100%;
	left: v-bind(hoverMenuLeft + "px");
	width: 100%;
	height: calc(100% - 5px);
	opacity: 1;
	padding: 5px;
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: stretch;
	transition: all 150ms ease-in-out;
	background: #222;
    overflow: auto;
    border-top-left-radius: 15px;
    border-top-right-radius: 15px;
}
.hoverMenu.vis{
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
}

.groupName {
	margin: 15px;
	padding: 3px 10px;
	background: var(--accent-color);
	color: #2a2a2a;
	border-radius: 13px;
}
</style>
