<script setup lang="ts">
import { assertExpressionStatement } from "@babel/types";
import $ from 'jquery';
import MarqueeText from 'vue-marquee-text-component'
</script>

<script lang="ts">
export default {
	props: {
		title: {
			required: true,
			type: String
		},
		website: {
			required: false,
			type: String
		},
		discord: {
			required: false,
			type: String
		},
		src: {
			required: true,
			type: String
		}
	},
	methods: {
		getSrc: function(){
			return require(this.src);
		}
	}
}
</script>

<template>
	<div class="thanksCard">
		<img :src="src" :alt="title">
		<div class="desc">
			<h3>{{ title }}</h3>
			<p>
				<a v-if="website" :href="website" target="_blank">Official Website</a>
				<a v-if="discord" :href="discord" target="_blank">Official Discord</a>
			</p>
		</div>
	</div>
</template>

<style scoped>
.thanksCard {
	width: fit-content;
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	background: #fff1;
	border-radius: 15px;
	padding: 10px;
	align-items: center;
	margin: 5px;
	flex-shrink: 0;
}

.thanksCard .desc {
	display: flex;
	flex-direction: column;
}

.thanksCard .desc p {
	display: flex;
	flex-direction: column;
}

.thanksCard .desc p a {
	text-decoration: none;
	font-size: 14px;
	font-style: italic;
}

.thanksCard .desc p a:hover {
	text-decoration: underline;
}
</style>
