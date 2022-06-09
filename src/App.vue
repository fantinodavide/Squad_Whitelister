<script setup lang="ts">
import login from "./components/login.vue";
import registration from "./components/registration.vue";
import tabBrowser from "./components/tabBrowser.vue";
import tabBrowserBtn from "./components/tabBrowserButton.vue";
import tab from "./components/tab.vue";
import AddNewClan from './components/addNewClan.vue'
import blackoutBackground from "./components/blackoutBackground.vue";
import AddNewGameGroup from "./components/addNewGameGroup.vue";
import ClanCard from "./components/clanCard.vue";
import popup from "./components/popup.vue";
import confirmPopup from "./components/confirmPopup.vue";
import gameGroupCard from "./components/gameGroupCard.vue";
import editClan from "./components/editClan.vue";
import editGameGroup from "./components/editGameGroup.vue";
import editClanUsers from "./components/editClanUsers.vue";
import whitelistTab from "./components/whitelistTab.vue";
import addNewWhitelistUser from "./components/addNewWhitelistUser.vue";
import thanksCard from "./components/thanksCard.vue";
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
				registration: false,
				login: false,
				editClan: false,
				editGameGroup: false,
				editClanUsers: false,
				addNewWhitelistUser: false,
			},
			clans: [] as Array<any>,
			inEditingClan: -1,
			game_groups: [] as Array<any>,
			inEditingGroup: -1,
			inUserEditingClan: -1,
			pointers: {
				confirmPopup: {} as any,
				editClanUsers: {} as any
			},
			tabData: {
				Whitelist: {
					add_data: {} as any
				},
				Groups: {
					editor: false,
				}
			}
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

				this.$nextTick(() => {
					this.setCurrentTab(this.tabs[0]['name'])
				});
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
		appendNewGroup: function (dt: any) {
			console.log("Appending new group", dt.clan_data)
			this.game_groups.push(dt.data)
			this.popups.addingNewGameGroup = false;
			// this.clans.sort((a, b) => (a.full_name - b.full_name));
		},
		getClans: function () {
			fetch("/api/clans/getAllClans").then(res => res.json()).then(dt => {
				console.log("All clans", dt)
				this.clans = dt;
			});
		},
		getGameGroups: function () {
			fetch("/api/gameGroups/read/getAllGroups").then(res => res.json()).then(dt => {
				console.log("All groups", dt)
				this.game_groups = dt;
			});
		},
		confirmEvt: function (title = '', text = '', callback: any) {
			this.popups.confirm = true;
			if (this.pointers.confirmPopup != null) {
				this.pointers.confirmPopup.setProps(title, text)
				this.pointers.confirmPopup.setCallback(callback);
			}
		},
		removeClan: function (dt: any) {
			this.confirmEvt("Confirm deletion?", "Do you really want to delete " + dt.clan_data.tag + " clan?", () => {
				dt.callback(() => {
					this.clans = this.clans.filter((a) => a._id != dt.clan_data._id)
					this.popups.confirm = false;
				});
			})
		},
		removeWhitelistPlayer: function (dt: any) {
			this.confirmEvt("Confirm deletion?", "Do you really want to delete " + dt.wl_data.username + "?", () => {
				dt.callback(() => {
					//this.clans = this.clans.filter((a) => a._id != dt.clan_data._id)
					dt.callback();
					this.popups.confirm = false;
				});
			})
		},
		removeGroup: function (dt: any) {
			this.confirmEvt("Confirm deletion?", "Do you really want to delete " + dt.group_data.group_name + " group?", () => {
				dt.callback(() => {
					this.game_groups = this.game_groups.filter((a) => a._id != dt.group_data._id)
					this.popups.confirm = false;
				});
			})
		},
		updateJson: function (config: any, emptyConfFile: any) {
			for (let k in emptyConfFile) {
				const objType = Object.prototype.toString.call(emptyConfFile[k]);
				const parentObjType = Object.prototype.toString.call(emptyConfFile);
				if (config[k] == undefined || (config[k] && (parentObjType == "[object Array]" && !config[k].includes(emptyConfFile[k])))) {
					switch (objType) {
						case "[object Object]":
							config[k] = {}
							break;
						case "[object Array]":
							config[k] = []
							break;

						default:
							//console.log("CONFIG:", config, "\nKEY:", k, "\nCONFIG_K:", config[k], "\nEMPTY_CONFIG_K:", emptyConfFile[k], "\nPARENT_TYPE:",parentObjType,"\n");
							if (parentObjType == "[object Array]") config.push(emptyConfFile[k])
							else config[k] = emptyConfFile[k]
							break;
					}
				}
				if (typeof (emptyConfFile[k]) === "object") {
					this.updateJson(config[k], emptyConfFile[k])
				}
			}
		},
		checkPerms: function (url: string, callback = (dt: any) => { }) {
			fetch(url).then(res => res.json()).then(dt => {
				console.log("editor?", dt)
				callback(dt);
			});
		},
	},
	created() {
		this.checkSession();
		this.getAppPersonalization();
		this.getTabs();
		// this.getClans();
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
			<button v-if="loginRequired" @click="popups.login = true">Login</button>
			<button v-if="loginRequired" @click="popups.registration = true">Sign Up</button>
		</div>

		<tabBrowser :visible="!loginRequired">
			<tabBrowserBtn v-for="t in tabBtns" @updateTab="setCurrentTab" :title="t" :currentTab="currentTab" />

		</tabBrowser>
	</header>

	<main>
		<blackoutBackground
			v-show="popups.addingNewClan || popups.addingNewGameGroup || popups.confirm || popups.login || popups.registration || popups.editClan || popups.editGameGroup || popups.editClanUsers || popups.addNewWhitelistUser">
			<login v-if="popups.login" @cancelBtnClick="popups.login = false"
				@login_done="loginRequired = false; popups.login = false" />
			<registration v-if="popups.registration" @cancelBtnClick="popups.registration = false"
				@registration_done="loginRequired = false; popups.registration = false" />
			<AddNewClan v-if="popups.addingNewClan" @cancelBtnClick="popups.addingNewClan = false"
				@new_clan="appendNewClan" />
			<AddNewGameGroup v-if="popups.addingNewGameGroup" @cancelBtnClick="popups.addingNewGameGroup = false"
				@new_game_group="appendNewGroup" />
			<confirmPopup :ref="(el: any) => { pointers.confirmPopup = el }" v-show="popups.confirm"
				@cancelBtnClick="popups.confirm = false" />
			<edit-clan v-if="popups.editClan" @cancelBtnClick="popups.editClan = false"
				:clan_data="clans[inEditingClan]" @clan_edited="clans[inEditingClan] = $event" />
			<editGameGroup v-if="popups.editGameGroup" @cancelBtnClick="popups.editGameGroup = false"
				:group_data="game_groups[inEditingGroup]" @edited="game_groups[inEditingGroup] = $event" />
			<editClanUsers v-if="popups.editClanUsers" :clan_data="clans[inUserEditingClan]"
				@cancelBtnClick="popups.editClanUsers = false;" />
			<addNewWhitelistUser v-if="popups.addNewWhitelistUser" @cancelBtnClick="popups.addNewWhitelistUser = false"
				:add_data="tabData.Whitelist.add_data" />
		</blackoutBackground>

		<!--<button @click="setLoginRequired(!loginRequired)">Toggle</button>-->
		<tab v-if="currentTab == 'Home'" :currentTab="currentTab">
		</tab>
		<tab v-else-if="currentTab == 'Clans'" :currentTab="currentTab" :horizontal="true" @vnodeMounted="getClans">
			<button class="addNewClan clanCard" @click="popups.addingNewClan = true"></button>
			<ClanCard @confirm='removeClan' v-for="c in clans" class="clanCard shadow" :clan_data="c"
				@edit_clan="popups.editClan = true; inEditingClan = clans.indexOf(c)"
				@edit_clan_users="popups.editClanUsers = true; inUserEditingClan = clans.indexOf(c)" />
		</tab>
		<tab v-else-if="currentTab == 'Groups'" :currentTab="currentTab"
			@vnodeMounted="() => { getGameGroups(); checkPerms('/api/gameGroups/write/checkPerm', (dt) => { tabData.Groups.editor = (dt ? true : false) }) }">
			<button v-if="tabData.Groups.editor" class="addNewGameGroup"
				@click="popups.addingNewGameGroup = true"></button>
			<gameGroupCard @confirm='removeGroup' v-for="g in game_groups" class="gameGroupCard shadow" :group_data="g"
				@edit="popups.editGameGroup = true; inEditingGroup = game_groups.indexOf(g)"
				:hoverMenuVisible="tabData.Groups.editor" />
		</tab>
		<tab v-else-if="currentTab == 'Roles'" :currentTab="currentTab">
			<button class="createRole" @click="popups.creatingNewRole = true"></button>

		</tab>
		<tab v-else-if="currentTab == 'Whitelist'" :currentTab="currentTab">
			<whitelistTab @addNewWhitelistUser="popups.addNewWhitelistUser = true; tabData.Whitelist.add_data = $event;"
				@confirm="removeWhitelistPlayer" />
		</tab>
	</main>
	<footer>
		<h2>Special Thanks</h2>
		<div class="thanksCard">
			<img src="/src/assets/bia_logo.png" alt="Brigata Italiana Ariete">
			<div class="desc">
				<h3>Brigata Italiana Ariete</h3>
				<p>
					<a href="https://biaclan.it/" target="_blank">Official Website</a>
					<a href="https://discord.gg/dXHVfQZcxJ" target="_blank">Official Discord</a>
				</p>
			</div>
		</div>
		<thanksCard title="Offworld Industries" website="https://www.offworldindustries.com/"
			src="https://www.offworldindustries.com/wp-content/themes/owitheme/img/logo_white.svg"
			discord="https://discord.com/invite/kRkqJgXW" />
	</footer>
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

button.addHorizontal,
.addNewGameGroup,
.gameGroupCard {
	/* width: ; */
	height: 65px;
	border: 5px solid #fff2;
	border-radius: 15px;
	margin: 10px;
	background: #0000;
	display: flex;
	flex-direction: row;
	overflow: hidden;
	align-items: center;
}

button.addHorizontal::after,
button.addHorizontal::before,
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

button.addHorizontal::before,
.addNewGameGroup::before {
	transform: translate(-50%, -50%) rotate(0deg);
}
</style>
