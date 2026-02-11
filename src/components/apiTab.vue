<script setup lang="ts">
	import SideMenu from './sideMenu.vue';
	import tab from './tab.vue';
	import levenshtein from 'js-levenshtein';
	import VCodeBlock from '@wdns/vue-code-block';
</script>

<script lang="ts">
	import apiKeyCard from './apiKeyCard.vue';

	export default {
		data() {
			return {
				models: {
					search: '',
				},
				elements: [] as Array<any>,
				app_roles: [] as any,
				editor: false,
				sideMenu: {
					curMenu: { menu: 'docs' },
					config: {
						docs: {
							selected: true,
							type: 'file',
							config: {
								test: 'nothing',
							},
						},
						keys: {
							selected: false,
							type: 'file',
							config: {
								test: 'nothing',
							},
						},
					},
				},
				swagger_output: null as any,
			};
		},
		props: {
			user_session: {
				required: true,
				default: {} as any,
			},
			roles: {
				required: true,
				default: [] as any,
			},
		},
		methods: {
			log: console.log,
			appendAfterDone: function (e: any) {
				console.log(e);
				this.elements.unshift(e);
			},
			removeElement(removedElm: any) {
				this.elements = this.elements.filter((e) => e._id != removedElm._id);
			},
			checkPerms: function (callback: any = null) {
				fetch('/api/keys/checkPerm')
					.then((res) => res.json())
					.then((dt) => {
						console.log('editor?', dt);
						this.editor = true;
						if (callback) callback();
					});
			},
			async getAllApiKeys() {
				try {
					this.elements = await (await fetch('/api/keys')).json();
				} catch (error) {}
			},
			swaggerSchemaToJson(schema: any) {
				const obj: any = {};
				for (let k in schema) obj[k] = schema[k].example;
				return JSON.stringify(obj, null, 2);
			},
			getSwaggerDocumentation() {
				fetch('/api/docs')
					.then((res) => res.json())
					.then((dt) => {
						this.swagger_output = dt.data;
						console.log(this.swagger_output);
					});
			},
		},
		async created() {
			this.checkPerms();
			this.getAllApiKeys();
			this.getSwaggerDocumentation();
		},
		updated() {
			console.log('sideMenu', this.sideMenu);
		},
		components: { apiKeyCard },
	};
</script>

<template>
	<SideMenu :config="sideMenu.config" :config_tr="{ docs: 'Documentation' }" @menuChanged="sideMenu.curMenu = $event" />
	<tab v-if="sideMenu.curMenu.menu == 'keys'">
		<input type="search" placeholder="Search Key" name="searchKey" v-model="models.search" />
		<button class="addHorizontal" @click="$emit('addNewApiKey', { callback: appendAfterDone })"></button>
		<apiKeyCard
			v-for="w of elements"
			v-show="w.name.toLowerCase().startsWith(models.search.toLowerCase()) || levenshtein(w.name.toLowerCase(), models.search.toLowerCase()) <= 2 || models.search == ''"
			:wl_data="w"
			:roles="roles"
			:key="w"
			:hoverMenuVisible="editor"
			@confirm="$emit('confirm', $event)"
			@removedApiKey="removeElement"
		/>
	</tab>
	<tab v-else-if="sideMenu.curMenu.menu == 'docs'" class="docsMenu">
		<input type="search" placeholder="Search Path" name="searchKey" v-model="models.search" />
		<div
			v-for="path of Object.keys(swagger_output?.paths || {}).sort()"
			:key="path"
			v-show="path.toLowerCase().includes(models.search.toLowerCase()) || levenshtein(path.replace(/api|\//g, ''), models.search.toLowerCase()) <= 5 || models.search == ''"
		>
			<h3>
				<span class="method">{{ Object.keys(swagger_output.paths[path])[0].toUpperCase() }}</span> {{ path }}
			</h3>
			<div v-for="method of Object.keys(swagger_output.paths[path])" :key="method" class="methodBody">
				<div v-show="Object.keys(swagger_output.paths[path]).length > 1">{{ method.toUpperCase() }}</div>
				<div>
					<h3>Parameters</h3>
					<div v-for="param of swagger_output.paths[path][method].parameters" :key="param.name">
						{{ param.in.toUpperCase() }} <span>{{ param.name }}</span
						>: {{ param.type }}
						<div v-if="param.schema?.properties" class="schemaBody">
							<VCodeBlock :code="swaggerSchemaToJson(param.schema?.properties)" highlightjs lang="json" theme="none" />
						</div>
					</div>
				</div>
				<div>
					<h3>Responses</h3>
					<div v-for="resp of Object.keys(swagger_output.paths[path][method].responses)" :key="resp">{{ resp }}: {{ swagger_output.paths[path][method].responses[resp].description }}</div>
				</div>
			</div>
		</div>
	</tab>
</template>

<style scoped>
	.method {
		/* background: color-mix(in srgb, var(--accent-color) 50%, white 30%); */
		background: var(--accent-color);
		color: #000;
		padding: 1px 10px;
		border-radius: 10px;
		display: inline-flex;
	}

	.docsMenu > div {
		background: #fff1;
		padding: 10px;
		margin: 10px 0;
		border-radius: 10px;
	}

	.docsMenu > div > h3 {
		background: #0006;
		padding: 10px;
		margin-bottom: 0px;
		border-radius: 10px;
		border-bottom-left-radius: 0px;
		border-bottom-right-radius: 0px;
	}

	.methodBody {
		background: #0002;
		padding: 10px;
		border-radius: 5px;
		display: flex;
		flex-direction: column;
		gap: 15 px;
		border-top-left-radius: 0px;
		border-top-right-radius: 0px;
	}

	.methodBody span {
		background: #fff2;
		padding: 2px 5px;
		display: inline-block;
		border-radius: 10px;
		text-align: center;
		margin: 2px;
	}

	.tab {
		border-radius: 20px;
		background: #fff1;
		flex-grow: 1;
		padding: 10px;
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		min-width: 0;
		overflow: hidden;
	}

	.tab.horizontal {
		flex-direction: row;
	}

	.tab.Clans {
		justify-content: center;
		align-content: baseline;
	}

	.selectorContainer {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		margin-bottom: 10px;
		height: 40px;
		/* overflow: hidden; */
	}

	.selectorContainer > * {
		margin: 0;
	}

	.selectorContainer select {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	.selectorContainer button {
		border-radius: 0;
		background: #444;
		color: #ddd;
		flex-shrink: 0;
	}
	.selectorContainer button img {
		height: 100%;
		width: 100%;
	}

	.selectorContainer button:hover {
		background: #555;
	}

	.selectorContainer .playerCounter {
		display: flex;
		flex-direction: row;
		align-items: center;
		border: 0px;
		background: #333;
		padding: 5px 10px;
		white-space: nowrap;
	}
	.selectorContainer > *:last-child {
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
	}
</style>
