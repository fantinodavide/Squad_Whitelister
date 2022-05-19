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
		<div class="clanName">{{ clan_data.full_name }}</div>
		<div class="clanTag">{{ clan_data.tag }}</div>
		<div class="clanCode">{{ clan_data.clan_code }}</div>
	</div>
</template>

<style scoped>
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
}

.clanTag {
	flex-grow: 1;
}

.clanCode {
	border-radius: 0;
	/* border-top-left-radius: 10px;
	border-top-right-radius: 10px; */
	padding: 0px 10px;
	background: #999;
	color: #111;
	font-size: 15px;
	text-align: center;
}
</style>
