<script setup lang="ts"></script>

<script lang="ts">
	export default {
		data() {
			return {
				models: {
					searchOption: '',
				},
				optRefs: [] as Array<any>,
				valRet: [] as Array<string>,
			};
		},
		props: {
			elements: {
				required: true,
				default: [] as Array<any>,
			},
			title: {
				required: false,
				type: String,
				default: '',
			},
			oIdKey: {
				required: true,
				type: String,
			},
			oTitleKey: {
				required: true,
				type: String,
			},
			preselect: {
				required: false,
				default: [] as Array<any>,
			},
		},
		methods: {
			log: console.log,
			compare: function (str1: string, str2: string) {
				return str1.includes(str2);
			},
			optionSelectChanged: function (e: any) {
				const tg: any = e.target;
				if (tg.checked) {
					this.valRet.push(tg.name);
				} else {
					this.valRet = this.valRet.filter((elm) => elm != tg.name);
				}
				this.$emit('selectChanged', [...this.valRet]);
			},
			arrIncludesObj: function (arr: any, obj: any) {
				return arr.find((e: any) => JSON.stringify(e) == JSON.stringify(obj)) != null;
			},
			preselectProcedure: function () {
				if (typeof this.preselect[0] === 'object') {
					const preselectFilter = this.preselect.filter((e) => this.elements.find((e2) => e[this.oIdKey] == e2[this.oIdKey]));
					for (let e of preselectFilter) if (!preselectFilter.includes(e[this.oIdKey])) this.valRet.push(e[this.oIdKey]);
					// console.log('obj', this.elements, this.preselect, preselectFilter);
				} else {
					const preselectFilter = this.preselect.filter((e) => this.elements.includes(e) || this.elements.find((e2) => e == e2[this.oIdKey]));
					this.valRet = preselectFilter;
					// console.log('arr', this.elements, this.preselect, preselectFilter);
				}
				this.$emit('selectChanged', [...this.valRet]);
			},
		},
		created() {
			this.preselectProcedure();
		},
		updated() {
			this.preselectProcedure();
		},
	};
</script>

<template>
	<div class="multipleSelectContainer">
		<div class="multipleSelectHeader">
			<h4 v-if="title != ''">{{ title }}</h4>
			<input popupIgnore type="text" v-model="models.searchOption" placeholder="Search" v-show="elements.length > 5" />
		</div>
		<div class="optionsContainer">
			<label v-for="elm of elements" :key="elm[oIdKey]" v-show="models.searchOption == '' || elm[oTitleKey].toLowerCase().includes(models.searchOption.toLowerCase())"> <input popupIgnore :ref="(r) => optRefs.push(r)" type="checkbox" :name="elm[oIdKey]" :checked="preselect.includes(elm[oIdKey]) || arrIncludesObj(preselect, elm)" @change="optionSelectChanged" />{{ elm[oTitleKey] }} </label>
		</div>
	</div>
</template>

<style scoped>
	.multipleSelectContainer {
		background: #333;
		border-radius: 15px;
		margin: 5px;
		border: none;
		font-size: 15px;
		color: #fff;
		/* transition: all 0.1s ease-in-out; */
		width: 100%;
		overflow: hidden;
	}
	.optionsContainer {
		margin: 5px 10px;
		max-height: 150px;
		overflow: auto;
	}
	.multipleSelectHeader {
		padding: 2px 10px;
		background: #00000028;
		display: flex;
		flex-direction: column;
	}
	label {
		user-select: none;
	}
	.multipleSelectHeader input {
		width: auto;
		flex-grow: 1;
		margin: 5px 0;
		border-radius: 5px;
	}
</style>
