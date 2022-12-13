<script setup lang="ts">
	import $ from 'jquery';
	import blackoutBackground from './blackoutBackground.vue';
</script>

<script lang="ts">
	export default {
		props: {
			title: {
				default: 'Popup',
				type: String,
			},
			hideConfirm: {
				default: false,
				type: Boolean,
			},
			hideCancel: {
				default: false,
				type: Boolean,
			},
			confirmText: {
				default: 'Confirm',
				type: String,
			},
			cancelText: {
				default: 'Cancel',
				type: String,
			},
			noBlackBg: {
				default: false,
				type: Boolean,
			},
			focus: {
				default: null,
				required: false,
				type: Object,
			},
			extRetProp: {
				default: [] as any,
				required: false,
			},
		},
		methods: {
			checkInputs(evt: any) {
				let inputs = Array.from(this.getInputs()) as Array<any>;
				inputs = inputs.filter((i: any) => !i.hasAttribute('popupIgnore'));
				let valid = true;
				let dt: { [key: string]: any } = {};
				for (let i of inputs) {
					if ((!i.value || i.value == '') && !i.hasAttribute('optional')) {
						this.blinkBgColor(i);
						valid = false;
					} else {
						let cName = i.name;
						let i_valid = true;

						if (i.hasAttribute('regex') && !(i.value == '' && i.hasAttribute('optional'))) {
							i_valid = i.value.match(new RegExp(i.getAttribute('regex')));
							if (!i_valid) {
								valid = false;
								this.blinkBgColor(i);
							}
						}

						if (i_valid) {
							if (i.nodeName == 'SELECT' && i.hasAttribute('multiple')) {
								let selOptions = [...i.querySelectorAll('option')].filter((e) => e.selected);
								let perms = [];
								for (let o of selOptions) {
									perms.push(o._value);
								}
								dt[cName] = perms;
							} else {
								if (i.type == 'checkbox') dt[cName] = i.checked;
								else dt[cName] = i.value;
							}
						}
					}
				}
				dt = { ...dt, ...this.extRetProp };
				if (valid) this.$emit('confirmBtnClick', dt);
			},
			blinkBgColor(elm: any, color: string = '#a228') {
				if (elm instanceof Array) for (let _e of elm) this.rawBlink(_e, color);
				else this.rawBlink(elm, color);
			},
			rawBlink(e: any, color: string) {
				e.style.backgroundColor = color;
				setTimeout(() => {
					e.style.backgroundColor = '';
				}, 2000);
			},
			getInputs() {
				return this.$el.querySelectorAll('input,select');
			},
			blinkAll(color: string = '#a228') {
				for (let e of this.getInputs()) this.rawBlink(e, color);
			},
			blinkName(name: string, color: string = '#a228') {
				this.rawBlink(this.$el.querySelector('input[name="' + name + '"]'), color);
			},
		},
		created() {
			this.$nextTick(() => {
				if (this.focus) this.focus.focus();
				else this.getInputs()[0]?.focus();
			});
		},
	};
</script>

<template>
	<div class="popupContainer" @keyup.enter="checkInputs" @keyup.escape="!hideCancel ? $emit('cancelBtnClick') : ''">
		<h1>{{ title }}</h1>
		<slot />
		<div class="btnContainer">
			<button id="btnCancel" v-if="!hideCancel" @click="$emit('cancelBtnClick')">{{ cancelText }}</button>
			<button id="btnConfirm" v-if="!hideConfirm" @click="checkInputs">{{ confirmText }}</button>
		</div>
	</div>
</template>

<style scoped>
	.btnContainer {
		display: flex;
		flex-direction: row;
	}

	.popupContainer {
		position: relative;
		/* top: 150px; */
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #222;
		width: fit-content;
		padding: 20px 30px;
		border-radius: 10px;
		margin-bottom: 10px;
		height: auto;
	}
</style>
