/*!
@language: en-US
@title: easy-markdown.js
@description: The EASY_MARKDOWN module integrates with EASY_UTILS to provide markdown-to-HTML conversion
	for Roll20 handouts and character bios. It uses factories (Phrase, Template, Theme) from the forge,
	parses user chat commands, and renders styled content via CSS themes stored in StyleSheet handouts.
@version: 1.2.0
@author: Mhykiel
@license: MIT
@repository: {@link https://github.com/tougher-together-games/roll20-api-scripts/blob/main/src/easy-markdown/easy-markdown.js|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_MARKDOWN = (() => {

	// SECTION Object: EASY_MARKDOWN

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Markdown",
		chatApiName: "ezmarkdown",
		globalName: "EASY_MARKDOWN",
		version: "1.2.0",
		author: "Mhykiel",
		sendWelcomeMsg: true,
		verbose: false,
		debug: {}
	};

	// ANCHOR Member: Factory References
	let Utils = {};
	let PhraseFactory = {};
	let TemplateFactory = {};
	let ThemeFactory = {};

	// ANCHOR Member: State - Last Converted Items
	let lastConvertedHandouts = [];
	let lastConvertedCharacters = [];

	// SECTION Helper Functions

	// ANCHOR Helper: parseCssOverrides
	const parseCssOverrides = (rootContent) => {
		const cssVars = {};
		const declarations = rootContent.split(";");

		declarations.forEach(declaration => {
			const trimmedDeclaration = declaration.trim();
			if (!trimmedDeclaration || trimmedDeclaration.startsWith("/*")) {
				return;
			}
			const colonIndex = trimmedDeclaration.indexOf(":");
			if (colonIndex === -1) {
				return;
			}
			let key = trimmedDeclaration.substring(0, colonIndex).trim();
			const value = trimmedDeclaration.substring(colonIndex + 1).trim();
			if (!key.startsWith("--")) {
				key = `--${key}`;
			}
			cssVars[key] = value;
		});

		return cssVars;
	};

	// ANCHOR Helper: extractRollTableBlocks
	const extractRollTableBlocks = (markdown) => {
		const blockRegex = /:::[^\n]*?(rolltable-(\S+))([\s\S]*?):::/gm;
		const blocks = [];

		let match;
		while ((match = blockRegex.exec(markdown)) !== null) {
			blocks.push({
				tableId: match[2],
				blockContent: match[3].trim()
			});
		}

		return blocks;
	};

	// ANCHOR Helper: parseDiceTable
	const parseDiceTable = (blockContent) => {
		const rowRegex = /^\|\s*([^|]+)\|\s*([^|]+)\|.*$/gm;
		const alignmentRegex = /^[\-:\s]+$/;

		let diceExpression = "";
		const entries = [];
		let rowIndex = 0;
		let match;

		while ((match = rowRegex.exec(blockContent)) !== null) {
			const col1 = match[1].trim();
			const col2 = match[2].trim();

			if (alignmentRegex.test(col1) && alignmentRegex.test(col2)) {
				continue;
			}

			if (rowIndex === 0) {
				diceExpression = col1;
			} else {
				const encodedResult = Utils.encodeBase64({ text: col2 });
				entries.push(`${col1}=${encodedResult}`);
			}

			rowIndex++;
		}

		return { diceExpression, csv: entries.join(",") };
	};

	// ANCHOR Helper: replaceRollTablesInMarkdown
	const replaceRollTablesInMarkdown = (markdown) => {
		const blocks = extractRollTableBlocks(markdown);
		let updatedMarkdown = markdown;

		for (const { tableId, blockContent } of blocks) {
			const { diceExpression, csv } = parseDiceTable(blockContent);
			const replacement = `href="&#96;!ezmarkdown --rolltable &#91;&#91;${diceExpression}&#93;&#93; ${csv}"`;
			const placeholderRegex = new RegExp(`href="\\{\\{\\s*%rolltable-${tableId}%\\s*\\}\\}"`, "g");
			updatedMarkdown = updatedMarkdown.replace(placeholderRegex, replacement);
		}

		return updatedMarkdown;
	};

	// ANCHOR Helper: getCharacterAttribute
	const getCharacterAttribute = (characterId, attrName) => {
		const namesToTry = [
			attrName,
			attrName.toLowerCase(),
			attrName.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, ""),
			attrName.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()
		];

		if (attrName.startsWith("Bio")) {
			const withoutBio = attrName.substring(3);
			namesToTry.push(withoutBio.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase());
		}

		for (const name of namesToTry) {
			const attr = findObjs({ type: "attribute", characterid: characterId, name })[0];
			if (attr) return attr.get("current") || "";
		}

		return "";
	};

	// ANCHOR Helper: replaceAllPlaceholders
	const replaceAllPlaceholders = (markdown, characterId, characterName, avatarUrl) => {
		const placeholderRegex = /\{\{\s*([^}]+)\s*\}\}/g;

		return markdown.replace(placeholderRegex, (match, placeholderName) => {
			const trimmedName = placeholderName.trim();

			switch (trimmedName) {
				case "CharacterName": return characterName;
				case "CharacterId": return characterId;
				case "AvatarUrl": return avatarUrl;
				default: return getCharacterAttribute(characterId, trimmedName);
			}
		});
	};

	// ANCHOR Helper: transformAvatarUrl
	const transformAvatarUrl = (avatarUrlRaw) => {
		if (!avatarUrlRaw) return "";

		return avatarUrlRaw
			.replace(/^"|"$/g, "")
			.replace(/\/med\.png(\?.*)?$/, "/original.png")
			.replace(/\/med\.jpg(\?.*)?$/, "/original.jpg")
			.replace(/\/thumb\.png(\?.*)?$/, "/original.png")
			.replace(/\/thumb\.jpg(\?.*)?$/, "/original.jpg");
	};

	// ANCHOR Helper: parseStyleBlock
	const parseStyleBlock = (decodedNotes) => {
		const styleMatch = decodedNotes.match(/<style([\s\S]*?)<\/style>/i);
		if (!styleMatch) return null;

		const styleContent = styleMatch[1].trim();
		const importMatch = styleContent.match(/@import\s+url\(["'](.+?)["']\);/i);
		if (!importMatch || !importMatch[1]) return null;

		const rootMatch = styleContent.match(/:root\s*{([\s\S]*?)}/i);
		const cssVars = rootMatch ? parseCssOverrides(rootMatch[1]) : {};

		return {
			themeName: importMatch[1].trim(),
			cssVars
		};
	};

	// !SECTION End of Helper Functions

	// SECTION Inner Methods

	// ANCHOR Function: processMenuAsync
	const processMenuAsync = async (msgDetails) => {

		const thisFuncDebugName = "processMenuAsync";
		const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0FF56D55" });

		if (!msgDetails.isGm) {
			if (moduleSettings.verbose) {
				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ transUnitId: "0x031B122E" })
				});
			}

			return 0;
		}

		const mainButtons = [
			`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --styles">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D813F3C" })}</a>`,
			`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --handouts">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x005A0033" })}</a>`,
			`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --characters">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C4A2B1E" })}</a>`
		];

		const body = `<div class="ez-content">${mainButtons.join("\n")}</div>`;

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
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x031B122E" })
			});

			return 0;
		}

		try {
			const handouts = findObjs({ type: "handout" });
			const styleSheets = handouts.filter((handout) => handout.get("name").startsWith("StyleSheet"));
			const handoutsLoaded = [];

			if (styleSheets.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ transUnitId: "0x0027BD4E" })
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
								return;
							}

							ThemeFactory.add({ newThemes: { [handoutId]: decodedNotes } });
							handoutsLoaded.push(handoutName);
							resolve();
						});
					});
				})
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

	// ANCHOR Function: renderStyledContent
	//    Shared rendering logic for handouts and character bios
	const renderStyledContent = async ({ gmNotes, avatarUrlRaw, characterId = null, characterName = null }) => {

		const decodedNotes = Utils.decodeNoteContent({ text: gmNotes });

		const styleInfo = parseStyleBlock(decodedNotes);
		if (!styleInfo) {
			return { success: false, error: "No valid style block found" };
		}

		const { themeName, cssVars } = styleInfo;

		const themeHandout = findObjs({
			type: "handout",
			name: `StyleSheet: ${themeName}`,
		})[0];

		if (!themeHandout) {
			return { success: false, error: `Theme not found: ${themeName}` };
		}

		const avatarUrl = transformAvatarUrl(avatarUrlRaw);

		let cleanedNotes = decodedNotes
			.replace(/<style[\s\S]*?<\/style>/i, "")
			.replace(/{{\s*AvatarUrl\s*}}/g, avatarUrl)
			.trim();

		if (characterId && characterName) {
			cleanedNotes = replaceAllPlaceholders(cleanedNotes, characterId, characterName, avatarUrl);
		}

		const replacedNotes = replaceRollTablesInMarkdown(cleanedNotes);
		const htmlConversion = Utils.convertMarkdownToHtml({ content: replacedNotes });

		const templateId = characterId || `handout_${Date.now()}`;

		TemplateFactory.add({ newTemplates: { [templateId]: htmlConversion } });

		try {
			const styledContent = await Utils.renderTemplateAsync({
				template: templateId,
				expressions: {},
				theme: themeHandout.get("_id"),
				cssVars
			});

			TemplateFactory.remove({ template: templateId });

			return { success: true, styledContent };

		} catch (err) {
			TemplateFactory.remove({ template: templateId });
			return { success: false, error: err.message || err };
		}
	};

	// ANCHOR Function: processHandoutsAsync
	const processHandoutsAsync = async (msgDetails) => {

		const thisFuncDebugName = "processHandoutsAsync";

		if (!msgDetails.isGm) {
			if (moduleSettings.verbose) {
				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ transUnitId: "0x031B122E" })
				});
			}

			return 0;
		}

		try {
			const handouts = findObjs({ type: "handout" });
			const handoutsConverted = [];

			for (const handout of handouts) {
				const handoutName = handout.get("name")?.trim();

				if (!handoutName || handoutName.startsWith("StyleSheet:")) {
					continue;
				}

				const gmNotes = await new Promise((resolve) => {
					handout.get("gmnotes", (notes) => resolve(notes));
				});

				const avatarUrlRaw = JSON.stringify(handout.get("avatar"));

				const result = await renderStyledContent({ gmNotes, avatarUrlRaw });

				if (result.success) {
					handout.set("notes", result.styledContent);
					handoutsConverted.push(handoutName);
				} else if (result.error && !result.error.includes("No valid style block")) {
					Utils.logSyslogMessage({
						severity: 6,
						tag: thisFuncDebugName,
						transUnitId: "50000",
						message: `Error rendering "${handoutName}": ${result.error}`
					});
				}
			}

			if (handoutsConverted.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 4,
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0FD080D4" })
				});
			} else {
				lastConvertedHandouts = handoutsConverted.slice();

				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 6,
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0DFBD0E4",
						expressions: { count: handoutsConverted.length }
					})} <a href="\`!${moduleSettings.chatApiName} --handout-details">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0H8C9D0E" })}</a>`,
				});
			}

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

	// ANCHOR Function: processCharactersAsync
	const processCharactersAsync = async (msgDetails) => {

		const thisFuncDebugName = "processCharactersAsync";

		if (!msgDetails.isGm) {
			if (moduleSettings.verbose) {
				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ transUnitId: "0x031B122E" })
				});
			}

			return 0;
		}

		try {
			const characters = findObjs({ type: "character" });
			const charactersConverted = [];

			for (const character of characters) {
				const characterName = character.get("name")?.trim();
				const characterId = character.get("_id");

				if (!characterName) continue;

				const gmNotes = await new Promise((resolve) => {
					character.get("gmnotes", (notes) => resolve(notes));
				});

				const avatarUrlRaw = character.get("avatar") || "";

				const result = await renderStyledContent({
					gmNotes,
					avatarUrlRaw,
					characterId,
					characterName
				});

				if (result.success) {
					character.set("bio", result.styledContent);
					charactersConverted.push(characterName);
				} else if (result.error && !result.error.includes("No valid style block")) {
					Utils.logSyslogMessage({
						severity: 6,
						tag: thisFuncDebugName,
						transUnitId: "50000",
						message: `Error rendering "${characterName}": ${result.error}`
					});
				}
			}

			if (charactersConverted.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 4,
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0B2D4C5E" })
				});
			} else {
				lastConvertedCharacters = charactersConverted.slice();

				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 6,
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0E3F1A2B",
						expressions: { count: charactersConverted.length }
					})} <a href="\`!${moduleSettings.chatApiName} --character-details">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0H8C9D0E" })}</a>`
				});
			}

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

	// ANCHOR Function: processCharacterAsync
	//    Render a single character by ID - allows players to refresh their own bio
	const processCharacterAsync = async (msgDetails, parsedArgs) => {

		const thisFuncDebugName = "processCharacterAsync";

		let characterId = null;
		for (const key of Object.keys(parsedArgs)) {
			if (key.startsWith("-") && key.length > 10) {
				characterId = key;
				break;
			}
		}

		if (!characterId) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0A1B2C3D" })
			});

			return 1;
		}

		const character = getObj("character", characterId);

		if (!character) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0D4E5F6A" })
			});

			return 1;
		}

		const controlledBy = character.get("controlledby") || "";
		const canControl = msgDetails.isGm ||
			controlledBy === "all" ||
			(controlledBy && controlledBy.includes(msgDetails.callerId));

		if (!canControl) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0E5F6A7B" })
			});

			return 1;
		}

		try {
			const characterName = character.get("name")?.trim();

			const gmNotes = await new Promise((resolve) => {
				character.get("gmnotes", (notes) => resolve(notes));
			});

			const avatarUrlRaw = character.get("avatar") || "";

			const result = await renderStyledContent({
				gmNotes,
				avatarUrlRaw,
				characterId,
				characterName
			});

			if (result.success) {
				character.set("bio", result.styledContent);

				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 6,
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0F6A7B8C" })} ${characterName}`
				});
			} else {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ transUnitId: "0x0G7B8C9D" })} ${result.error}`
				});
			}

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

	// ANCHOR Function: processRollTable
	const processRollTable = async (msgDetails, parsedArgs) => {
		try {
			const keys = Object.keys(parsedArgs);
			if (keys.length === 0) {
				sendChat("System", `/w "${msgDetails.callerName}" No valid roll table entries found.`);
				return;
			}

			const randomKey = keys[Math.floor(Math.random() * keys.length)];
			const decodedValue = Utils.decodeBase64({ text: randomKey });
			const output = `&{template:default} {{name=Roll Table Result}} {{Result=${decodedValue}}}`;

			sendChat(msgDetails.callerName, output);

		} catch (err) {
			log(`Error in processRollTable: ${err.message}`);
			sendChat("System", `/w "${msgDetails.callerName}" Error processing roll table: ${err.message}`);
		}
	};

	// ANCHOR Function: processHandoutDetails
	const processHandoutDetails = async (msgDetails) => {
		if (!msgDetails.isGm) return 0;

		if (lastConvertedHandouts.length === 0) {
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0I9D0E1F" })
			});
		} else {
			const list = lastConvertedHandouts.map(name => `\u2022 ${name}`).join("<br>");
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: `<strong>${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0J0E1F2G" })}</strong><br>${list}`
			});
		}

		return 0;
	};

	// ANCHOR Function: processCharacterDetails
	const processCharacterDetails = async (msgDetails) => {
		if (!msgDetails.isGm) return 0;

		if (lastConvertedCharacters.length === 0) {
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0K1F2G3H" })
			});
		} else {
			const list = lastConvertedCharacters.map(name => `\u2022 ${name}`).join("<br>");
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: `<strong>${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0L2G3H4I" })}</strong><br>${list}`
			});
		}

		return 0;
	};

	// !SECTION End of Inner Methods

	// SECTION Event Hooks: Roll20 API

	// ANCHOR Member: actionMap
	const actionMap = {
		"--menu": (msgDetails) => processMenuAsync(msgDetails),
		"--styles": (msgDetails) => processStylesAsync(msgDetails),
		"--handouts": (msgDetails) => processHandoutsAsync(msgDetails),
		"--handout-details": (msgDetails) => processHandoutDetails(msgDetails),
		"--characters": (msgDetails) => processCharactersAsync(msgDetails),
		"--character-details": (msgDetails) => processCharacterDetails(msgDetails),
		"--character": (msgDetails, parsedArgs) => processCharacterAsync(msgDetails, parsedArgs),
		"--rolltable": (msgDetails, parsedArgs) => processRollTable(msgDetails, parsedArgs),
	};

	actionMap["--default"] = actionMap["--menu"];

	// ANCHOR Function: registerEventHandlers
	const registerEventHandlers = () => {
		on("chat:message", (apiCall) => {
			if (apiCall.type === "api" && apiCall.content.startsWith(`!${moduleSettings.chatApiName}`)) {
				Utils.handleApiCall({ actionMap, apiCall });
			}
		});

		return 0;
	};

	// ANCHOR Function: checkInstall
	const checkInstall = () => {

		if (typeof EASY_UTILS !== "undefined") {

			const requiredFunctions = [
				"convertMarkdownToHtml",
				"decodeBase64",
				"encodeBase64",
				"decodeNoteContent",
				"getSharedForge",
				"handleApiCall",
				"logSyslogMessage",
				"renderTemplateAsync",
				"whisperAlertMessageAsync",
				"whisperPlayerMessage"
			];

			Utils = EASY_UTILS.fetchUtilities({
				requiredFunctions,
				moduleSettings
			});

			const easySharedForge = Utils.getSharedForge();

			PhraseFactory = easySharedForge.getFactory({ name: "PhraseFactory" });
			TemplateFactory = easySharedForge.getFactory({ name: "TemplateFactory" });
			ThemeFactory = easySharedForge.getFactory({ name: "ThemeFactory" });

			if (moduleSettings.verbose) {
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
						"0x0FF56D55": "Easy-Markdown Menu",
						"0x0D813F3C": "Load Style Sheets",
						"0x005A0033": "Render Markdown Handouts",
						"0x0C4A2B1E": "Render Character Bios",
						"0x0027BD4E": "No StyleSheet handouts found. Ensure the handout name is prefixed with 'StyleSheet:'.",
						"0x089BBAAA": "The following styles were saved:",
						"0x0DFBD0E4": "Handouts converted: {{ count }}.",
						"0x0E3F1A2B": "Characters rendered: {{ count }}.",
						"0x031B122E": "You have to be GM to use handout styling commands.",
						"0x0FD080D4": "No handouts were rendered",
						"0x0B2D4C5E": "No characters were rendered",
						"0x0A1B2C3D": "No character ID provided. Usage: !ezmarkdown --character <characterId>",
						"0x0D4E5F6A": "Character not found.",
						"0x0E5F6A7B": "You do not have permission to edit this character.",
						"0x0F6A7B8C": "Character bio rendered:",
						"0x0G7B8C9D": "Failed to render character bio:",
						"0x0H8C9D0E": "Show Details",
						"0x0I9D0E1F": "No handouts have been converted yet.",
						"0x0J0E1F2G": "Converted Handouts:",
						"0x0K1F2G3H": "No characters have been rendered yet.",
						"0x0L2G3H4I": "Rendered Characters:",
					},
					frFR: {
						"0x0FF56D55": "Easy-Markdown",
						"0x0D813F3C": "Charger les feuilles de style",
						"0x005A0033": "Rendre les handouts en Markdown",
						"0x0C4A2B1E": "Rendre les bios des personnages",
						"0x0027BD4E": "Aucune feuille de style trouv\u00e9e. Assurez-vous que le nom du handout commence par 'StyleSheet:'.",
						"0x089BBAAA": "Les styles suivants ont \u00e9t\u00e9 enregistr\u00e9s :",
						"0x0DFBD0E4": "Handouts convertis : {{ count }}.",
						"0x0E3F1A2B": "Personnages rendus : {{ count }}.",
						"0x031B122E": "Vous devez \u00eatre GM pour utiliser les commandes de style des handouts.",
						"0x0FD080D4": "Aucun handout n'a \u00e9t\u00e9 rendu",
						"0x0B2D4C5E": "Aucun personnage n'a \u00e9t\u00e9 rendu",
						"0x0A1B2C3D": "Aucun ID de personnage fourni. Usage: !ezmarkdown --character <characterId>",
						"0x0D4E5F6A": "Personnage non trouv\u00e9.",
						"0x0E5F6A7B": "Vous n'avez pas la permission de modifier ce personnage.",
						"0x0F6A7B8C": "Bio du personnage rendue :",
						"0x0G7B8C9D": "\u00c9chec du rendu de la bio du personnage :",
						"0x0H8C9D0E": "Afficher les d\u00e9tails",
						"0x0I9D0E1F": "Aucun handout n'a encore \u00e9t\u00e9 converti.",
						"0x0J0E1F2G": "Handouts convertis :",
						"0x0K1F2G3H": "Aucun personnage n'a encore \u00e9t\u00e9 rendu.",
						"0x0L2G3H4I": "Personnages rendus :",
					}
				}
			});

			return 0;
		} else {

			const _getSyslogTimestamp = () => new Date().toISOString();
			const logMessage = `<e> ${_getSyslogTimestamp()} [${moduleSettings.readableName}](checkInstall): {"transUnitId": 50000, "message": "Not Found: EASY_UTILS is unavailable. Ensure it is loaded before this module in the API console."}`;
			log(logMessage);

			return 1;
		}
	};

	// ANCHOR Event: on(ready)
	on("ready", () => {

		const continueMod = checkInstall();
		if (continueMod === 0) {

			registerEventHandlers();

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

	return {};

})();
