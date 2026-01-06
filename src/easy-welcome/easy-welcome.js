/*!
@language: en-US
@title: easy-welcome.js
@description: The EASY_WELCOME module integrates with EASY_UTILS to provide automated
    onboarding workflows for new players and characters. Configuration is stored in a
    handout allowing GMs to customize steps per campaign.
@version: 1.0.0
@author: Mhykiel
@license: MIT
@repository: {@link https://github.com/tougher-together-games/roll20-api-scripts|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_WELCOME = (() => {
	// SECTION Object: EASY_WELCOME
	/**
	 * @namespace EASY_WELCOME
	 * @summary Automated onboarding for players and characters.
	 *
	 * - **Purpose**:
	 *   - Run configurable workflows when players join
	 *   - Create and configure characters on demand
	 *   - Copy handouts, set properties, send messages
	 *
	 * - **Execution**:
	 *   - Config stored in "EasyWelcome: Config" handout GM notes as JSON
	 *   - newPlayer workflow triggers on first login
	 *   - newCharacter workflow triggers via !ezwelcome --newcharacter
	 *
	 * - **Design**:
	 *   - Label system tracks created objects for placeholder substitution
	 *   - Four step types: createCharacter, copyHandout, sendToChat, changeProperty
	 *   - Welcomed players tracked in vault to prevent re-runs
	 */

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Welcome",
		chatApiName: "ezwelcome",
		globalName: "EASY_WELCOME",
		version: "1.0.0",
		author: "Mhykiel",
		configHandoutName: "EasyWelcome: Config",
		sendWelcomeMsg: true,
		verbose: false,
		debug: {
			"onReady": false,
			"loadConfig": false,
			"executeWorkflow": false,
			"executeStep": false
		}
	};

	// ANCHOR Member: Factory References
	let Utils = {};
	let PhraseFactory = {};

	// ANCHOR Member: Vault Reference
	let EasyWelcomeVault = {};

	// ANCHOR Member: Workflow Configuration
	let workflowConfig = {
		newPlayer: { enabled: false, steps: [] },
		newCharacter: { enabled: false, steps: [] }
	};

	// ANCHOR Member: Default Configuration
	const DEFAULT_CONFIG = {
		newPlayer: {
			enabled: true,
			steps: [
				{
					type: "createCharacter",
					config: {
						label: "pc",
						charType: "pc",
						name: "{{playerName}}'s Character",
						inPlayerJournals: "all",
						controlledBy: "{{playerId}}"
					}
				},
				{
					type: "sendToChat",
					config: {
						message: "/w {{playerName}} Welcome! Your character sheet: [{{character:pc:name}}](http://journal.roll20.net/character/{{character:pc}})"
					}
				}
			]
		},
		newCharacter: {
			enabled: true,
			steps: [
				{
					type: "createCharacter",
					config: {
						label: "pc",
						charType: "pc",
						name: "{{playerName}}'s Character",
						inPlayerJournals: "all",
						controlledBy: "{{playerId}}"
					}
				},
				{
					type: "sendToChat",
					config: {
						message: "/w {{playerName}} Character created: [{{character:pc:name}}](http://journal.roll20.net/character/{{character:pc}})"
					}
				}
			]
		}
	};

	// SECTION Inner Methods: Utility Functions

	// ANCHOR Function: loadConfigFromHandout
	/**
	 * @summary Loads workflow configuration from the config handout.
	 * @returns {Promise<Object>} Parsed configuration or default config
	 */
	const loadConfigFromHandout = () => {
		return new Promise((resolve) => {
			const handout = findObjs({
				_type: "handout",
				name: moduleSettings.configHandoutName
			})[0];

			if (!handout) {
				if (moduleSettings.verbose) {
					Utils.logSyslogMessage({
						severity: "WARN",
						tag: `${moduleSettings.readableName}.loadConfigFromHandout`,
						transUnitId: "40400",
						message: PhraseFactory.get({
							transUnitId: "40400",
							expressions: { remark: moduleSettings.configHandoutName }
						})
					});
				}
				resolve(DEFAULT_CONFIG);
				return;
			}

			handout.get("gmnotes", (gmnotes) => {
				try {
					// NOTE: Decode HTML entities from Roll20
					const decoded = unescape(gmnotes)
						.replace(/<br>/g, "")
						.replace(/<[^>]*>/g, "")
						.replace(/&nbsp;/g, " ")
						.replace(/&quot;/g, '"')
						.replace(/&amp;/g, "&")
						.replace(/&lt;/g, "<")
						.replace(/&gt;/g, ">")
						.trim();

					if (!decoded) {
						resolve(DEFAULT_CONFIG);
						return;
					}

					const config = JSON.parse(decoded);

					if (moduleSettings.debug.loadConfig) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.loadConfigFromHandout`,
							transUnitId: "70000",
							message: JSON.stringify(config)
						});
					}

					resolve(config);
				} catch (err) {
					Utils.logSyslogMessage({
						severity: "ERROR",
						tag: `${moduleSettings.readableName}.loadConfigFromHandout`,
						transUnitId: "50000",
						message: PhraseFactory.get({
							transUnitId: "50000",
							expressions: { remark: `JSON parse error: ${err.message}` }
						})
					});
					resolve(DEFAULT_CONFIG);
				}
			});
		});
	};

	// ANCHOR Function: replacePlaceholders
	/**
	 * @summary Replaces placeholders in a string with context values.
	 * @param {string} text - Text containing placeholders
	 * @param {Object} context - Context with playerId, playerName, and created objects
	 * @returns {string} Text with placeholders replaced
	 */
	const replacePlaceholders = (text, context) => {
		if (typeof text !== "string") return text;

		let result = text;

		// NOTE: Replace player placeholders
		result = result.replace(/\{\{playerId\}\}/g, context.playerId || "");
		result = result.replace(/\{\{playerName\}\}/g, context.playerName || "");

		// NOTE: Replace character placeholders {{character:label}} and {{character:label:name}}
		if (context.characters) {
			for (const [label, data] of Object.entries(context.characters)) {
				const idPattern = new RegExp(`\\{\\{character:${label}\\}\\}`, "g");
				const namePattern = new RegExp(`\\{\\{character:${label}:name\\}\\}`, "g");
				result = result.replace(idPattern, data.id || "");
				result = result.replace(namePattern, data.name || "");
			}
		}

		// NOTE: Replace handout placeholders {{handout:label}} and {{handout:label:name}}
		if (context.handouts) {
			for (const [label, data] of Object.entries(context.handouts)) {
				const idPattern = new RegExp(`\\{\\{handout:${label}\\}\\}`, "g");
				const namePattern = new RegExp(`\\{\\{handout:${label}:name\\}\\}`, "g");
				result = result.replace(idPattern, data.id || "");
				result = result.replace(namePattern, data.name || "");
			}
		}

		return result;
	};

	// ANCHOR Function: replaceConfigPlaceholders
	/**
	 * @summary Recursively replaces placeholders in a config object.
	 * @param {Object|string|Array} config - Config to process
	 * @param {Object} context - Placeholder context
	 * @returns {Object|string|Array} Config with placeholders replaced
	 */
	const replaceConfigPlaceholders = (config, context) => {
		if (typeof config === "string") {
			return replacePlaceholders(config, context);
		}

		if (Array.isArray(config)) {
			return config.map(item => replaceConfigPlaceholders(item, context));
		}

		if (typeof config === "object" && config !== null) {
			const result = {};
			for (const [key, value] of Object.entries(config)) {
				result[key] = replaceConfigPlaceholders(value, context);
			}
			return result;
		}

		return config;
	};

	// !SECTION End of Inner Methods: Utility Functions
	// SECTION Inner Methods: Step Executors

	// ANCHOR Function: executeCreateCharacter
	/**
	 * @summary Creates a character and stores reference in context.
	 * @param {Object} stepConfig - Step configuration
	 * @param {Object} context - Workflow context
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const executeCreateCharacter = async (stepConfig, context) => {
		try {
			const config = replaceConfigPlaceholders(stepConfig, context);

			const charData = {
				name: config.name || `${context.playerName}'s Character`,
				inplayerjournals: config.inPlayerJournals || "",
				controlledby: config.controlledBy || ""
			};

			// NOTE: Set archived based on charType (npc = true, pc = false)
			if (config.charType === "npc") {
				charData.archived = false;
			}

			const character = createObj("character", charData);

			if (!character) {
				Utils.logSyslogMessage({
					severity: "ERROR",
					tag: `${moduleSettings.readableName}.executeCreateCharacter`,
					transUnitId: "50000",
					message: PhraseFactory.get({
						transUnitId: "50000",
						expressions: { remark: "Failed to create character" }
					})
				});
				return 1;
			}

			// NOTE: Store in context for later placeholder use
			const label = config.label || "default";
			context.characters[label] = {
				id: character.get("_id"),
				name: character.get("name"),
				obj: character
			};

			if (moduleSettings.debug.executeStep) {
				Utils.logSyslogMessage({
					severity: "DEBUG",
					tag: `${moduleSettings.readableName}.executeCreateCharacter`,
					transUnitId: "70000",
					message: `Created character "${character.get("name")}" with label "${label}"`
				});
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.executeCreateCharacter`,
				transUnitId: "50000",
				message: PhraseFactory.get({
					transUnitId: "50000",
					expressions: { remark: err.message }
				})
			});
			return 1;
		}
	};

	// ANCHOR Function: executeCopyHandout
	/**
	 * @summary Copies a handout and stores reference in context.
	 * @param {Object} stepConfig - Step configuration
	 * @param {Object} context - Workflow context
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const executeCopyHandout = async (stepConfig, context) => {
		try {
			const config = replaceConfigPlaceholders(stepConfig, context);

			const sourceHandout = findObjs({
				_type: "handout",
				name: config.sourceName
			})[0];

			if (!sourceHandout) {
				Utils.logSyslogMessage({
					severity: "ERROR",
					tag: `${moduleSettings.readableName}.executeCopyHandout`,
					transUnitId: "40400",
					message: PhraseFactory.get({
						transUnitId: "40400",
						expressions: { remark: `Source handout: ${config.sourceName}` }
					})
				});
				return 1;
			}

			// NOTE: Read source content asynchronously
			const [notes, gmnotes] = await new Promise((resolve) => {
				sourceHandout.get("notes", (n) => {
					sourceHandout.get("gmnotes", (gm) => {
						resolve([n, gm]);
					});
				});
			});

			// NOTE: Create new handout
			const newName = config.newName || config.sourceName;
			const newHandout = createObj("handout", {
				name: newName,
				inplayerjournals: config.inPlayerJournals || "",
				controlledby: config.controlledBy || "",
				archived: false
			});

			if (!newHandout) {
				Utils.logSyslogMessage({
					severity: "ERROR",
					tag: `${moduleSettings.readableName}.executeCopyHandout`,
					transUnitId: "50000",
					message: PhraseFactory.get({
						transUnitId: "50000",
						expressions: { remark: "Failed to create handout" }
					})
				});
				return 1;
			}

			// NOTE: Set content after creation
			newHandout.set("notes", notes || "");
			newHandout.set("gmnotes", gmnotes || "");

			// NOTE: Store in context for later placeholder use
			const label = config.label || "default";
			context.handouts[label] = {
				id: newHandout.get("_id"),
				name: newHandout.get("name"),
				obj: newHandout
			};

			if (moduleSettings.debug.executeStep) {
				Utils.logSyslogMessage({
					severity: "DEBUG",
					tag: `${moduleSettings.readableName}.executeCopyHandout`,
					transUnitId: "70000",
					message: `Copied handout "${config.sourceName}" as "${newName}" with label "${label}"`
				});
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.executeCopyHandout`,
				transUnitId: "50000",
				message: PhraseFactory.get({
					transUnitId: "50000",
					expressions: { remark: err.message }
				})
			});
			return 1;
		}
	};

	// ANCHOR Function: executeSendToChat
	/**
	 * @summary Sends a message to chat with placeholder substitution.
	 * @param {Object} stepConfig - Step configuration
	 * @param {Object} context - Workflow context
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const executeSendToChat = async (stepConfig, context) => {
		try {
			const config = replaceConfigPlaceholders(stepConfig, context);
			const message = config.message || "";

			if (!message) {
				Utils.logSyslogMessage({
					severity: "WARN",
					tag: `${moduleSettings.readableName}.executeSendToChat`,
					transUnitId: "40000",
					message: PhraseFactory.get({
						transUnitId: "40000",
						expressions: { remark: "Empty message" }
					})
				});
				return 1;
			}

			const sender = config.as || moduleSettings.readableName;
			sendChat(sender, message);

			if (moduleSettings.debug.executeStep) {
				Utils.logSyslogMessage({
					severity: "DEBUG",
					tag: `${moduleSettings.readableName}.executeSendToChat`,
					transUnitId: "70000",
					message: `Sent: ${message}`
				});
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.executeSendToChat`,
				transUnitId: "50000",
				message: PhraseFactory.get({
					transUnitId: "50000",
					expressions: { remark: err.message }
				})
			});
			return 1;
		}
	};

	// ANCHOR Function: executeChangeProperty
	/**
	 * @summary Changes a property on a character or handout.
	 * @param {Object} stepConfig - Step configuration
	 * @param {Object} context - Workflow context
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const executeChangeProperty = async (stepConfig, context) => {
		try {
			const config = replaceConfigPlaceholders(stepConfig, context);

			const targetId = config.target;
			const property = config.property;
			const mode = config.mode || "replace";

			if (!targetId || !property) {
				Utils.logSyslogMessage({
					severity: "ERROR",
					tag: `${moduleSettings.readableName}.executeChangeProperty`,
					transUnitId: "40000",
					message: PhraseFactory.get({
						transUnitId: "40000",
						expressions: { remark: "Missing target or property" }
					})
				});
				return 1;
			}

			// NOTE: Find target object (character or handout)
			let targetObj = getObj("character", targetId);
			let targetType = "character";

			if (!targetObj) {
				targetObj = getObj("handout", targetId);
				targetType = "handout";
			}

			if (!targetObj) {
				Utils.logSyslogMessage({
					severity: "ERROR",
					tag: `${moduleSettings.readableName}.executeChangeProperty`,
					transUnitId: "40400",
					message: PhraseFactory.get({
						transUnitId: "40400",
						expressions: { remark: `Target: ${targetId}` }
					})
				});
				return 1;
			}

			// NOTE: Get the data to apply
			let newData = "";

			if (config.data !== undefined) {
				// NOTE: Literal data string
				newData = config.data;
			} else if (config.dataFrom) {
				// NOTE: Data from another handout
				const sourceHandout = findObjs({
					_type: "handout",
					name: config.dataFrom.handout
				})[0];

				if (!sourceHandout) {
					Utils.logSyslogMessage({
						severity: "ERROR",
						tag: `${moduleSettings.readableName}.executeChangeProperty`,
						transUnitId: "40400",
						message: PhraseFactory.get({
							transUnitId: "40400",
							expressions: { remark: `Source handout: ${config.dataFrom.handout}` }
						})
					});
					return 1;
				}

				const field = config.dataFrom.field || "notes";
				newData = await new Promise((resolve) => {
					sourceHandout.get(field, (content) => {
						resolve(content || "");
					});
				});
			}

			// NOTE: Handle async properties (bio, gmnotes, notes)
			const asyncProps = ["bio", "gmnotes", "notes"];

			if (asyncProps.includes(property)) {
				// NOTE: Get current value for append/prepend
				const currentValue = await new Promise((resolve) => {
					targetObj.get(property, (content) => {
						resolve(content || "");
					});
				});

				let finalValue;
				switch (mode) {
					case "append":
						finalValue = currentValue + newData;
						break;
					case "prepend":
						finalValue = newData + currentValue;
						break;
					case "replace":
					default:
						finalValue = newData;
						break;
				}

				targetObj.set(property, finalValue);
			} else {
				// NOTE: Direct property (name, avatar, etc.)
				const currentValue = targetObj.get(property) || "";

				let finalValue;
				switch (mode) {
					case "append":
						finalValue = currentValue + newData;
						break;
					case "prepend":
						finalValue = newData + currentValue;
						break;
					case "replace":
					default:
						finalValue = newData;
						break;
				}

				targetObj.set(property, finalValue);
			}

			if (moduleSettings.debug.executeStep) {
				Utils.logSyslogMessage({
					severity: "DEBUG",
					tag: `${moduleSettings.readableName}.executeChangeProperty`,
					transUnitId: "70000",
					message: `Changed ${targetType}.${property} (${mode}) on ${targetId}`
				});
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.executeChangeProperty`,
				transUnitId: "50000",
				message: PhraseFactory.get({
					transUnitId: "50000",
					expressions: { remark: err.message }
				})
			});
			return 1;
		}
	};

	// ANCHOR Function: executeStep
	/**
	 * @summary Executes a single workflow step.
	 * @param {Object} step - Step definition with type and config
	 * @param {Object} context - Workflow context
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const executeStep = async (step, context) => {
		const stepExecutors = {
			createCharacter: executeCreateCharacter,
			copyHandout: executeCopyHandout,
			sendToChat: executeSendToChat,
			changeProperty: executeChangeProperty
		};

		const executor = stepExecutors[step.type];

		if (!executor) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.executeStep`,
				transUnitId: "40400",
				message: PhraseFactory.get({
					transUnitId: "40400",
					expressions: { remark: `Step type: ${step.type}` }
				})
			});
			return 1;
		}

		return await executor(step.config || {}, context);
	};

	// ANCHOR Function: executeWorkflow
	/**
	 * @summary Executes a complete workflow (newPlayer or newCharacter).
	 * @param {string} workflowName - Name of workflow to execute
	 * @param {Object} playerInfo - Player information { playerId, playerName }
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const executeWorkflow = async (workflowName, playerInfo) => {
		const workflow = workflowConfig[workflowName];

		if (!workflow || !workflow.enabled) {
			if (moduleSettings.verbose) {
				Utils.logSyslogMessage({
					severity: "INFO",
					tag: `${moduleSettings.readableName}.executeWorkflow`,
					transUnitId: "70000",
					message: `Workflow "${workflowName}" is disabled or not found`
				});
			}
			return 0;
		}

		// NOTE: Initialize context for placeholder substitution
		const context = {
			playerId: playerInfo.playerId,
			playerName: playerInfo.playerName,
			characters: {},
			handouts: {}
		};

		if (moduleSettings.debug.executeWorkflow) {
			Utils.logSyslogMessage({
				severity: "DEBUG",
				tag: `${moduleSettings.readableName}.executeWorkflow`,
				transUnitId: "70000",
				message: `Starting workflow "${workflowName}" for ${playerInfo.playerName}`
			});
		}

		// NOTE: Execute steps sequentially
		for (let i = 0; i < workflow.steps.length; i++) {
			const step = workflow.steps[i];
			const result = await executeStep(step, context);

			if (result !== 0) {
				Utils.logSyslogMessage({
					severity: "ERROR",
					tag: `${moduleSettings.readableName}.executeWorkflow`,
					transUnitId: "50000",
					message: PhraseFactory.get({
						transUnitId: "50000",
						expressions: { remark: `Step ${i + 1} (${step.type}) failed` }
					})
				});
				// NOTE: Continue with remaining steps despite failure
			}

			// NOTE: Small delay between steps to allow Roll20 to process
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		if (moduleSettings.debug.executeWorkflow) {
			Utils.logSyslogMessage({
				severity: "DEBUG",
				tag: `${moduleSettings.readableName}.executeWorkflow`,
				transUnitId: "70000",
				message: `Completed workflow "${workflowName}" for ${playerInfo.playerName}`
			});
		}

		return 0;
	};

	// !SECTION End of Inner Methods: Step Executors
	// SECTION Inner Methods: Action Processors

	// ANCHOR Function: processMenuAsync
	/**
	 * @summary Displays the Easy-Welcome menu.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processMenuAsync = async (msgDetails) => {
		const thisFuncDebugName = "processMenuAsync";

		try {
			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00001" });
			const menuItemsArray = [];

			// NOTE: New Character button (available to all)
			menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --newcharacter">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00002" })}</a></li>`);

			// NOTE: GM-only options
			if (msgDetails.isGm) {
				menuItemsArray.push(`<li style="border-top: 1px solid #ccc; margin: 5px 0; padding: 0;"></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --reload">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00003" })}</a></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --status">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00004" })}</a></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --createconfig">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00007" })}</a></li>`);
				menuItemsArray.push(`<li data-category="caution"><a role="button" href="\`!${moduleSettings.chatApiName} --reset">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00005" })}</a></li>`);
			}

			const newPlayerStatus = workflowConfig.newPlayer?.enabled ? "✓" : "✗";
			const newCharStatus = workflowConfig.newCharacter?.enabled ? "✓" : "✗";
			const footer = `newPlayer: ${newPlayerStatus} | newCharacter: ${newCharStatus}`;

			const menuContent = {
				title,
				menuItems: menuItemsArray.join("\n"),
				footer
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
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processNewCharacter
	/**
	 * @summary Runs the newCharacter workflow for the calling player.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processNewCharacter = async (msgDetails) => {
		const thisFuncDebugName = "processNewCharacter";

		try {
			const playerInfo = {
				playerId: msgDetails.callerId,
				playerName: msgDetails.callerName
			};

			await executeWorkflow("newCharacter", playerInfo);

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processReload
	/**
	 * @summary Reloads configuration from handout.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processReload = async (msgDetails) => {
		const thisFuncDebugName = "processReload";

		if (!msgDetails.isGm) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00006" })
			});
			return 1;
		}

		try {
			workflowConfig = await loadConfigFromHandout();

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00008" })
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processStatus
	/**
	 * @summary Shows list of welcomed players.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processStatus = async (msgDetails) => {
		const thisFuncDebugName = "processStatus";

		if (!msgDetails.isGm) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00006" })
			});
			return 1;
		}

		try {
			const welcomedPlayers = EasyWelcomeVault.welcomedPlayers || {};
			const playerList = Object.entries(welcomedPlayers)
				.map(([id, data]) => `• ${data.name} (${new Date(data.timestamp).toLocaleDateString()})`)
				.join("\n") || "No players welcomed yet.";

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: `Welcomed Players:\n${playerList}`
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processReset
	/**
	 * @summary Clears the welcomed players list.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processReset = async (msgDetails) => {
		const thisFuncDebugName = "processReset";

		if (!msgDetails.isGm) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00006" })
			});
			return 1;
		}

		try {
			EasyWelcomeVault.welcomedPlayers = {};

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "WARN",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00009" })
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Function: processCreateConfig
	/**
	 * @summary Creates the config handout with default configuration.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processCreateConfig = async (msgDetails) => {
		const thisFuncDebugName = "processCreateConfig";

		if (!msgDetails.isGm) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW00006" })
			});
			return 1;
		}

		try {
			// NOTE: Check if handout already exists
			let handout = findObjs({
				_type: "handout",
				name: moduleSettings.configHandoutName
			})[0];

			if (handout) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW0000A" })
				});
				return 0;
			}

			// NOTE: Create new handout with default config
			handout = createObj("handout", {
				name: moduleSettings.configHandoutName,
				inplayerjournals: "",
				archived: false
			});

			if (!handout) {
				Utils.logSyslogMessage({
					severity: "ERROR",
					tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
					transUnitId: "50000",
					message: PhraseFactory.get({
						transUnitId: "50000",
						expressions: { remark: "Failed to create config handout" }
					})
				});
				return 1;
			}

			// NOTE: Set notes with instructions and gmnotes with default JSON
			const instructions = `<h1>Easy-Welcome Configuration</h1>
<p>Edit the GM Notes section with your workflow configuration in JSON format.</p>
<p>Use <code>!ezwelcome --reload</code> after making changes.</p>
<h2>Available Step Types</h2>
<ul>
<li><strong>createCharacter</strong> - Create a character sheet</li>
<li><strong>copyHandout</strong> - Copy a handout to player</li>
<li><strong>sendToChat</strong> - Send a chat message</li>
<li><strong>changeProperty</strong> - Modify character/handout properties</li>
</ul>
<h2>Available Placeholders</h2>
<ul>
<li><code>{{playerId}}</code> - Player's Roll20 ID</li>
<li><code>{{playerName}}</code> - Player's display name</li>
<li><code>{{character:label}}</code> - Created character's ID</li>
<li><code>{{character:label:name}}</code> - Created character's name</li>
<li><code>{{handout:label}}</code> - Created handout's ID</li>
<li><code>{{handout:label:name}}</code> - Created handout's name</li>
</ul>`;

			const defaultJson = JSON.stringify(DEFAULT_CONFIG, null, 2);

			handout.set("notes", instructions);
			handout.set("gmnotes", defaultJson);

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0EW0000B" })
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({
				severity: "ERROR",
				tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
				transUnitId: "50000",
				message: PhraseFactory.get({ transUnitId: "50000", expressions: { remark: err } })
			});
			return 1;
		}
	};

	// ANCHOR Member: actionMap
	const actionMap = {
		"--menu": (msgDetails) => processMenuAsync(msgDetails),
		"--newcharacter": (msgDetails) => processNewCharacter(msgDetails),
		"--reload": (msgDetails) => processReload(msgDetails),
		"--status": (msgDetails) => processStatus(msgDetails),
		"--reset": (msgDetails) => processReset(msgDetails),
		"--createconfig": (msgDetails) => processCreateConfig(msgDetails)
	};

	// NOTE: Set default action
	actionMap["--default"] = actionMap["--menu"];

	// !SECTION End of Inner Methods: Action Processors
	// SECTION Event Hooks: Roll20 API

	// ANCHOR Function: handlePlayerLogin
	/**
	 * @summary Handles player login event for newPlayer workflow.
	 * @param {Object} player - Roll20 player object
	 */
	const handlePlayerLogin = async (player) => {
		const playerId = player.get("_id");
		const playerName = player.get("_displayname");

		// NOTE: Skip GMs
		if (playerIsGM(playerId)) return;

		// NOTE: Check if already welcomed
		EasyWelcomeVault.welcomedPlayers = EasyWelcomeVault.welcomedPlayers || {};

		if (EasyWelcomeVault.welcomedPlayers[playerId]) {
			if (moduleSettings.verbose) {
				Utils.logSyslogMessage({
					severity: "INFO",
					tag: `${moduleSettings.readableName}.handlePlayerLogin`,
					transUnitId: "70000",
					message: `Player "${playerName}" already welcomed, skipping.`
				});
			}
			return;
		}

		// NOTE: Mark as welcomed
		EasyWelcomeVault.welcomedPlayers[playerId] = {
			name: playerName,
			timestamp: Date.now()
		};

		// NOTE: Execute newPlayer workflow
		const playerInfo = { playerId, playerName };

		// NOTE: Delay to allow Roll20 to fully process login
		setTimeout(async () => {
			await executeWorkflow("newPlayer", playerInfo);
		}, 3000);
	};

	// ANCHOR Outer Method: registerEventHandlers
	const registerEventHandlers = () => {
		// NOTE: Chat command handler
		on("chat:message", (apiCall) => {
			if (apiCall.type === "api" && apiCall.content.startsWith(`!${moduleSettings.chatApiName}`)) {
				Utils.handleApiCall({ actionMap, apiCall });
			}
		});

		// NOTE: Player login handler
		on("change:player:_online", (player) => {
			if (player.get("_online")) {
				handlePlayerLogin(player);
			}
		});

		return 0;
	};

	// ANCHOR Outer Method: checkInstall
	const checkInstall = async () => {
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

			// NOTE: Get reference to shared forge and factories
			const easySharedForge = Utils.getSharedForge();
			PhraseFactory = easySharedForge.getFactory({ name: "PhraseFactory" });

			// NOTE: Initialize vault storage
			const sharedVault = Utils.getSharedVault();
			sharedVault.EasyWelcome = sharedVault.EasyWelcome || { welcomedPlayers: {} };
			EasyWelcomeVault = sharedVault.EasyWelcome;

			if (moduleSettings.verbose) {
				const msgId = "10000";
				Utils.logSyslogMessage({
					severity: "INFO",
					tag: moduleSettings.readableName,
					transUnitId: msgId,
					message: PhraseFactory.get({ transUnitId: msgId })
				});
			}

			// NOTE: Add localization phrases
			PhraseFactory.add({
				newMap: {
					enUS: {
						"0x0EW00001": "Easy Welcome",
						"0x0EW00002": "New Character",
						"0x0EW00003": "Reload Config",
						"0x0EW00004": "View Status",
						"0x0EW00005": "Reset Welcomed List",
						"0x0EW00006": "GM only command.",
						"0x0EW00007": "Create Config Handout",
						"0x0EW00008": "Configuration reloaded.",
						"0x0EW00009": "Welcomed players list cleared.",
						"0x0EW0000A": "Config handout already exists.",
						"0x0EW0000B": "Config handout created. Edit GM Notes to customize."
					},
					frFR: {
						"0x0EW00001": "Easy Welcome",
						"0x0EW00002": "Nouveau Personnage",
						"0x0EW00003": "Recharger Config",
						"0x0EW00004": "Voir Statut",
						"0x0EW00005": "R\u00e9initialiser Liste",
						"0x0EW00006": "Commande r\u00e9serv\u00e9e au MJ.",
						"0x0EW00007": "Cr\u00e9er Handout Config",
						"0x0EW00008": "Configuration recharg\u00e9e.",
						"0x0EW00009": "Liste des joueurs accueillis effac\u00e9e.",
						"0x0EW0000A": "Le handout de config existe d\u00e9j\u00e0.",
						"0x0EW0000B": "Handout de config cr\u00e9\u00e9. Modifiez les notes du MJ."
					}
				}
			});

			// NOTE: Load configuration from handout
			workflowConfig = await loadConfigFromHandout();

			return 0;
		} else {
			const _getSyslogTimestamp = () => new Date().toISOString();
			const logMessage = `<e> ${_getSyslogTimestamp()} [${moduleSettings.readableName}](checkInstall): {"transUnitId": 50000, "message": "Not Found: EASY_UTILS is unavailable."}`;
			log(logMessage);

			return 1;
		}
	};

	// ANCHOR Event: on(ready)
	on("ready", async () => {
		const continueMod = await checkInstall();

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

	return {
		// NOTE: Expose for external API integration
		executeWorkflow: (workflowName, playerInfo) => executeWorkflow(workflowName, playerInfo),
		reloadConfig: async () => { workflowConfig = await loadConfigFromHandout(); }
	};

	// !SECTION End of Public Methods: Exposed Interface
	// !SECTION End of Object: EASY_WELCOME
})();