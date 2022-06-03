<script setup lang="ts">
</script>

<script lang="ts">
import { anyTypeAnnotation } from '@babel/types';
import { stringifyStyle } from '@vue/shared';

export default {
	data() {
		return {
			whitelist_clans: [] as Array<any>,
			sel_clan: {} as any
		}
	},
	methods: {
		getWhitelistTabClans: function () {
			fetch("/api/whitelist/read/getAllClans").then(res => res.json()).then(dt => {
				this.whitelist_clans = dt;
				this.sel_clan = this.whitelist_clans[0]._id;
			});
		},
		log: console.log
	},
	created() {
		this.getWhitelistTabClans()
	}
}
</script>

<template>
	<select name="clan_selector" ref="clan_selector" :disabled="whitelist_clans.length == 1" @change="(v:any)=>{sel_clan = v.target.value}">
		<option v-for="c of whitelist_clans" :value="c._id">{{ c.full_name }}
		</option>
	</select>
	<button class="addHorizontal" @click="$emit('addNewWhitelistUser', sel_clan)"></button>

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
