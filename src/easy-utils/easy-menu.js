/*!
@language: en-US
@title: easy-menu.js
@description: The EASY_MENU module integrates with EASY_UTILS to provide a menu-driven interface and 
	control commands in the Roll20 environment. It uses factories (Phrase, Template, Theme) from the forge,
	parses user chat commands, and renders styled alerts to players via whisper messages.
@version: 1.0.0
@author: Mhykiel
@license: MIT
@repository: {@link https://github.com/tougher-together-games/roll20-api-scripts/blob/main/src/easy-utils/easy-utils-menu.js|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_MENU = (() => {
	// SECTION Object: EASY_MENU
	/**
	 * @namespace EASY_MENU
	 * @summary Example use of EASY_UTILS.
	 * 
	 * - **Purpose**:
	 *   - // TODO Fill in Purpose
	 * 
	 * - **Execution**:
	 *   - // TODO Fill in Execution
	 * 
	 * - **Design**:
	 *   - // TODO Fill in Design
	 * 
	 * @see https://example.com
	 */

	// TODO Fill out module meta data
	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Menu",
		chatApiName: "ezmenu",
		globalName: "EASY_MENU",
		version: "1.0.0",
		author: "Mhykiel",
		sendWelcomeMsg: true,
		verbose: false,
		debug: {
			"onReady": false,
			"convertCssToJson": false,
			"convertHtmlToJson": false,
			"convertMarkdownToHtml": false,
			"convertJsonToHtml": false,
			"convertToSingleLine": false,
			"createPhraseFactory": false,
			"createTemplateFactory": false,
			"createThemeFactory": false,
			"decodeBase64": false,
			"encodeBase64": false,
			"decodeCodeBlock": false,
			"encodeCodeBlock": false,
			"decodeNoteContent": false,
			"encodeNoteContent": false,
			"getGlobalSettings": false,
			"getSharedForge": false,
			"getSharedVault": false,
			"logSyslogMessage": false,
			"parseChatCommands": false,
			"parseChatSubcommands": false,
			"replacePlaceholders": false,
			"applyCssToHtmlJson": false,
			"handleChatApi": false,
			"renderTemplateAsync": false,
			"whisperAlertMessageAsync": false,
			"whisperPlayerMessage": false
		}
	};

	// ANCHOR Factory References
	let Utils = {};
	let PhraseFactory = {};
	//let TemplateFactory = {};
	//let ThemeFactory = {};

	// ANCHOR Member: actionMap
	const actionMap = {
		"--menu": (msgDetails) => { return processMenuAsync(msgDetails); },
		"--set-lang": (msgDetails, parsedArgs) => { return processSetLanguageAsync(msgDetails, parsedArgs); },
		"--alerts": (msgDetails) => { return processExampleAlerts(msgDetails); },
		"--announcement": (msgDetails, parsedArgs) => { return processAnnouncementAsync(msgDetails, parsedArgs); },
		"--flip": (msgDetails) => { return processFlipTokensAsync(msgDetails); },
		"--purge-state": (msgDetails, parsedArgs) => { return processPurgeState(msgDetails, parsedArgs); },
		"--export-config": (msgDetails) => { return processExportConfig(msgDetails); },
		"--reload-config": (msgDetails) => { return processReloadConfig(msgDetails); },
		"--reset-style": (msgDetails) => { return processResetStyle(msgDetails); },
		"--echo-inline-roll": (msgDetails) => { Utils.whisperPlayerMessage({ from: moduleSettings.readableName, to: msgDetails.callerName, message: JSON.stringify(msgDetails.raw) }); },
	};

	// Set Default Action
	actionMap["--default"] = actionMap["--menu"];

	// SECTION Inner Methods

	// ANCHOR Function: processMenuAsync
	const processMenuAsync = async (msgDetails) => {

		const thisFuncDebugName = "processMenuAsync";
		const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x03BDB2A5" });

		// Build buttons for main content
		const mainButtons = [
			`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --set-lang">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x08161075" })}</a>`,
			`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --alerts">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D842F34" })}</a>`,
			`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --announcement">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C3D" })}</a>`,
			`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --flip">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0382B96E" })}</a>`
		];

		// Build body with content section
		let body = `<div class="ez-content">${mainButtons.join("\n")}</div>`;

		// Add GM-only section if GM
		if (msgDetails.isGm) {
			const gmHeader = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x09B11313" });
			const gmButtons = [
				`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --export-config">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E1F2A3B" })}</a>`,
				`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --reload-config">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0F2E3D4C" })}</a>`,
				`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --reset-style">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0K8L9M0N" })}</a>`,
				`<a class="ez-btn ez-caution" href="\`!${moduleSettings.chatApiName} --purge-state all">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0DD74385" })}</a>`,
				`<a class="ez-btn ez-caution" href="\`!${moduleSettings.chatApiName} --purge-state EASY_VAULT">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0009ADA5" })}</a>`
			];
			body += `<div class="ez-header">${gmHeader}</div>`;
			body += `<div class="ez-content">${gmButtons.join("\n")}</div>`;
		}

		const menuContent = {
			title,
			subtitle: "",
			body,
			footer: `v${moduleSettings.version}`,
		};

		try {
			const styledMessage = await Utils.renderTemplateAsync({
				template: "chatMenu",
				expressions: menuContent,
				theme: "chatMenu",
				cssVars: {},
			});

			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: styledMessage
			});

			return 0;
		} catch (err) {

			// "50000": "Error: {{ remark }}"
			const msgId = "50000";
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
			});

			return 1;
		}
	};

	// ANCHOR Function: processSetLanguageAsync
	const processSetLanguageAsync = async (msgDetails, parsedArgs) => {

		const thisFuncDebugName = "processSetLanguageAsync";

		try {
			const _isEmptyObject = (obj) => {
				return JSON.stringify(obj) === "{}";
			};

			if (_isEmptyObject(parsedArgs)) {

				const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x08161075" });
				const availableLanguagesArray = PhraseFactory.getLanguages();

				const buttonsArray = availableLanguagesArray.map(aLang => {
					return `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --set-lang ${aLang}">${aLang}</a>`;
				});

				const body = `<div class="ez-content">${buttonsArray.join("\n")}</div>`;

				const menuContent = {
					title,
					subtitle: "",
					body,
					footer: "",
				};

				const styledMessage = await Utils.renderTemplateAsync({
					template: "chatMenu",
					expressions: menuContent,
					theme: "chatMenu",
					cssVars: {},
				});

				Utils.whisperPlayerMessage({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					message: styledMessage
				});

				return 0;

			}
			else {

				// set-lang has a subcommand value passed, assume it is the target language
				const selectedLang = Object.keys(parsedArgs)[0];
				PhraseFactory.setLanguage({ playerId: msgDetails.callerId, language: selectedLang });

				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "INFO",
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x062D88F0", expressions: { remark: selectedLang } })}`
				});

				return 0;
			}
		} catch (err) {

			// "50000": "Error: {{ remark }}"
			const msgId = "50000";
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
			});

			return 1;
		}
	};

	// ANCHOR Function: processPurgeState
	const processPurgeState = (msgDetails, parsedArgs) => {

		const thisFuncDebugName = "processPurgeState";

		try {
			if (parsedArgs.all) {

				state = {};

				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x084D29DE", expressions: { remark: "" } })}`
				});

				return 0;

			} else {

				// purge-state has an array of target state.objects to purge
				Object.keys(parsedArgs).forEach((name) => {
					if (parsedArgs[name] === true && name !== "all") {
						state[name] = {};

						Utils.whisperAlertMessageAsync({
							from: moduleSettings.readableName,
							to: msgDetails.callerName,
							toId: msgDetails.callerId,
							severity: "WARN",
							apiCallContent: msgDetails.raw.content,
							remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x084D29DE", expressions: { remark: `.${name}` } })}`
						});
					}
				});

				return 0;
			}
		} catch (err) {

			// "50000": "Error: {{ remark }}"
			const msgId = "50000";
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
			});

			return 1;
		}
	};

	// ANCHOR Function: processExampleAlerts
	const processExampleAlerts = (msgDetails) => {

		const thisFuncDebugName = "processPurgeState";

		try {

			// Example Error
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x07845DCE" })}`
			});

			// Example Warning
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "WARN",
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x06F2AA1E" })}`
			});

			// Example Information
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0512C293" })}`
			});

			// Example Debug or Tip
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "DEBUG",
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x061115DE" })}`
			});

			return 0;

		} catch (err) {

			// "50000": "Error: {{ remark }}"
			const msgId = "50000";
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
			});

			return 1;
		}
	};

	// ANCHOR Function: processAnnouncementAsync
	const processAnnouncementAsync = async (msgDetails, parsedArgs) => {

		const thisFuncDebugName = "processAnnouncementAsync";

		try {
			// Get message from args or use default
			const message = parsedArgs.message || parsedArgs.msg || 
				PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0B3C4D5E" });

			const announcementContent = {
				title: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C3D" }),
				body: message,
				footer: moduleSettings.readableName,
			};

			const styledMessage = await Utils.renderTemplateAsync({
				template: "chatAnnouncement",
				expressions: announcementContent,
				theme: "chatAnnouncement",
				cssVars: {},
			});

			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: styledMessage
			});

			return 0;

		} catch (err) {

			const msgId = "50000";
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
			});

			return 1;
		}
	};

	// ANCHOR Function: processExportConfig
	const processExportConfig = (msgDetails) => {

		const thisFuncDebugName = "processExportConfig";
		const configHandoutName = "Easy-Utils:Config";

		try {
			// Comprehensive config template with all CSS variables
			const cssContent = `:root {
    /* ======================================================
     * EASY-UTILS CONFIGURATION
     * ======================================================
     * Modify variables as needed.
     * Run !ezmenu --reload-config to apply changes.
     * Run !ezmenu --reset-style to revert to defaults.
     * ====================================================== */

    /* ==================================================
     * PRIMARY PALETTE
     * ================================================== */
    --ez-color-primary: #8655b6;
    --ez-color-secondary: #34627b;
    --ez-color-tertiary: #17aee8;
    --ez-color-accent: #cc6699;
    --ez-color-complement: #fcec52;
    --ez-color-contrast: #c3b9c8;

    /* ==================================================
     * BACKGROUNDS
     * ================================================== */
    --ez-color-background-primary: #252b2c;
    --ez-color-background-secondary: #2d3e43;
    --ez-color-background-tertiary: #8c888e;
    --ez-color-background-accent: #fbe2c4;
    --ez-color-background-complement: #3f3f3f;
    --ez-color-background-contrast: #f2f2f2;

    /* ==================================================
     * BORDERS
     * ================================================== */
    --ez-color-border-primary: #000000;
    --ez-color-border-shadow: #3f3f3f;
    --ez-color-border-contrast: #f2f2f2;

    /* ==================================================
     * TEXT COLORS
     * ================================================== */
    --ez-color-text-primary: #000000;
    --ez-color-text-secondary: #2d3e43;
    --ez-color-text-tertiary: #660000;
    --ez-color-text-accent: #cc6699;
    --ez-color-text-complement: #c9ad6a;
    --ez-color-text-contrast: #ffffff;

    /* ==================================================
     * RAINBOW COLORS (for alerts and accents)
     * ================================================== */
    --ez-rainbow-red: #ff0000;
    --ez-rainbow-orange: #ffa500;
    --ez-rainbow-yellow: #ffff00;
    --ez-rainbow-olive: #808000;
    --ez-rainbow-green: #008000;
    --ez-rainbow-teal: #008080;
    --ez-rainbow-blue: #0000ff;
    --ez-rainbow-violet: #ee82ee;
    --ez-rainbow-purple: #800080;
    --ez-rainbow-pink: #ffc0cb;
    --ez-rainbow-brown: #a52a2a;
    --ez-rainbow-grey: #808080;
    --ez-rainbow-black: #000000;

    /* ==================================================
     * TYPOGRAPHY
     * ================================================== */
    --ez-line-height: 1.6;
    --ez-font-weight: 400;
    --ez-font-size: 62.5%;
    --ez-font-family-emoji: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    --ez-font-family-serif: 'Times New Roman', Times, Garamond, serif;
    --ez-font-family-sans-serif: Ubuntu, Cantarell, Helvetica, Arial, 'Helvetica Neue', sans-serif;
    --ez-font-family-monospace: Consolas, monospace;

    /* ==================================================
     * LAYOUT
     * ================================================== */
    --ez-block-padding: 5px 10px;
    --ez-block-margin: .5em 0em;
    --ez-block-radius: 5px;

    /* ==================================================
     * CAP (Top/Bottom decorative bars)
     * ================================================== */
    --ez-cap-height: 12px;
    /* --ez-cap-bg: url(https://example.com/cap.png); */
    /* --ez-cap-top-bg: url(https://example.com/cap-top.png); */
    /* --ez-cap-bottom-bg: url(https://example.com/cap-bottom.png); */
    /* --ez-cap-bg-size: 100% 100%; */
    /* --ez-cap-radius: 8px 8px 0 0; */
    /* --ez-cap-radius-bottom: 0 0 8px 8px; */

    /* ==================================================
     * TITLE BAR
     * ================================================== */
    --ez-title-align: center;
    /* --ez-title-bg: url(https://example.com/title.png); */
    /* --ez-title-bg-size: cover; */

    /* ==================================================
     * SUBTITLE (Menu only)
     * ================================================== */
    --ez-subtitle-align: center;
    /* --ez-subtitle-bg: url(https://example.com/subtitle.png); */
    /* --ez-subtitle-bg-size: cover; */

    /* ==================================================
     * HEADER (Menu section dividers)
     * ================================================== */
    --ez-header-align: center;
    /* --ez-header-bg: url(https://example.com/header.png); */
    /* --ez-header-bg-size: cover; */

    /* ==================================================
     * CONTENT AREAS (Menu)
     * ================================================== */
    --ez-content-align: center;
    /* --ez-content-bg: url(https://example.com/content.png); */
    /* --ez-content-bg-size: cover; */

    /* ==================================================
     * BODY (Alert/Announcement)
     * ================================================== */
    --ez-body-align: left;
    /* --ez-body-bg: url(https://example.com/body.png); */
    /* --ez-body-bg-size: cover; */

    /* ==================================================
     * FOOTER
     * ================================================== */
    --ez-footer-align: center;
    /* --ez-footer-bg: url(https://example.com/footer.png); */
    /* --ez-footer-bg-size: cover; */

    /* ==================================================
     * BUTTONS (Menu)
     * ================================================== */
    --ez-btn-align: center;
    /* --ez-btn-bg: url(https://example.com/button.png); */
    /* --ez-btn-bg-size: cover; */
    /* --ez-btn-hover-bg: url(https://example.com/button-hover.png); */
    /* --ez-btn-caution-bg: url(https://example.com/button-caution.png); */

    /* ==================================================
     * CODE BLOCKS (Alert)
     * ================================================== */
    /* --ez-code-bg: #f2f2f2; */

    /* ==================================================
     * ALERT SEVERITY COLORS
     * ================================================== */
    /* --ez-error-bg: #ff0000; */
    /* --ez-warn-bg: #ffa500; */
    /* --ez-info-bg: #17aee8; */
    /* --ez-tip-bg: #008000; */
}`;

			// Check if handout exists
			let handout = findObjs({ type: "handout", name: configHandoutName })[0];

			if (!handout) {
				handout = createObj("handout", {
					name: configHandoutName,
					inplayerjournals: "",
					archived: false
				});
			}

			// Set the GM notes with the CSS content
			handout.set("notes", cssContent);

			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0G4H5I6J", expressions: { remark: configHandoutName } })
			});

			return 0;

		} catch (err) {

			const msgId = "50000";
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
			});

			return 1;
		}
	};

	// ANCHOR Function: processReloadConfig
	const processReloadConfig = (msgDetails) => {

		const thisFuncDebugName = "processReloadConfig";
		const configHandoutName = "Easy-Utils:Config";

		try {
			// Find the config handout
			const handout = findObjs({ type: "handout", name: configHandoutName })[0];

			if (!handout) {
				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "40400", expressions: { remark: configHandoutName } })
				});
				return 1;
			}

			// Read the notes content
			handout.get("notes", (notes) => {
				if (!notes || notes === "null") {
					Utils.whisperAlertMessageAsync({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "WARN",
						apiCallContent: msgDetails.raw.content,
						remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0H5I6J7K" })
					});
					return;
				}

				// Parse CSS variables from the notes
				// Expected format: :root { --ez-var: value; }
				const cssVarRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
				let match;
				const customVars = {};

				while ((match = cssVarRegex.exec(notes)) !== null) {
					customVars[match[1].trim()] = match[2].trim();
				}

				// Store in vault for persistence
				const vault = Utils.getSharedVault();
				vault.customStyle = customVars;

				// Update ThemeFactory with custom vars (if needed)
				// For now, just confirm reload
				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "INFO",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0I6J7K8L", expressions: { remark: Object.keys(customVars).length } })
				});
			});

			return 0;

		} catch (err) {

			const msgId = "50000";
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
			});

			return 1;
		}
	};

	// ANCHOR Function: processResetStyle
	const processResetStyle = (msgDetails) => {

		const thisFuncDebugName = "processResetStyle";

		try {
			// Clear custom styles from vault
			const vault = Utils.getSharedVault();
			delete vault.customStyle;

			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0J7K8L9M" })
			});

			return 0;

		} catch (err) {

			const msgId = "50000";
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
			});

			return 1;
		}
	};

	// ANCHOR Function: processFlipTokensAsync
	const processFlipTokensAsync = async (msgDetails) => {

		const thisFuncDebugName = "processPurgeState";

		try {

			// Check if there are selected IDs
			const { selectedIds } = msgDetails;

			if (!Array.isArray(selectedIds) || selectedIds.length === 0) {

				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D9A441E" })}`
				});

				return 1;
			}

			// Process each selected token asynchronously
			for (const id of selectedIds) {

				// Get the token object using the ID
				const token = getObj("graphic", id);

				if (!token) {

					const whisperArguments = {
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "WARN",
						apiCallContent: msgDetails.raw.content,
						remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "40400", expressions: { remark: id } })}`
					};

					Utils.whisperAlertMessageAsync(whisperArguments);

					continue;
				}

				// Flip the token horizontally (toggle 'fliph' property)
				const currentFlipH = token.get("fliph");
				token.set("fliph", !currentFlipH);

				// Flip the token vertically (toggle 'flipv' property)
				const currentFlipV = token.get("flipv");
				token.set("flipv", !currentFlipV);

				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "INFO",
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C2A2E7E" })}`
				});
			}
		} catch (err) {

			// "50000": "Error: {{ remark }}"
			const msgId = "50000";
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
			});

			return 1;
		}
	};

	// !SECTION End of Inner Methods

	// SECTION Event Hooks: Roll20 API

	// ANCHOR Outer Method: registerEventHandlers
	const registerEventHandlers = () => {
		on("chat:message", (apiCall) => {
			if (apiCall.type === "api" && apiCall.content.startsWith(`!${moduleSettings.chatApiName}`)) {
				Utils.handleApiCall({ actionMap, apiCall });
			}
		});

		return 0;
	};

	// ANCHOR Outer Method: checkInstall
	const checkInstall = () => {

		if (typeof EASY_UTILS !== "undefined") {

			// TODO Limit the functions fetched down to the ones this module uses for memory efficiency.
			const requiredFunctions = [
				/*
				"convertCssToJson",
				"convertHtmlToJson",
				"convertMarkdownToHtml",
				"convertJsonToHtml",
				"convertToSingleLine",
				"decodeBase64",
				"encodeBase64",
				"decodeCodeBlock",
				"encodeCodeBlock",
				"decodeNoteContent",
				"encodeNoteContent",
				"getGlobalSettings",
				"getSharedForge",
				"getSharedVault",
				"logSyslogMessage",
				"parseChatCommands",
				"parseChatSubcommands",
				"replacePlaceholders",
				"applyCssToHtmlJson",
				"handleChatApi",
				"renderTemplateAsync",
				"whisperAlertMessageAsync",
				"whisperPlayerMessage"
				*/
				"getGlobalSettings",
				"getSharedForge",
				"getSharedVault",
				"handleApiCall",
				"logSyslogMessage",
				"parseChatCommands",
				"parseChatSubcommands",
				"renderTemplateAsync",
				"whisperAlertMessageAsync",
				"whisperPlayerMessage",
				// This function is not in EASY_UTILS; when trying to retrieve it a warning will be logged.
				"badFunction"
			];

			Utils = EASY_UTILS.fetchUtilities({
				requiredFunctions,
				moduleSettings
			});

			// Get reference to and assign pre-existing factories
			const easySharedForge = Utils.getSharedForge();

			PhraseFactory = easySharedForge.getFactory({ name: "PhraseFactory" });
			TemplateFactory = easySharedForge.getFactory({ name: "TemplateFactory" });
			ThemeFactory = easySharedForge.getFactory({ name: "ThemeFactory" });

			if (moduleSettings.verbose) {

				// "10000": ".=> Initializing <=.",
				const msgId = "10000";
				Utils.logSyslogMessage({
					severity: "INFO",
					tag: moduleSettings.readableName,
					transUnitId: msgId,
					message: PhraseFactory.get({ transUnitId: msgId })
				});
			}

			// Continue with other Set Up Tasks.

			// TODO Add custom localization
			PhraseFactory.add({
				newMap: {
					enUS: {
						"0x03BDB2A5": "Custom Menu",
						"0x08161075": "Set Preferred Language",
						"0x062D88F0": "Whispers to you from 'EASY-MODULES' will be in {{ remark }} (if available). ",
						"0x0DD74385": "Purge ALL Game State",
						"0x0009ADA5": "Purge module Game State",
						"0x084D29DE": "The Roll20 API state{{ remark }} was purged.",
						"0x0D842F34": "Example Alert Messages",
						"0x0382B96E": "Example Change Token(s)",
						"0x0C2A2E7E": "Tokens were successfully flipped.",
						"0x07845DCE": "This is an example error alert whispered to players.",
						"0x06F2AA1E": "Example warning, suggesting a possibly dangerous thing happened.",
						"0x0512C293": "This is an example information notification whispered to players",
						"0x061115DE": "An example tip or confirmation styled Notification.",
						"0x0A1B2C3D": "Announcement",
						"0x0B3C4D5E": "This is an example announcement message. Announcements can be used for important game updates or story narration.",
						"0x0E1F2A3B": "Export Config",
						"0x0F2E3D4C": "Reload Config",
						"0x0G4H5I6J": "Config exported to handout: {{ remark }}",
						"0x0H5I6J7K": "Config handout is empty. Export config first.",
						"0x0I6J7K8L": "Config reloaded. {{ remark }} custom variables loaded.",
						"0x0J7K8L9M": "Custom styles cleared. Using default theme.",
						"0x0K8L9M0N": "Reset Style"
					},
					frFR: {
						"0x03BDB2A5": "Menu personnalisé",
						"0x08161075": "Définir la langue préférée",
						"0x062D88F0": "Les chuchotements de 'EASY-MODULES' vous parviendront en {{ remark }} (si disponible).",
						"0x0DD74385": "Purger TOUT l'état de la partie",
						"0x0009ADA5": "Purger l'état du module de la partie",
						"0x084D29DE": "L'état de l'API Roll20.{{ remark }} a été purgé.",
						"0x0D842F34": "Exemples de messages d'alerte",
						"0x0382B96E": "Exemple de modification de(s) jeton(s)",
						"0x0C2A2E7E": "Les jetons ont été retournés avec succès.",
						"0x07845DCE": "Ceci est un exemple d'alerte d'erreur chuchotée aux joueurs.",
						"0x06F2AA1E": "Exemple d'avertissement, suggérant un événement potentiellement dangereux.",
						"0x0512C293": "Ceci est un exemple de notification d'information chuchotée aux joueurs.",
						"0x061115DE": "Un exemple de notification de type conseil ou confirmation.",
						"0x0A1B2C3D": "Annonce",
						"0x0B3C4D5E": "Ceci est un exemple de message d'annonce. Les annonces peuvent être utilisées pour des mises à jour importantes ou une narration.",
						"0x0E1F2A3B": "Exporter la config",
						"0x0F2E3D4C": "Recharger la config",
						"0x0G4H5I6J": "Config exportée vers le document: {{ remark }}",
						"0x0H5I6J7K": "Le document de config est vide. Exportez d'abord la config.",
						"0x0I6J7K8L": "Config rechargée. {{ remark }} variables personnalisées chargées.",
						"0x0J7K8L9M": "Styles personnalisés effacés. Utilisation du thème par défaut.",
						"0x0K8L9M0N": "Réinitialiser le style"
					}
				}
			});

			return 0;
		} else {

			// EASY_UTILS is unavailable. In Roll20, scripts that are in the most left tab are loaded first into a global
			// sandbox; as if all the script are pasted into one.
			const _getSyslogTimestamp = () => { return new Date().toISOString(); };
			const logMessage = `<ERROR> ${_getSyslogTimestamp()} [${moduleSettings.readableName}](checkInstall): {"transUnitId": 50000, "message": "Not Found: EASY_UTILS is unavailable. Ensure it is loaded before this module in the API console."}`;
			log(logMessage);

			return 1;
		}
	};

	on("ready", () => {

		const continueMod = checkInstall();
		if (continueMod === 0) {

			registerEventHandlers();

			// "20000": ".=> Ready <=.",
			const msgId = "20000";

			Utils.logSyslogMessage({
				severity: "INFO",
				tag: moduleSettings.readableName,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId })
			});

			if (moduleSettings.sendWelcomeMsg) {

				Utils.whisperPlayerMessage({
					from: moduleSettings.readableName,
					to: "gm",
					message: PhraseFactory.get({ transUnitId: msgId })
				});
			}
		}
	});

	// !SECTION End of Event Hooks: Roll20 API

	// SECTION Public Methods: Exposed Interface

	return {};

	// !SECTION End of Public Methods: Exposed Interface
	// !SECTION End of Object: EASY_MENU
})();