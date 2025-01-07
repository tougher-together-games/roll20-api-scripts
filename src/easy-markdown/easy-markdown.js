/*!
@language: en-US
@title: easy-markdown.js
@description: The EASY_MARKDOWN module integrates with EASY_UTILS to provide a menu-driven interface and 
	control commands in the Roll20 environment. It uses factories (Phrase, Template, Theme) from the forge,
	parses user chat commands, and renders styled alerts to players via whisper messages.
@version: 1.0.0
@author: Mhykiel
@license: MIT
@repository: {@link https://github.com/tougher-together-games/roll20-api-scripts/blob/main/src/easy-utils/easy-utils-menu.js|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_MARKDOWN = (() => {

	// SECTION Object: EASY_MARKDOWN
	/**
	 * @namespace EASY_MARKDOWN
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

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Markdown",
		chatApiName: "ezmarkdown",
		globalName: "EASY_MARKDOWN",
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
	let TemplateFactory = {};
	let ThemeFactory = {};

	// SECTION Inner Methods

	// ANCHOR Function: processMenuAsync
	const processMenuAsync = async (msgDetails) => {

		const thisFuncDebugName = "processMenuAsync";
		const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0FF56D55" });

		if (!msgDetails.isGm) {

			if (moduleSettings.verbose) {
				// Only for GM Use
				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR", // ERROR
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ transUnitId: "0x031B122E" })}`
				});
			}

			return 0;
		}

		const menuItemsArray = [
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --styles">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D813F3C" })}</a></li>`,
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --handouts">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x005A0033" })}</a></li>`
		];

		const menuItemsHTML = menuItemsArray.join("\n");

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

	// ANCHOR Function: processStylesAsync
	const processStylesAsync = async (msgDetails) => {

		const thisFuncDebugName = "processStylesAsync";

		if (!msgDetails.isGm) {

			// Only for GM Use
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR", // ERROR
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ transUnitId: "0x031B122E" })}`
			});

			return 0;
		}

		try {
			const handouts = findObjs({ type: "handout" });
			const styleSheets = handouts.filter((handout) => { return handout.get("name").startsWith("StyleSheet"); });
			const handoutsLoaded = [];

			if (styleSheets.length === 0) {

				// "0x0027BD4E": "No StyleSheet handouts found. Ensure the handout name is prefixed with 'StyleSheet:'.",
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ transUnitId: "0x0027BD4E" })}`
				});

				return 0;
			}

			await Promise.all(
				styleSheets.map((handout) => {
					return new Promise((resolve) => {
						handout.get("gmnotes", (gmNotes) => {
							const handoutName = handout.get("name");
							const handoutId = handout.get("_id");
							const decodedNotes = Utils.decodeNoteContent({ text: gmNotes });

							if (!decodedNotes.trim()) {

								// "40000": "Invalid Arguments: {{ remark }}",
								const msgId = "40000";
								Utils.logSyslogMessage({
									severity: "WARN",
									tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
									transUnitId: msgId,
									message: PhraseFactory.get({
										transUnitId: msgId,
										expressions: { remarks: `Invalid content for ${handoutName}` },
									}),
								});

								resolve();

								return 0;
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

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x089BBAAA" })} ${handoutsLoaded}`,
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

	// ANCHOR Function: processHandoutsAsync
	const processHandoutsAsync = async (msgDetails) => {

		const thisFuncDebugName = "processHandoutsAsync";

		if (!msgDetails.isGm) {

			if (moduleSettings.verbose) {
				// Only for GM Use
				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR", // ERROR
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ transUnitId: "0x031B122E" })}`
				});
			}

			return 0;
		}

		// Subroutine: parseCssOverrides
		const parseCssOverrides = (rootContent) => {
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
					//log(`Invalid CSS declaration in :root for "${handoutName}": "${trimmedDeclaration}"`);

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

		// Subroutine: extractRollTableBlocks
		const extractRollTableBlocks = (markdown) => {
			// Regex Explanation:
			// /:::[^\n]*?(rolltable-(\S+))([\s\S]*?):::/gm
			// - Matches `:::` followed by optional text,
			// - then a group capturing "rolltable-xxx" plus an inner group for the ID,
			// - then lazily captures everything until the closing triple colons.
			const blockRegex = /:::[^\n]*?(rolltable-(\S+))([\s\S]*?):::/gm;
			const blocks = [];

			let match;
			while ((match = blockRegex.exec(markdown)) !== null) {
				const entireMatch = match[0];    // The whole ::: ... ::: text
				const fullClass = match[1];      // e.g. "rolltable-tableID"
				const tableId = match[2];        // e.g. "tableID"
				const blockContent = match[3];   // The text between ::: lines

				blocks.push({ tableId, blockContent: blockContent.trim(), entireMatch });
			}

			return blocks;
		};

		// Subroutine: parseSecondColumnOfTable
		const parseSecondColumnOfTable = (blockContent) => {
			// Regex Explanation:
			// ^\|\s*(\d+)\s*\|\s*([^|]+)\|.*$
			// - ^\| at start of line, matches a leading pipe (|)
			// - \s*(\d+)\s* captures one or more digits in the first column
			// - \|\s* then a pipe and optional spaces
			// - ([^|]+) captures everything in the second column up to the next pipe
			// - \|.*$ matches the remaining pipe and any text that might follow in other columns
			const rowRegex = /^\|\s*(\d+)\s*\|\s*([^|]+)\|.*$/gm;

			const results = [];
			let match;

			while ((match = rowRegex.exec(blockContent)) !== null) {
				// match[1] = the number in the first column (roll)
				// match[2] = the descriptive result in the second column

				// Github:   https://github.com/shdwjk/Roll20API/blob/master/Base64/Base64.js
				// By:       The Aaron, Arcane Scriptomancer
				// Contact:  https://app.roll20.net/users/104025/the-aaron
				// modified from:  http://www.webtoolkit.info/



				// Example usage:
				//const originalString = "This is a test string.";
				//const base64Encoded = encodeBase64(originalString);
				//log(`Encoded: ${base64Encoded}`);

				const col2 = Utils.encodeBase64({ text: match[2].trim() });
				//.replace(/ /g, "%%%SPACE%%%")  // Replace spaces
				//.replace(/#/g, "%%%HASHTAG%%%")  // Replace #
				//.replace(/\|/g, "%%%PIPE%%%");  // Replace |

				log(`Found matching row ${col2}`);
				results.push(col2);
			}

			log("results: " + results);
			
			return results;
		};

		// Subroutine: replaceRollTablesInMarkdown
		const replaceRollTablesInMarkdown = (markdown) => {
			// 1) Extract all rolltable blocks
			const blocks = extractRollTableBlocks(markdown);

			// 2) Parse each block’s second column, and build a comma-separated string
			const tableResultsMap = {};  // { [tableId]: "Value1, Value2, Value3..." }
			for (const { tableId, blockContent } of blocks) {
				const col2Array = parseSecondColumnOfTable(blockContent);
				// Build a single comma-separated string from col2
				const csvResults = col2Array.join(" ");
				tableResultsMap[tableId] = csvResults;
			}

			// 3) For each recognized tableId, replace the matching placeholder
			//    href="{{ %roll-table-<tableId>% }}" with
			//    href="&#96;!ezmarkdown --rolltable ..."
			let updatedMarkdown = markdown;

			for (const tableId of Object.keys(tableResultsMap)) {
				// The placeholder to look for: {{ %roll-table-tableId% }}
				// We'll build a regex that matches href="{{ %roll-table-tableId% }}"
				const placeholderRegex = new RegExp(`href="\\{\\{\\s*%rolltable-${tableId}%\\s*\\}\\}"`, "g");

				// Build the replacement
				const csv = tableResultsMap[tableId];
				const replacement = `href="&#96;!ezmarkdown --rolltable ${csv}"`;

				updatedMarkdown = updatedMarkdown.replace(placeholderRegex, replacement);
			}

			return updatedMarkdown;
		};

		try {
			const handouts = findObjs({ type: "handout" });
			const handoutsConverted = [];

			// Iterate over all handouts in a serial (await) fashion
			for (const handout of handouts) {
				let styledContent = "";
				const handoutName = handout.get("name")?.trim();
				const handoutId = handout.get("_id");

				// Skip if handout has no valid name
				if (!handoutName) {
					continue;
				}

				// Skip if this is a stylesheet handout
				if (handoutName.startsWith("StyleSheet:")) {
					continue;
				}

				// Retrieve the GM notes asynchronously
				const gmNotes = await new Promise((resolve) => {
					handout.get("gmnotes", (notes) => { return resolve(notes); });
				});

				// Decode the GM notes
				const avatarUrlRaw = JSON.stringify(handout.get("avatar"));
				const decodedNotes = Utils.decodeNoteContent({ text: gmNotes });

				// Attempt to match the <style> block
				const styleMatch = decodedNotes.match(/<style([\s\S]*?)<\/style>/i);
				if (!styleMatch) {
					// No <style> block => no @import => skip
					continue;
				}
				const styleContent = styleMatch[1].trim();

				// Attempt to match an @import line
				const importMatch = styleContent.match(/@import\s+url\(["'](.+?)["']\);/i);
				if (!importMatch || !importMatch[1]) {
					// No @import => skip
					continue;
				}

				// This is the stylesheet name we're looking for, e.g. "DarkTheme" in @import url("DarkTheme");
				const themeName = importMatch[1].trim();

				// Transform the avatar URL if present
				let avatarUrl = "";
				if (avatarUrlRaw) {
					avatarUrl = avatarUrlRaw
						.replace(/^"|"$/g, "") // Remove surrounding quotes
						.replace(/\/med\.jpg(\?.*)?$/, "/original.jpg"); // Turn /med.jpg -> /original.jpg
				}

				// Clean out the <style> block and replace any {{ AvatarUrl }} placeholders
				const cleanedNotes = decodedNotes
					.replace(/<style[\s\S]*?<\/style>/i, "")
					.replace(/{{\s*AvatarUrl\s*}}/, avatarUrl)
					.trim();

				// --- NEW STEP: Replace any roll-table placeholders ---
				const replacedNotes = replaceRollTablesInMarkdown(cleanedNotes);

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
					// Move on to the next handout
					continue;
				}

				// Grab the theme's roll20 _id
				const themeId = themeHandout.get("_id");

				// Attempt to extract any CSS variables (e.g. from :root {...})
				const rootMatch = styleContent.match(/:root\s*{([\s\S]*?)}/i);
				const cssVars = rootMatch
					? parseCssOverrides(rootMatch[1], handoutName)
					: {};

				// Convert the final (replaced) Markdown to HTML
				const htmlConversion = Utils.convertMarkdownToHtml({
					content: replacedNotes
				});

				// Register this handout's content as a template in the TemplateFactory
				TemplateFactory.add({
					newTemplates: {
						[handoutId]: htmlConversion,
					},
				});

				try {
					// Render this handout with the correct theme
					styledContent = await Utils.renderTemplateAsync({
						template: handoutId,
						expressions: {},
						theme: themeId,
						cssVars,
					});

					// Remove it from the TemplateFactory after rendering
					TemplateFactory.remove({
						template: handoutId
					});

					// Update the handout’s notes
					handout.set("notes", styledContent);


					styledContent = "";

					// Keep track of which handouts were successfully converted
					handoutsConverted.push(handoutName);
				} catch (err) {
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
				}
			}

			// Post-processing: whisper a summary to whoever initiated this
			if (handoutsConverted.length === 0) {
				const whisperArguments = {
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 4, // WARNING
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0FD080D4",
					})}`
				};
				await Utils.whisperAlertMessageAsync(whisperArguments);
			} else {
				const whisperArguments = {
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 6, // INFORMATION
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0DFBD0E4",
					})} ${handoutsConverted}`,
				};
				await Utils.whisperAlertMessageAsync(whisperArguments);
			}

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

	// Subroutine: processRollTable
	const processRollTable = async (msgDetails, parsedArgs) => {
		try {
			// Check if parsedArgs is not empty
			const keys = Object.keys(parsedArgs);
			if (keys.length === 0) {
				sendChat("System", `/w "${msgDetails.callerName}" No valid roll table entries found.`);

				return;
			}
	
			// Randomly select one of the keys
			const randomKey = keys[Math.floor(Math.random() * keys.length)];
	
			// Decode the Base64 key
			const decodedValue = Utils.decodeBase64({ text: randomKey });
	
			// Prepare the output message
			const output = `&{template:default} {{name=Roll Table Result}} {{Result=${decodedValue}}}`;
	
			// Send the formatted roll table output to Roll20 chat
			sendChat(msgDetails.callerName, output);
		} catch (err) {
			// Handle errors by logging and sending a whisper to the caller
			log(`Error in processRollTable: ${err.message}`);
			sendChat("System", `/w "${msgDetails.callerName}" Error processing roll table: ${err.message}`);
		}
	};	

	// !SECTION End of Inner Methods
	// SECTION Event Hooks: Roll20 API

	// ANCHOR Member: actionMap
	const actionMap = {
		"--menu": (msgDetails) => { return processMenuAsync(msgDetails); },
		"--styles": (msgDetails) => { return processStylesAsync(msgDetails); },
		"--handouts": (msgDetails) => { return processHandoutsAsync(msgDetails); },
		"--rolltable": (msgDetails, parsedArgs) => { return processRollTable(msgDetails, parsedArgs); },
	};

	// Set Default Action
	actionMap["--default"] = actionMap["--menu"];

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
				"convertMarkdownToHtml",
				"decodeBase64",
				"encodeBase64",
				"decodeNoteContent",
				"getGlobalSettings",
				"getSharedForge",
				"handleApiCall",
				"logSyslogMessage",
				"parseChatCommands",
				"parseChatSubcommands",
				"renderTemplateAsync",
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
	// !SECTION End of Object: EASY_MARKDOWN
})();

