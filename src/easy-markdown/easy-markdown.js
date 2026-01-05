/*!
@language: en-US
@title: easy-markdown.js
@description: The EASY_MARKDOWN module integrates with EASY_UTILS to provide a menu-driven interface and 
	control commands in the Roll20 environment. It uses factories (Phrase, Template, Theme) from the forge,
	parses user chat commands, and renders styled alerts to players via whisper messages.
@version: 1.1.0
@author: Mhykiel
@license: MIT
@repository: {@link https://github.com/tougher-together-games/roll20-api-scripts/blob/main/src/easy-utils/easy-utils-menu.js|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_MARKDOWN = (() => {

	// SECTION Object: EASY_MARKDOWN

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Markdown",
		chatApiName: "ezmarkdown",
		globalName: "EASY_MARKDOWN",
		version: "1.1.0",
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
					remark: `${PhraseFactory.get({ transUnitId: "0x031B122E" })}`
				});
			}

			return 0;
		}

		const menuItemsArray = [
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --styles">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D813F3C" })}</a></li>`,
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --handouts">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x005A0033" })}</a></li>`,
			`<li><a role="button" href="\`!${moduleSettings.chatApiName} --characters">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C4A2B1E" })}</a></li>`
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
				remark: `${PhraseFactory.get({ transUnitId: "0x031B122E" })}`
			});

			return 0;
		}

		try {
			const handouts = findObjs({ type: "handout" });
			const styleSheets = handouts.filter((handout) => { return handout.get("name").startsWith("StyleSheet"); });
			const handoutsLoaded = [];

			if (styleSheets.length === 0) {

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
				Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({ transUnitId: "0x031B122E" })}`
				});
			}

			return 0;
		}

		// ANCHOR Subroutine: parseCssOverrides
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

		// ANCHOR Subroutine: extractRollTableBlocks
		const extractRollTableBlocks = (markdown) => {
			const blockRegex = /:::[^\n]*?(rolltable-(\S+))([\s\S]*?):::/gm;
			const blocks = [];

			let match;
			while ((match = blockRegex.exec(markdown)) !== null) {
				const tableId = match[2];
				const blockContent = match[3];
				blocks.push({
					tableId,
					blockContent: blockContent.trim()
				});
			}

			return blocks;
		};

		// ANCHOR Subroutine: parseDiceTable
		const parseDiceTable = (blockContent) => {
			const rowRegex = /^\|\s*([^|]+)\|\s*([^|]+)\|.*$/gm;

			let diceExpression = "";
			const entries = [];

			let rowIndex = 0;
			let match;

			while ((match = rowRegex.exec(blockContent)) !== null) {
				const col1 = match[1].trim();
				const col2 = match[2].trim();

				const alignmentRegex = /^[\-\:\s]+$/;
				const isAlignmentRow = alignmentRegex.test(col1) && alignmentRegex.test(col2);
				if (isAlignmentRow) {
					continue;
				}

				if (rowIndex === 0) {
					diceExpression = col1;
				} else {
					const rangePart = col1;
					const encodedResult = Utils.encodeBase64({ text: col2 });
					entries.push(`${rangePart}=${encodedResult}`);
				}

				rowIndex++;
			}

			const csv = entries.join(",");

			return { diceExpression, csv };
		};

		// ANCHOR Subroutine: replaceRollTablesInMarkdown
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

		try {
			const handouts = findObjs({ type: "handout" });
			const handoutsConverted = [];

			for (const handout of handouts) {
				let styledContent = "";
				const handoutName = handout.get("name")?.trim();
				const handoutId = handout.get("_id");

				if (!handoutName) continue;

				if (handoutName.startsWith("StyleSheet:")) {
					continue;
				}

				const gmNotes = await new Promise((resolve) => {
					handout.get("gmnotes", (notes) => { return resolve(notes); });
				});

				const avatarUrlRaw = JSON.stringify(handout.get("avatar"));
				const decodedNotes = Utils.decodeNoteContent({ text: gmNotes });

				const styleMatch = decodedNotes.match(/<style([\s\S]*?)<\/style>/i);
				if (!styleMatch) {
					continue;
				}
				const styleContent = styleMatch[1].trim();

				const importMatch = styleContent.match(/@import\s+url\(["'](.+?)["']\);/i);
				if (!importMatch || !importMatch[1]) {
					continue;
				}

				const themeName = importMatch[1].trim();

				let avatarUrl = "";
				if (avatarUrlRaw) {
					avatarUrl = avatarUrlRaw
						.replace(/^"|"$/g, "")
						.replace(/\/med\.png(\?.*)?$/, "/original.png")
						.replace(/\/med\.jpg(\?.*)?$/, "/original.jpg")
						.replace(/\/thumb\.png(\?.*)?$/, "/original.png")
						.replace(/\/thumb\.jpg(\?.*)?$/, "/original.jpg");
				}

				const cleanedNotes = decodedNotes
					.replace(/<style[\s\S]*?<\/style>/i, "")
					.replace(/{{\s*AvatarUrl\s*}}/g, avatarUrl)
					.trim();

				const replacedNotes = replaceRollTablesInMarkdown(cleanedNotes);

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
						message: `Not Found: No theme handout: "${themeName}" for "${handoutName}".`
					});
					continue;
				}

				const rootMatch = styleContent.match(/:root\s*{([\s\S]*?)}/i);
				const cssVars = rootMatch ? parseCssOverrides(rootMatch[1]) : {};

				const htmlConversion = Utils.convertMarkdownToHtml({ content: replacedNotes });

				TemplateFactory.add({
					newTemplates: {
						[handoutId]: htmlConversion
					}
				});

				try {
					styledContent = await Utils.renderTemplateAsync({
						template: handoutId,
						expressions: {},
						theme: themeHandout.get("_id"),
						cssVars
					});

					TemplateFactory.remove({ template: handoutId });

					handout.set("notes", styledContent);

					styledContent = "";
					handoutsConverted.push(handoutName);

				} catch (err) {
					const msgId = "50000";
					Utils.logSyslogMessage({
						severity: 6,
						tag: "processHandoutsAsync",
						transUnitId: msgId,
						message: PhraseFactory.get({
							transUnitId: msgId,
							expressions: { remark: err }
						}),
					});
				}
			}

			if (handoutsConverted.length === 0) {
				const whisperArguments = {
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 4,
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0FD080D4"
					})}`
				};
				await Utils.whisperAlertMessageAsync(whisperArguments);
			} else {
				// Store for details command
				lastConvertedHandouts = handoutsConverted.slice();

				const whisperArguments = {
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
				};
				await Utils.whisperAlertMessageAsync(whisperArguments);
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

	// ANCHOR Function: renderCharacterBio
	//    Shared rendering logic for single character
	const renderCharacterBio = async (character) => {

		// ANCHOR Subroutine: parseCssOverrides
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

		// ANCHOR Subroutine: extractRollTableBlocks
		const extractRollTableBlocks = (markdown) => {
			const blockRegex = /:::[^\n]*?(rolltable-(\S+))([\s\S]*?):::/gm;
			const blocks = [];

			let match;
			while ((match = blockRegex.exec(markdown)) !== null) {
				const tableId = match[2];
				const blockContent = match[3];
				blocks.push({
					tableId,
					blockContent: blockContent.trim()
				});
			}

			return blocks;
		};

		// ANCHOR Subroutine: parseDiceTable
		const parseDiceTable = (blockContent) => {
			const rowRegex = /^\|\s*([^|]+)\|\s*([^|]+)\|.*$/gm;

			let diceExpression = "";
			const entries = [];

			let rowIndex = 0;
			let match;

			while ((match = rowRegex.exec(blockContent)) !== null) {
				const col1 = match[1].trim();
				const col2 = match[2].trim();

				const alignmentRegex = /^[\-\:\s]+$/;
				const isAlignmentRow = alignmentRegex.test(col1) && alignmentRegex.test(col2);
				if (isAlignmentRow) {
					continue;
				}

				if (rowIndex === 0) {
					diceExpression = col1;
				} else {
					const rangePart = col1;
					const encodedResult = Utils.encodeBase64({ text: col2 });
					entries.push(`${rangePart}=${encodedResult}`);
				}

				rowIndex++;
			}

			const csv = entries.join(",");

			return { diceExpression, csv };
		};

		// ANCHOR Subroutine: replaceRollTablesInMarkdown
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

		// ANCHOR Subroutine: getCharacterAttribute
		//    Tries multiple naming conventions to find attribute value
		const getCharacterAttribute = (characterId, attrName) => {
			// Try exact name first
			let attr = findObjs({ type: "attribute", characterid: characterId, name: attrName })[0];
			if (attr) return attr.get("current") || "";

			// Try lowercase
			attr = findObjs({ type: "attribute", characterid: characterId, name: attrName.toLowerCase() })[0];
			if (attr) return attr.get("current") || "";

			// Try snake_case conversion (CamelCase -> snake_case)
			const snakeCase = attrName.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
			attr = findObjs({ type: "attribute", characterid: characterId, name: snakeCase })[0];
			if (attr) return attr.get("current") || "";

			// Try with underscores between words (BioPersonalityTraits -> bio_personality_traits)
			const underscored = attrName.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
			attr = findObjs({ type: "attribute", characterid: characterId, name: underscored })[0];
			if (attr) return attr.get("current") || "";

			// Try removing "Bio" prefix if present (BioPersonalityTraits -> personality_traits)
			if (attrName.startsWith("Bio")) {
				const withoutBio = attrName.substring(3);
				const withoutBioSnake = withoutBio.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
				attr = findObjs({ type: "attribute", characterid: characterId, name: withoutBioSnake })[0];
				if (attr) return attr.get("current") || "";
			}

			return "";
		};

		// ANCHOR Subroutine: replaceAllPlaceholders
		//    Replaces all {{ placeholder }} patterns with character attribute values
		const replaceAllPlaceholders = (markdown, characterId, characterName, avatarUrl) => {
			// Find all {{ placeholder }} patterns
			const placeholderRegex = /\{\{\s*([^}]+)\s*\}\}/g;

			return markdown.replace(placeholderRegex, (match, placeholderName) => {
				const trimmedName = placeholderName.trim();

				// Handle special built-in placeholders
				switch (trimmedName) {
					case "CharacterName":
						return characterName;
					case "CharacterId":
						return characterId;
					case "AvatarUrl":
						return avatarUrl;
					default:
						// Look up as character attribute
						return getCharacterAttribute(characterId, trimmedName);
				}
			});
		};

		const characterName = character.get("name")?.trim();
		const characterId = character.get("_id");

		if (!characterName) {
			return { success: false, error: "No character name" };
		}

		// Retrieve the GM notes asynchronously
		const gmNotes = await new Promise((resolve) => {
			character.get("gmnotes", (notes) => { return resolve(notes); });
		});

		const decodedNotes = Utils.decodeNoteContent({ text: gmNotes });

		// Attempt to match the <style> block
		const styleMatch = decodedNotes.match(/<style([\s\S]*?)<\/style>/i);
		if (!styleMatch) {
			return { success: false, error: "No style block found" };
		}
		const styleContent = styleMatch[1].trim();

		// Attempt to match an @import line
		const importMatch = styleContent.match(/@import\s+url\(["'](.+?)["']\);/i);
		if (!importMatch || !importMatch[1]) {
			return { success: false, error: "No @import found" };
		}

		const themeName = importMatch[1].trim();

		// Transform the avatar URL if present
		const avatarUrlRaw = character.get("avatar") || "";
		let avatarUrl = "";
		if (avatarUrlRaw) {
			avatarUrl = avatarUrlRaw
				.replace(/\/med\.png(\?.*)?$/, "/original.png")
				.replace(/\/med\.jpg(\?.*)?$/, "/original.jpg")
				.replace(/\/thumb\.png(\?.*)?$/, "/original.png")
				.replace(/\/thumb\.jpg(\?.*)?$/, "/original.jpg");
		}

		// Clean out the <style> block
		let cleanedNotes = decodedNotes
			.replace(/<style[\s\S]*?<\/style>/i, "")
			.trim();

		// Replace all {{ placeholder }} patterns with character attributes
		cleanedNotes = replaceAllPlaceholders(cleanedNotes, characterId, characterName, avatarUrl);

		// Replace any rolltable placeholders
		const replacedNotes = replaceRollTablesInMarkdown(cleanedNotes);

		// Find the theme handout by name
		const themeHandout = findObjs({
			type: "handout",
			name: `StyleSheet: ${themeName}`,
		})[0];

		if (!themeHandout) {
			return { success: false, error: `Theme not found: ${themeName}` };
		}

		// Extract CSS variables
		const rootMatch = styleContent.match(/:root\s*{([\s\S]*?)}/i);
		const cssVars = rootMatch ? parseCssOverrides(rootMatch[1]) : {};

		// Convert Markdown to HTML
		const htmlConversion = Utils.convertMarkdownToHtml({ content: replacedNotes });

		// Register as template
		TemplateFactory.add({
			newTemplates: {
				[characterId]: htmlConversion
			}
		});

		try {
			// Render with theme
			const styledContent = await Utils.renderTemplateAsync({
				template: characterId,
				expressions: {},
				theme: themeHandout.get("_id"),
				cssVars
			});

			// Remove from TemplateFactory after rendering
			TemplateFactory.remove({ template: characterId });

			// Update the character's bio
			character.set("bio", styledContent);

			return { success: true, characterName };

		} catch (err) {
			return { success: false, error: err.message || err };
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
					remark: `${PhraseFactory.get({ transUnitId: "0x031B122E" })}`
				});
			}

			return 0;
		}

		try {
			const characters = findObjs({ type: "character" });
			const charactersConverted = [];

			for (const character of characters) {
				const result = await renderCharacterBio(character);

				if (result.success) {
					charactersConverted.push(result.characterName);
				} else if (result.error && !result.error.includes("No style block")) {
					Utils.logSyslogMessage({
						severity: 6,
						tag: thisFuncDebugName,
						transUnitId: "50000",
						message: `Error rendering "${character.get("name")}": ${result.error}`
					});
				}
			}

			// Whisper summary
			if (charactersConverted.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 4,
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0B2D4C5E"
					})}`
				});
			} else {
				// Store for details command
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

		// Get character ID from parsedArgs (first key that looks like an ID)
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
				remark: `${PhraseFactory.get({ transUnitId: "0x0A1B2C3D" })}`
			});

			return 1;
		}

		// Find the character
		const character = getObj("character", characterId);

		if (!character) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ transUnitId: "0x0D4E5F6A" })}`
			});

			return 1;
		}

		// Check permissions - GM can always render, players only if they control the character
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
				remark: `${PhraseFactory.get({ transUnitId: "0x0E5F6A7B" })}`
			});

			return 1;
		}

		try {
			const result = await renderCharacterBio(character);

			if (result.success) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: 6,
					apiCallContent: msgDetails.raw.content,
					remark: `${PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0F6A7B8C"
					})} ${result.characterName}`
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

	// ANCHOR Subroutine: processRollTable
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
	//    Shows the list of last converted handouts
	const processHandoutDetails = async (msgDetails) => {
		if (!msgDetails.isGm) return 0;

		if (lastConvertedHandouts.length === 0) {
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0I9D0E1F" })
			});
		} else {
			const list = lastConvertedHandouts.map(name => `• ${name}`).join("<br>");
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: `<strong>${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0J0E1F2G" })}</strong><br>${list}`
			});
		}

		return 0;
	};

	// ANCHOR Function: processCharacterDetails
	//    Shows the list of last converted characters
	const processCharacterDetails = async (msgDetails) => {
		if (!msgDetails.isGm) return 0;

		if (lastConvertedCharacters.length === 0) {
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0K1F2G3H" })
			});
		} else {
			const list = lastConvertedCharacters.map(name => `• ${name}`).join("<br>");
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
		"--menu": (msgDetails) => { return processMenuAsync(msgDetails); },
		"--styles": (msgDetails) => { return processStylesAsync(msgDetails); },
		"--handouts": (msgDetails) => { return processHandoutsAsync(msgDetails); },
		"--handout-details": (msgDetails) => { return processHandoutDetails(msgDetails); },
		"--characters": (msgDetails) => { return processCharactersAsync(msgDetails); },
		"--character-details": (msgDetails) => { return processCharacterDetails(msgDetails); },
		"--character": (msgDetails, parsedArgs) => { return processCharacterAsync(msgDetails, parsedArgs); },
		"--rolltable": (msgDetails, parsedArgs) => { return processRollTable(msgDetails, parsedArgs); },
	};

	// Set Default Action
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
						"0x0027BD4E": "Aucune feuille de style trouvée. Assurez-vous que le nom du handout commence par 'StyleSheet:'.",
						"0x089BBAAA": "Les styles suivants ont été enregistrés :",
						"0x0DFBD0E4": "Handouts convertis : {{ count }}.",
						"0x0E3F1A2B": "Personnages rendus : {{ count }}.",
						"0x031B122E": "Vous devez être GM pour utiliser les commandes de style des handouts.",
						"0x0FD080D4": "Aucun handout n'a été rendu",
						"0x0B2D4C5E": "Aucun personnage n'a été rendu",
						"0x0A1B2C3D": "Aucun ID de personnage fourni. Usage: !ezmarkdown --character <characterId>",
						"0x0D4E5F6A": "Personnage non trouvé.",
						"0x0E5F6A7B": "Vous n'avez pas la permission de modifier ce personnage.",
						"0x0F6A7B8C": "Bio du personnage rendue :",
						"0x0G7B8C9D": "Échec du rendu de la bio du personnage :",
						"0x0H8C9D0E": "Afficher les détails",
						"0x0I9D0E1F": "Aucun handout n'a encore été converti.",
						"0x0J0E1F2G": "Handouts convertis :",
						"0x0K1F2G3H": "Aucun personnage n'a encore été rendu.",
						"0x0L2G3H4I": "Personnages rendus :",
					}
				}
			});

			return 0;
		} else {

			const _getSyslogTimestamp = () => { return new Date().toISOString(); };
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