/*!
 * @language: en-US
 * @title: easy-menus.js
 * @description: Chat UI service layer for Easy Modules in Roll20. Provides styled menus, alerts, dialogs, and announcements.
 * @requires: easy-utils.js
 * @author: Mhykiel
 * @version: 0.1.0
 * @license: MIT License
 */

// eslint-disable-next-line no-unused-vars
const EASY_MENUS = (() => {
	// SECTION Object: EASY_MENUS

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Menus",
		chatApiName: "ezmenus",
		globalName: "EASY_MENUS",
		version: "0.1.0",
		author: "Mhykiel",
		verbose: true,
		debug: {}
	};

	// ANCHOR Member: Utility References
	let Utils = {};
	let PhraseFactory = {};
	let TemplateFactory = {};
	let ThemeFactory = {};

	// ANCHOR Member: Default Style Variables
	const defaultStyleVariables = {
		/* Primary Palette */
		"--ez-color-primary": "#8655b6",
		"--ez-color-secondary": "#34627b",
		"--ez-color-tertiary": "#17aee8",
		"--ez-color-accent": "#cc6699",
		"--ez-color-complement": "#fcec52",
		"--ez-color-contrast": "#c3b9c8",

		/* Backgrounds and Borders */
		"--ez-color-background-primary": "#252b2c",
		"--ez-color-background-secondary": "#2d3e43",
		"--ez-color-background-tertiary": "#8c888e",
		"--ez-color-background-accent": "#fbe2c4",
		"--ez-color-background-complement": "#3f3f3f",
		"--ez-color-background-contrast": "#f2f2f2",

		"--ez-color-border-primary": "#000000",
		"--ez-color-border-shadow": "#3f3f3f",
		"--ez-color-border-contrast": "#f2f2f2",

		/* Text */
		"--ez-color-text-primary": "#000000",
		"--ez-color-text-secondary": "#2d3e43",
		"--ez-color-text-tertiary": "#660000",
		"--ez-color-text-accent": "#cc6699",
		"--ez-color-text-complement": "#c9ad6a",
		"--ez-color-text-contrast": "#ffffff",

		/* Rainbow Colors */
		"--ez-rainbow-red": "#ff0000",
		"--ez-rainbow-orange": "#ffa500",
		"--ez-rainbow-yellow": "#ffff00",
		"--ez-rainbow-olive": "#808000",
		"--ez-rainbow-green": "#008000",
		"--ez-rainbow-teal": "#008080",
		"--ez-rainbow-blue": "#0000ff",
		"--ez-rainbow-violet": "#ee82ee",
		"--ez-rainbow-purple": "#800080",
		"--ez-rainbow-pink": "#ffc0cb",
		"--ez-rainbow-brown": "#a52a2a",
		"--ez-rainbow-grey": "#808080",
		"--ez-rainbow-black": "#000000",

		/* Typography Constants */
		"--ez-line-height": "1.6",
		"--ez-font-weight": "400",
		"--ez-font-size": "62.5%",

		"--ez-font-family-emoji": "'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
		"--ez-font-family-serif": "'Times New Roman', Times, Garamond, serif, var(--ez-font-family-emoji)",
		"--ez-font-family-sans-serif": "Ubuntu, Cantarell, Helvetica, Arial, 'Helvetica Neue', sans-serif, var(--ez-font-family-emoji)",
		"--ez-font-family-monospace": "Consolas, monospace",

		/* Layout */
		"--ez-block-padding": "5px 10px",
		"--ez-block-margin": ".5em 0em",
		"--ez-block-radius": "5px"
	};

	// SECTION Templates

	// ANCHOR Template: chatMenuAlert
	const templateChatMenuAlert = `
<div id="rootContainer" class="ezmenus-box ezmenus-alert {{ alertClass }}">
	<div class="ezmenus-cap ezmenus-cap-top"></div>
	<div class="ezmenus-title">{{ title }}</div>
	<div class="ezmenus-header">{{ header }}</div>
	<div class="ezmenus-body">
		<p class="ezmenus-description">{{ description }}</p>
		<pre class="ezmenus-code">{{ code }}</pre>
		<p class="ezmenus-remark">{{ remark }}</p>
	</div>
	<div class="ezmenus-footer">{{ footer }}</div>
	<div class="ezmenus-cap ezmenus-cap-bottom"></div>
</div>`;

	// ANCHOR Template: chatMenuMain
	const templateChatMenuMain = `
<div id="rootContainer" class="ezmenus-box ezmenus-main {{ mainClass }}">
	<div class="ezmenus-cap ezmenus-cap-top"></div>
	<div class="ezmenus-title">{{ title }}</div>
	<div class="ezmenus-header">{{ header }}</div>
	<div class="ezmenus-body">{{ body }}</div>
	<div class="ezmenus-footer">{{ footer }}</div>
	<div class="ezmenus-cap ezmenus-cap-bottom"></div>
</div>`;

	// ANCHOR Template: chatMenuSubmenu
	const templateChatMenuSubmenu = `
<div id="rootContainer" class="ezmenus-box ezmenus-submenu {{ submenuClass }}">
	<div class="ezmenus-cap ezmenus-cap-top"></div>
	<div class="ezmenus-title">{{ title }}</div>
	<div class="ezmenus-header">{{ header }}</div>
	<div class="ezmenus-body">{{ body }}</div>
	<div class="ezmenus-footer">{{ footer }}</div>
	<div class="ezmenus-cap ezmenus-cap-bottom"></div>
</div>`;

	// ANCHOR Template: chatMenuDialog
	const templateChatMenuDialog = `
<div id="rootContainer" class="ezmenus-box ezmenus-dialog {{ dialogClass }}">
	<div class="ezmenus-avatar">{{ avatar }}</div>
	<div class="ezmenus-bubble">
		<div class="ezmenus-speaker">{{ speaker }}</div>
		<div class="ezmenus-message">{{ message }}</div>
	</div>
</div>`;

	// ANCHOR Template: chatMenuAnnouncement
	const templateChatMenuAnnouncement = `
<div id="rootContainer" class="ezmenus-box ezmenus-announcement {{ announcementClass }}">
	<div class="ezmenus-cap ezmenus-cap-top"></div>
	<div class="ezmenus-title">{{ title }}</div>
	<div class="ezmenus-header">{{ header }}</div>
	<div class="ezmenus-body">{{ body }}</div>
	<div class="ezmenus-footer">{{ footer }}</div>
	<div class="ezmenus-cap ezmenus-cap-bottom"></div>
</div>`;

	// !SECTION End of Templates

	// SECTION Themes

	// ANCHOR Theme: chatMenuAlert
	const themeChatMenuAlert = `
:root {
	--ez-color-primary: #8655b6;
	--ez-color-secondary: #34627b;
	--ez-color-tertiary: #17aee8;
	--ez-color-accent: #cc6699;
	--ez-color-text-primary: #000000;
	--ez-color-text-secondary: #2d3e43;
	--ez-color-text-contrast: #ffffff;
	--ez-color-background-primary: #252b2c;
	--ez-color-background-secondary: #2d3e43;
	--ez-font-family-sans-serif: Ubuntu, Cantarell, Helvetica, Arial, sans-serif;
	--ez-font-family-monospace: Consolas, monospace;
	--ez-line-height: 1.6;
	--ez-block-radius: 5px;
	--ez-rainbow-red: #ff0000;
	--ez-rainbow-orange: #ffa500;
	--ez-rainbow-green: #008000;
}

#rootContainer.ezmenus-box {
	font-family: var(--ez-font-family-sans-serif);
	line-height: var(--ez-line-height);
	color: var(--ez-color-text-primary);
	max-width: 100%;
	margin: 0;
	padding: 0;
}

.ezmenus-cap {
	min-height: 12px;
	background-size: 100% 100%;
	background-repeat: no-repeat;
}

.ezmenus-cap-top {
	background: var(--ez-color-primary);
	border-radius: 8px 8px 0 0;
}

.ezmenus-cap-bottom {
	background: var(--ez-color-primary);
	border-radius: 0 0 8px 8px;
}

.ezmenus-alert .ezmenus-title {
	background: var(--ez-color-primary);
	color: var(--ez-color-text-contrast);
	font-weight: bold;
	text-transform: uppercase;
	text-align: center;
	padding: 5px 10px;
	margin: 0;
}

.ezmenus-alert .ezmenus-title:empty { display: none; }

.ezmenus-alert .ezmenus-header {
	height: 0;
}

.ezmenus-alert .ezmenus-header:empty { display: none; }

.ezmenus-alert .ezmenus-body {
	background: #e8d4f4;
	padding: 10px;
	color: var(--ez-color-text-primary);
}

.ezmenus-alert .ezmenus-body .ezmenus-description {
	margin: 0 0 0.5em 0;
}

.ezmenus-alert .ezmenus-body .ezmenus-code {
	display: block;
	background: var(--ez-color-background-primary);
	color: var(--ez-color-text-contrast);
	font-family: var(--ez-font-family-monospace);
	font-size: 12px;
	padding: 8px;
	border-radius: var(--ez-block-radius);
	margin: 0.5em 0;
	white-space: pre-wrap;
	word-wrap: break-word;
}

.ezmenus-alert .ezmenus-body .ezmenus-code:empty { display: none; }

.ezmenus-alert .ezmenus-body .ezmenus-remark {
	margin: 0.5em 0 0 0;
	color: var(--ez-rainbow-red);
	font-weight: bold;
}

.ezmenus-alert .ezmenus-body .ezmenus-remark:empty { display: none; }

.ezmenus-alert .ezmenus-footer {
	background: #e8d4f4;
	color: var(--ez-color-text-secondary);
	font-size: 11px;
	text-align: left;
	padding: 5px 10px;
}

.ezmenus-alert .ezmenus-footer:empty { display: none; }

.ezmenus-alert.ezmenus-error .ezmenus-cap { background: var(--ez-rainbow-red); }
.ezmenus-alert.ezmenus-error .ezmenus-title { background: var(--ez-rainbow-red); }
.ezmenus-alert.ezmenus-error .ezmenus-body { background: #fde8e8; }
.ezmenus-alert.ezmenus-error .ezmenus-footer { background: #fde8e8; }

.ezmenus-alert.ezmenus-warn .ezmenus-cap { background: var(--ez-rainbow-orange); }
.ezmenus-alert.ezmenus-warn .ezmenus-title { background: var(--ez-rainbow-orange); }
.ezmenus-alert.ezmenus-warn .ezmenus-body { background: #fff3e0; }
.ezmenus-alert.ezmenus-warn .ezmenus-footer { background: #fff3e0; }

.ezmenus-alert.ezmenus-info .ezmenus-cap { background: var(--ez-color-tertiary); }
.ezmenus-alert.ezmenus-info .ezmenus-title { background: var(--ez-color-tertiary); }
.ezmenus-alert.ezmenus-info .ezmenus-body { background: #e0f4ff; }
.ezmenus-alert.ezmenus-info .ezmenus-footer { background: #e0f4ff; }

.ezmenus-alert.ezmenus-tip .ezmenus-cap { background: var(--ez-rainbow-green); }
.ezmenus-alert.ezmenus-tip .ezmenus-title { background: var(--ez-rainbow-green); }
.ezmenus-alert.ezmenus-tip .ezmenus-body { background: #e8f5e9; }
.ezmenus-alert.ezmenus-tip .ezmenus-footer { background: #e8f5e9; }
`;

	// ANCHOR Theme: chatMenuMain
	const themeChatMenuMain = `
:root {
	--ez-color-primary: #8655b6;
	--ez-color-secondary: #34627b;
	--ez-color-tertiary: #17aee8;
	--ez-color-text-contrast: #ffffff;
	--ez-color-text-complement: #c9ad6a;
	--ez-color-text-primary: #000000;
	--ez-color-background-primary: #252b2c;
	--ez-color-background-secondary: #2d3e43;
	--ez-font-family-sans-serif: Ubuntu, Cantarell, Helvetica, Arial, sans-serif;
	--ez-line-height: 1.6;
	--ez-block-padding: 5px 10px;
	--ez-block-radius: 5px;
	--ez-rainbow-red: #ff0000;
}

#rootContainer.ezmenus-box {
	font-family: var(--ez-font-family-sans-serif);
	line-height: var(--ez-line-height);
	color: var(--ez-color-text-primary);
	max-width: 100%;
	margin: 0;
	padding: 0;
}

.ezmenus-cap {
	min-height: 12px;
	background-size: 100% 100%;
	background-repeat: no-repeat;
}

.ezmenus-cap-top {
	background: var(--ez-color-primary);
	border-radius: 8px 8px 0 0;
}

.ezmenus-cap-bottom {
	background: var(--ez-color-primary);
	border-radius: 0 0 8px 8px;
}

.ezmenus-main .ezmenus-title {
	background: var(--ez-color-primary);
	color: var(--ez-color-text-contrast);
	font-weight: bold;
	text-transform: uppercase;
	text-align: center;
	padding: var(--ez-block-padding);
	margin: 0;
}

.ezmenus-main .ezmenus-header {
	background: var(--ez-color-tertiary);
	height: 8px;
}

.ezmenus-main .ezmenus-header:empty { display: none; }

.ezmenus-main .ezmenus-body {
	background: var(--ez-color-background-primary);
	padding: 10px;
}

.ezmenus-main .ezmenus-btn {
	display: block;
	background: var(--ez-color-secondary);
	color: var(--ez-color-text-contrast);
	text-decoration: none;
	font-weight: bold;
	text-align: left;
	padding: 5px 10px;
	margin: 3px 0;
	border: 2px solid var(--ez-color-background-secondary);
	border-radius: var(--ez-block-radius);
	cursor: pointer;
}

.ezmenus-main .ezmenus-btn.ezmenus-caution {
	background: var(--ez-rainbow-red);
}

.ezmenus-main .ezmenus-footer {
	background: var(--ez-color-background-secondary);
	color: var(--ez-color-text-complement);
	font-size: 12px;
	text-align: left;
	padding: 5px 10px;
}

.ezmenus-main .ezmenus-footer:empty { display: none; }
`;

	// ANCHOR Theme: chatMenuSubmenu
	const themeChatMenuSubmenu = `
:root {
	--ez-color-secondary: #34627b;
	--ez-color-tertiary: #17aee8;
	--ez-color-text-contrast: #ffffff;
	--ez-color-text-complement: #c9ad6a;
	--ez-color-text-primary: #000000;
	--ez-color-background-primary: #252b2c;
	--ez-color-background-secondary: #2d3e43;
	--ez-font-family-sans-serif: Ubuntu, Cantarell, Helvetica, Arial, sans-serif;
	--ez-line-height: 1.6;
}

#rootContainer.ezmenus-box {
	font-family: var(--ez-font-family-sans-serif);
	line-height: var(--ez-line-height);
	color: var(--ez-color-text-primary);
	max-width: 100%;
	margin: 0;
	padding: 0;
}

.ezmenus-cap {
	min-height: 8px;
	background-size: 100% 100%;
	background-repeat: no-repeat;
}

.ezmenus-cap-top {
	background: var(--ez-color-secondary);
	border-radius: 5px 5px 0 0;
}

.ezmenus-cap-bottom {
	background: var(--ez-color-secondary);
	border-radius: 0 0 5px 5px;
}

.ezmenus-submenu .ezmenus-title {
	background: var(--ez-color-secondary);
	color: var(--ez-color-text-contrast);
	font-weight: bold;
	text-align: center;
	padding: 3px 8px;
	font-size: 12px;
}

.ezmenus-submenu .ezmenus-header {
	background: var(--ez-color-tertiary);
	height: 4px;
}

.ezmenus-submenu .ezmenus-header:empty { display: none; }

.ezmenus-submenu .ezmenus-body {
	background: var(--ez-color-background-primary);
	padding: 10px;
}

.ezmenus-submenu .ezmenus-btn {
	display: block;
	background: var(--ez-color-tertiary);
	color: var(--ez-color-text-contrast);
	text-decoration: none;
	font-size: 11px;
	text-align: left;
	padding: 3px 8px;
	margin: 2px 0;
	border: 1px solid var(--ez-color-background-secondary);
	border-radius: 3px;
	cursor: pointer;
}

.ezmenus-submenu .ezmenus-footer {
	background: var(--ez-color-background-secondary);
	color: var(--ez-color-text-complement);
	font-size: 10px;
	text-align: left;
	padding: 3px 10px;
}

.ezmenus-submenu .ezmenus-footer:empty { display: none; }
`;

	// ANCHOR Theme: chatMenuDialog
	const themeChatMenuDialog = `
:root {
	--ez-color-text-contrast: #ffffff;
	--ez-color-text-complement: #c9ad6a;
	--ez-color-background-primary: #252b2c;
	--ez-font-family-sans-serif: Ubuntu, Cantarell, Helvetica, Arial, sans-serif;
	--ez-line-height: 1.6;
	--ez-block-radius: 5px;
	--ez-block-padding: 5px 10px;
	--ezmenus-avatar-size: 50px;
}

#rootContainer.ezmenus-dialog {
	font-family: var(--ez-font-family-sans-serif);
	line-height: var(--ez-line-height);
	color: var(--ez-color-text-contrast);
	display: table;
	width: 100%;
	padding: 0;
	margin: 0;
}

.ezmenus-dialog .ezmenus-avatar {
	display: table-cell;
	vertical-align: top;
	width: var(--ezmenus-avatar-size);
	padding-right: 8px;
}

.ezmenus-dialog .ezmenus-avatar img {
	width: var(--ezmenus-avatar-size);
	height: var(--ezmenus-avatar-size);
	border-radius: 4px;
	object-fit: cover;
	object-position: top;
}

.ezmenus-dialog .ezmenus-avatar .ezmenus-letter {
	width: var(--ezmenus-avatar-size);
	height: var(--ezmenus-avatar-size);
	border-radius: 4px;
	text-align: center;
	line-height: var(--ezmenus-avatar-size);
	font-size: 24px;
	font-weight: bold;
	color: var(--ez-color-text-contrast);
}

.ezmenus-dialog .ezmenus-bubble {
	display: table-cell;
	vertical-align: top;
	background: var(--ez-color-background-primary);
	border-radius: var(--ez-block-radius);
	padding: var(--ez-block-padding);
}

.ezmenus-dialog .ezmenus-speaker {
	font-weight: bold;
	color: var(--ez-color-text-complement);
	margin-bottom: 4px;
}

.ezmenus-dialog .ezmenus-message {
	color: var(--ez-color-text-contrast);
}

.ezmenus-dialog.ezmenus-right .ezmenus-avatar {
	padding-right: 0;
	padding-left: 8px;
}

.ezmenus-dialog.ezmenus-right {
	direction: rtl;
}

.ezmenus-dialog.ezmenus-right .ezmenus-bubble {
	direction: ltr;
}

.ezmenus-dialog.ezmenus-right .ezmenus-avatar {
	direction: ltr;
}
`;

	// ANCHOR Theme: chatMenuAnnouncement
	const themeChatMenuAnnouncement = `
:root {
	--ez-color-accent: #cc6699;
	--ez-color-tertiary: #17aee8;
	--ez-color-text-primary: #000000;
	--ez-color-text-contrast: #ffffff;
	--ez-color-text-complement: #c9ad6a;
	--ez-color-background-accent: #fbe2c4;
	--ez-color-background-secondary: #2d3e43;
	--ez-font-family-sans-serif: Ubuntu, Cantarell, Helvetica, Arial, sans-serif;
	--ez-line-height: 1.6;
	--ez-block-padding: 5px 10px;
}

#rootContainer.ezmenus-box {
	font-family: var(--ez-font-family-sans-serif);
	line-height: var(--ez-line-height);
	color: var(--ez-color-text-primary);
	max-width: 100%;
	margin: 0;
	padding: 0;
}

.ezmenus-cap {
	min-height: 12px;
	background-size: 100% 100%;
	background-repeat: no-repeat;
}

.ezmenus-cap-top {
	background: var(--ez-color-accent);
	border-radius: 8px 8px 0 0;
}

.ezmenus-cap-bottom {
	background: var(--ez-color-accent);
	border-radius: 0 0 8px 8px;
}

.ezmenus-announcement .ezmenus-title {
	background: var(--ez-color-accent);
	color: var(--ez-color-text-contrast);
	font-weight: bold;
	text-transform: uppercase;
	text-align: center;
	padding: var(--ez-block-padding);
	margin: 0;
}

.ezmenus-announcement .ezmenus-header {
	background: var(--ez-color-tertiary);
	height: 8px;
}

.ezmenus-announcement .ezmenus-header:empty { display: none; }

.ezmenus-announcement .ezmenus-body {
	background: var(--ez-color-background-accent);
	color: var(--ez-color-text-primary);
	padding: 10px;
}

.ezmenus-announcement .ezmenus-footer {
	background: var(--ez-color-background-secondary);
	color: var(--ez-color-text-complement);
	font-size: 12px;
	text-align: left;
	padding: 5px 10px;
}

.ezmenus-announcement .ezmenus-footer:empty { display: none; }
`;

	// !SECTION End of Themes

	// SECTION Helper Functions

	// ANCHOR Helper: getLetterColor
	const getLetterColor = (name) => {
		const colors = [
			"#e74c3c", "#e67e22", "#f1c40f", "#2ecc71",
			"#1abc9c", "#3498db", "#9b59b6", "#e91e63"
		];
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	};

	// ANCHOR Helper: buildAvatarHtml
	const buildAvatarHtml = ({ tokenId, speaker }) => {
		let avatarUrl = null;
		let speakerName = speaker || "Unknown";

		if (tokenId) {
			const token = getObj("graphic", tokenId);
			if (token) {
				const charId = token.get("represents");
				if (charId) {
					const character = getObj("character", charId);
					if (character) {
						speakerName = speaker || character.get("name") || speakerName;
						const charAvatar = character.get("avatar");
						if (charAvatar) {
							avatarUrl = charAvatar;
						}
					}
				}
				if (!avatarUrl) {
					const tokenImg = token.get("imgsrc");
					if (tokenImg) {
						avatarUrl = tokenImg;
					}
					speakerName = speaker || token.get("name") || speakerName;
				}
			}
		}

		if (avatarUrl) {
			return { html: `<img src="${avatarUrl}" alt="">`, speaker: speakerName };
		}

		const letter = speakerName.charAt(0).toUpperCase();
		const bgColor = getLetterColor(speakerName);
		return { html: `<div class="ezmenus-letter" style="background-color: ${bgColor};">${letter}</div>`, speaker: speakerName };
	};

	// ANCHOR Helper: getDialogSide
	const getDialogSide = ({ tokenId, position }) => {
		const vault = Utils.getSharedVault();

		if (!vault.ezmenus) {
			vault.ezmenus = {};
		}
		if (!vault.ezmenus.dialogState) {
			vault.ezmenus.dialogState = { lastTokenId: null, currentSide: "right" };
		}

		// Manual override
		if (position) {
			return position;
		}

		// Auto-alternate when speaker changes
		if (tokenId !== vault.ezmenus.dialogState.lastTokenId) {
			vault.ezmenus.dialogState.currentSide = vault.ezmenus.dialogState.currentSide === "left" ? "right" : "left";
			vault.ezmenus.dialogState.lastTokenId = tokenId;
		}

		return vault.ezmenus.dialogState.currentSide;
	};

	// !SECTION End of Helper Functions

	// SECTION Public Render Methods

	// ANCHOR Method: renderAlert
	const renderAlert = async ({ to, toId, severity = "info", title, description, code, remark, footer }) => {
		const typeEnum = {
			error: {
				cssClass: "ezmenus-error",
				defaultTitle: PhraseFactory.get({ playerId: toId, transUnitId: "0x004A7742" })
			},
			warn: {
				cssClass: "ezmenus-warn",
				defaultTitle: PhraseFactory.get({ playerId: toId, transUnitId: "0x0B672E77" })
			},
			info: {
				cssClass: "ezmenus-info",
				defaultTitle: PhraseFactory.get({ playerId: toId, transUnitId: "0x0004E2AF" })
			},
			tip: {
				cssClass: "ezmenus-tip",
				defaultTitle: PhraseFactory.get({ playerId: toId, transUnitId: "0x000058E0" })
			},
			debug: {
				cssClass: "ezmenus-tip",
				defaultTitle: PhraseFactory.get({ playerId: toId, transUnitId: "0x000058E0" })
			}
		};

		const resolvedSeverity = Object.keys(typeEnum).find((key) => {
			return typeof severity === "string" && key === severity.toLowerCase();
		}) || "info";

		const alertConfig = typeEnum[resolvedSeverity];

		const expressions = {
			alertClass: alertConfig.cssClass,
			title: title || alertConfig.defaultTitle,
			description: description || "",
			code: code || "",
			remark: remark || "",
			footer: footer || ""
		};

		const styledMessage = await Utils.renderTemplateAsync({
			template: "chatMenuAlert",
			expressions,
			theme: "chatMenuAlert",
			cssVars: {}
		});

		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: to || "gm",
			message: styledMessage
		});

		return styledMessage;
	};

	// ANCHOR Method: renderMenu
	const renderMenu = async ({ to, title, buttons = [], body, header, footer, cssVars = {} }) => {
		let bodyContent = body || "";

		if (buttons.length > 0) {
			bodyContent = buttons.map((btn) => {
				const cautionClass = btn.caution ? " ezmenus-caution" : "";
				return `<a class="ezmenus-btn${cautionClass}" href="${btn.href}">${btn.label}</a>`;
			}).join("");
		}

		const expressions = {
			title: title || "",
			header: header || "",
			body: bodyContent,
			footer: footer || ""
		};

		const styledMessage = await Utils.renderTemplateAsync({
			template: "chatMenuMain",
			expressions,
			theme: "chatMenuMain",
			cssVars
		});

		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: to || "gm",
			message: styledMessage
		});

		return styledMessage;
	};

	// ANCHOR Method: renderSubmenu
	const renderSubmenu = async ({ to, title, buttons = [], body, header, footer, cssVars = {} }) => {
		let bodyContent = body || "";

		if (buttons.length > 0) {
			bodyContent = buttons.map((btn) => {
				return `<a class="ezmenus-btn" href="${btn.href}">${btn.label}</a>`;
			}).join("");
		}

		const expressions = {
			title: title || "",
			header: header || "",
			body: bodyContent,
			footer: footer || ""
		};

		const styledMessage = await Utils.renderTemplateAsync({
			template: "chatMenuSubmenu",
			expressions,
			theme: "chatMenuSubmenu",
			cssVars
		});

		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: to || "gm",
			message: styledMessage
		});

		return styledMessage;
	};

	// ANCHOR Method: renderDialog
	const renderDialog = async ({ to, tokenId, speaker, message, position, cssVars = {} }) => {
		const avatarResult = buildAvatarHtml({ tokenId, speaker });
		const side = getDialogSide({ tokenId, position });

		const expressions = {
			dialogClass: side === "right" ? "ezmenus-right" : "",
			avatar: avatarResult.html,
			speaker: speaker || avatarResult.speaker,
			message: message || ""
		};

		const styledMessage = await Utils.renderTemplateAsync({
			template: "chatMenuDialog",
			expressions,
			theme: "chatMenuDialog",
			cssVars
		});

		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: to || "gm",
			message: styledMessage
		});

		return styledMessage;
	};

	// ANCHOR Method: renderAnnouncement
	const renderAnnouncement = async ({ to, title, body, header, footer, cssVars = {} }) => {
		const expressions = {
			title: title || "",
			header: header || "",
			body: body || "",
			footer: footer || ""
		};

		const styledMessage = await Utils.renderTemplateAsync({
			template: "chatMenuAnnouncement",
			expressions,
			theme: "chatMenuAnnouncement",
			cssVars
		});

		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: to || "gm",
			message: styledMessage
		});

		return styledMessage;
	};

	// !SECTION End of Public Render Methods

	// SECTION Command Handlers

	// ANCHOR Member: actionMap
	const actionMap = {
		"--menu": (msgDetails) => { return processMenuAsync(msgDetails); },
		"--set-lang": (msgDetails, parsedArgs) => { return processSetLanguageAsync(msgDetails, parsedArgs); },
		"--demo-alerts": (msgDetails) => { return processDemoAlerts(msgDetails); },
		"--demo-dialog": (msgDetails, parsedArgs) => { return processDemoDialog(msgDetails, parsedArgs); },
		"--demo-announcement": (msgDetails) => { return processDemoAnnouncement(msgDetails); },
		"--demo-submenu": (msgDetails) => { return processDemoSubmenu(msgDetails); },
		"--demo-tokenmod": (msgDetails) => { return processDemoTokenmod(msgDetails); },
		"--export-config": (msgDetails) => { return processExportConfig(msgDetails); },
		"--load-config": (msgDetails) => { return processLoadConfig(msgDetails); },
		"--reset-style": (msgDetails) => { return processResetStyle(msgDetails); },
		"--purge-state": (msgDetails, parsedArgs) => { return processPurgeState(msgDetails, parsedArgs); },
	};

	actionMap["--default"] = actionMap["--menu"];

	// ANCHOR Function: processMenuAsync
	const processMenuAsync = async (msgDetails) => {
		try {
			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x03BDB2A5" });

			const buttons = [
				{ label: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x08161075" }), href: `\`!${moduleSettings.chatApiName} --set-lang` },
				{ label: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D842F34" }), href: `\`!${moduleSettings.chatApiName} --demo-alerts` },
				{ label: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0DIALOG1" }), href: `\`!${moduleSettings.chatApiName} --demo-dialog` },
				{ label: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C3D" }), href: `\`!${moduleSettings.chatApiName} --demo-announcement` },
				{ label: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0SUBMEN1" }), href: `\`!${moduleSettings.chatApiName} --demo-submenu` },
				{ label: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0382B96E" }), href: `\`!${moduleSettings.chatApiName} --demo-tokenmod` },
			];

			let body = buttons.map((btn) => {
				return `<a class="ezmenus-btn" href="${btn.href}">${btn.label}</a>`;
			}).join("");

			if (msgDetails.isGm) {
				body += `<div style="background: var(--ez-color-tertiary, #17aee8); padding: 5px; margin: 10px -10px; font-weight: bold; color: var(--ez-color-text-contrast, #ffffff);">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x09B11313" })}</div>`;
				body += `<a class="ezmenus-btn" href="\`!${moduleSettings.chatApiName} --export-config">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E1F2A3B" })}</a>`;
				body += `<a class="ezmenus-btn" href="\`!${moduleSettings.chatApiName} --load-config">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0F2E3D4C" })}</a>`;
				body += `<a class="ezmenus-btn" href="\`!${moduleSettings.chatApiName} --reset-style">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0K8L9M0N" })}</a>`;
				body += `<a class="ezmenus-btn ezmenus-caution" href="\`!${moduleSettings.chatApiName} --purge-state target|all">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0DD74385" })}</a>`;
				body += `<a class="ezmenus-btn ezmenus-caution" href="\`!${moduleSettings.chatApiName} --purge-state target|EASY_VAULT">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0009ADA5" })}</a>`;
			}

			const styledMessage = await Utils.renderTemplateAsync({
				template: "chatMenuMain",
				expressions: { title, header: "", body, footer: `v${moduleSettings.version}` },
				theme: "chatMenuMain",
				cssVars: {}
			});

			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: styledMessage
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processMenuAsync`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processSetLanguageAsync
	const processSetLanguageAsync = async (msgDetails, parsedArgs) => {
		try {
			const selectedLang = parsedArgs.lang || parsedArgs.language;

			if (selectedLang) {
				PhraseFactory.setLanguage({ playerId: msgDetails.callerId, language: selectedLang });

				await renderAlert({
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "info",
					description: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x062D88F0", expressions: { remark: selectedLang } })
				});

				return 0;
			}

			const availableLangs = PhraseFactory.getLanguages();
			const buttons = availableLangs.map((lang) => ({
				label: lang,
				href: `\`!${moduleSettings.chatApiName} --set-lang lang|${lang}`
			}));

			await renderSubmenu({
				to: msgDetails.callerName,
				title: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x08161075" }),
				buttons
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processSetLanguageAsync`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processDemoAlerts
	const processDemoAlerts = async (msgDetails) => {
		try {
			const severities = ["error", "warn", "info", "tip"];
			const phraseMap = {
				error: "0x0ALERTERRO",
				warn: "0x0ALERTWARN",
				info: "0x0ALERTINFO",
				tip: "0x0ALERTDEBU"
			};

			for (const sev of severities) {
				await renderAlert({
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: sev,
					code: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: phraseMap[sev] }),
					footer: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0834C8EE", expressions: { author: moduleSettings.author } })
				});
			}
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processDemoAlerts`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processDemoDialog
	const processDemoDialog = async (msgDetails, parsedArgs) => {
		try {
			const tokenId = msgDetails.selectedIds?.[0] || null;
			const speaker = parsedArgs.speaker || parsedArgs.name;
			const message = parsedArgs.message || parsedArgs.msg || PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0DIALOG2" });
			const position = parsedArgs.position || parsedArgs.pos;

			await renderDialog({
				to: msgDetails.callerName,
				tokenId,
				speaker,
				message,
				position
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processDemoDialog`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processDemoAnnouncement
	const processDemoAnnouncement = async (msgDetails) => {
		try {
			await renderAnnouncement({
				to: msgDetails.callerName,
				title: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C3D" }),
				body: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0B3C4D5E" }),
				footer: moduleSettings.readableName
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processDemoAnnouncement`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processDemoSubmenu
	const processDemoSubmenu = async (msgDetails) => {
		try {
			const buttons = [
				{ label: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0BACK001" }), href: `\`!${moduleSettings.chatApiName} --menu` },
				{ label: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D842F34" }), href: `\`!${moduleSettings.chatApiName} --demo-alerts` }
			];

			await renderSubmenu({
				to: msgDetails.callerName,
				title: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0SUBMEN1" }),
				buttons
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processDemoSubmenu`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processDemoTokenmod
	const processDemoTokenmod = async (msgDetails) => {
		try {
			const { selectedIds } = msgDetails;

			if (!selectedIds || selectedIds.length === 0) {
				await renderAlert({
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "warn",
					code: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0NOTOKEN" })
				});
				return 1;
			}

			selectedIds.forEach((tokenId) => {
				const token = getObj("graphic", tokenId);
				if (token) {
					const currentFlip = token.get("fliph");
					token.set("fliph", !currentFlip);
				}
			});

			await renderAlert({
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "info",
				code: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C2A2E7E" })
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processDemoTokenmod`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processExportConfig
	const processExportConfig = async (msgDetails) => {
		const configHandoutName = "Easy-Menus:Config";

		try {
			const templates = TemplateFactory.getAll();
			const themes = ThemeFactory.getAll();
			const storedVars = ThemeFactory.getRootVariables();
			const rootVariables = Object.keys(storedVars).length > 0 ? storedVars : defaultStyleVariables;

			const handoutContent = Utils.generateConfigHandout({ rootVariables, themes, templates });
			const encodedContent = Utils.encodeNoteContent({ text: handoutContent });

			let handout = findObjs({ type: "handout", name: configHandoutName })[0];
			if (!handout) {
				handout = createObj("handout", {
					name: configHandoutName,
					inplayerjournals: "",
					archived: false
				});
			}

			handout.set("gmnotes", encodedContent);
			handout.set("notes", `<h2>Easy-Menus Configuration</h2><p>Edit GM Notes to customize, then run <code>!ezmenus --load-config</code></p>`);

			await renderAlert({
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "info",
				code: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0G4H5I6J", expressions: { remark: configHandoutName } })
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processExportConfig`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processLoadConfig
	const processLoadConfig = async (msgDetails) => {
		const configHandoutName = "Easy-Menus:Config";

		try {
			const handout = findObjs({ type: "handout", name: configHandoutName })[0];
			if (!handout) {
				await renderAlert({
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "warn",
					code: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0H5I6J7K" })
				});
				return 1;
			}

			handout.get("gmnotes", async (gmnotes) => {
				if (!gmnotes || gmnotes.trim() === "") {
					await renderAlert({
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "warn",
						code: msgDetails.raw.content,
						remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0H5I6J7K" })
					});
					return;
				}

				const decoded = Utils.decodeNoteContent({ text: gmnotes });
				const parsed = Utils.parseConfigHandout({ content: decoded });

				if (parsed.templates && Object.keys(parsed.templates).length > 0) {
					TemplateFactory.add({ newTemplates: parsed.templates });
				}
				if (parsed.themes && Object.keys(parsed.themes).length > 0) {
					ThemeFactory.add({ newThemes: parsed.themes });
				}
				if (parsed.rootVariables && Object.keys(parsed.rootVariables).length > 0) {
					ThemeFactory.setRootVariables({ variables: parsed.rootVariables });
				}

				const loaded = [];
				if (Object.keys(parsed.templates || {}).length) loaded.push("templates");
				if (Object.keys(parsed.themes || {}).length) loaded.push("themes");
				if (Object.keys(parsed.rootVariables || {}).length) loaded.push("variables");

				await renderAlert({
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "info",
					code: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0I6J7K8L", expressions: { remark: loaded.join(", ") } })
				});
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processLoadConfig`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processResetStyle
	const processResetStyle = async (msgDetails) => {
		try {
			ThemeFactory.setRootVariables({ variables: {} });

			const vault = Utils.getSharedVault();
			delete vault.customStyle;

			await renderAlert({
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "info",
				code: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0J7K8L9M" })
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processResetStyle`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processPurgeState
	const processPurgeState = async (msgDetails, parsedArgs) => {
		try {
			const target = parsedArgs.target || "all";

			if (target === "all") {
				Object.keys(state).forEach((key) => {
					delete state[key];
				});
			} else {
				delete state[target];
			}

			await renderAlert({
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "info",
				code: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x084D29DE", expressions: { remark: target } })
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.processPurgeState`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: onInvalidCommand
	const onInvalidCommand = async (msgDetails, invalidCommands) => {
		await renderAlert({
			to: msgDetails.callerName,
			toId: msgDetails.callerId,
			severity: "error",
			title: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x004A7742" }),
			description: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x02B2451A" }),
			code: msgDetails.raw.content,
			remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x03B6FF6E" }),
			footer: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0834C8EE", expressions: { author: moduleSettings.author } })
		});
	};

	// ANCHOR Function: registerEventHandlers
	const registerEventHandlers = () => {
		on("chat:message", (apiCall) => {
			if (apiCall.type === "api" && apiCall.content.startsWith(`!${moduleSettings.chatApiName}`)) {
				Utils.handleApiCall({ actionMap, apiCall, onInvalidCommand });
			}
		});
		return 0;
	};

	// !SECTION End of Command Handlers

	// SECTION Initialization

	// ANCHOR Function: registerPhrases
	const registerPhrases = () => {
		PhraseFactory.add({
			newMap: {
				enUS: {
					"0": "Success",
					"1": "Failure",
					"10000": ".=> Initializing <=.",
					"20000": ".=> Ready <=.",
					"40000": "Invalid Arguments: {{ remark }}",
					"40400": "Not Found: {{ remark }}",
					"50000": "Error: {{ remark }}",
					"0x004A7742": "error",
					"0x0B672E77": "warning",
					"0x0004E2AF": "information",
					"0x000058E0": "tip",
					"0x02B2451A": "You entered the following command:",
					"0x0834C8EE": "If you continue to experience issues contact the module author ({{ author }}).",
					"0x03B6FF6E": "Invalid Arguments: There is one or more commands unrecognized. Check the commands spelling and usage.",
					"0x09B11313": "Game Master Options",
					"0x03BDB2A5": "Easy-Menus Menu",
					"0x08161075": "Set Preferred Language",
					"0x062D88F0": "Language set to {{ remark }}.",
					"0x0DD74385": "Purge ALL Game State",
					"0x0009ADA5": "Purge Module State",
					"0x0D842F34": "Demo Alerts",
					"0x0DIALOG1": "Demo Dialog",
					"0x0DIALOG2": "Greetings, traveler. What brings you to these parts?",
					"0x0A1B2C3D": "Announcement",
					"0x0B3C4D5E": "This is an example announcement message.",
					"0x0SUBMEN1": "Demo Submenu",
					"0x0BACK001": "Back to Menu",
					"0x0382B96E": "Demo Tokenmod",
					"0x0C2A2E7E": "Tokens were successfully flipped.",
					"0x0NOTOKEN": "No tokens selected.",
					"0x0E1F2A3B": "Export Config",
					"0x0F2E3D4C": "Load Config",
					"0x0K8L9M0N": "Reset Style",
					"0x0G4H5I6J": "Config exported to {{ remark }}",
					"0x0H5I6J7K": "Config handout is empty.",
					"0x0I6J7K8L": "Config loaded: {{ remark }}",
					"0x0J7K8L9M": "Custom styles cleared.",
					"0x084D29DE": "State purged: {{ remark }}",
					"0x0ALERTERRO": "This is an example error alert.",
					"0x0ALERTWARN": "This is an example warning alert.",
					"0x0ALERTINFO": "This is an example info alert.",
					"0x0ALERTDEBU": "This is an example tip/debug alert."
				},
				frFR: {
					"0": "Succès",
					"1": "Échec",
					"10000": ".=> Initialisation <=.",
					"20000": ".=> Prêt <=.",
					"40000": "Arguments invalides : {{ remark }}",
					"40400": "Non trouvé : {{ remark }}",
					"50000": "Erreur : {{ remark }}",
					"0x004A7742": "erreur",
					"0x0B672E77": "avertissement",
					"0x0004E2AF": "information",
					"0x000058E0": "conseil",
					"0x02B2451A": "Vous avez entré la commande suivante :",
					"0x0834C8EE": "Si le problème persiste, contactez l'auteur du module ({{ author }}).",
					"0x03B6FF6E": "Arguments invalides : une ou plusieurs commandes ne sont pas reconnues. Vérifiez l'orthographe et l'utilisation des commandes.",
					"0x09B11313": "Options du Maître du Jeu",
					"0x03BDB2A5": "Menu Easy-Menus",
					"0x08161075": "Définir la langue",
					"0x062D88F0": "Langue définie sur {{ remark }}.",
					"0x0DD74385": "Purger TOUT l'état",
					"0x0009ADA5": "Purger l'état du module",
					"0x0D842F34": "Démo Alertes",
					"0x0DIALOG1": "Démo Dialogue",
					"0x0DIALOG2": "Salutations, voyageur. Qu'est-ce qui vous amène?",
					"0x0A1B2C3D": "Annonce",
					"0x0B3C4D5E": "Ceci est un exemple de message d'annonce.",
					"0x0SUBMEN1": "Démo Sous-menu",
					"0x0BACK001": "Retour au menu",
					"0x0382B96E": "Démo Tokenmod",
					"0x0C2A2E7E": "Les jetons ont été retournés.",
					"0x0NOTOKEN": "Aucun jeton sélectionné.",
					"0x0E1F2A3B": "Exporter Config",
					"0x0F2E3D4C": "Charger Config",
					"0x0K8L9M0N": "Réinitialiser Style",
					"0x0G4H5I6J": "Config exportée vers {{ remark }}",
					"0x0H5I6J7K": "Le document de config est vide.",
					"0x0I6J7K8L": "Config chargée: {{ remark }}",
					"0x0J7K8L9M": "Styles personnalisés effacés.",
					"0x084D29DE": "État purgé: {{ remark }}",
					"0x0ALERTERRO": "Ceci est un exemple d'alerte d'erreur.",
					"0x0ALERTWARN": "Ceci est un exemple d'alerte d'avertissement.",
					"0x0ALERTINFO": "Ceci est un exemple d'alerte d'information.",
					"0x0ALERTDEBU": "Ceci est un exemple d'alerte conseil."
				}
			}
		});
	};

	// ANCHOR Function: registerTemplatesAndThemes
	const registerTemplatesAndThemes = () => {
		// Register templates
		TemplateFactory.add({
			newTemplates: {
				chatMenuAlert: templateChatMenuAlert,
				chatMenuMain: templateChatMenuMain,
				chatMenuSubmenu: templateChatMenuSubmenu,
				chatMenuDialog: templateChatMenuDialog,
				chatMenuAnnouncement: templateChatMenuAnnouncement
			}
		});

		// Register themes
		ThemeFactory.add({
			newThemes: {
				chatMenuAlert: themeChatMenuAlert,
				chatMenuMain: themeChatMenuMain,
				chatMenuSubmenu: themeChatMenuSubmenu,
				chatMenuDialog: themeChatMenuDialog,
				chatMenuAnnouncement: themeChatMenuAnnouncement
			}
		});

		// Set default style variables
		ThemeFactory.setRootVariables({ variables: defaultStyleVariables });
	};

	// ANCHOR Function: checkInstall
	const checkInstall = () => {
		if (typeof EASY_UTILS === "undefined") {
			log(`[${moduleSettings.readableName}] ERROR: EASY_UTILS is required but not found. Ensure easy-utils.js is loaded first.`);
			return 1;
		}

		const requiredFunctions = [
			"createPhraseFactory",
			"createTemplateFactory",
			"createThemeFactory",
			"logSyslogMessage",
			"handleApiCall",
			"whisperPlayerMessage",
			"renderTemplateAsync",
			"generateConfigHandout",
			"parseConfigHandout",
			"decodeNoteContent",
			"encodeNoteContent",
			"getSharedVault"
		];

		Utils = EASY_UTILS.fetchUtilities({
			requiredFunctions,
			moduleSettings
		});

		PhraseFactory = Utils.createPhraseFactory;
		TemplateFactory = Utils.createTemplateFactory;
		ThemeFactory = Utils.createThemeFactory;

		if (moduleSettings.verbose) {
			const msgId = "10000";
			Utils.logSyslogMessage({
				severity: "INFO",
				tag: moduleSettings.readableName,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId })
			});
		}

		return 0;
	};

	// ANCHOR Event: on(ready)
	on("ready", () => {
		const continueMod = checkInstall();
		if (continueMod === 0) {
			registerPhrases();
			registerTemplatesAndThemes();
			registerEventHandlers();

			const msgId = "20000";
			Utils.logSyslogMessage({
				severity: "INFO",
				tag: moduleSettings.readableName,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId })
			});
		}
	});

	// !SECTION End of Initialization

	// SECTION Public Interface

	return {
		// Render methods for other APIs
		renderAlert,
		renderMenu,
		renderSubmenu,
		renderDialog,
		renderAnnouncement,

		// Helper for building avatars (if other APIs need it)
		buildAvatarHtml,

		// Access to module settings for reference
		getModuleSettings: () => ({ ...moduleSettings })
	};

	// !SECTION End of Public Interface

})();
