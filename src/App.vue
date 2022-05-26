<script setup lang="ts">
import login from "./components/login.vue";
import tabBrowser from "./components/tabBrowser.vue";
import tabBrowserBtn from "./components/tabBrowserButton.vue";
import tab from "./components/tab.vue";
import AddNewClan from './components/addNewClan.vue'
import blackoutBackground from "./components/blackoutBackground.vue";
import AddNewGameGroup from "./components/addNewGameGroup.vue";
import ClanCard from "./components/clanCard.vue";
import popup from "./components/popup.vue";
import confirmPopup from "./components/confirmPopup.vue";
import $ from 'jquery'
import type { Method } from "@babel/types";

</script>

<script lang="ts">
export default {
	data() {
		return {
			loginRequired: true,
			app_title: "Squad Whitelister",
			accent_color: "#ffc40b",
			currentTab: "Home",
			logo_url: "./assets/logo.svg",
			tabs: [],
			tabBtns: [],
			popups: {
				addingNewClan: false,
				addingNewGameGroup: false,
				creatingNewRole: false,
				confirm: false,
			},
			clans: [] as Array<any>,
			pointers: {
				confirmPopup: {} as any,
			},
		}
	},
	methods: {
		getAppPersonalization: function () {
			fetch("/api/getAppPersonalization").then(res => res.json()).then(dt => {
				this.app_title = dt.name;
				this.accent_color = dt.accent_color;
				this.logo_url = dt.logo_url;
			});
		},
		checkSession: function () {
			fetch("/api/checkSession").then(res => res.json()).then(dt => {
				this.setLoginRequired(dt.status == "login_required")

			});
		},
		getTabs: function () {
			fetch("/api/getTabs").then(res => res.json()).then(dt => {
				console.log(dt);
				this.tabs = dt.tabs;
				this.tabs.forEach(e => this.tabBtns.push(e['name']));
				this.setCurrentTab(this.tabs[0]['name'])
			});
		},
		logout: function () {
			fetch("/api/logout").then(res => res.json()).then(dt => {
				this.setLoginRequired(dt.status == "logout_ok")
			});
		},
		setLoginRequired: function (required: boolean) {
			this.loginRequired = required;
			this.currentTab = required ? "Login" : "Home";
		},
		setCurrentTab: function (ct: string) {
			this.currentTab = ct;
		},
		appendNewClan: function (dt: any) {
			console.log("Appending new clan", dt.clan_data)
			this.clans.push(dt.clan_data)
			// this.clans.sort((a, b) => (a.full_name - b.full_name));
		},
		getClans: function () {
			fetch("/api/clans/getAllClans").then(res => res.json()).then(dt => {
				console.log("All clans", dt)
				this.clans = dt;
			});
		},
		confirmEvt: function (title = '', text = '', e: any) {
			this.popups.confirm = true;
			if (this.pointers.confirmPopup != null) {
				this.pointers.confirmPopup.setProps(title, text)
				this.pointers.confirmPopup.setCallback(()=>{
					e.callback(()=>{
						this.clans = this.clans.filter((a)=>a._id!=e.clan_data._id)
						this.popups.confirm = false;
					});
				});
			}
			/*if (confirm("Confirm deletion?"))
	e();*/
		}
	},
	created() {
		this.checkSession();
		this.getAppPersonalization();
		this.getTabs();
		this.getClans();
	}
}
</script>

<template>
	<title>{{ currentTab }} | {{ app_title }}</title>
	<header>
		<img alt="Squad Whitelister Logo" class="logo" :src="logo_url" />
		<h1>{{ app_title }}</h1>
		<div id="hdBtnContainer">
			<button v-if="!loginRequired" @click="logout">Logout</button>
		</div>

		<tabBrowser :visible="!loginRequired">
			<tabBrowserBtn v-for="t in tabBtns" @updateTab="setCurrentTab" :title="t" :currentTab="currentTab" />

		</tabBrowser>
	</header>

	<main>
		<blackoutBackground
			v-show="loginRequired || popups.addingNewClan || popups.addingNewGameGroup || popups.confirm">
			<login v-if="loginRequired" @cancelBtnClick="loginRequired = false" @login_done="loginRequired = false" />
			<AddNewClan v-if="popups.addingNewClan" @cancelBtnClick="popups.addingNewClan = false"
				@new_clan="appendNewClan" />
			<AddNewGameGroup v-if="popups.addingNewGameGroup" @cancelBtnClick="popups.addingNewGameGroup = false" />
			<confirmPopup :ref="(el: any) => { pointers.confirmPopup = el }" v-show="popups.confirm"
				@cancelBtnClick="popups.confirm = false" />
		</blackoutBackground>

		<!--<button @click="setLoginRequired(!loginRequired)">Toggle</button>-->
		<tab v-if="currentTab == 'Home'" :currentTab="currentTab">
		</tab>
		<tab v-else-if="currentTab == 'Clans'" :currentTab="currentTab" :horizontal="true">
			<button class="addNewClan clanCard" @click="popups.addingNewClan = true"></button>
			<ClanCard
				@confirm='(e) => { confirmEvt("Confirm deletion?", "Do you really want to delete this clan?", e) }'
				v-for="c in clans" class="clanCard shadow" :clan_data="c" />
		</tab>
		<tab v-else-if="currentTab == 'Groups'" :currentTab="currentTab">
			<button class="addNewGameGroup" @click="popups.addingNewGameGroup = true"></button>

		</tab>
		<tab v-else-if="currentTab == 'Roles'" :currentTab="currentTab">
			<button class="createRole" @click="popups.creatingNewRole = true"></button>

		</tab>
	</main>
</template>

<style>
@import "./assets/base.css";

#app * {
	--accent-color: v-bind(accent_color);
}

main {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	align-items: center;
	padding: 20px;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: flex-start;
	flex-grow: 1;
}

header .logo {
	max-height: 50px;
}

#hdBtnContainer {
	display: flex;
	flex-grow: 100;
	justify-content: end;
	align-items: center;
}

.popupsArea {
	align-self: center;
	display: flex;
	flex-direction: column;
}

.addNewClan,
.clanCard {
	width: 250px;
	height: 250px;
	border: 5px solid #fff2;
	border-radius: 15px;
	margin: 10px;
	background: #0000;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	min-width: 200px;
}

.addNewClan::after,
.addNewClan::before {
	content: "";
	position: absolute;
	height: 75px;
	width: 5px;
	border-radius: 1px;
	background: #444;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%) rotate(90deg);
}

.addNewClan::before {
	transform: translate(-50%, -50%) rotate(0deg);
}

.popupContainer {
	position: fixed;
	top: 0;
	left: 0;
	display: flex;
	width: 100%;
	height: 100%;
	justify-content: center;
	align-items: baseline;
	padding-top: 100px;
}

.addNewGameGroup {
	/* width: ; */
	height: 65px;
	border: 5px solid #fff2;
	border-radius: 15px;
	margin: 10px;
	background: #0000;
}

.addNewGameGroup::after,
.addNewGameGroup::before {
	content: "";
	position: absolute;
	height: 35px;
	width: 5px;
	border-radius: 1px;
	background: #444;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%) rotate(90deg);
}

.addNewGameGroup::before {
	transform: translate(-50%, -50%) rotate(0deg);
}
</style>
