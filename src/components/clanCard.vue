<script setup lang="ts">
import { assertExpressionStatement } from "@babel/types";
</script>

<script lang="ts">
export default {
	props: {
		clan_data: {
			required: true,
			type: Object
		}
	},
	methods: {
	}
}
</script>

<template>
	<div class="clanCard">
		<div class="clanName"><span class="clanTag">{{ clan_data.tag }}</span>{{ clan_data.full_name }}</div>
		<!--<div class="clanTag"></div>-->
		<div class="mainClanContainer">
			<div class="hoverMenu">
				<button>Delete</button>
				<button>Whitelist</button>
				<button>Admins</button>
			</div>
		</div>
		<div class="clanCode">{{ clan_data.clan_code }}</div>
	</div>
</template>

<style scoped>
.hoverMenu {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	opacity: 0;
	padding: 5px;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: stretch;
	transition: all 100ms ease-in-out pointer-events 0ms 500ms ease-in-out;
	background: #0003;
	pointer-events: none;
}

.clanCard:hover .hoverMenu {
	opacity: 1;
	pointer-events: all;
}
.hoverMenu button{
	border: 5px solid #fff2;
    border-radius: 10px;
    margin: 5px;
	flex-grow: 1;
    background: #0000;
    color: #fff2;
	transition: all 100ms ease-in-out;
}
.hoverMenu button:hover{
    color: var(--accent-color);
	border-color: var(--accent-color);
}

.clanCard {
	border: none;
	background: #2f2f2f;
}

.clanName,
.clanCode {
	background: #ddd;
	/* border-bottom-left-radius: 10px;
	border-bottom-right-radius: 10px; */
	color: #222;
	font-size: 18px;
	padding: 5px 10px;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.mainClanContainer {
	position: relative;
	flex-grow: 1;
}

.clanTag {
	background: #555;
	color: #ddd;
	border-radius: 10px;
	padding: 1px 5px;
	margin-right: 5px;
	height: 28px;
	text-align: center;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.clanCode {
	border-radius: 0;
	/* border-top-left-radius: 10px;
	border-top-right-radius: 10px; */
	padding: 0px 10px;
	background: #999;
	color: #111;
	font-size: 15px;
	justify-content: center;
}
</style>
