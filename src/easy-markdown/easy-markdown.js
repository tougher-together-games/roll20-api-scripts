/*!
@language: en-US
@title: easy-markdown.js
@description: 
@version: 1.0.0
@author: Mhykiel
@license: MIT
@repository: {@link https://github.com/Tougher-Together-Gaming/roll20-api-scripts/blob/main/src/easy-utils/easy-utils-menu.js|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_MARKDOWN = (() => {

	/*******************************************************************************************************************
	 * SECTION: MODULE CONFIGURATION
	 *
	 * Here we define configuration and state related to EASY_MARKDOWN itself. The `moduleSettings` object is passed 
	 * to utility functions so they can behave according to the EASY_MARKDOWN module's preferences (e.g., verbose logging).
	 ******************************************************************************************************************/

	// TODO Fill out module meta data
	const moduleSettings = {
		readableName: "Easy-Markdown",
		chatApiName: "ezmarkdown",
		globalName: "EASY_MARKDOWN",
		version: "1.0.0",
		author: "Mhykiel",
		verbose: true,
		sendWelcomeMsg: true,
	};

	let Utils = {};
	let PhraseFactory = {};
	let TemplateFactory = {};
	let ThemeFactory = {};

	// TODO Add universal style colors
	// NOTE: It's recommended to use a consistent naming convention for color variables in your CSS.
	// This ensures a cohesive and consistent color scheme across all components, such as chat menus and modals. 
	// Define your styles here in the `paletteColors` object and pass it into all theme-related requests.

	const paletteColors = {
		"--ez-primary-color": "#8655B6", // Primary theme color
		"--ez-secondary-color": "#17AEE8", // Secondary theme color
		"--ez-tertiary-color": "#34627B", // Tertiary theme color for accents
		"--ez-accent-color": "#CC6699", // Accent color for highlights
		"--ez-complement-color": "#FCEC52", // Complementary color for contrast
		"--ez-contrast-color": "#C3B9C8", // Color for subtle contrasts
		"--ez-primary-background-color": "#252B2C", // Primary background color
		"--ez-secondary-background-color": "#3F3F3F", // Secondary background color
		"--ez-subdued-background-color": "#f2f2f2", // Subdued or neutral background color
		"--ez-text-color": "#000000", // Default text color
		"--ez-overlay-text-color": "#ffffff", // Overlay text color (e.g., on dark backgrounds)
		"--ez-border-color": "#000000", // Default border color
		"--ez-shadow-color": "#4d4d4d", // Default shadow color
	};

	// !SECTION END of MODULE CONFIGURATION

	/*******************************************************************************************************************
	 * SECTION: MODULE FUNCTIONS
	 * ****************************************************************************************************************/

	// ANCHOR processMenuAsync
	const processMenuAsync = async (msgDetails) => {

		if (msgDetails.isGm) {


			//const moduleState = Utils.getGlobalSettings();
			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0FF56D55" });

			// NOTE use the '\' to escape, make literal, the special characters like the backtick (`) and exclamation (!)
			const menuItemsArray = [
				`<li><a href="\`!${moduleSettings.chatApiName} --styles">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D813F3C" })}</a></li>`,
				`<li><a href="\`!${moduleSettings.chatApiName} --handouts">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x005A0033" })}</a></li>`
			];

			// Join them with a newline
			const menuItemsHTML = menuItemsArray.join("\n");

			const menuContent = {
				title,
				menuItems: menuItemsHTML,
				footer: "",
			};

			try {
				const styledMessage = await Utils.renderTemplateAsync({
					template: "ezMarkdownMenu",
					expressions: menuContent,
					theme: "ezMarkdownMenu",
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

			// Only for GM Use
			const whisperArguments = {
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: 3, // ERROR
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ transUnitId: "0x031B122E" })}`
			};

			Utils.whisperAlertMessageAsync(whisperArguments);

			return;
		}
	};

	const processStylesAsync = async (msgDetails) => {
		const handouts = findObjs({ type: "handout" });
		const styleSheets = handouts.filter((handout) => { return handout.get("name").startsWith("StyleSheet"); });
		const handoutsLoaded = [];

		if (styleSheets.length === 0) {
			const whisperArguments = {
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: 3, // ERROR
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ transUnitId: "0x0027BD4E" })}`
			};

			await Utils.whisperAlertMessageAsync(whisperArguments);

			return;
		}

		await Promise.all(
			styleSheets.map((handout) => {
				return new Promise((resolve) => {
					handout.get("gmnotes", (gmNotes) => {
						const handoutName = handout.get("name");
						const handoutId = handout.get("_id");
						const decodedNotes = Utils.decodeNoteContent({ text: gmNotes });

						if (!decodedNotes.trim()) {
							const msgId = "40000";
							Utils.logSyslogMessage({
								severity: 6,
								tag: "registerEventHandlers",
								transUnitId: msgId,
								message: PhraseFactory.get({
									transUnitId: msgId,
									expressions: { remarks: `Invalid content for ${handoutName}` },
								}),
							});
							resolve();

							return;
						}

						ThemeFactory.add({
							newThemes: {
								[handoutId]: decodedNotes,
							},
						});

						handoutsLoaded.push(handoutName);
						resolve();
					});
				});
			}
			)
		);

		const whisperArguments = {
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			toId: msgDetails.callerId,
			severity: 6, // INFORMATION
			apiCallContent: msgDetails.raw.content,
			remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x089BBAAA" })} ${handoutsLoaded}`,
		};

		await Utils.whisperAlertMessageAsync(whisperArguments);
	};

	/**
 * Parses CSS variables from a :root block and returns an object mapping variable names to their values.
 *
 * @param {string} rootContent - The content inside the :root { } block.
 * @param {string} handoutName - The name of the handout (used for logging purposes).
 * @returns {Object} An object containing CSS variables as key-value pairs.
 */
	const parseCssVariables = (rootContent, handoutName) => {
		const cssVars = {};
    
		// Split the root content by semicolons to handle each declaration separately
		const declarations = rootContent.split(";");
    
		declarations.forEach(declaration => {
			const trimmedDeclaration = declaration.trim();
        
			// Skip empty lines or lines that are comments
			if (!trimmedDeclaration || trimmedDeclaration.startsWith("/*")) {
				return;
			}
        
			// Find the first colon to separate the property name and value
			const colonIndex = trimmedDeclaration.indexOf(":");
			if (colonIndex === -1) {
				log(`Invalid CSS declaration in :root for "${handoutName}": "${trimmedDeclaration}"`);

				return;
			}
        
			// Extract key and value
			let key = trimmedDeclaration.substring(0, colonIndex).trim();
			const value = trimmedDeclaration.substring(colonIndex + 1).trim();
        
			// Ensure the key starts with '--'
			if (!key.startsWith("--")) {
				key = `--${key}`;
			}
        
			// Assign the key-value pair to the cssVars object
			cssVars[key] = value;
		});
    
		return cssVars;
	};

	const processHandoutsAsync = async (msgDetails) => {
		try {
			const handouts = findObjs({ type: "handout" });
			const handoutsConverted = [];
	
			for (const handout of handouts) {
				await new Promise((resolve) => {
					handout.get("gmnotes", (gmNotes) => {
						try {
							const handoutName = handout.get("name").trim();
							const handoutId = handout.get("_id");
							
							if (!handoutName) {
								resolve();

								return;
							}
	
							// Skip theme handouts (assuming theme names start with "StyleSheet:")
							if (handoutName.startsWith("StyleSheet:")) {
								resolve();

								return;
							}
	
							const avatarUrlRaw = JSON.stringify(handout.get("avatar"));
							const decodedNotes = Utils.decodeNoteContent({ text: gmNotes });
	
							// Check if the handout contains an @import tag within a <style> block
							const styleMatch = decodedNotes.match(/<style([\s\S]*?)<\/style>/i);
							if (!styleMatch) {
								resolve();

								return;
							}
	
							const styleContent = styleMatch[1].trim();
	
							// Check for @import tag within the <style> block
							const importMatch = styleContent.match(/@import\s+url\(["'](.+?)["']\);/i);
							if (!importMatch || !importMatch[1]) {
								resolve();

								return;
							}
	
							const themeName = importMatch[1].trim();
	
							// Transform the avatar URL
							let avatarUrl = "";
							if (avatarUrlRaw) {
								avatarUrl = avatarUrlRaw
									.replace(/^"|"$/g, "") // Remove surrounding quotes
									.replace(/\/med\.jpg(\?.*)?$/, "/original.jpg"); // Replace '/med.jpg' and remove query string if present
							} else {
							}
	
							// Clean the notes by removing the <style> block and replacing the avatar URL placeholder
							const cleanedNotes = decodedNotes
								.replace(/<style[\s\S]*?<\/style>/i, "")
								.replace(/{{\s*AvatarUrl\s*}}/, avatarUrl)
								.trim();
	
							// Find the theme handout by name
							const themeHandout = findObjs({
								type: "handout",
								name: `StyleSheet: ${themeName}`,
							})[0];
	
							if (!themeHandout) {
								const msgId = "50000";
								Utils.logSyslogMessage({
									severity: 6,
									tag: "processHandoutsAsync",
									transUnitId: msgId,
									message: `Not Found: No theme handout: "${themeName}" for "${handoutName}" to use.`,
								});
								resolve();

								return;
							}
	
							const themeId = themeHandout.get("_id");
	
							// Extract CSS variables from the :root block using the helper function
							const rootMatch = styleContent.match(/:root\s*{([\s\S]*?)}/i);
							if (!rootMatch) {
								log(`No :root block found in <style> for handout: "${handoutName}"`);
							} else {
								log(`:root content for "${handoutName}":\n${rootMatch[1]}`);
							}
	
							const cssVars = rootMatch
								? parseCssVariables(rootMatch[1], handoutName) // Use the helper function here
								: {};
	
							// Convert Markdown to HTML
							const htmlConversion = Utils.convertMarkdownToHtml({ content: cleanedNotes });
	
							// Add the converted template
							TemplateFactory.add({
								newTemplates: {
									[handoutName]: htmlConversion,
								},
							});
	
							// Render the template with the extracted CSS variables
							Utils.renderTemplateAsync({
								template: handoutName,
								expressions: {},
								theme: themeId,
								cssVars,
							})
								.then((styledContent) => {
									//log(`Styled content for "${handoutName}":\n${styledContent}`);
	
									// Update the handout's notes with the styled content
									handout.set("notes", styledContent);
									handoutsConverted.push(handoutName);
									resolve();
								})
								.catch((err) => {
									const msgId = "50000";
									Utils.logSyslogMessage({
										severity: 6,
										tag: "processHandoutsAsync",
										transUnitId: msgId,
										message: PhraseFactory.get({
											transUnitId: msgId,
											expressions: { remark: err },
										}),
									});
									resolve();
								});
						} catch (err) {
							const msgId = "50000";
							Utils.logSyslogMessage({
								severity: 6,
								tag: "processHandoutsAsync",
								transUnitId: msgId,
								message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } }),
							});
							resolve();
						}
					});
				}
				);}
	
			// Handle final alert message logic...
			if (handoutsConverted.length === 0) {
				const whisperArguments = {
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 4, // WARNING
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0FD080D4" })}`
				};
	
				await Utils.whisperAlertMessageAsync(whisperArguments);
			} else {
				const whisperArguments = {
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 6, // INFORMATION
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0DFBD0E4" })} ${handoutsConverted}`,
				};
	
				await Utils.whisperAlertMessageAsync(whisperArguments);
			}
		} catch (err) {
			const msgId = "50000";
			Utils.logSyslogMessage({
				severity: 6,
				tag: "processHandoutsAsync",
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } }),
			});
		}
	};

	// !SECTION END of Module Functions

	/*******************************************************************************************************************
	 * SECTION: EVENT HANDLERS
	 * ****************************************************************************************************************/

	// ANCHOR actionMap
	const actionMap = {
		// 	whisperAlertMessageAsync({ from, to, severity = 6, apiCallContent, remark })
		"--menu": (msgDetails) => { return processMenuAsync(msgDetails); },
		"--styles": (msgDetails) => { return processStylesAsync(msgDetails); },
		"--handouts": (msgDetails) => { return processHandoutsAsync(msgDetails); },
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
	// !SECTION END of Event Handlers

	/*******************************************************************************************************************
	 * SECTION: INITIALIZATION
	 ******************************************************************************************************************/

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
				"convertJsonToHtml",
				"convertToSingleLine",
				"convertMarkdownToHtml",
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
				"renderTemplateAsync",
				"replacePlaceholders",
				"whisperAlertMessageAsync",
				"whisperPlayerMessage"
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

			// Log the module is initializing.
			const msgId = "10000";
			Utils.logSyslogMessage({
				severity: 6,
				tag: "checkInstall",
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId })
			});

			// Continue with other Set Up Tasks.

			// TODO Add custom localization
			PhraseFactory.add({
				newMap: {
					enUS: {
						"0x0FF56D55": "Easy-Markdown",
						"0x0D813F3C": "Load Style Sheets",
						"0x005A0033": "Render Markdown Handouts",
						"0x0027BD4E": "No StyleSheet handouts found. Ensure the handout name is prefixed with 'StyleSheet:'.",
						"0x089BBAAA": "The following styles were saved:",
						"0x0DFBD0E4": "The following handouts were converted:",
						"0x031B122E": "You have to be GM to use handout styling commands.",
						"0x0FD080D4": "no handouts were rendered",
					},
					frFR: {
						"0x0FF56D55": "Easy-Markdown",
						"0x0D813F3C": "Charger les feuilles de style",
						"0x005A0033": "Rendre les handouts en Markdown",
						"0x0027BD4E": "Aucune feuille de style trouvée. Assurez-vous que le nom du handout commence par 'StyleSheet:'.",
						"0x089BBAAA": "Les styles suivants ont été enregistrés :",
						"0x0DFBD0E4": "Les handouts suivants ont été convertis :",
						"0x031B122E": "Vous devez être GM pour utiliser les commandes de style des handouts.",
						"0x0FD080D4": "aucun handout n'a été rendu"
					}
				}
			});

			// TODO Add Templates
			const menuHtml = `
<div class="menu-box">
	<h3>{{ title }}</h3>
	<ul>
		<!-- <li><a href="!api --menu">Option 1</a></li> -->
		{{ menuItems }}
	</ul>
	<p class="menu-footer">{{ footer }}</p>
</div>
			`;

			TemplateFactory.add({
				newTemplates: {
					"ezMarkdownMenu": `${menuHtml}`
				}
			});

			// TODO Add Themes
			const menuCss = `
:root {
  /* Palette Colors */
  --ez-primary-color: #8655B6; 
  --ez-secondary-color: #17AEE8; 
  --ez-primary-background-color: #252B2C; 
  --ez-subdued-background-color: #F2F2F2; 
  --ez-overlay-text-color: #ffffff; 
  --ez-border-color: #000000; 
}

/* Chat Menu CSS Rules */
.menu-box {
  font-size: 1em;
  background-color: var(--ez-primary-background-color);
  border: 2px solid var(--ez-border-color);
  border-radius: 8px;
  padding: 10px;
  max-width: 100%;
  font-family: Arial, sans-serif;
  color: var(--ez-overlay-text-color);
  margin: 5px;
}

h3 {
  margin: 0;
  font-size: 1.2em;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
  color: var(--ez-overlay-text-color);
  background-color: var(--ez-primary-color);
  border: 2px solid var(--ez-border-color);
  border-radius: 5px;
  padding: 5px;
}

ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

li {
  margin: 5px 0;
  width: 90%;
  background-color: var(--ez-secondary-color);
  border: 2px solid var(--ez-border-color);
  color: var(--ez-overlay-text-color);
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  box-sizing: border-box;
}

li[role='deletion'] {
  background-color: red;
}

#token {
  background-color: green;
}

/* Strip styles from Anchor tags (<a>) */
li>a {
    text-decoration: none;
    color: white;
    font-weight: bold;
    font-size: inherit;
    font-family: inherit;
    cursor: pointer;
}

.menu-footer {
  color: var(--ez-subdued-background-color);
}

.inline-rolls {
color: black;
}
`;
			ThemeFactory.add({
				newThemes: {
					"ezMarkdownMenu": `${menuCss}`
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

	// !SECTION END of INITIALIZATION

	/*******************************************************************************************************************
	 * SECTION: ROLL20 STARTUP HOOK
	 ******************************************************************************************************************/

	on("ready", () => {
		const continueMod = checkInstall();
		if (continueMod === 0) {
			registerEventHandlers();

			// Log the Module is now ready for use.
			const msgId = "20000";
			Utils.logSyslogMessage({
				severity: 6,
				tag: "registerEventHandlers",
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

	// !SECTION END of ROLL20 STARTUP HOOK

	/*******************************************************************************************************************
	 * SECTION: PUBLIC INTERFACE
	 ******************************************************************************************************************/

	return {};
	// !SECTION END of PUBLIC INTERFACE

})();