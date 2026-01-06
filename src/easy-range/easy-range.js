/*!
@language: en-US
@title: easy-range.js
@description: Distance calculator for Roll20. Measures range between source and target tokens
	with support for multiple calculation methods, elevation, and creature size adjustment.
@version: 1.1.0
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
	 *   - !ezrange --measure start|<token_id> finish|<token_id>
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
		version: "1.1.0",
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
		elevationBar: "bar3_value",
		useHeight: true,
		calculationMethod: "auto"
	};

	// ANCHOR Member: GRID_SIZE
	const GRID_SIZE = 70;

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

		// ANCHOR Calculation: Token sizes for edge-to-edge
		const t1Width = (Number(token1.get("width")) || GRID_SIZE) / GRID_SIZE;
		const t2Width = (Number(token2.get("width")) || GRID_SIZE) / GRID_SIZE;
		const t1Height = (Number(token1.get("height")) || GRID_SIZE) / GRID_SIZE;
		const t2Height = (Number(token2.get("height")) || GRID_SIZE) / GRID_SIZE;

		// ANCHOR Calculation: Vertical Distance (always Pythagorean combined with horizontal)
		let zDist = 0;
		if (config.elevationBar !== "none") {
			const elev1 = parseFloat(token1.get(config.elevationBar)) || 0;
			const elev2 = parseFloat(token2.get(config.elevationBar)) || 0;

			// NOTE: Higher elevation minus lower elevation (works with negatives)
			const higherElev = Math.max(elev1, elev2);
			const lowerElev = Math.min(elev1, elev2);
			zDist = higherElev - lowerElev;

			// NOTE: Subtract lower token's height - they reach up toward higher token
			if (config.useHeight) {
				const lowerToken = (elev1 <= elev2) ? token1 : token2;
				const lowerHeightUnits = (Number(lowerToken.get("height")) || GRID_SIZE) / GRID_SIZE * curScale;
				zDist = Math.max(0, zDist - lowerHeightUnits);
			}
		}

		// ANCHOR Calculation: Horizontal distance (center-to-center, then adjust to edge-to-edge)
		let lDistCenter = Math.abs(token1.get("left") - token2.get("left")) / GRID_SIZE;
		let tDistCenter = Math.abs(token1.get("top") - token2.get("top")) / GRID_SIZE;

		// NOTE: Subtract half of each token's size to get edge-to-edge
		let lDist = Math.max(0, lDistCenter - (t1Width / 2) - (t2Width / 2));
		let tDist = Math.max(0, tDistCenter - (t1Height / 2) - (t2Height / 2));

		// ANCHOR Calculation: D&D 4e/5e (foure)
		if (method === "foure" && curGridType === "square") {
			// NOTE: Horizontal distance using 5e rules (max of X and Y)
			let hDist = Math.max(lDist, tDist) * curScale;

			// NOTE: Combine horizontal and vertical with Pythagorean
			dist = Math.sqrt(hDist * hDist + zDist * zDist);
			dist = curScale * Math.round(dist / curScale);
			distSQ = Math.round(dist / curScale);
			showSquares = true;
		}

		// ANCHOR Calculation: D&D 3.5/Pathfinder (threefive)
		if (method === "threefive" && curGridType === "square") {
			// NOTE: Horizontal distance using 3.5e rules (diagonal costs 1.5)
			let hDist = (1.5 * Math.min(lDist, tDist) + Math.abs(lDist - tDist)) * curScale;

			// NOTE: Combine horizontal and vertical with Pythagorean
			dist = Math.sqrt(hDist * hDist + zDist * zDist);
			dist = curScale * Math.round(dist / curScale);
			showSquares = false;
		}

		// ANCHOR Calculation: Euclidean (pythagorean)
		if (method === "pythagorean" && curGridType === "square") {
			// NOTE: Horizontal distance using true Euclidean
			let hDist = Math.sqrt(lDist * lDist + tDist * tDist) * curScale;

			// NOTE: Combine horizontal and vertical with Pythagorean
			dist = Math.sqrt(hDist * hDist + zDist * zDist);
			dist = Math.round(dist * 10) / 10;
			distSQ = Math.round(dist / curScale * 10) / 10;
			showSquares = false;
		}

		// ANCHOR Calculation: Manhattan
		if (method === "manhattan" && curGridType === "square") {
			// NOTE: Horizontal distance using Manhattan (X + Y)
			let hDist = (lDist + tDist) * curScale;

			// NOTE: Combine horizontal and vertical with Pythagorean
			dist = Math.sqrt(hDist * hDist + zDist * zDist);
			dist = curScale * Math.round(dist / curScale);
			distSQ = Math.round(dist / curScale);
			showSquares = true;
		}

		// ANCHOR Calculation: Hex(V)
		if (curGridType === "hex") {
			let lDistHex = Math.abs(token1.get("left") - token2.get("left"));
			let tDistHex = Math.abs(token1.get("top") - token2.get("top"));

			lDistHex = lDistHex / 75.19856198446026;
			tDistHex = tDistHex / 66.96582782426833;

			// NOTE: Adjust for token sizes
			lDistHex = Math.max(0, lDistHex - (t1Width / 2) - (t2Width / 2));
			tDistHex = Math.max(0, tDistHex - (t1Height / 2) - (t2Height / 2));

			let hDist = (1.5 * Math.min(lDistHex, tDistHex) + Math.abs(lDistHex - tDistHex)) * curScale;

			// NOTE: Combine horizontal and vertical with Pythagorean
			dist = Math.sqrt(hDist * hDist + zDist * zDist);
			dist = Math.round(dist * 1000) / 1000;
			showSquares = false;
		}

		// ANCHOR Calculation: Hex(H)
		if (curGridType === "hexr") {
			let lDistHex = Math.abs(token1.get("left") - token2.get("left"));
			let tDistHex = Math.abs(token1.get("top") - token2.get("top"));

			lDistHex = lDistHex / 69.58512749037783;
			tDistHex = tDistHex / 79.68878998350463;

			// NOTE: Adjust for token sizes
			lDistHex = Math.max(0, lDistHex - (t1Width / 2) - (t2Width / 2));
			tDistHex = Math.max(0, tDistHex - (t1Height / 2) - (t2Height / 2));

			let hDist = (1.5 * Math.min(lDistHex, tDistHex) + Math.abs(lDistHex - tDistHex)) * curScale;

			// NOTE: Combine horizontal and vertical with Pythagorean
			dist = Math.sqrt(hDist * hDist + zDist * zDist);
			dist = Math.round(dist * 1000) / 1000;
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
	 * @summary Calculates and displays range between start and finish tokens.
	 * @description Command format: !ezrange --measure start|<token_id> finish|<token_id>
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments { start, finish }
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processRange = async (msgDetails, parsedArgs) => {
		const thisFuncDebugName = "processRange";

		try {
			const startId = parsedArgs.start;
			const finishId = parsedArgs.finish;

			// NOTE: Validate required arguments
			if (!startId || !finishId) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01001" })
				});
				return 1;
			}

			// NOTE: Get page from caller
			const curPage = findPlayerPage(msgDetails.callerId);
			if (!curPage) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01002" })
				});
				return 1;
			}

			// NOTE: Get tokens
			const token1 = findObjs({ _type: "graphic", layer: "objects", _pageid: curPage.id, _id: startId })[0];
			const token2 = findObjs({ _type: "graphic", layer: "objects", _pageid: curPage.id, _id: finishId })[0];

			if (!token1) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01003" })
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
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01004" })
				});
				return 1;
			}

			// NOTE: Calculate distance
			const result = calculateDistance(token1, token2, curPage);

			// NOTE: Debug logging
			if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
				Utils.logSyslogMessage({
					severity: "DEBUG",
					tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
					transUnitId: "70000",
					message: JSON.stringify(result)
				});
			}

			// NOTE: Build distance string
			let distanceText;
			if (result.showSquares) {
				distanceText = `(${result.squares}) ${result.distance} ${result.units}`;
			} else {
				distanceText = `${result.distance} ${result.units}`;
			}

			// NOTE: Build announcement content
			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01020" });
			const directionLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01030" });
			const body = `<p>${directionLabel}</p><p><strong>${distanceText}</strong></p>`;

			const announcementContent = {
				title,
				body,
				footer: `v${moduleSettings.version}`
			};

			const styledMessage = await Utils.renderTemplateAsync({
				template: "chatAnnouncement",
				expressions: announcementContent,
				theme: "chatAnnouncement",
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

	// ANCHOR Function: processMenuAsync
	/**
	 * @summary Displays GM configuration menu using renderTemplateAsync.
	 * @param {Object} msgDetails - Parsed message details
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processMenuAsync = async (msgDetails) => {
		const thisFuncDebugName = "processMenuAsync";

		try {
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
			const currentHeight = config.useHeight
				? PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01031" })
				: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01032" });

			// NOTE: Build menu title
			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01020" });

			// NOTE: Build current settings display
			const settingsHeader = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01021" });
			const elevationBarLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01022" });
			const sizeAdjLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01023" });
			const calcLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01024" });

			const settingsDisplay = [
				`<p><strong>${elevationBarLabel}:</strong> ${currentBar}</p>`,
				`<p><strong>${sizeAdjLabel}:</strong> ${currentHeight}</p>`,
				`<p><strong>${calcLabel}:</strong> ${currentMethod}</p>`
			];

			let body = `<div class="ez-header">${settingsHeader}</div>`;
			body += `<div class="ez-content">${settingsDisplay.join("\n")}</div>`;

			// NOTE: Add GM-only config section
			if (msgDetails.isGm) {
				const gmHeader = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x09B11313" });

				const setElevationLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01025" });
				const toggleSizeLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01026" });
				const setCalcLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01027" });
				const enableLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01033" });
				const disableLabel = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01034" });

				const gmButtons = [
					`<a class="ez-btn" href="\`${api} --config elevationBar|?{${elevationBarLabel}|${barOptions}}">${setElevationLabel}</a>`,
					`<a class="ez-btn" href="\`${api} --config useHeight|?{${sizeAdjLabel}|${enableLabel},true|${disableLabel},false}">${toggleSizeLabel}</a>`,
					`<a class="ez-btn" href="\`${api} --config calculationMethod|?{${calcLabel}|${methodOptions}}">${setCalcLabel}</a>`
				];

				body += `<div class="ez-header">${gmHeader}</div>`;
				body += `<div class="ez-content">${gmButtons.join("\n")}</div>`;
			}

			const menuContent = {
				title,
				subtitle: "",
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
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processConfig = async (msgDetails, parsedArgs) => {
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
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0ER01010" })
				});
				return 1;
			}

			// NOTE: Check for elevationBar
			if (parsedArgs.elevationBar !== undefined) {
				const value = parsedArgs.elevationBar;
				const validBars = ["none", "bar1_value", "bar2_value", "bar3_value", "bar4_value"];
				if (validBars.includes(value)) {
					setConfig("elevationBar", value);
				}
			}

			// NOTE: Check for useHeight
			if (parsedArgs.useHeight !== undefined) {
				const value = String(parsedArgs.useHeight).toLowerCase();
				setConfig("useHeight", value === "true");
			}

			// NOTE: Check for calculationMethod
			if (parsedArgs.calculationMethod !== undefined) {
				const value = parsedArgs.calculationMethod;
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
		"--measure": (msgDetails, parsedArgs) => processRange(msgDetails, parsedArgs),
		"--menu": (msgDetails) => processMenuAsync(msgDetails),
		"--config": (msgDetails, parsedArgs) => processConfig(msgDetails, parsedArgs)
	};

	// NOTE: Default action shows menu
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
						"0x0ER01001": "Missing start or finish token. Usage: !ezrange --measure start|@{selected|token_id} finish|@{target|Target|token_id}",
						"0x0ER01002": "Could not determine player page.",
						"0x0ER01003": "Start token not found.",
						"0x0ER01004": "Finish token not found.",
						"0x0ER01010": "Only the GM can configure this module.",
						"0x0ER01020": "Range Finder",
						"0x0ER01021": "Current Settings",
						"0x0ER01022": "Elevation Bar",
						"0x0ER01023": "Size Adjustment",
						"0x0ER01024": "Calculation",
						"0x0ER01025": "Set Elevation Bar",
						"0x0ER01026": "Toggle Size Adjustment",
						"0x0ER01027": "Set Calculation Method",
						"0x0ER01030": "Selected → Target",
						"0x0ER01031": "On",
						"0x0ER01032": "Off",
						"0x0ER01033": "Enable",
						"0x0ER01034": "Disable"
					},
					frFR: {
						"0x0ER01001": "Jeton de départ ou d'arrivée manquant. Usage: !ezrange --measure start|@{selected|token_id} finish|@{target|Target|token_id}",
						"0x0ER01002": "Impossible de déterminer la page du joueur.",
						"0x0ER01003": "Jeton de départ introuvable.",
						"0x0ER01004": "Jeton d'arrivée introuvable.",
						"0x0ER01010": "Seul le MJ peut configurer ce module.",
						"0x0ER01020": "Calculateur de Distance",
						"0x0ER01021": "Paramètres Actuels",
						"0x0ER01022": "Barre d'Élévation",
						"0x0ER01023": "Ajustement de Taille",
						"0x0ER01024": "Calcul",
						"0x0ER01025": "Définir Barre d'Élévation",
						"0x0ER01026": "Basculer Ajust. Taille",
						"0x0ER01027": "Définir Méthode de Calcul",
						"0x0ER01030": "Sélectionné → Cible",
						"0x0ER01031": "Activé",
						"0x0ER01032": "Désactivé",
						"0x0ER01033": "Activer",
						"0x0ER01034": "Désactiver"
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
