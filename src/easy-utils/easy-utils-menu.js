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

/* SECTION Object: EASY_MENU *****************************************************************************************/
/**
 * @namespace EASY_MENU
 * @summary Example use of EASY_UTILS.
 * 
 * - **Purpose**:
 *   - {{ purpose }}
 * 
 * - **Execution**:
 *   - {{ execution }}
 * 
 * - **Design**:
 *   - {{ design }}
 * 
 * @see https://example.com
 */
// eslint-disable-next-line no-unused-vars
const EASY_MENU = (() => {

	// TODO Fill out module meta data
	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Menu",
		chatApiName: "ezmenu",
		globalName: "EASY_MENU",
		version: "1.0.0",
		author: "Mhykiel",
		verbose: false,
		sendWelcomeMsg: true,
		debug: {
			"applyCssToHtmlJson": false,
			"convertCssToJson": false,
			"convertHtmlToJson": false,
			"convertMarkdownToHtml": false,
			"convertJsonToHtml": false,
			"convertToSingleLine": false,
			"createPhraseFactory": false,
			"createTemplateFactory": false,
			"createThemeFactory": false,
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

	// TODO Add universal style colors
	// NOTE: It's recommended to use a consistent naming convention for color variables in your CSS.
	// This ensures a cohesive and consistent color scheme across all components, such as chat menus and modals. 
	// Define your styles here in the `paletteColors` object and pass it into all theme-related requests.

	const paletteColors = {
		"--ez-color-primary": " #8655b6",
		"--ez-color-secondary": " #34627b",
		"--ez-color-tertiary": " #17aee8",
		"--ez-color-accent": " #cc6699",
		"--ez-color-complement": " #fcec52",
		"--ez-color-contrast": " #c3b9c8",
	
		/* Backgrounds and Borders */
		"--ez-color-background-primary": " #252b2c",
		"--ez-color-background-secondary": " #2d3e43",
		"--ez-color-background-tertiary": " #8c888e",
		"--ez-color-background-accent": " #fbe2c4",
		"--ez-color-background-complement": " #3f3f3f",
		"--ez-color-background-contrast": " #f2f2f2",
	
		"--ez-color-border-primary": " #000000",
		"--ez-color-border-shadow": " #3f3f3f",
		"--ez-color-border-contrast": " #f2f2f2",
	
		/* Text */
		"--ez-color-text-primary": " #000000",
		"--ez-color-text-secondary": " #2d3e43",
		"--ez-color-text-tertiary": " #660000",
		"--ez-color-text-accent": " #cc6699",
		"--ez-color-text-complement": " #c9ad6a",
		"--ez-color-text-contrast": " #ffffff",
	
		/* Rainbow Colors */
		"--ez-rainbow-red": " #ff0000",
		"--ez-rainbow-orange": " #ffa500",
		"--ez-rainbow-yellow": " #ffff00",
		"--ez-rainbow-olive": " #808000",
		"--ez-rainbow-green": " #008000",
		"--ez-rainbow-teal": " #008080",
		"--ez-rainbow-blue": " #0000ff",
		"--ez-rainbow-violet": " #ee82ee",
		"--ez-rainbow-purple": " #800080",
		"--ez-rainbow-pink": " #ffc0cb",
		"--ez-rainbow-brown": " #a52a2a",
		"--ez-rainbow-grey": " #808080",
		"--ez-rainbow-black": " #000000",
	
		/* Typography Constants */
		"--ez-line-height": " 1.6",
		"--ez-font-weight": " 400",
		"--ez-font-size": " 62.5%",
	
		"--ez-font-family-emoji": " 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
		"--ez-font-family-serif": " 'Times New Roman', Times, Garamond, serif, var(--ez-font-family-emoji)",
		"--ez-font-family-sans-serif": " Ubuntu, Cantarell, Helvetica, Arial, 'Helvetica Neue', sans-serif, var(--ez-font-family-emoji)",
		"--ez-font-family-monospace": " Consolas, monospace",
	
		/* Layout */
		"--ez-block-padding": " 5px 10px",
		"--ez-block-margin": " .5em 0em",
		"--ez-block-radius": " 5px"
	};

	/* SECTION Private Methods: Module Functions **********************************************************************/
	// ANCHOR processMenuAsync
	const processMenuAsync = async (msgDetails) => {

		const moduleState = Utils.getGlobalSettings();
		const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x03BDB2A5" });

		// NOTE use the '\' to escape, make literal, the special characters like the backtick (`) and exclamation (!)
		const menuItemsArray = [
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --set-lang">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x08161075" })}</a></li>`,
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --alerts">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D842F34" })}</a></li>`,
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --flip">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0382B96E" })}</a></li>`
		];

		const gmMenuItemsArray = [
			"</ul>",
			"<h4>GM Only Options</h4>",
			"<ul>",
			`<li data-category="caution"><a role="button" href="\`!${moduleSettings.chatApiName} --purge-state all">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0DD74385" })}</a></li>`,
			`<li data-category="caution"><a role="button" href="\`!${moduleSettings.chatApiName} --purge-state ${moduleState.sharedVaultName}">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0009ADA5" })}</a></li>`,
		];

		// Conditionally combine arrays if isGm is true
		const combinedMenuItemsArray = msgDetails.isGm
			? [...menuItemsArray, ...gmMenuItemsArray]
			: menuItemsArray;

		// Join them with a newline
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
				cssVars: paletteColors,
			});

			const whisperArguments = {
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: styledMessage
			};
			Utils.whisperPlayerMessage(whisperArguments);

			return 0;
		} catch (err) {
			throw new Error(`${err}`);
		}
	};

	// ANCHOR processSetLanguageAsync
	const processSetLanguageAsync = async (msgDetails, parsedArgs) => {

		const _isEmptyObject = (obj) => {
			return JSON.stringify(obj) === "{}";
		};

		if (_isEmptyObject(parsedArgs)) {

			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x03BDB2A5" });
			const availableLanguagesArray = PhraseFactory.getLanguages();

			const menuItemsArray = availableLanguagesArray.map(aLang => {
				return `<li><a role="button" href="\`!${moduleSettings.chatApiName} --set-lang ${aLang}">${aLang}</a></li>`;
			});

			// Join them with a newline
			const menuItemsHTML = menuItemsArray
				.join("\n");

			const footer = "";

			const menuContent = {
				title,
				menuItems: menuItemsHTML,
				footer,
			};

			try {
				const styledMessage = await Utils.renderTemplateAsync({
					template: "chatMenu",
					expressions: menuContent,
					theme: "chatMenu",
					cssVars: paletteColors,
				});

				const whisperArguments = {
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					message: styledMessage
				};
				Utils.whisperPlayerMessage(whisperArguments);

				return 0;
			} catch (err) {
				throw new Error(`${err}`);
			}
		}
		else {

			const selectedLang = Object.keys(parsedArgs)[0];
			PhraseFactory.setLanguage({ playerId: msgDetails.callerId, language: selectedLang });

			// whisperAlertMessageAsync({ from, to, severity = 4, apiCallContent, remark })
			const whisperArguments = {
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: 6, // INFORMATION
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x062D88F0", expressions: { remark: selectedLang } })}`
			};

			Utils.whisperAlertMessageAsync(whisperArguments);
		}
	};

	// ANCHOR processPurgeState
	const processPurgeState = (msgDetails, parsedArgs) => {

		if (parsedArgs.all) {

			state = {};

			const whisperArguments = {
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: 4, // WARNING
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x084D29DE", expressions: { remark: "" }})}`
			};
	
			Utils.whisperAlertMessageAsync(whisperArguments);

		} else {

			Object.keys(parsedArgs).forEach((name) => {
				if (parsedArgs[name] === true && name !== "all") {
					state[name] = {};

					const whisperArguments = {
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: 4, // WARNING
						apiCallContent: msgDetails.raw.content,
						remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x084D29DE", expressions: { remark: `.${name}` }})}`
					};
			
					Utils.whisperAlertMessageAsync(whisperArguments);
				}
			});
		}
	};

	// ANCHOR processExampleAlerts
	const processExampleAlerts = (msgDetails) => {

		let whisperArguments = {};

		// whisperAlertMessageAsync({ from, to, severity = 4, apiCallContent, remark })
		whisperArguments = {
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			toId: msgDetails.callerId,
			severity: "ERROR", // ERROR
			apiCallContent: msgDetails.raw.content,
			remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x07845DCE" })}`
		};

		Utils.whisperAlertMessageAsync(whisperArguments);

		// whisperAlertMessageAsync({ from, to, severity = 4, apiCallContent, remark })
		whisperArguments = {
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			toId: msgDetails.callerId,
			severity: "WARN", // WARNING
			apiCallContent: msgDetails.raw.content,
			remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x06F2AA1E" })}`
		};

		Utils.whisperAlertMessageAsync(whisperArguments);

		// whisperAlertMessageAsync({ from, to, severity = 4, apiCallContent, remark })
		whisperArguments = {
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			toId: msgDetails.callerId,
			severity: "INFO", // INFORMATION
			apiCallContent: msgDetails.raw.content,
			remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0512C293" })}`
		};

		Utils.whisperAlertMessageAsync(whisperArguments);

		// whisperAlertMessageAsync({ from, to, severity = 4, apiCallContent, remark })
		whisperArguments = {
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			toId: msgDetails.callerId,
			severity: "DEBUG", // TIP
			apiCallContent: msgDetails.raw.content,
			remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x061115DE" })}`
		};

		Utils.whisperAlertMessageAsync(whisperArguments);
	};

	// ANCHOR flipSelectedTokens
	const flipSelectedTokens = async (msgDetails) => {
		// Check if there are selected IDs
		const { selectedIds } = msgDetails;
		let doContinue = false;

		if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
			
			const whisperArguments = {
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR", // ERROR
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D9A441E" })}`
			};
	
			Utils.whisperAlertMessageAsync(whisperArguments);

			return;
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
					severity: 3, // ERROR
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "40400", expressions: { remark: id }})}`
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

			doContinue = true;
		}

		if (doContinue) {
			const whisperArguments = {
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: 6, // INFORMATION
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C2A2E7E" })}`
			};
	
			Utils.whisperAlertMessageAsync(whisperArguments);
		}
	};



	// !SECTION END of Module Functions

	// SECTION Event Handlers *****************************************************************************************/

	// ANCHOR actionMap
	const actionMap = {
		// 	whisperAlertMessageAsync({ from, to, severity = 6, apiCallContent, remark })
		"--menu": (msgDetails) => { return processMenuAsync(msgDetails); },
		"--set-lang": (msgDetails, parsedArgs) => { return processSetLanguageAsync(msgDetails, parsedArgs); },
		"--alerts": (msgDetails) => { return processExampleAlerts(msgDetails); },
		"--flip": (msgDetails) => { return flipSelectedTokens(msgDetails); },
		"--purge-state": (msgDetails, parsedArgs) => { return processPurgeState(msgDetails, parsedArgs); },
		"--echo-inline-roll": (msgDetails) => { Utils.whisperPlayerMessage({ from: moduleSettings.readableName, to: msgDetails.callerName, message: JSON.stringify(msgDetails.raw) }); },
	};

	const handleChatMessages = (apiCall) => {

		/* NOTE: If the message originates from a player, `thisPlayerId` will store the corresponding player object. 
		This can be used for actions like retrieving the player's name or sending them a whisper. 
		If the message does not come from a player (e.g., it comes from an API script), `thisPlayerId` will be set to `null`. 
		If a function needs the playerId it should check for its existence or provide a default.
		*/
		const thisPlayerObj = apiCall.playerid ? getObj("player", apiCall.playerid) : null;
		const thisPlayerName = thisPlayerObj ? thisPlayerObj.get("_displayname") : "Unknown Player";
		const thisPlayerIsGm = thisPlayerObj && playerIsGM(apiCall.playerid) ? true : false;

		const msgDetails = {
			raw: apiCall,
			commandMap: Utils.parseChatCommands({
				apiCallContent: apiCall.content,
			}),
			isGm: thisPlayerIsGm,
			callerId: thisPlayerObj.get("_id"),
			callerName: thisPlayerName.replace(/\(GM\)/g, "").trim(),
		};

		// Check if --ids is provided
		if (!msgDetails.commandMap.has("--ids")) {
			if (!apiCall.selected || apiCall.selected.length === 0) {
				// No --ids and no tokens selected error

				// In functions be sure to check if the --ids is empty.
				msgDetails.selectedIds = [];

			} else {

				// --ids not provided. Use selected token IDs
				const selectedIds = apiCall.selected.map(aSelection => { return aSelection._id; });
				msgDetails.selectedIds = selectedIds;
			}

		} else {

			// --ids was provided use those for the selected tokens, and remove the command from further parsing.
			msgDetails.selectedIds = msgDetails.commandMap.get("--ids");
			msgDetails.commandMap.delete("--ids");
		}

		// Check if command exists in the methodMap and execute the corresponding action
		// Separate valid and invalid commands
		const validCommands = [];
		const invalidCommands = [];

		// Categorize commands as valid or invalid
		msgDetails.commandMap.forEach((args, aCommandName) => {
			if (actionMap.hasOwnProperty(aCommandName)) {
				validCommands.push({ aCommandName, args });
			} else {
				invalidCommands.push(aCommandName);
			}
		});

		// Check if both arrays are empty and default to calling the menu action
		if (validCommands.length === 0 && invalidCommands.length === 0) {

			// Default to menu if no command is provided
			actionMap["--menu"](msgDetails, {});
		} else {
			// Execute valid commands
			validCommands.forEach(({ aCommandName, args }) => {
				const parsedArgs = Utils.parseChatSubcommands({ subcommands: args });
				actionMap[aCommandName](msgDetails, parsedArgs);
			});

			// Handle invalid commands
			if (invalidCommands.length > 0) {
				let whisperArguments = {};

				// whisperAlertMessageAsync({ from, to, severity = 4, apiCallContent, remark })
				whisperArguments = {
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 3, // ERROR
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ transUnitId: "0x03B6FF6E" })}`
				};

				Utils.whisperAlertMessageAsync(whisperArguments);
			}
		}
	};
	// !SECTION END of Event Handlers *********************************************************************************/

	/* SECTION INITIALIZATION *****************************************************************************************/

	// ANCHOR Function: registerEventHandlers
	const registerEventHandlers = () => {
		on("chat:message", (apiCall) => {
			if (apiCall.type === "api" && apiCall.content.startsWith(`!${moduleSettings.chatApiName}`)) {
				handleChatMessages(apiCall);
			}
		});

		return 0;
	};

	// ANCHOR Function: checkInstall
	const checkInstall = () => {

		if (typeof EASY_UTILS !== "undefined") {

			// TODO Limit the functions fetched down to the ones this module uses for memory efficiency.
			const requiredFunctions = [
				"applyCssToHtmlJson",
				"convertCssToJson",
				"convertHtmlToJson",
				"convertMarkdownToHtml",
				"convertJsonToHtml",
				"convertToSingleLine",
				"createPhraseFactory",
				"createTemplateFactory",
				"createThemeFactory",
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
						"0x08433FB0": `${moduleSettings.readableName} .=> Active <=.`,
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
						"0x03B6FF6E": "Invalid Arguments: There is one or more commands unrecognized. Check the commands spelling and usage."
					},
					frFR: {
						"0x08433FB0": `${moduleSettings.readableName} .=> Prêt <=.`,
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
						"0x03B6FF6E": "Arguments invalides : une ou plusieurs commandes ne sont pas reconnues. Vérifiez l'orthographe et l'utilisation des commandes."
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

				const whisperArguments = {
					from: moduleSettings.readableName,
					to: "gm",
					message: PhraseFactory.get({ transUnitId: "20000" })
				};
				Utils.whisperPlayerMessage(whisperArguments);

			}
		}
	});

	/* !SECTION END of INITIALIZATION *********************************************************************************/

	/* SECTION: PUBLIC INTERFACE **************************************************************************************/

	return {};

	/* !SECTION End of PUBLIC INTERFACE *******************************************************************************/

})();

/* !SECTION End of EASY_MENU *****************************************************************************************/