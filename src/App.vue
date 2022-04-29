<script setup lang="ts">
import login from "./components/login.vue";
import tabBrowser from "./components/tabBrowser.vue";
import tabBrowserBtn from "./components/tabBrowserButton.vue";
import $ from 'jquery'

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
			tabs: ["Home","Clans","Users"]
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
		}
	},
	created() {
		this.checkSession();
		this.getAppPersonalization();
	}
}
</script>

<template>
	<title>{{ currentTab }} | {{ app_title }}</title>
	<header>
		<img alt="Squad Whitelister Logo" class="logo" :src="logo_url" />
		<h1>{{ currentTab }} | {{ app_title }}</h1>
		<div id="hdBtnContainer">
			<button v-if="!loginRequired" @click="logout">Logout</button>
		</div>

		<tabBrowser>
			<tabBrowserBtn v-for="t in tabs" @updateTab="setCurrentTab" :title="t" />
		</tabBrowser>
	</header>

	<main>
		<login v-if="loginRequired" @cancelBtnClick="loginRequired = false" @login_done="loginRequired = false" />
		<button @click="setLoginRequired(!loginRequired)">Toggle</button>
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
	margin-top: 20px;
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
</style>
