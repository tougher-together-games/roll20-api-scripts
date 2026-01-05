/*!
@language: en-US
@title: easy-range.js
@description: Distance calculator for Roll20. Measures range between source and target tokens
	with support for multiple calculation methods, elevation, and creature size adjustment.
@version: 1.0.0
@author: Mhykiel
@license: MIT
@original: Kilthar (https://gist.github.com/kilthar/4decaa1d45def15929e83470069f4843)
@repository: {@link https://github.com/tougher-together-games/roll20-api-scripts|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_RANGE = (() => {
	// SECTION Object: EASY_RANGE
	/**
	 * @namespace EASY_RANGE
	 * @summary Distance calculator for Roll20.
	 *
	 * - **Purpose**:
	 *   - Calculate distance between two tokens
	 *   - Support multiple calculation methods (5e, 3.5e, Euclidean, Manhattan, Hex)
	 *   - Include elevation with creature size adjustment
	 *
	 * - **Execution**:
	 *   - !ezrange --measure source|<token_id> target|<token_id>
	 *   - GM can configure via !ezrange --menu
	 *
	 * - **Design**:
	 *   - Preserves original RangeFinder calculation logic
	 *   - Integrates with EASY_UTILS for theming and messaging
	 *   - Configuration stored in EASY_VAULT
	 */

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Range",
		chatApiName: "ezrange",
		globalName: "EASY_RANGE",
		version: "1.0.0",
		author: "Mhykiel",
		sendWelcomeMsg: false,
		verbose: false,
		debug: {
			"onReady": false,
			"processRange": false,
			"processMenuAsync": false,
			"processConfig": false
		}
	};

	// ANCHOR Member: DEFAULT_CONFIG
	const DEFAULT_CONFIG = {
		elevationBar: "bar4_value",
		useHeight: true,
		calculationMethod: "auto"
	};

	// ANCHOR Member: GRID_SIZE
	const GRID_SIZE = 70;

	// ANCHOR Member: OUTPUT_CSS
	const OUTPUT_CSS = "width: 189px; border: 1px solid black; background-color: #ffffff; padding: 5px; font-size: 16px;";

	// ANCHOR Member: Factory References
	let Utils = {};
	let PhraseFactory = {};

	// ANCHOR Member: Vault Reference
	let EasyRangeVault = {};

	// SECTION Inner Methods: Configuration

	// ANCHOR Function: getConfig
	/**
	 * @summary Retrieves current configuration with defaults.
	 * @returns {Object} Configuration object
	 */
	const getConfig = () => {
		return { ...DEFAULT_CONFIG, ...EasyRangeVault };
	};

	// ANCHOR Function: setConfig
	/**
	 * @summary Updates configuration in vault.
	 * @param {string} key - Configuration key
	 * @param {*} value - Configuration value
	 */
	const setConfig = (key, value) => {
		if (DEFAULT_CONFIG.hasOwnProperty(key)) {
			EasyRangeVault[key] = value;
		}
	};

	// !SECTION End of Inner Methods: Configuration
	// SECTION Inner Methods: Calculation Functions

	// ANCHOR Function: calculateDistance
	/**
	 * @summary Main distance calculation - preserves original RangeFinder logic.
	 * @param {Object} token1 - Source token
	 * @param {Object} token2 - Target token
	 * @param {Object} page - Page object
	 * @returns {Object} { squares, distance, units, showSquares }
	 */
	const calculateDistance = (token1, token2, page) => {
		const config = getConfig();
		const curScale = page.get("scale_number") || 5;
		const curUnit = page.get("scale_units") || "ft";
		const curGridType = page.get("grid_type") || "square";
		const curDiagonalType = page.get("diagonaltype") || "foure";

		// NOTE: Determine calculation method
		const method = config.calculationMethod === "auto" ? curDiagonalType : config.calculationMethod;

		let dist = 0;
		let distSQ = 0;
		let showSquares = false;

		// ANCHOR Calculation: D&D 4e/5e (foure)
		if (method === "foure" && curGridType === "square") {
			let lDist = Math.abs(token1.get("left") - token2.get("left")) / GRID_SIZE;
			let tDist = Math.abs(token1.get("top") - token2.get("top")) / GRID_SIZE;
			let zDist = 0;

			if (config.useHeight && config.elevationBar !== "none") {
				zDist = Math.abs((parseFloat(token1.get(config.elevationBar)) || 0) - (parseFloat(token2.get(config.elevationBar)) || 0)) / curScale;
				if (zDist >= 1) {
					zDist = zDist - 1; // Medium creature occupies 1 unit vertical space
				}
			}

			dist = Math.floor(Math.max(Math.min(lDist, tDist) + Math.abs(lDist - tDist), zDist));
			distSQ = dist;
			dist = dist * curScale;
			showSquares = true;
		}

		// ANCHOR Calculation: D&D 3.5/Pathfinder (threefive)
		if (method === "threefive" && curGridType === "square") {
			let lDist = Math.abs(token1.get("left") - token2.get("left"));
			let tDist = Math.abs(token1.get("top") - token2.get("top"));
			let zDist = 0;

			const t1Height = Number(token1.get("height")) || GRID_SIZE;
			const t2Height = Number(token2.get("height")) || GRID_SIZE;

			if (config.useHeight && config.elevationBar !== "none") {
				zDist = Math.abs((parseFloat(token1.get(config.elevationBar)) || 0) - (parseFloat(token2.get(config.elevationBar)) || 0)) / curScale * GRID_SIZE;
				if (zDist >= GRID_SIZE) {
					zDist = zDist - ((t1Height + t2Height) / 2);
				}
			}

			dist = Math.floor(1.5 * Math.min(lDist, tDist) + Math.abs(lDist - tDist)) - ((t1Height + t2Height) / 2);
			zDist = 1.118033988749895 * zDist; // Height scaling factor
			dist = Math.sqrt(dist * dist + zDist * zDist);
			dist = dist * curScale / GRID_SIZE;
			dist = curScale * Math.round(dist / curScale);
			showSquares = false;
		}

		// ANCHOR Calculation: Euclidean (pythagorean)
		if (method === "pythagorean" && curGridType === "square") {
			let lDist = Math.abs(token1.get("left") - token2.get("left")) / GRID_SIZE;
			let tDist = Math.abs(token1.get("top") - token2.get("top")) / GRID_SIZE;

			dist = Math.sqrt(lDist * lDist + tDist * tDist);
			distSQ = dist;
			dist = dist * curScale;
			dist = Math.round(dist * 10) / 10;
			showSquares = false;
		}

		// ANCHOR Calculation: Manhattan
		if (method === "manhattan" && curGridType === "square") {
			let lDist = Math.abs(token1.get("left") - token2.get("left")) / GRID_SIZE;
			let tDist = Math.abs(token1.get("top") - token2.get("top")) / GRID_SIZE;

			dist = Math.round(lDist + tDist);
			distSQ = dist;
			dist = dist * curScale;
			showSquares = true;
		}

		// ANCHOR Calculation: Hex(V)
		if (curGridType === "hex") {
			let lDist = Math.abs(token1.get("left") - token2.get("left"));
			let tDist = Math.abs(token1.get("top") - token2.get("top"));

			lDist = lDist / 75.19856198446026;
			tDist = tDist / 66.96582782426833;
			dist = 1.5 * Math.min(lDist, tDist) + Math.abs(lDist - tDist);
			dist = Math.round(dist * curScale * 1000) / 1000;
			showSquares = false;
		}

		// ANCHOR Calculation: Hex(H)
		if (curGridType === "hexr") {
			let lDist = Math.abs(token1.get("left") - token2.get("left"));
			let tDist = Math.abs(token1.get("top") - token2.get("top"));

			lDist = lDist / 69.58512749037783;
			tDist = tDist / 79.68878998350463;
			dist = 1.5 * Math.min(lDist, tDist) + Math.abs(lDist - tDist);
			dist = Math.round(dist * curScale * 1000) / 1000;
			showSquares = false;
		}

		return {
			squares: distSQ,
			distance: dist,
			units: curUnit,
			showSquares: showSquares
		};
	};

	// !SECTION End of Inner Methods: Calculation Functions
	// SECTION Inner Methods: Action Processors

	// ANCHOR Function: findPlayerPage
	/**
	 * @summary Finds the page the player is currently viewing.
	 * @param {string} playerId - Player ID
	 * @returns {Object|null} Page object or null
	 */
	const findPlayerPage = (playerId) => {
		// NOTE: Check GM's last viewed page
		if (playerIsGM(playerId)) {
			const player = getObj("player", playerId);
			if (player) {
				const page = getObj("page", player.get("lastpage"));
				if (page) return page;
			}
		}

		// NOTE: Check player-specific pages
		const playerPages = Campaign().get("playerspecificpages");
		if (playerPages && playerPages[playerId]) {
			const page = getObj("page", playerPages[playerId]);
			if (page) return page;
		}

		// NOTE: Default to player ribbon page
		return getObj("page", Campaign().get("playerpageid"));
	};

	// ANCHOR Function: processRange
	/**
	 * @summary Calculates and displays range between source and target tokens.
	 * @description Command format: !ezrange --measure source|<token_id> target|<token_id>
	 * @param {Object} msgDetails - Parsed message details
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processRange = async (msgDetails) => {
		const thisFuncDebugName = "processRange";

		try {
			const content = msgDetails.raw.content;

			// NOTE: Parse source|<token_id> and target|<token_id>
			const sourceMatch = content.match(/source\|(-[A-Za-z0-9_-]{19})/i);
			const targetMatch = content.match(/target\|(-[A-Za-z0-9_-]{19})/i);

			if (!sourceMatch || !targetMatch) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0RA01001" })
				});
				return 1;
			}

			const sourceId = sourceMatch[1];
			const targetId = targetMatch[1];

			// NOTE: Get page from caller
			const curPage = findPlayerPage(msgDetails.callerId);
			if (!curPage) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0RA01002" })
				});
				return 1;
			}

			// NOTE: Get tokens
			const token1 = findObjs({ _type: "graphic", layer: "objects", _pageid: curPage.id, _id: sourceId })[0];
			const token2 = findObjs({ _type: "graphic", layer: "objects", _pageid: curPage.id, _id: targetId })[0];

			if (!token1) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0RA01003" })
				});
				return 1;
			}

			if (!token2) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0RA01004" })
				});
				return 1;
			}

			// NOTE: Calculate distance
			const result = calculateDistance(token1, token2, curPage);
			const sourceName = token1.get("name") || "Token";

			// NOTE: Debug logging
			if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
				Utils.logSyslogMessage({
					severity: "DEBUG",
					tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
					transUnitId: "70000",
					message: JSON.stringify(result)
				});
			}

			// NOTE: Build output message matching original RangeFinder style
			let finalMessage;
			if (result.showSquares) {
				finalMessage = `Distance between ${sourceName} and target creature is (${result.squares}) ${result.distance} ${result.units}.`;
			} else {
				finalMessage = `Distance between ${sourceName} and target creature is ${result.distance} ${result.units}.`;
			}

			// NOTE: Whisper result to caller using original template style
			Utils.whisperPlayerMessage({
				from: "RangeFinder",
				to: msgDetails.callerName,
				message: `<div style="${OUTPUT_CSS}">${finalMessage}</div>`
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

	// ANCHOR Function: processMenuAsync
	/**
	 * @summary Displays GM configuration menu using renderTemplateAsync.
	 * @param {Object} msgDetails - Parsed message details
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processMenuAsync = async (msgDetails) => {
		const thisFuncDebugName = "processMenuAsync";

		try {
			// NOTE: GM only
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0RA01010" })
				});
				return 1;
			}

			const config = getConfig();
			const api = `!${moduleSettings.chatApiName}`;

			// NOTE: Labels for display
			const barLabels = {
				"none": "None",
				"bar1_value": "Bar 1",
				"bar2_value": "Bar 2",
				"bar3_value": "Bar 3",
				"bar4_value": "Bar 4"
			};

			const methodLabels = {
				"auto": "Auto (Page Setting)",
				"foure": "D&D 4e/5e",
				"threefive": "D&D 3.5/Pathfinder",
				"pythagorean": "Euclidean",
				"manhattan": "Manhattan"
			};

			// NOTE: Build dropdowns for Roll20 queries
			const barOptions = Object.entries(barLabels).map(([k, v]) => `${v},${k}`).join("|");
			const methodOptions = Object.entries(methodLabels).map(([k, v]) => `${v},${k}`).join("|");

			// NOTE: Current settings for display
			const currentBar = barLabels[config.elevationBar] || config.elevationBar;
			const currentMethod = methodLabels[config.calculationMethod] || config.calculationMethod;
			const currentHeight = config.useHeight ? "Enabled" : "Disabled";

			// NOTE: Build menu title
			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0RA01020" });

			// NOTE: Build menu items
			const menuItemsArray = [];

			// Current settings display
			menuItemsArray.push(`<li><b>Elevation Bar:</b> ${currentBar}</li>`);
			menuItemsArray.push(`<li><b>Use Elevation:</b> ${currentHeight}</li>`);
			menuItemsArray.push(`<li><b>Calculation:</b> ${currentMethod}</li>`);

			// Divider
			menuItemsArray.push(`</ul><h4>${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0RA01021" })}</h4><ul>`);

			// Config buttons
			menuItemsArray.push(`<li><a role="button" href="\`${api} --config --elevationBar|?{Elevation Bar|${barOptions}}">Set Elevation Bar</a></li>`);
			menuItemsArray.push(`<li><a role="button" href="\`${api} --config --useHeight|?{Use Elevation|Enable,true|Disable,false}">Toggle Elevation</a></li>`);
			menuItemsArray.push(`<li><a role="button" href="\`${api} --config --calculationMethod|?{Calculation Method|${methodOptions}}">Set Calc Method</a></li>`);

			const menuContent = {
				title,
				menuItems: menuItemsArray.join("\n"),
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

	// ANCHOR Function: processConfig
	/**
	 * @summary Processes configuration changes.
	 * @param {Object} msgDetails - Parsed message details
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processConfig = async (msgDetails) => {
		const thisFuncDebugName = "processConfig";

		try {
			// NOTE: GM only
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0RA01010" })
				});
				return 1;
			}

			const content = msgDetails.raw.content;

			// NOTE: Check for elevationBar
			const barMatch = content.match(/--elevationBar\|(\S+)/i);
			if (barMatch) {
				const value = barMatch[1];
				const validBars = ["none", "bar1_value", "bar2_value", "bar3_value", "bar4_value"];
				if (validBars.includes(value)) {
					setConfig("elevationBar", value);
				}
			}

			// NOTE: Check for useHeight
			const heightMatch = content.match(/--useHeight\|(\S+)/i);
			if (heightMatch) {
				const value = heightMatch[1].toLowerCase();
				setConfig("useHeight", value === "true");
			}

			// NOTE: Check for calculationMethod
			const methodMatch = content.match(/--calculationMethod\|(\S+)/i);
			if (methodMatch) {
				const value = methodMatch[1];
				const validMethods = ["auto", "foure", "threefive", "pythagorean", "manhattan"];
				if (validMethods.includes(value)) {
					setConfig("calculationMethod", value);
				}
			}

			// NOTE: Show updated menu
			return processMenuAsync(msgDetails);

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
		"--measure": (msgDetails, args) => processRange(msgDetails, args),
		"--menu": (msgDetails, args) => processMenuAsync(msgDetails, args),
		"--config": (msgDetails, args) => processConfig(msgDetails, args)
	};

	// NOTE: Default action shows menu
	actionMap["--default"] = (msgDetails, args) => processMenuAsync(msgDetails, args);

	// ANCHOR Outer Method: registerEventHandlers
	const registerEventHandlers = () => {
		on("chat:message", (apiCall) => {
			if (apiCall.type === "api" && apiCall.content.startsWith(`!${moduleSettings.chatApiName}`)) {

				// NOTE: Build msgDetails for special handlers
				const buildMsgDetails = () => ({
					raw: apiCall,
					callerId: apiCall.playerid,
					callerName: (getObj("player", apiCall.playerid) || { get: () => "Unknown" }).get("_displayname"),
					isGm: playerIsGM(apiCall.playerid),
					selectedIds: (apiCall.selected || []).map(s => s._id)
				});

				// NOTE: Special handling for pipe-delimited config commands
				if (apiCall.content.includes("--config")) {
					processConfig(buildMsgDetails());
					return;
				}

				// NOTE: Special handling for pipe-delimited measure commands
				if (apiCall.content.includes("--measure")) {
					processRange(buildMsgDetails());
					return;
				}

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

			// NOTE: Get reference to shared forge and factories
			const easySharedForge = Utils.getSharedForge();
			PhraseFactory = easySharedForge.getFactory({ name: "PhraseFactory" });

			// NOTE: Initialize vault storage
			const sharedVault = Utils.getSharedVault();
			sharedVault.EasyRange = sharedVault.EasyRange || {};
			EasyRangeVault = sharedVault.EasyRange;

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
						"0x0RA01001": "Missing source or target. Usage: !ezrange --measure source|@{selected|token_id} target|@{target|Target|token_id}",
						"0x0RA01002": "Could not determine player page.",
						"0x0RA01003": "Source token not found.",
						"0x0RA01004": "Target token not found.",
						"0x0RA01010": "Only the GM can configure this module.",
						"0x0RA01020": "Easy-Range Finder",
						"0x0RA01021": "Configuration"
					}
				}
			});

			return 0;

		} else {
			const _getSyslogTimestamp = () => new Date().toISOString();
			const logMessage = `<e> ${_getSyslogTimestamp()} [${moduleSettings.readableName}](checkInstall): {"transUnitId": 50000, "message": "Not Found: EASY_UTILS is unavailable."}`;
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

	return {
		getConfig: () => getConfig(),
		calculateDistance: (token1, token2, page) => calculateDistance(token1, token2, page)
	};

	// !SECTION End of Public Methods: Exposed Interface
	// !SECTION End of Object: EASY_RANGE
})();