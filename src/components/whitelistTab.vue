<script setup lang="ts">
</script>

<script lang="ts">
import { anyTypeAnnotation } from '@babel/types';
import { stringifyStyle } from '@vue/shared';

export default {
	data() {
		return {
			whitelist_clans: [] as Array<any>
		}
	},
	methods: {
		getWhitelistTabClans: function () {
			fetch("/api/whitelist/read/getAllClans").then(res => res.json()).then(dt => {
				this.whitelist_clans = dt;
			});
		},
	},
	created(){
		this.getWhitelistTabClans()
	}
}
</script>

<template>
	<select name="clan_selector" :disabled="whitelist_clans.length==1">
		<option v-for="c of whitelist_clans" :value="c._id">{{ c.full_name }}</option>
	</select>
	
</template>

<style scoped>
.tab {
	border-radius: 20px;
	background: #fff1;
	flex-grow: 1;
	padding: 10px;
	display: flex;
	flex-direction: column;
	flex-wrap: wrap;
}

.tab.horizontal {
	flex-direction: row;
}

.tab.Clans {
	justify-content: center;
	align-content: baseline;
}
</style>
