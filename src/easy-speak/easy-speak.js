/*!
@language: en-US
@title: easy-speak.js
@description: The EASY_SPEAK module integrates with EASY_UTILS to provide language-based communication
	in the Roll20 environment. Players select a token and choose from known languages to speak.
	Non-speakers see gibberish while speakers receive the actual message via whisper.
@version: 1.0.0
@author: Mhykiel
@license: MIT
@repository: {@link https://github.com/tougher-together-games/roll20-api-scripts|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_SPEAK = (() => {
	// SECTION Object: EASY_SPEAK
	/**
	 * @namespace EASY_SPEAK
	 * @summary Language-based communication system for Roll20.
	 * 
	 * - **Purpose**:
	 *   - Allows players to speak in languages their characters know
	 *   - Non-speakers see random gibberish words from language handouts
	 *   - Speakers and GM receive the actual message via whisper
	 * 
	 * - **Execution**:
	 *   - Player selects a token and runs !ezspeak
	 *   - Menu displays languages from character's other_languages attribute
	 *   - Clicking a language prompts for message, then broadcasts gibberish and whispers translation
	 * 
	 * - **Design**:
	 *   - Language handouts named "Language: <name>" contain gibberish words in GM notes
	 *   - Words extracted from <div id="easySpeakWords">word1, word2, word3</div>
	 *   - Player journal access on handouts determines who can understand
	 */

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Speak",
		chatApiName: "ezspeak",
		globalName: "EASY_SPEAK",
		version: "1.0.0",
		author: "Mhykiel",
		sendWelcomeMsg: true,
		verbose: false,
		debug: {
			"onReady": false,
			"processMenuAsync": false,
			"processSpeakAsync": false,
			"processAddAccess": false,
			"processRemoveAccess": false,
			"processListLanguages": false
		}
	};

	// ANCHOR Member: Factory References
	let Utils = {};
	let PhraseFactory = {};

	// ANCHOR Member: Vault Reference
	let EasySpeakVault = {};

	// SECTION Inner Methods: Utility Functions

	// ANCHOR Function: normalizeLanguageName
	/**
	 * @summary Normalizes a language name from character sheet format to handout format.
	 * Character sheets use spaces and apostrophes, handouts use hyphens and no apostrophes.
	 * @param {string} name - The language name to normalize
	 * @returns {string} Normalized name matching handout naming convention
	 * @example
	 * normalizeLanguageName("Deep Speech")         // "Deep-Speech"
	 * normalizeLanguageName("Thieves' Cant")       // "Thieves-Cant"
	 * normalizeLanguageName("Common Sign Language") // "Common-Sign-Language"
	 */
	const normalizeLanguageName = (name) => {
		return name
			.replace(/[''`]/g, "")      // Remove apostrophes
			.replace(/\s+/g, "-")       // Replace spaces with hyphens
			.trim();
	};

	// ANCHOR Function: findLanguageHandout
	/**
	 * @summary Finds a language handout by name, normalizing for naming convention differences.
	 * @param {string} languageName - The language name from character sheet
	 * @returns {Object|null} The handout object or null if not found
	 */
	const findLanguageHandout = (languageName) => {
		// First try exact match (in case handout matches character sheet exactly)
		const exactMatch = findObjs({ _type: "handout", name: `Language: ${languageName}` })[0];
		if (exactMatch) return exactMatch;

		// Try normalized match (spaces to hyphens, no apostrophes)
		const normalizedName = normalizeLanguageName(languageName);
		const normalizedMatch = findObjs({ _type: "handout", name: `Language: ${normalizedName}` })[0];
		if (normalizedMatch) return normalizedMatch;

		return null;
	};

	// ANCHOR Function: getAllLanguages
	/**
	 * @summary Scans all handouts for those prefixed with "Language:" and returns language names.
	 * @returns {string[]} Array of language names
	 */
	const getAllLanguages = () => {
		const languageHandouts = findObjs({ _type: "handout" })
			.filter(handout => handout.get("name").startsWith("Language:"));

		return languageHandouts
			.map(handout => handout.get("name").replace("Language:", "").trim())
			.filter(lang => lang);
	};

	// ANCHOR Function: getCharacterLanguages
	/**
	 * @summary Retrieves languages from a character's other_languages attribute.
	 * @param {string} characterId - The character's Roll20 ID
	 * @returns {string[]} Array of language names the character knows
	 */
	const getCharacterLanguages = (characterId) => {
		const otherLanguagesAttr = findObjs({
			_type: "attribute",
			_characterid: characterId,
			name: "other_languages"
		})[0];

		if (!otherLanguagesAttr) return [];

		return otherLanguagesAttr.get("current")
			.split(",")
			.map(lang => lang.trim())
			.filter(lang => lang);
	};

	// ANCHOR Function: decodeHtmlEntities
	/**
	 * @summary Decodes HTML entities in a string.
	 * @param {string} html - String with HTML entities
	 * @returns {string} Decoded string
	 */
	const decodeHtmlEntities = (html) => {
		return html
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, "\"")
			.replace(/&amp;/g, "&");
	};

	// ANCHOR Function: extractWords
	/**
	 * @summary Extracts words from the easySpeakWords div in handout GM notes.
	 * @param {string} notes - GM notes content from handout
	 * @returns {string[]} Array of words for gibberish generation
	 */
	const extractWords = (notes) => {
		const decodedNotes = decodeHtmlEntities(notes);
		const match = decodedNotes.match(/<div[^>]*id="easySpeakWords"[^>]*>(.*?)<\/div>/);

		if (!match || !match[1]) return [];

		return match[1]
			.split(",")
			.map(word => word.trim())
			.filter(Boolean);
	};

	// ANCHOR Function: getRandomWords
	/**
	 * @summary Returns a random subset of words from an array.
	 * @param {string[]} words - Array of available words
	 * @param {number} count - Number of words to return
	 * @returns {string[]} Random selection of words
	 */
	const getRandomWords = (words, count) => {
		const shuffled = [...words].sort(() => 0.5 - Math.random());
		return shuffled.slice(0, count);
	};

	// ANCHOR Function: getTokenAndCharacter
	/**
	 * @summary Validates selected token and returns token/character objects.
	 * @param {string} tokenId - The token's Roll20 ID
	 * @returns {Object|null} Object with token and character, or null if invalid
	 */
	const getTokenAndCharacter = (tokenId) => {
		const token = getObj("graphic", tokenId);
		if (!token) return null;

		const character = getObj("character", token.get("represents"));
		if (!character) return null;

		return { token, character };
	};

	// ANCHOR Function: getControllingPlayers
	/**
	 * @summary Gets all controlling players for a token/character combination.
	 * @param {Object} token - Roll20 token object
	 * @param {Object} character - Roll20 character object
	 * @returns {string[]} Array of player IDs with control
	 */
	const getControllingPlayers = (token, character) => {
		const tokenControllers = token.get("controlledby").split(",").filter(Boolean);
		const characterControllers = character.get("controlledby").split(",").filter(Boolean);

		return [...new Set([...tokenControllers, ...characterControllers])];
	};

	// !SECTION End of Inner Methods: Utility Functions
	// SECTION Inner Methods: Action Processors

	// ANCHOR Function: processMenuAsync
	/**
	 * @summary Displays the language selection menu for a selected token.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processMenuAsync = async (msgDetails) => {
		const thisFuncDebugName = "processMenuAsync";

		try {
			// Validate token selection
			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C41" })
				});
				return 1;
			}

			// Process first selected token
			const tokenId = msgDetails.selectedIds[0];
			const tokenData = getTokenAndCharacter(tokenId);

			if (!tokenData) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C42" })
				});
				return 1;
			}

			const { token, character } = tokenData;
			const characterLanguages = getCharacterLanguages(character.id);

			if (characterLanguages.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0A1B2C43",
						expressions: { name: character.get("name") }
					})
				});
				return 1;
			}

			// Build menu items for character's languages
			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C3D" });
			const menuItemsArray = characterLanguages.map(lang => {
				// Normalize language name for URL (spaces to hyphens) to avoid parsing issues
				const urlLang = normalizeLanguageName(lang);
				// NOTE: Using \` to escape backtick and ?{} for Roll20 query prompt
				return `<li><a role="button" href="\`!${moduleSettings.chatApiName} --speak lang|${urlLang} token|${tokenId} prompt|?{${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C4A" })}}">${lang}</a></li>`;
			});

			// Add GM-specific options
			const gmMenuItemsArray = [];
			if (msgDetails.isGm) {
				gmMenuItemsArray.push("</ul>");
				gmMenuItemsArray.push(`<h4>${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x09B11313" })}</h4>`);
				gmMenuItemsArray.push("<ul>");

				// GM Speak As - all languages available
				const allLanguages = EasySpeakVault.languages || [];
				if (allLanguages.length > 0) {
					// Normalize language names for URL (spaces to hyphens)
					const langChoices = allLanguages.map(lang => normalizeLanguageName(lang)).join("|");
					gmMenuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --speak lang|?{${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C3E" })}|${langChoices}} as|?{${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C4B" })}} prompt|?{${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C4A" })}}">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C4C" })}</a></li>`);
				}

				// Add/Remove access buttons
				gmMenuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --add">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C3F" })}</a></li>`);
				gmMenuItemsArray.push(`<li data-category="caution"><a role="button" href="\`!${moduleSettings.chatApiName} --remove">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C40" })}</a></li>`);
			}

			const combinedMenuItems = msgDetails.isGm
				? [...menuItemsArray, ...gmMenuItemsArray]
				: menuItemsArray;

			const menuContent = {
				title,
				menuItems: combinedMenuItems.join("\n"),
				footer: `${character.get("name")}`
			};

			const styledMessage = await Utils.renderTemplateAsync({
				template: "chatMenu",
				expressions: menuContent,
				theme: "chatMenu",
				cssVars: {}
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

	// ANCHOR Function: processSpeakAsync
	/**
	 * @summary Processes a speak command - displays gibberish publicly and whispers translation.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @param {Object} parsedArgs - Parsed subcommand arguments
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processSpeakAsync = async (msgDetails, parsedArgs) => {
		const thisFuncDebugName = "processSpeakAsync";

		try {
			const language = parsedArgs.lang;
			const message = parsedArgs.prompt;
			const tokenId = parsedArgs.token;
			const speakAs = parsedArgs.as;

			// Validate required parameters
			if (!language || !message) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "40000", expressions: { remark: "lang, prompt" } })
				});
				return 1;
			}

			// Determine display name
			let displayName;
			if (tokenId) {
				const token = getObj("graphic", tokenId);
				if (!token) {
					await Utils.whisperAlertMessageAsync({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "ERROR",
						apiCallContent: msgDetails.raw.content,
						remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "40400", expressions: { remark: "token" } })
					});
					return 1;
				}
				displayName = token.get("name");
			} else if (speakAs) {
				displayName = speakAs;
			} else {
				displayName = msgDetails.callerName;
			}

			// Find language handout (fuzzy match for punctuation differences)
			const handout = findLanguageHandout(language);
			if (!handout) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0A1B2C44",
						expressions: { lang: language }
					})
				});
				return 1;
			}

			// Get gibberish words from handout GM notes
			const gmNotes = await new Promise((resolve) => {
				handout.get("gmnotes", (notes) => resolve(notes || ""));
			});

			const words = extractWords(gmNotes);
			if (words.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0A1B2C45",
						expressions: { lang: language }
					})
				});
				return 1;
			}

			// Generate gibberish and broadcast
			const randomWords = getRandomWords(words, 5);
			const gibberish = randomWords.join(" ");

			// Public emote with gibberish (everyone sees this)
			sendChat(displayName, `/em ${PhraseFactory.get({ transUnitId: "0x0A1B2C48", expressions: { gibberish } })}`);

			// Whisper real message to GM
			sendChat(displayName, `/w gm (${PhraseFactory.get({ transUnitId: "0x0A1B2C49", expressions: { lang: language } })}): ${message}`);

			// Whisper real message to players with access to this language
			const journalPlayers = handout.get("inplayerjournals").split(",").filter(Boolean);
			if (journalPlayers.length > 0) {
				for (const playerId of journalPlayers) {
					const player = getObj("player", playerId);
					if (player) {
						const playerName = player.get("_displayname");
						sendChat(displayName, `/w "${playerName}" (${PhraseFactory.get({ transUnitId: "0x0A1B2C49", expressions: { lang: language } })}): ${message}`);
					}
				}
			} else {
				// Warn speaker that no players understand this language
				Utils.whisperPlayerMessage({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					message: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0A1B2C50",
						expressions: { lang: language }
					})
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

	// ANCHOR Function: processAddAccess
	/**
	 * @summary Adds controlling players of selected tokens to their language handout journals.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processAddAccess = async (msgDetails) => {
		const thisFuncDebugName = "processAddAccess";

		try {
			// GM only
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C4D" })
				});
				return 1;
			}

			// Validate token selection
			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C41" })
				});
				return 1;
			}

			// Process each selected token
			for (const tokenId of msgDetails.selectedIds) {
				const tokenData = getTokenAndCharacter(tokenId);
				if (!tokenData) continue;

				const { token, character } = tokenData;
				const controllingPlayers = getControllingPlayers(token, character);
				if (controllingPlayers.length === 0) continue;

				const languages = getCharacterLanguages(character.id);
				if (languages.length === 0) continue;

				// Add players to each language handout
				for (const lang of languages) {
					const handout = findLanguageHandout(lang);
					if (!handout) continue;

					const currentJournals = handout.get("inplayerjournals").split(",").filter(Boolean);

					for (const playerId of controllingPlayers) {
						if (!currentJournals.includes(playerId)) {
							currentJournals.push(playerId);
						}
					}

					handout.set("inplayerjournals", currentJournals.join(","));
				}

				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "INFO",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0A1B2C46",
						expressions: { name: character.get("name") }
					})
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

	// ANCHOR Function: processRemoveAccess
	/**
	 * @summary Removes controlling players of selected tokens from their language handout journals.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processRemoveAccess = async (msgDetails) => {
		const thisFuncDebugName = "processRemoveAccess";

		try {
			// GM only
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C4D" })
				});
				return 1;
			}

			// Validate token selection
			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C41" })
				});
				return 1;
			}

			// Process each selected token
			for (const tokenId of msgDetails.selectedIds) {
				const tokenData = getTokenAndCharacter(tokenId);
				if (!tokenData) continue;

				const { token, character } = tokenData;
				const controllingPlayers = getControllingPlayers(token, character);
				if (controllingPlayers.length === 0) continue;

				const languages = getCharacterLanguages(character.id);
				if (languages.length === 0) continue;

				// Remove players from each language handout
				for (const lang of languages) {
					const handout = findLanguageHandout(lang);
					if (!handout) continue;

					const currentJournals = handout.get("inplayerjournals").split(",").filter(Boolean);
					const updatedJournals = currentJournals.filter(id => !controllingPlayers.includes(id));

					handout.set("inplayerjournals", updatedJournals.join(","));
				}

				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "INFO",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0A1B2C47",
						expressions: { name: character.get("name") }
					})
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

	// ANCHOR Function: processListLanguages
	/**
	 * @summary Whispers a list of all available languages to the caller.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processListLanguages = async (msgDetails) => {
		const thisFuncDebugName = "processListLanguages";

		try {
			const languages = EasySpeakVault.languages || [];

			if (languages.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C4E" })
				});
				return 1;
			}

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0A1B2C4F" })}: ${languages.join(", ")}`
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

	// !SECTION End of Inner Methods: Action Processors
	// SECTION Event Hooks: Roll20 API

	// ANCHOR Member: actionMap
	const actionMap = {
		"--menu": (msgDetails) => processMenuAsync(msgDetails),
		"--speak": (msgDetails, parsedArgs) => processSpeakAsync(msgDetails, parsedArgs),
		"--add": (msgDetails) => processAddAccess(msgDetails),
		"--remove": (msgDetails) => processRemoveAccess(msgDetails),
		"--list": (msgDetails) => processListLanguages(msgDetails)
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

			const requiredFunctions = [
				"getSharedForge",
				"getSharedVault",
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

			// Get reference to shared forge and factories
			const easySharedForge = Utils.getSharedForge();
			PhraseFactory = easySharedForge.getFactory({ name: "PhraseFactory" });

			// Initialize vault storage
			const sharedVault = Utils.getSharedVault();
			sharedVault.EasySpeak = sharedVault.EasySpeak || {};
			EasySpeakVault = sharedVault.EasySpeak;

			// Cache available languages
			EasySpeakVault.languages = getAllLanguages();

			if (moduleSettings.verbose) {
				const msgId = "10000";
				Utils.logSyslogMessage({
					severity: "INFO",
					tag: moduleSettings.readableName,
					transUnitId: msgId,
					message: PhraseFactory.get({ transUnitId: msgId })
				});
			}

			// Add localization phrases
			PhraseFactory.add({
				newMap: {
					enUS: {
						"0x0A1B2C3D": "Easy-Speak Menu",
						"0x0A1B2C3E": "Choose Language",
						"0x0A1B2C3F": "Add Language Access",
						"0x0A1B2C40": "Remove Language Access",
						"0x0A1B2C41": "No tokens selected.",
						"0x0A1B2C42": "Token is not linked to a character.",
						"0x0A1B2C43": "No languages found for {{ name }}.",
						"0x0A1B2C44": "No handout found for language: {{ lang }}.",
						"0x0A1B2C45": "No words available for language: {{ lang }}.",
						"0x0A1B2C46": "Players added to language access for {{ name }}.",
						"0x0A1B2C47": "Players removed from language access for {{ name }}.",
						"0x0A1B2C48": "in an unknown language says, \"{{ gibberish }}\"",
						"0x0A1B2C49": "In {{ lang }}",
						"0x0A1B2C4A": "Message",
						"0x0A1B2C4B": "Speak As",
						"0x0A1B2C4C": "GM Speak As",
						"0x0A1B2C4D": "This command is restricted to GM.",
						"0x0A1B2C4E": "No language handouts found.",
						"0x0A1B2C4F": "Available languages",
						"0x0A1B2C50": "No players have access to {{ lang }}."
					}
				}
			});

			return 0;

		} else {
			const _getSyslogTimestamp = () => new Date().toISOString();
			const logMessage = `<ERROR> ${_getSyslogTimestamp()} [${moduleSettings.readableName}](checkInstall): {"transUnitId": 50000, "message": "Not Found: EASY_UTILS is unavailable. Ensure it is loaded before this module in the API console."}`;
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
	// SECTION Public Methods: Exposed Interface

	return {};

	// !SECTION End of Public Methods: Exposed Interface
	// !SECTION End of Object: EASY_SPEAK
})();