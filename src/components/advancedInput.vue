<script setup lang="ts"></script>

<script lang="ts">
	import { emit } from 'process';
	export default {
		props: {
			text: {
				required: true,
				type: String,
			},
			name: {
				required: true,
				type: String,
			},
			type: {
				type: String,
				default: 'text',
			},
			value: {
				default: '' as any,
			},
			placeholder: {
				type: String,
				default: null,
			},
			oIdKey: {
				required: false,
				type: String,
				default: null,
			},
			oTitleKey: {
				required: false,
				type: String,
				default: '',
			},
			options: {
				default: [] as Array<any>,
			},
			optionPreselect: {
				required: false,
				default: null as any,
			},
			inputHidden: {
				required: false,
				default: false,
			},
			selectHidden: {
				required: false,
				default: false,
			},
			optional: {
				required: false,
				default: false,
			},
			readonly: {
				required: false,
				default: false,
			},
			min: {
				required: false,
				type: Number,
			},
			max: {
				required: false,
				type: Number,
			},
			regex: {
				required: false,
				type: RegExp,
			},
		},
		data() {
			return {
				valRet: '' as any,
				optRet: {} as Object,
			};
		},
		methods: {
			log: console.log,
			optionUpdate: function (dt: any) {
				console.log(dt);
				this.optRet = dt.target.value;
				this.emitUpdate();
			},
			valueUpdate: function (dt: any) {
				console.log(dt);
				this.valRet = dt.target.value;
				this.emitUpdate();
			},
			emitUpdate: function () {
				const emitData = { value: this.valRet, option: this.optRet };
				console.log(this.text, 'emitting update', emitData);
				this.$emit('valueChanged', emitData);
			},
			preselectProcedure: function () {
				try {
					this.optRet =
						this.oIdKey && this.options[0] && this.options[0][this.oIdKey]
							? this.options.find((o) => o[this.oIdKey] == this.optionPreselect)[this.oIdKey]
							: this.options.find((o) => o == this.optionPreselect);
				} catch (error) {}
				this.valRet = this.value;
				this.emitUpdate();
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
	<label :class="{ selectVisible: options.length > 0 }"
		>{{ text }}
		<input
			v-if="!inputHidden"
			:type="type"
			:value="value"
			:placeholder="placeholder"
			@change="valueUpdate"
			:optional="optional"
			:readonly="readonly"
			:min="min"
			:max="max"
			:regex="regex?.toString().replace(/^\//, '').replace(/\/$/, '')"
		/>
		<select v-if="!selectHidden && options.length > 0" @change="optionUpdate">
			<option value="0" selected hidden>Select</option>
			<option v-for="o of options" :key="o[oIdKey]" :value="oIdKey && o[oIdKey] ? o[oIdKey] : o" :selected="(oIdKey && o[oIdKey] ? o[oIdKey] : o) == optRet">
				{{ oTitleKey && o[oTitleKey] ? o[oTitleKey] : o }}
			</option>
		</select>
	</label>
</template>

<style scoped>
	label {
		height: 40px;
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		align-content: center;
		word-break: keep-all;
		white-space: nowrap;
		border-radius: 10px;
		padding-left: 10px;
		/* overflow: hidden; */
		background: #444;
		margin-right: 10px;
		margin-bottom: 10px;
		/* padding: 0; */
	}
	label:last-of-type {
		/* margin-right: 0px; */
	}
	label input {
		margin: 0;
		margin-left: 10px;
		flex-grow: 100;
		background: #333;
		border-radius: 0;
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
		height: 100%;
		width: auto;
		flex-shrink: 1;
		/* width: auto; */
		/* margin: 0; */
	}
	label.selectVisible input {
		border-radius: 0;
	}
	label.selectVisible select {
		border-radius: 0;
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
		margin: 0;
		margin-left: 5px;
		height: 100%;
	}
</style>
