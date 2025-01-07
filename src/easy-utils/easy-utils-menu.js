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
		"--flip": (msgDetails) => { return processFlipTokensAsync(msgDetails); },
		"--purge-state": (msgDetails, parsedArgs) => { return processPurgeState(msgDetails, parsedArgs); },
		"--echo-inline-roll": (msgDetails) => { Utils.whisperPlayerMessage({ from: moduleSettings.readableName, to: msgDetails.callerName, message: JSON.stringify(msgDetails.raw) }); },
	};

	// Set Default Action
	actionMap["--default"] = actionMap["--menu"];

	// SECTION Inner Methods

	// ANCHOR Function: processMenuAsync
	const processMenuAsync = async (msgDetails) => {

		const thisFuncDebugName = "processMenuAsync";
		const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x03BDB2A5" });

		// NOTE use the '\' to escape, make literal, the special characters like the backtick (`) and exclamation (!)
		const menuItemsArray = [
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --set-lang">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x08161075" })}</a></li>`,
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --alerts">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D842F34" })}</a></li>`,
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --flip">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0382B96E" })}</a></li>`
		];

		const gmMenuItemsArray = [
			"</ul>",
			`<h4>${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x09B11313" })}</h4>`,
			"<ul>",
			`<li data-category="caution"><a role="button" href="\`!${moduleSettings.chatApiName} --purge-state all">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0DD74385" })}</a></li>`,
			`<li data-category="caution"><a role="button" href="\`!${moduleSettings.chatApiName} --purge-state EASY_VAULT">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0009ADA5" })}</a></li>`,
		];

		// Conditionally combine arrays if isGm is true
		const combinedMenuItemsArray = msgDetails.isGm
			? [...menuItemsArray, ...gmMenuItemsArray]
			: menuItemsArray;

		const menuItemsHTML = combinedMenuItemsArray.join("\n");

		const menuContent = {
			title,
			menuItems: menuItemsHTML,
			footer: "",
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

				const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x03BDB2A5" });
				const availableLanguagesArray = PhraseFactory.getLanguages();

				const menuItemsArray = availableLanguagesArray.map(aLang => {
					return `<li><a role="button" href="\`!${moduleSettings.chatApiName} --set-lang ${aLang}">${aLang}</a></li>`;
				});

				const menuItemsHTML = menuItemsArray
					.join("\n");

				const menuContent = {
					title,
					menuItems: menuItemsHTML,
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
						"0x061115DE": "An example tip or confirmation styled Notification."
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
						"0x061115DE": "Un exemple de notification de type conseil ou confirmation."
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