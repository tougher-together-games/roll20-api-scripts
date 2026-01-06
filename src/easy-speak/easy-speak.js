/*!
@language: en-US
@title: easy-speak.js
@description: The EASY_SPEAK module integrates with EASY_UTILS to provide language-based communication
	in the Roll20 environment. Players select a token and choose from known languages to speak.
	Non-speakers see gibberish while speakers receive the actual message via whisper.
@version: 2.0.0
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
		version: "2.0.0",
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
		// Try exact match first
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
			.filter(handout => { return handout.get("name").startsWith("Language:"); });

		return languageHandouts
			.map(handout => { return handout.get("name").replace("Language:", "").trim(); })
			.filter(lang => { return lang; });
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
			.map(lang => { return lang.trim(); })
			.filter(lang => { return lang; });
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
		const match = decodedNotes.match(/<div[^>]*id="easySpeakWords"[^>]*>(.*?)<\/div>/is);

		if (!match || !match[1]) return [];

		// Strip HTML tags, normalize whitespace, then split by comma
		const cleanedContent = match[1]
			.replace(/<[^>]*>/g, "")     // Remove HTML tags
			.replace(/&nbsp;/g, " ")     // Replace non-breaking spaces
			.replace(/[\r\n]+/g, " ")    // Replace newlines with space
			.replace(/\s+/g, " ")        // Normalize multiple spaces
			.trim();

		return cleanedContent
			.split(",")
			.map(word => { return word.trim(); })
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
		const shuffled = [...words].sort(() => { return 0.5 - Math.random(); });
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
				Utils.whisperPlayerMessage({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					message: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00001" })
				});
				return 1;
			}

			// Process first selected token
			const tokenId = msgDetails.selectedIds[0];
			const tokenData = getTokenAndCharacter(tokenId);

			if (!tokenData) {
				Utils.whisperPlayerMessage({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					message: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00002" })
				});
				return 1;
			}

			const { character } = tokenData;
			const characterLanguages = getCharacterLanguages(character.id);

			if (characterLanguages.length === 0) {
				Utils.whisperPlayerMessage({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					message: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0ES00003",
						expressions: { name: character.get("name") }
					})
				});
				return 1;
			}

			// Build language buttons
			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00010" });
			const languageButtons = characterLanguages.map(lang => {
				const urlLang = normalizeLanguageName(lang);
				const promptLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00011" });
				return `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --speak lang|${urlLang} token|${tokenId} prompt|?{${promptLabel}}">${lang}</a>`;
			});

			// Build body with language buttons
			let body = `<div class="ez-content">${languageButtons.join("\n")}</div>`;

			// Add GM options if caller is GM
			if (msgDetails.isGm) {
				const gmHeader = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x09B11313" });
				const allLanguages = EasySpeakVault.languages || [];

				const gmButtons = [];

				// GM Speak As - all languages available
				if (allLanguages.length > 0) {
					const langChoices = allLanguages.map(lang => { return normalizeLanguageName(lang); }).join("|");
					const chooseLangLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00012" });
					const speakAsLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00013" });
					const promptLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00011" });
					const gmSpeakLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00014" });

					gmButtons.push(`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --speak lang|?{${chooseLangLabel}|${langChoices}} as|?{${speakAsLabel}} prompt|?{${promptLabel}}">${gmSpeakLabel}</a>`);
				}

				// Add/Remove access buttons
				const addLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00015" });
				const removeLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00016" });
				const listLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00017" });

				gmButtons.push(`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --add">${addLabel}</a>`);
				gmButtons.push(`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --list">${listLabel}</a>`);
				gmButtons.push(`<a class="ez-btn ez-caution" href="\`!${moduleSettings.chatApiName} --remove">${removeLabel}</a>`);

				body += `<div class="ez-header">${gmHeader}</div>`;
				body += `<div class="ez-content">${gmButtons.join("\n")}</div>`;
			}

			const menuContent = {
				title,
				subtitle: character.get("name"),
				body,
				footer: `v${moduleSettings.version}`
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

			if (moduleSettings.debug[thisFuncDebugName]) {
				Utils.logSyslogMessage({
					severity: "DEBUG",
					tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
					transUnitId: "70000",
					message: `Menu displayed for ${character.get("name")}`
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
				Utils.whisperPlayerMessage({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					message: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00004" })
				});
				return 1;
			}

			// Determine display name
			let displayName;
			if (tokenId) {
				const token = getObj("graphic", tokenId);
				if (!token) {
					Utils.whisperPlayerMessage({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						message: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00005" })
					});
					return 1;
				}
				displayName = token.get("name");
			} else if (speakAs) {
				displayName = speakAs;
			} else {
				displayName = msgDetails.callerName;
			}

			// Find language handout
			const handout = findLanguageHandout(language);
			if (!handout) {
				// GM gets alert, player gets simple whisper
				if (msgDetails.isGm) {
					await Utils.whisperAlertMessageAsync({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "WARN",
						apiCallContent: msgDetails.raw.content,
						remark: PhraseFactory.get({
							playerId: msgDetails.callerId,
							transUnitId: "0x0ES00006",
							expressions: { lang: language }
						})
					});
				} else {
					Utils.whisperPlayerMessage({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						message: PhraseFactory.get({
							playerId: msgDetails.callerId,
							transUnitId: "0x0ES00006",
							expressions: { lang: language }
						})
					});
				}
				return 1;
			}

			// Get gibberish words from handout GM notes
			const gmNotes = await new Promise((resolve) => {
				handout.get("gmnotes", (notes) => { return resolve(notes || ""); });
			});

			const words = extractWords(gmNotes);
			if (words.length === 0) {
				// GM gets alert about missing config
				if (msgDetails.isGm) {
					await Utils.whisperAlertMessageAsync({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "WARN",
						apiCallContent: msgDetails.raw.content,
						remark: PhraseFactory.get({
							playerId: msgDetails.callerId,
							transUnitId: "0x0ES00007",
							expressions: { lang: language }
						})
					});
				} else {
					Utils.whisperPlayerMessage({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						message: PhraseFactory.get({
							playerId: msgDetails.callerId,
							transUnitId: "0x0ES00007",
							expressions: { lang: language }
						})
					});
				}
				return 1;
			}

			// Generate gibberish and broadcast
			const randomWords = getRandomWords(words, 5);
			const gibberish = randomWords.join(" ");

			// Public emote with gibberish
			const emoteText = PhraseFactory.get({
				transUnitId: "0x0ES00020",
				expressions: { gibberish }
			});
			sendChat(displayName, `/em ${emoteText}`);

			// Whisper real message to GM
			const langLabel = PhraseFactory.get({
				transUnitId: "0x0ES00021",
				expressions: { lang: language }
			});
			sendChat(displayName, `/w gm (${langLabel}): ${message}`);

			// Whisper real message to players with access
			const journalPlayers = handout.get("inplayerjournals").split(",").filter(Boolean);
			if (journalPlayers.length > 0) {
				for (const playerId of journalPlayers) {
					const player = getObj("player", playerId);
					if (player) {
						const playerName = player.get("_displayname");
						sendChat(displayName, `/w "${playerName}" (${langLabel}): ${message}`);
					}
				}
			} else {
				// Notify speaker that no one understands
				Utils.whisperPlayerMessage({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					message: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0ES00008",
						expressions: { lang: language }
					})
				});
			}

			if (moduleSettings.debug[thisFuncDebugName]) {
				Utils.logSyslogMessage({
					severity: "DEBUG",
					tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
					transUnitId: "70000",
					message: `${displayName} spoke in ${language}`
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
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00009" })
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
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00001" })
				});
				return 1;
			}

			// Process each selected token
			const processedCharacters = [];

			for (const tokenId of msgDetails.selectedIds) {
				const tokenData = getTokenAndCharacter(tokenId);
				if (!tokenData) continue;

				const { token, character } = tokenData;
				const controllingPlayers = getControllingPlayers(token, character);
				if (controllingPlayers.length === 0) continue;

				const languages = getCharacterLanguages(character.id);
				if (languages.length === 0) continue;

				// Add players to each language handout (skip GMs)
				for (const lang of languages) {
					const handout = findLanguageHandout(lang);
					if (!handout) continue;

					const currentJournals = handout.get("inplayerjournals").split(",").filter(Boolean);

					for (const playerId of controllingPlayers) {
						// Skip GMs - they can always see handout content
						if (playerIsGM(playerId)) continue;

						if (!currentJournals.includes(playerId)) {
							currentJournals.push(playerId);
						}
					}

					handout.set("inplayerjournals", currentJournals.join(","));
				}

				processedCharacters.push(character.get("name"));
			}

			if (processedCharacters.length > 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "INFO",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0ES0000A",
						expressions: { names: processedCharacters.join(", ") }
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
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00009" })
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
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00001" })
				});
				return 1;
			}

			// Process each selected token
			const processedCharacters = [];

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
					const updatedJournals = currentJournals.filter(id => { return !controllingPlayers.includes(id); });

					handout.set("inplayerjournals", updatedJournals.join(","));
				}

				processedCharacters.push(character.get("name"));
			}

			if (processedCharacters.length > 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "INFO",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0ES0000B",
						expressions: { names: processedCharacters.join(", ") }
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
			// GM only
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES00009" })
				});
				return 1;
			}

			const languages = EasySpeakVault.languages || [];

			if (languages.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES0000C" })
				});
				return 1;
			}

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: `${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ES0000D" })}: ${languages.join(", ")}`
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
		"--menu": (msgDetails) => { return processMenuAsync(msgDetails); },
		"--speak": (msgDetails, parsedArgs) => { return processSpeakAsync(msgDetails, parsedArgs); },
		"--add": (msgDetails) => { return processAddAccess(msgDetails); },
		"--remove": (msgDetails) => { return processRemoveAccess(msgDetails); },
		"--list": (msgDetails) => { return processListLanguages(msgDetails); }
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
				"createPhraseFactory",
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
						// Player messages (simple whispers)
						"0x0ES00001": "Please select a token first.",
						"0x0ES00002": "Selected token is not linked to a character.",
						"0x0ES00003": "{{ name }} doesn't know any languages.",
						"0x0ES00004": "Missing language or message.",
						"0x0ES00005": "Token not found.",
						"0x0ES00006": "No handout found for language: {{ lang }}",
						"0x0ES00007": "No words configured for language: {{ lang }}",
						"0x0ES00008": "No one nearby understands {{ lang }}.",
						"0x0ES00009": "This command is GM only.",

						// GM confirmations (alerts)
						"0x0ES0000A": "Language access added for: {{ names }}",
						"0x0ES0000B": "Language access removed for: {{ names }}",
						"0x0ES0000C": "No language handouts found. Create handouts named 'Language: [Name]'.",
						"0x0ES0000D": "Available languages",

						// Menu labels
						"0x0ES00010": "Speak Language",
						"0x0ES00011": "Message",
						"0x0ES00012": "Choose Language",
						"0x0ES00013": "Speak As",
						"0x0ES00014": "GM Speak As",
						"0x0ES00015": "Add Language Access",
						"0x0ES00016": "Remove Language Access",
						"0x0ES00017": "List Languages",

						// Chat output
						"0x0ES00020": "says something in an unknown tongue: \"{{ gibberish }}\"",
						"0x0ES00021": "In {{ lang }}"
					},
					frFR: {
						// Player messages (simple whispers)
						"0x0ES00001": "Veuillez d'abord s\u00e9lectionner un jeton.",
						"0x0ES00002": "Le jeton s\u00e9lectionn\u00e9 n'est pas li\u00e9 \u00e0 un personnage.",
						"0x0ES00003": "{{ name }} ne conna\u00eet aucune langue.",
						"0x0ES00004": "Langue ou message manquant.",
						"0x0ES00005": "Jeton introuvable.",
						"0x0ES00006": "Aucun document trouv\u00e9 pour la langue: {{ lang }}",
						"0x0ES00007": "Aucun mot configur\u00e9 pour la langue: {{ lang }}",
						"0x0ES00008": "Personne \u00e0 proximit\u00e9 ne comprend {{ lang }}.",
						"0x0ES00009": "Cette commande est r\u00e9serv\u00e9e au MJ.",

						// GM confirmations (alerts)
						"0x0ES0000A": "Acc\u00e8s linguistique ajout\u00e9 pour: {{ names }}",
						"0x0ES0000B": "Acc\u00e8s linguistique retir\u00e9 pour: {{ names }}",
						"0x0ES0000C": "Aucun document de langue trouv\u00e9. Cr\u00e9ez des documents nomm\u00e9s 'Language: [Nom]'.",
						"0x0ES0000D": "Langues disponibles",

						// Menu labels
						"0x0ES00010": "Parler une Langue",
						"0x0ES00011": "Message",
						"0x0ES00012": "Choisir la Langue",
						"0x0ES00013": "Parler en tant que",
						"0x0ES00014": "MJ Parler en tant que",
						"0x0ES00015": "Ajouter Acc\u00e8s Langue",
						"0x0ES00016": "Retirer Acc\u00e8s Langue",
						"0x0ES00017": "Lister les Langues",

						// Chat output
						"0x0ES00020": "dit quelque chose dans une langue inconnue: \"{{ gibberish }}\"",
						"0x0ES00021": "En {{ lang }}"
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
	// SECTION Public Methods: Exposed Interface

	return {};

	// !SECTION End of Public Methods: Exposed Interface
	// !SECTION End of Object: EASY_SPEAK
})();
