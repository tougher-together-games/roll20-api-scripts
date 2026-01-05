/*!
@language: en-US
@title: easy-combat.js
@description: The EASY_COMBAT module integrates with EASY_UTILS to provide a lightweight combat
	tracker for Roll20. Manages turn order, round tracking, and turn announcements.
@version: 1.1.0
@author: Mhykiel
@license: MIT
@repository: {@link https://github.com/tougher-together-games/roll20-api-scripts|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_COMBAT = (() => {
	// SECTION Object: EASY_COMBAT
	/**
	 * @namespace EASY_COMBAT
	 * @summary Lightweight combat tracker for Roll20.
	 *
	 * - **Purpose**:
	 *   - Manage turn order and round tracking
	 *   - Announce current turn to players
	 *   - Provide simple start/stop/next/prev controls
	 *
	 * - **Execution**:
	 *   - GM runs !ezcombat to access menu
	 *   - Select tokens and start combat to roll initiative
	 *   - Use next/prev to advance through turns
	 *
	 * - **Design**:
	 *   - Minimal event hooks to avoid performance issues
	 *   - Integrates with EASY_UTILS factories for theming and localization
	 *   - Lean state storage for round tracking only
	 */

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Combat",
		chatApiName: "ezcombat",
		globalName: "EASY_COMBAT",
		version: "1.1.0",
		author: "Mhykiel",
		sendWelcomeMsg: true,
		verbose: false,
		debug: {
			"onReady": false,
			"processMenuAsync": false,
			"processStartCombat": false,
			"processStopCombat": false,
			"processNextTurn": false,
			"processPrevTurn": false
		}
	};

	// ANCHOR Member: Factory References
	let Utils = {};
	let PhraseFactory = {};

	// ANCHOR Member: Vault Reference
	let EasyCombatVault = {};

	// ANCHOR Member: Default Effect Library
	/**
	 * @summary Default 5e conditions and effects with Roll20 default token markers.
	 * @description Unified structure: name, type, icon, description, duration, direction, autochange, counter, visibility
	 *   - duration: null = persists forever
	 *   - counter: null = passive (no counter displayed)
	 *   - direction: -1 = down, 1 = up, null = no change
	 *   - autochange: "turn" | "round" | "manual" | null
	 *   - type: "condition" | "spell" | "reminder" | "trait"
	 *   - visibility: "show" | "hide" (hide = GM only, default is "show")
	 */
	const DEFAULT_EFFECT_LIBRARY = {
		blinded: {
			name: "Blinded",
			type: "condition",
			icon: "bleeding-eye",
			description: "Cannot see. Auto-fails sight checks. Attacks against have advantage, attacks by have disadvantage.",
			duration: null,
			direction: null,
			autochange: null
		},
		charmed: {
			name: "Charmed",
			type: "spell",
			icon: "broken-heart",
			description: "Can't attack the charmer. Charmer has advantage on social checks.",
			duration: 10,
			direction: -1,
			autochange: "round"
		},
		concentration: {
			name: "Concentration",
			type: "spell",
			icon: "trophy",
			description: "Maintaining a spell. Taking damage requires CON save to maintain.",
			duration: null,
			direction: null,
			autochange: null
		},
		deafened: {
			name: "Deafened",
			type: "condition",
			icon: "edge-crack",
			description: "Cannot hear. Auto-fails hearing checks.",
			duration: null,
			direction: null,
			autochange: null
		},
		frightened: {
			name: "Frightened",
			type: "condition",
			icon: "screaming",
			description: "Disadvantage on checks/attacks while source in sight. Can't move closer to source.",
			duration: null,
			direction: null,
			autochange: null
		},
		grappled: {
			name: "Grappled",
			type: "condition",
			icon: "grab",
			description: "Speed is 0. Ends if grappler is incapacitated or effect moves you out of reach.",
			duration: null,
			direction: null,
			autochange: null
		},
		incapacitated: {
			name: "Incapacitated",
			type: "condition",
			icon: "interdiction",
			description: "Cannot take actions or reactions.",
			duration: null,
			direction: null,
			autochange: null
		},
		invisibility: {
			name: "Invisibility",
			type: "spell",
			icon: "ninja-mask",
			description: "Impossible to see. Attacks against have disadvantage, attacks by have advantage.",
			duration: 10,
			direction: -1,
			autochange: "round"
		},
		paralyzed: {
			name: "Paralyzed",
			type: "condition",
			icon: "pummeled",
			description: "Incapacitated, can't move or speak. Auto-fails STR/DEX saves. Attacks have advantage, hits within 5ft are crits.",
			duration: null,
			direction: null,
			autochange: null
		},
		petrified: {
			name: "Petrified",
			type: "condition",
			icon: "frozen-orb",
			description: "Transformed to stone. Incapacitated, unaware. Resistance to all damage. Immune to poison/disease.",
			duration: null,
			direction: null,
			autochange: null
		},
		poisoned: {
			name: "Poisoned",
			type: "condition",
			icon: "chemical-bolt",
			description: "Disadvantage on attack rolls and ability checks.",
			duration: null,
			direction: null,
			autochange: null
		},
		prone: {
			name: "Prone",
			type: "condition",
			icon: "back-pain",
			description: "Can only crawl. Disadvantage on attacks. Attacks within 5ft have advantage, beyond have disadvantage.",
			duration: null,
			direction: null,
			autochange: null
		},
		restrained: {
			name: "Restrained",
			type: "condition",
			icon: "fishing-net",
			description: "Speed is 0. Attacks against have advantage, attacks by have disadvantage. Disadvantage on DEX saves.",
			duration: null,
			direction: null,
			autochange: null
		},
		stunned: {
			name: "Stunned",
			type: "condition",
			icon: "fist",
			description: "Incapacitated, can't move, speaks falteringly. Auto-fails STR/DEX saves. Attacks have advantage.",
			duration: 1,
			direction: -1,
			autochange: "turn"
		},
		unconscious: {
			name: "Unconscious",
			type: "condition",
			icon: "sleepy",
			description: "Incapacitated, can't move/speak, unaware. Drops items, falls prone. Auto-fails STR/DEX saves. Attacks have advantage, hits within 5ft are crits.",
			duration: null,
			direction: null,
			autochange: null
		},
		rage: {
			name: "Rage",
			type: "trait",
			icon: "strong",
			description: "Advantage on STR checks/saves. Bonus rage damage on melee. Resistance to bludgeoning, piercing, slashing.",
			duration: 10,
			direction: -1,
			autochange: "round"
		},
		reckless: {
			name: "Reckless Attack",
			type: "trait",
			icon: "overdrive",
			description: "Advantage on melee attacks this turn. Attacks against you have advantage until next turn.",
			duration: 1,
			direction: -1,
			autochange: "turn"
		},
		defensive: {
			name: "Defensive Stance",
			type: "trait",
			icon: "white-tower",
			description: "+2 AC. Movement speed reduced by half.",
			duration: null,
			direction: null,
			autochange: null
		},
		dodge: {
			name: "Dodging",
			type: "trait",
			icon: "flying-flag",
			description: "Attacks against have disadvantage. Advantage on DEX saves.",
			duration: 1,
			direction: -1,
			autochange: "turn"
		},
		hiding: {
			name: "Hiding",
			type: "trait",
			icon: "ninja-mask",
			description: "Cannot be seen. Attacks have advantage. Revealed if you attack or make noise.",
			duration: null,
			direction: null,
			autochange: null
		}
	};

	// ANCHOR Member: Attribute Name for Storage
	const COMBAT_DATA_ATTR = "ez_combat_data";

	// SECTION Inner Methods: Utility Functions

	// ANCHOR Function: getCharacterFromToken
	/**
	 * @summary Gets the character linked to a token.
	 * @param {Object} token - Roll20 token object
	 * @returns {Object|null} Character object or null
	 */
	const getCharacterFromToken = (token) => {
		if (!token) return null;
		const charId = token.get("represents");
		if (!charId) return null;
		return getObj("character", charId);
	};

	// ANCHOR Function: getCombatData
	/**
	 * @summary Retrieves combat data from character attribute (synchronous).
	 * @param {Object} character - Roll20 character object
	 * @returns {Object|null} Parsed combat data or null
	 */
	const getCombatData = (character) => {
		if (!character) return null;

		const attr = findObjs({
			_type: "attribute",
			_characterid: character.id,
			name: COMBAT_DATA_ATTR
		})[0];

		if (!attr) return null;

		const value = attr.get("current");
		if (!value || value.trim() === "") return null;

		try {
			return JSON.parse(value);
		} catch (e) {
			return null;
		}
	};

	// ANCHOR Function: setCombatData
	/**
	 * @summary Stores combat data in character attribute (synchronous).
	 * @param {Object} character - Roll20 character object
	 * @param {Object} data - Combat data to store
	 */
	const setCombatData = (character, data) => {
		if (!character) return;

		const jsonStr = JSON.stringify(data);

		let attr = findObjs({
			_type: "attribute",
			_characterid: character.id,
			name: COMBAT_DATA_ATTR
		})[0];

		if (attr) {
			attr.set("current", jsonStr);
		} else {
			createObj("attribute", {
				characterid: character.id,
				name: COMBAT_DATA_ATTR,
				current: jsonStr
			});
		}
	};

	// ANCHOR Function: getTokenEffectsFromGMNotes
	/**
	 * @summary Retrieves effects from token's GM notes (fallback for unlinked tokens).
	 * @param {Object} token - Roll20 token object
	 * @returns {Array} Array of effect objects
	 */
	const getTokenEffectsFromGMNotes = (token) => {
		if (!token) return [];

		try {
			const gmNotes = token.get("gmnotes");
			if (!gmNotes) return [];

			const decoded = unescape(gmNotes);
			const divMatch = decoded.match(/<div[^>]*id=["']easyCombatStatus["'][^>]*>(.*?)<\/div>/i);
			if (!divMatch) return [];

			const jsonData = divMatch[1].trim();
			if (!jsonData) return [];

			const data = JSON.parse(jsonData);
			return Array.isArray(data.effects) ? data.effects : [];
		} catch (err) {
			return [];
		}
	};

	// ANCHOR Function: setTokenEffectsToGMNotes
	/**
	 * @summary Stores effects in token's GM notes (fallback for unlinked tokens).
	 * @param {Object} token - Roll20 token object
	 * @param {Array} effects - Array of effect objects
	 */
	const setTokenEffectsToGMNotes = (token, effects) => {
		if (!token) return;

		const data = JSON.stringify({ effects: effects || [] });
		const newDiv = `<div style="display: none;" id="easyCombatStatus">${data}</div>`;

		let gmNotes = token.get("gmnotes") || "";
		gmNotes = unescape(gmNotes);

		const divRegex = /<div[^>]*id=["']easyCombatStatus["'][^>]*>.*?<\/div>/i;

		if (divRegex.test(gmNotes)) {
			gmNotes = gmNotes.replace(divRegex, newDiv);
		} else {
			gmNotes = gmNotes + newDiv;
		}

		token.set("gmnotes", gmNotes);
	};

	// ANCHOR Function: updateDefaultToken
	/**
	 * @summary Updates the character's default token with current status markers.
	 * @param {Object} token - Roll20 token object
	 * @param {Object} character - Roll20 character object
	 */
	const updateDefaultToken = (token, character) => {
		if (!token || !character) return;

		try {
			const currentMarkers = token.get("statusmarkers") || "";

			character.get("_defaulttoken", (defaultTokenStr) => {
				if (!defaultTokenStr) return;

				try {
					const defaultToken = JSON.parse(defaultTokenStr);
					defaultToken.statusmarkers = currentMarkers;
					character.set("_defaulttoken", JSON.stringify(defaultToken));
				} catch (e) {
					// Skip on parse error
				}
			});
		} catch (err) {
			// Skip on error
		}
	};

	// ANCHOR Function: getCurrentTurnOrder
	/**
	 * @summary Retrieves and parses the current turn order from Campaign.
	 * @returns {Array} Array of turn order entries
	 */
	const getCurrentTurnOrder = () => {
		const turnOrderRaw = Campaign().get("turnorder");
		if (!turnOrderRaw || turnOrderRaw === "") return [];

		try {
			return JSON.parse(turnOrderRaw);
		} catch (err) {
			return [];
		}
	};

	// ANCHOR Function: setTurnOrder
	/**
	 * @summary Sets the campaign turn order.
	 * @param {Array} turnOrder - Array of turn order entries
	 */
	const setTurnOrder = (turnOrder) => {
		Campaign().set({ turnorder: JSON.stringify(turnOrder) });
	};

	// ANCHOR Function: applyCustomItemFormula
	/**
	 * @summary Applies formula to a custom turn order entry (increments/decrements).
	 * @param {Object} entry - Turn order entry with formula field
	 * @returns {Object} Updated entry with new pr value
	 */
	const applyCustomItemFormula = (entry) => {
		if (!entry || !entry.formula) return entry;

		// NOTE: Parse formula (+1, -1, +2, etc.)
		const formulaValue = parseInt(entry.formula, 10) || 0;
		entry.pr = (parseInt(entry.pr, 10) || 0) + formulaValue;

		return entry;
	};

	// ANCHOR Function: isCustomItem
	/**
	 * @summary Checks if a turn order entry is a custom item.
	 * @param {Object} entry - Turn order entry
	 * @returns {boolean} True if custom item (id is "-1" and has custom name)
	 */
	const isCustomItem = (entry) => {
		return entry && entry.id === "-1" && entry.custom;
	};

	// ANCHOR Function: getTokenEffects
	/**
	 * @summary Retrieves effects from character attribute (linked) or GM notes (unlinked).
	 * @param {Object} token - Roll20 token object
	 * @returns {Array} Array of effect objects
	 */
	const getTokenEffects = (token) => {
		if (!token) return [];

		const character = getCharacterFromToken(token);

		if (character) {
			// NOTE: Linked token - use character attribute
			const data = getCombatData(character);
			return (data && Array.isArray(data.effects)) ? data.effects : [];
		} else {
			// NOTE: Unlinked token - fallback to GM notes
			return getTokenEffectsFromGMNotes(token);
		}
	};

	// ANCHOR Function: setTokenEffects
	/**
	 * @summary Stores effects in character attribute (linked) or GM notes (unlinked).
	 * @param {Object} token - Roll20 token object
	 * @param {Array} effects - Array of effect objects
	 */
	const setTokenEffects = (token, effects) => {
		if (!token) return;

		const character = getCharacterFromToken(token);

		if (character) {
			// NOTE: Linked token - use character attribute
			setCombatData(character, { effects: effects || [] });
			// NOTE: Update default token so markers persist across maps
			updateDefaultToken(token, character);
		} else {
			// NOTE: Unlinked token - fallback to GM notes
			setTokenEffectsToGMNotes(token, effects);
		}
	};

	// ANCHOR Function: addTokenEffect
	/**
	 * @summary Adds an effect to a token from library or custom.
	 * @param {Object} token - Roll20 token object
	 * @param {string} effectKey - Library key or custom effect name
	 * @param {Object} [customProps] - Optional override properties
	 * @returns {boolean} True if added successfully
	 * @description Unified structure: name, type, icon, description, duration, direction, autochange, counter
	 */
	const addTokenEffect = (token, effectKey, customProps = {}) => {
		if (!token || !effectKey) return false;

		const library = getEffectLibrary();
		let effect;

		// NOTE: Check if effectKey is in library
		if (library[effectKey.toLowerCase()]) {
			const libEffect = library[effectKey.toLowerCase()];
			effect = {
				name: libEffect.name,
				type: libEffect.type,
				icon: libEffect.icon,
				description: libEffect.description,
				duration: libEffect.duration,
				direction: libEffect.direction,
				autochange: libEffect.autochange,
				counter: libEffect.duration,
				...customProps
			};
		} else {
			// NOTE: Custom effect with unified structure
			effect = {
				name: effectKey,
				type: customProps.type || "reminder",
				icon: customProps.icon || null,
				description: customProps.description || null,
				duration: customProps.duration !== undefined ? customProps.duration : null,
				direction: customProps.direction !== undefined ? customProps.direction : null,
				autochange: customProps.autochange || null,
				counter: customProps.duration !== undefined ? customProps.duration : null
			};
		}

		const effects = getTokenEffects(token);

		// NOTE: Check if effect already exists
		const existingIndex = effects.findIndex(e => e.name.toLowerCase() === effect.name.toLowerCase());
		if (existingIndex >= 0) {
			effects[existingIndex] = effect;
		} else {
			effects.push(effect);
		}

		setTokenEffects(token, effects);

		// NOTE: Set token status marker if icon specified
		if (effect.icon) {
			const currentMarkers = token.get("statusmarkers") || "";
			const markerList = currentMarkers.split(",").filter(m => m);
			if (!markerList.includes(effect.icon)) {
				markerList.push(effect.icon);
				token.set("statusmarkers", markerList.join(","));
			}
		}

		return true;
	};

	// ANCHOR Function: removeTokenEffect
	/**
	 * @summary Removes an effect from a token.
	 * @param {Object} token - Roll20 token object
	 * @param {string} effectName - Name of effect to remove
	 * @returns {boolean} True if removed successfully
	 */
	const removeTokenEffect = (token, effectName) => {
		if (!token || !effectName) return false;

		const effects = getTokenEffects(token);
		const effectIndex = effects.findIndex(e => e.name.toLowerCase() === effectName.toLowerCase());

		if (effectIndex < 0) return false;

		const removedEffect = effects[effectIndex];
		effects.splice(effectIndex, 1);
		setTokenEffects(token, effects);

		// NOTE: Remove token status marker if icon specified
		if (removedEffect.icon) {
			const currentMarkers = token.get("statusmarkers") || "";
			const markerList = currentMarkers.split(",").filter(m => m && m !== removedEffect.icon);
			token.set("statusmarkers", markerList.join(","));
		}

		return true;
	};

	// ANCHOR Function: syncTokenWithMarkers
	/**
	 * @summary Bidirectional sync between token markers and stored effects.
	 * @param {Object} token - Roll20 token object
	 * @returns {Object} { effectsRemoved: number, markersAdded: number, effectsAdded: number }
	 * @description If marker removed from token, removes corresponding effect.
	 *              If effect has icon but marker missing, adds marker.
	 *              If marker present but no effect, adds effect from library.
	 */
	const syncTokenWithMarkers = (token) => {
		if (!token) return { effectsRemoved: 0, markersAdded: 0, effectsAdded: 0 };

		let effectsRemoved = 0;
		let markersAdded = 0;
		let effectsAdded = 0;

		const effects = getTokenEffects(token);
		const currentMarkersStr = token.get("statusmarkers") || "";
		const currentMarkers = currentMarkersStr.split(",").filter(m => m);

		// NOTE: Remove effects whose markers have been removed from token
		const effectsToRemove = [];
		for (const effect of effects) {
			if (effect.icon && !currentMarkers.includes(effect.icon)) {
				effectsToRemove.push(effect.name);
			}
		}

		for (const effectName of effectsToRemove) {
			const idx = effects.findIndex(e => e.name === effectName);
			if (idx >= 0) {
				effects.splice(idx, 1);
				effectsRemoved++;
			}
		}

		// NOTE: Add missing markers for remaining effects
		const newMarkers = [...currentMarkers];
		for (const effect of effects) {
			if (effect.icon && !newMarkers.includes(effect.icon)) {
				newMarkers.push(effect.icon);
				markersAdded++;
			}
		}

		// NOTE: Add effects for markers that have library entries but no active effect
		const library = getEffectLibrary();
		const effectIcons = effects.map(e => e.icon).filter(i => i);
		
		for (const marker of currentMarkers) {
			// NOTE: Skip if effect with this icon already exists on token
			if (effectIcons.includes(marker)) continue;

			// NOTE: Find library effect with matching icon
			for (const [key, libEffect] of Object.entries(library)) {
				if (libEffect.icon === marker) {
					// NOTE: Add effect from library
					const newEffect = {
						name: libEffect.name,
						type: libEffect.type || "condition",
						icon: libEffect.icon,
						description: libEffect.description || "",
						duration: libEffect.duration !== undefined ? libEffect.duration : null,
						counter: libEffect.duration !== undefined ? libEffect.duration : null,
						direction: libEffect.direction !== undefined ? libEffect.direction : -1,
						autochange: libEffect.autochange || "turn"
					};
					effects.push(newEffect);
					effectIcons.push(marker);
					effectsAdded++;
					break;
				}
			}
		}

		// NOTE: Save changes
		if (effectsRemoved > 0 || effectsAdded > 0) {
			setTokenEffects(token, effects);
		}

		if (markersAdded > 0) {
			token.set("statusmarkers", newMarkers.join(","));
		}

		return { effectsRemoved, markersAdded, effectsAdded };
	};

	// ANCHOR Function: getCurrentTurnToken
	/**
	 * @summary Gets the token for the current turn.
	 * @returns {Object|null} Token object or null
	 */
	const getCurrentTurnToken = () => {
		const turnOrder = getCurrentTurnOrder();
		if (turnOrder.length === 0) return null;

		const current = turnOrder[0];
		if (isCustomItem(current)) return null;

		return getObj("graphic", current.id);
	};

	// ANCHOR Function: updateEffectCounters
	/**
	 * @summary Updates effect counters based on autochange trigger, removes at 0.
	 * @param {Object} token - Roll20 token object
	 * @param {string} trigger - "turn" or "round"
	 */
	const updateEffectCounters = (token, trigger) => {
		if (!token) return;

		const effects = getTokenEffects(token);
		const toRemove = [];
		let changed = false;

		for (const effect of effects) {
			// NOTE: Skip if no autochange, wrong trigger, or passive (null counter/duration)
			if (effect.autochange !== trigger) continue;
			if (effect.duration === null) continue;
			if (effect.counter === null) continue;
			if (effect.direction === null) continue;

			effect.counter = effect.counter + effect.direction;
			changed = true;

			// NOTE: Mark for removal if counter reached 0
			if (effect.counter <= 0) {
				toRemove.push(effect.name);
			}
		}

		if (changed) {
			setTokenEffects(token, effects);
		}

		// NOTE: Remove expired effects
		for (const effectName of toRemove) {
			removeTokenEffect(token, effectName);
		}
	};

	// ANCHOR Function: updateAllTokensRoundCounters
	/**
	 * @summary Updates all token effect counters that trigger on round.
	 */
	const updateAllTokensRoundCounters = () => {
		const turnOrder = getCurrentTurnOrder();

		for (const entry of turnOrder) {
			if (isCustomItem(entry)) continue;

			const token = getObj("graphic", entry.id);
			if (token) {
				updateEffectCounters(token, "round");
			}
		}
	};

	// ANCHOR Function: addReminder
	/**
	 * @summary Adds a reminder to a token using unified effect structure.
	 * @param {Object} token - Roll20 token object
	 * @param {string} title - Reminder title
	 * @param {string} [description] - Reminder description
	 * @returns {boolean} True if added
	 */
	const addReminder = (token, title, description) => {
		if (!token || !title) return false;

		const effects = getTokenEffects(token);
		effects.push({
			name: title,
			type: "reminder",
			icon: null,
			description: description || null,
			duration: null,
			direction: null,
			autochange: null,
			counter: null
		});
		setTokenEffects(token, effects);

		return true;
	};

	// ANCHOR Function: getEffectLibrary
	/**
	 * @summary Gets the effect library (session custom > state > default).
	 * @returns {Object} Effect library
	 */
	const getEffectLibrary = () => {
		// NOTE: Session customizations take priority
		if (EasyCombatVault.customLibrary) {
			return EasyCombatVault.customLibrary;
		}
		if (typeof state !== "undefined" && state.EASY_COMBAT && state.EASY_COMBAT.effectLibrary) {
			return state.EASY_COMBAT.effectLibrary;
		}
		return DEFAULT_EFFECT_LIBRARY;
	};

	// ANCHOR Function: initializeEffectLibrary
	/**
	 * @summary Initializes effect library in state if not present.
	 */
	const initializeEffectLibrary = () => {
		if (typeof state !== "undefined") {
			state.EASY_COMBAT = state.EASY_COMBAT || {};
			if (!state.EASY_COMBAT.effectLibrary) {
				state.EASY_COMBAT.effectLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));
			}
		}
	};

	// ANCHOR Function: getTokenName
	/**
	 * @summary Gets display name for a token ID.
	 * @param {string} tokenId - The token's Roll20 ID
	 * @returns {string} Token name or "Unknown"
	 */
	const getTokenName = (tokenId) => {
		if (!tokenId || tokenId === "-1") return "Custom Entry";

		const token = getObj("graphic", tokenId);
		if (!token) return "Unknown";

		return token.get("name") || "Unnamed Token";
	};

	// ANCHOR Function: getInitiativeBonus
	/**
	 * @summary Gets initiative bonus from a token's linked character.
	 * @param {Object} token - Roll20 token object
	 * @returns {number} Initiative bonus or 0
	 */
	const getInitiativeBonus = (token) => {
		const characterId = token.get("represents");
		if (!characterId) return 0;

		// NOTE: Try common attribute names for initiative
		const attrNames = ["initiative_bonus", "initiative", "init_bonus", "init"];

		for (const attrName of attrNames) {
			const attr = findObjs({
				_type: "attribute",
				_characterid: characterId,
				name: attrName
			})[0];

			if (attr) {
				const value = parseInt(attr.get("current"), 10);
				if (!isNaN(value)) return value;
			}
		}

		return 0;
	};

	// ANCHOR Function: rollInitiative
	/**
	 * @summary Rolls initiative for a token (1d20 + bonus).
	 * @param {Object} token - Roll20 token object
	 * @returns {number} Initiative result
	 */
	const rollInitiative = (token) => {
		const bonus = getInitiativeBonus(token);
		const roll = randomInteger(20);

		return roll + bonus;
	};

	// ANCHOR Function: announceTurn
	/**
	 * @summary Announces the current turn/status with styled template to chat.
	 * @param {Object} turnEntry - Turn order entry or token object
	 * @param {number} round - Current round number
	 */
	const announceTurn = (turnEntry, round) => {
		const isCustom = isCustomItem(turnEntry);

		// NOTE: Roll template styles (red theme for combat)
		const styles = {
			container: "background-color: #fff; border: 1px solid #7e2d40; border-radius: 5px; overflow: hidden; margin: 5px 0;",
			header: "background-color: #7e2d40; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;",
			headerCustom: "background-color: #4a4a4a; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;",
			body: "padding: 8px;",
			imageRow: "display: flex; align-items: center; margin-bottom: 8px;",
			image: "width: 50px; height: 50px; border: 1px solid #000; border-radius: 3px; margin-right: 10px;",
			nameText: "font-size: 16px; font-weight: bold;",
			valueText: "font-size: 24px; font-weight: bold; color: #7e2d40;",
			sectionHeader: "display: flex; align-items: center; font-weight: bold; border-bottom: 1px solid #ccc; margin: 8px 0 4px 0; padding-bottom: 2px; font-size: 11px; color: #666;",
			addSectionBtn: "background-color: #7e2d40; color: #fff; padding: 1px 5px; border-radius: 3px; text-decoration: none; font-size: 9px; margin-right: 8px;",
			effectGrid: "display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px;",
			effectBtn: "display: flex; align-items: center; padding: 5px 8px; border-radius: 4px; text-decoration: none; font-size: 12px; color: #000;",
			effectCondition: "background-color: #ffcccc; border: 1px solid #cc9999;",
			effectSpell: "background-color: #ccccff; border: 1px solid #9999cc;",
			effectTrait: "background-color: #ccffcc; border: 1px solid #99cc99;",
			effectReminder: "background-color: #ffffcc; border: 1px solid #cccc99;",
			effectIcon: "font-size: 14px; margin-right: 6px;",
			effectName: "flex: 1; font-weight: bold;",
			effectCounter: "font-size: 11px; color: #555; margin-left: 6px;",
			effectNone: "color: #888; font-style: italic; font-size: 11px; padding: 3px 0;",
			buttonRow: "display: flex; gap: 5px; margin-top: 8px;",
			button: "flex: 1; background-color: #7e2d40; color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold;"
		};

		let template;

		if (isCustom) {
			// NOTE: Custom item announcement (no token image, show value, no buttons)
			const name = turnEntry.custom;
			const value = turnEntry.pr;

			template = `<div style="${styles.container}">`
				+ `<div style="${styles.headerCustom}">${name}</div>`
				+ `<div style="${styles.body}">`
				+ `<div style="${styles.imageRow}"><span style="${styles.valueText}">${value}</span></div>`
				+ `</div>`
				+ `</div>`;

			// NOTE: Custom items are public (round counter, etc.)
			sendChat(moduleSettings.readableName, template);
		} else {
			// NOTE: Token turn announcement
			const tokenId = turnEntry.id;
			const token = getObj("graphic", tokenId);
			if (!token) return;

			// NOTE: Auto-sync token markers with effects at turn start
			syncTokenWithMarkers(token);

			// NOTE: Determine display name - PCs always shown, NPCs check showplayers_name
			let name = token.get("name") || "Unnamed Token";
			const linkedChar = getObj("character", token.get("represents"));
			
			if (linkedChar) {
				const controllers = linkedChar.get("controlledby") || "";
				const isPlayerControlled = controllers.length > 0;
				
				// NOTE: If NPC (not player controlled), check if name should be hidden
				if (!isPlayerControlled && !token.get("showplayers_name")) {
					name = "Unknown Creature";
				}
			} else {
				// NOTE: No linked character - check showplayers_name
				if (!token.get("showplayers_name")) {
					name = "Unknown Creature";
				}
			}

			const imgSrc = token.get("imgsrc");

			const imageHtml = imgSrc
				? `<img src="${imgSrc}" style="${styles.image}" />`
				: `<div style="${styles.image} background-color: #ccc;"></div>`;

			// NOTE: Get token effects grouped by type
			const effects = getTokenEffects(token);
			const conditions = effects.filter(e => e.type === "condition");
			const spells = effects.filter(e => e.type === "spell");
			const traits = effects.filter(e => e.type === "trait");
			const reminders = effects.filter(e => e.type === "reminder");

			// NOTE: Build effect button - larger with icon, name, duration, direction
			const buildEffectBtn = (effect, bgStyle) => {
				const iconHtml = effect.icon ? `<span style="${styles.effectIcon}">${getMarkerImage(effect.icon, 14)}</span>` : "";
				let counterHtml = "";
				if (effect.counter !== null && effect.duration !== null) {
					const dirIcon = effect.direction === 1 ? PhraseFactory.get({ transUnitId: "0x0C0B1020" }) : (effect.direction === -1 ? PhraseFactory.get({ transUnitId: "0x0C0B1021" }) : "");
					counterHtml = `<span style="${styles.effectCounter}">${dirIcon} ${effect.counter}/${effect.duration}</span>`;
				}
				const cmd = `!ezcombat --effectdetail|${tokenId}|${encodeURIComponent(effect.name)}`;
				return `<a style="${styles.effectBtn} ${bgStyle}" href="${cmd}">${iconHtml}<span style="${styles.effectName}">${effect.name}</span>${counterHtml}</a>`;
			};

			// NOTE: Build clickable effect display for non-controllers (whispers info to clicker)
			const buildEffectDisplayBtn = (effect, bgStyle) => {
				const iconHtml = effect.icon ? `<span style="${styles.effectIcon}">${getMarkerImage(effect.icon, 14)}</span>` : "";
				let counterHtml = "";
				if (effect.counter !== null && effect.duration !== null) {
					const dirIcon = effect.direction === 1 ? PhraseFactory.get({ transUnitId: "0x0C0B1020" }) : (effect.direction === -1 ? PhraseFactory.get({ transUnitId: "0x0C0B1021" }) : "");
					counterHtml = `<span style="${styles.effectCounter}">${dirIcon} ${effect.counter}/${effect.duration}</span>`;
				}
				const cmd = `!ezcombat --effectinfo|${tokenId}|${encodeURIComponent(effect.name)}`;
				return `<a style="${styles.effectBtn} ${bgStyle}" href="${cmd}">${iconHtml}<span style="${styles.effectName}">${effect.name}</span>${counterHtml}</a>`;
			};

			// NOTE: Build section header (read-only, no add button)
			const buildSectionHeaderReadOnly = (label) => {
				return `<div style="font-weight: bold; border-bottom: 1px solid #ccc; margin: 8px 0 4px 0; padding-bottom: 2px; font-size: 11px; color: #666;">${label}</div>`;
			};

			// NOTE: Conditions HTML
			const addConditionCmd = `!ezcombat --effectmenu|${tokenId}|condition|red`;
			let conditionsHtml = conditions.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: conditions.map(e => buildEffectBtn(e, styles.effectCondition)).join("");
			let conditionsHtmlReadOnly = conditions.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: conditions.map(e => buildEffectDisplayBtn(e, styles.effectCondition)).join("");

			// NOTE: Spell Effects HTML
			const addSpellCmd = `!ezcombat --effectmenu|${tokenId}|spell|red`;
			let spellsHtml = spells.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: spells.map(e => buildEffectBtn(e, styles.effectSpell)).join("");
			let spellsHtmlReadOnly = spells.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: spells.map(e => buildEffectDisplayBtn(e, styles.effectSpell)).join("");

			// NOTE: Traits HTML
			const addTraitCmd = `!ezcombat --effectmenu|${tokenId}|trait|red`;
			let traitsHtml = traits.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: traits.map(e => buildEffectBtn(e, styles.effectTrait)).join("");
			let traitsHtmlReadOnly = traits.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: traits.map(e => buildEffectDisplayBtn(e, styles.effectTrait)).join("");

			// NOTE: Reminders HTML (controllers only)
			const addReminderCmd = `!ezcombat --addreminder|${tokenId}|?{Title}|?{Description}`;
			let remindersHtml = reminders.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: reminders.map(e => buildEffectBtn(e, styles.effectReminder)).join("");

			const addStatusCmd = `!ezcombat --effectmenu|${tokenId}|all|red`;

			// NOTE: Full interactive template for controllers/GM
			const controllerTemplate = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">Round ${round}</div>`
				+ `<div style="${styles.body}">`
				+ `<div style="${styles.imageRow}">${imageHtml}<span style="${styles.nameText}">${name}</span></div>`
				+ `<div style="${styles.sectionHeader}"><a style="${styles.addSectionBtn}" href="${addConditionCmd}">+ Add</a><span>Conditions</span></div>`
				+ `<div style="${styles.effectGrid}">${conditionsHtml}</div>`
				+ `<div style="${styles.sectionHeader}"><a style="${styles.addSectionBtn}" href="${addSpellCmd}">+ Add</a><span>Spell Effects</span></div>`
				+ `<div style="${styles.effectGrid}">${spellsHtml}</div>`
				+ `<div style="${styles.sectionHeader}"><a style="${styles.addSectionBtn}" href="${addTraitCmd}">+ Add</a><span>Traits</span></div>`
				+ `<div style="${styles.effectGrid}">${traitsHtml}</div>`
				+ `<div style="${styles.sectionHeader}"><a style="${styles.addSectionBtn}" href="${addReminderCmd}">+ Add</a><span>Reminders</span></div>`
				+ `<div style="${styles.effectGrid}">${remindersHtml}</div>`
				+ `<div style="${styles.buttonRow}"><a style="${styles.button}" href="${addStatusCmd}">Add Status</a><a style="${styles.button}" href="!ezcombat --next">End Turn</a></div>`
				+ `</div>`
				+ `</div>`;

			// NOTE: Read-only template for non-controllers
			const readOnlyTemplate = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">Round ${round}</div>`
				+ `<div style="${styles.body}">`
				+ `<div style="${styles.imageRow}">${imageHtml}<span style="${styles.nameText}">${name}</span></div>`
				+ buildSectionHeaderReadOnly("Conditions")
				+ `<div style="${styles.effectGrid}">${conditionsHtmlReadOnly}</div>`
				+ buildSectionHeaderReadOnly("Spell Effects")
				+ `<div style="${styles.effectGrid}">${spellsHtmlReadOnly}</div>`
				+ buildSectionHeaderReadOnly("Traits")
				+ `<div style="${styles.effectGrid}">${traitsHtmlReadOnly}</div>`
				+ `</div>`
				+ `</div>`;

			// NOTE: Get controlling players
			const character = getObj("character", token.get("represents"));
			const controllerIds = [];

			if (character) {
				const controllers = character.get("controlledby").split(",").filter(Boolean);
				for (const id of controllers) {
					if (id !== "all") {
						controllerIds.push(id);
					}
				}
			}

			// NOTE: Get all GMs
			const gmPlayers = findObjs({ _type: "player" }).filter(p => playerIsGM(p.id));
			const gmIds = gmPlayers.map(p => p.id);

			// NOTE: Build set of controller IDs (including GMs)
			const controllerSet = new Set([...controllerIds, ...gmIds]);

			// NOTE: Get all online players
			const allPlayers = findObjs({ _type: "player" }).filter(p => p.get("_online"));

			// NOTE: Track who has been whispered to avoid duplicates
			const whisperedIds = new Set();

			// NOTE: Whisper appropriate template to each player
			for (const player of allPlayers) {
				const playerId = player.id;
				if (whisperedIds.has(playerId)) continue;

				const displayName = player.get("_displayname");
				const isController = controllerSet.has(playerId);

				if (isController) {
					sendChat(moduleSettings.readableName, `/w "${displayName}" ${controllerTemplate}`);
				} else {
					sendChat(moduleSettings.readableName, `/w "${displayName}" ${readOnlyTemplate}`);
				}
				whisperedIds.add(playerId);
			}
		}
	};

	// ANCHOR Function: pingTokenControllers
	/**
	 * @summary Pings controlling players for a token.
	 * @param {Object} token - Roll20 token object
	 * @description Called on turn increment, not on status display.
	 */
	const pingTokenControllers = (token) => {
		if (!token) return;

		const pageId = token.get("_pageid");
		const left = token.get("left");
		const top = token.get("top");

		const character = getObj("character", token.get("represents"));
		const controllerIds = [];

		if (character) {
			const controllers = character.get("controlledby").split(",").filter(Boolean);
			for (const id of controllers) {
				if (id !== "all") {
					controllerIds.push(id);
				}
			}
		}

		if (controllerIds.length > 0) {
			for (const playerId of controllerIds) {
				const player = getObj("player", playerId);
				if (player) {
					sendPing(left, top, pageId, playerId, false, playerId);
				}
			}
		} else {
			// NOTE: No controllers - ping GMs
			const gmPlayers = findObjs({ _type: "player" }).filter(p => playerIsGM(p.id));
			for (const gm of gmPlayers) {
				sendPing(left, top, pageId, gm.id, false, gm.id);
			}
		}
	};

	// ANCHOR Function: getAvailableMarkers
	/**
	 * @summary Gets all available token markers for dropdown selection.
	 * @returns {string[]} Array of marker names/tags
	 * @description Uses LibTokenMarker if available, falls back to Campaign token_markers.
	 */
	const getAvailableMarkers = () => {
		const markers = [];

		// NOTE: Try LibTokenMarker first (most reliable)
		if (typeof libTokenMarkers !== "undefined" && libTokenMarkers.getOrderedList) {
			const orderedList = libTokenMarkers.getOrderedList();
			for (const marker of orderedList) {
				if (marker.tag) {
					markers.push(marker.tag);
				}
			}
		}

		// NOTE: Fallback to Campaign token_markers
		if (markers.length === 0) {
			try {
				const campaignMarkers = JSON.parse(Campaign().get("token_markers") || "[]");
				for (const marker of campaignMarkers) {
					if (marker.tag) {
						markers.push(marker.tag);
					}
				}
			} catch (err) {
				// NOTE: Ignore parse errors
			}

			// NOTE: Add default Roll20 markers
			const defaultMarkers = [
				"red", "blue", "green", "brown", "purple", "pink", "yellow",
				"dead", "skull", "sleepy", "half-heart", "half-haze",
				"interdiction", "snail", "lightning-helix", "spanner",
				"chained-heart", "chemical-bolt", "death-zone", "drink-me",
				"edge-crack", "ninja-mask", "stopwatch", "fishing-net",
				"overdrive", "strong", "fist", "padlock", "three-leaves",
				"fluffy-wing", "pummeled", "tread", "arrowed", "aura",
				"back-pain", "black-flag", "bleeding-eye", "bolt-shield",
				"broken-heart", "cobweb", "broken-skull", "frozen-orb",
				"rolling-bomb", "white-tower", "grab", "screaming",
				"grenade", "sentry-gun", "all-for-one", "angel-outfit",
				"archery-target"
			];

			for (const m of defaultMarkers) {
				if (!markers.includes(m)) {
					markers.push(m);
				}
			}
		}

		return markers.sort();
	};

	// ANCHOR Function: getMarkerImage
	/**
	 * @summary Returns HTML img tag for a token marker using LibTokenMarker.
	 * @param {string} marker - Roll20 marker name/tag
	 * @param {number} [size=18] - Image size in pixels
	 * @returns {string} HTML img tag or empty string
	 */
	const getMarkerImage = (marker, size = 18) => {
		if (!marker) return "";
		
		// NOTE: Check if LibTokenMarker is available
		if (typeof libTokenMarkers !== "undefined" && libTokenMarkers.getStatus) {
			const markerInfo = libTokenMarkers.getStatus(marker);
			if (markerInfo && markerInfo.url) {
				return `<img src="${markerInfo.url}" style="width: ${size}px; height: ${size}px; vertical-align: middle;" />`;
			}
		}
		
		// NOTE: Fallback to marker name if LibTokenMarker not available
		return `<span style="font-size: ${size}px;">${PhraseFactory.get({ transUnitId: "0x0C0B1025" })}</span>`;
	};

	// !SECTION End of Inner Methods: Utility Functions
	// SECTION Inner Methods: Action Processors

	// ANCHOR Function: processMenuAsync
	/**
	 * @summary Displays the combat tracker menu.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processMenuAsync = async (msgDetails) => {
		const thisFuncDebugName = "processMenuAsync";

		try {
			const title = "Easy Combat";
			const currentRound = EasyCombatVault.round || 0;
			const turnOrder = getCurrentTurnOrder();
			const inCombat = turnOrder.length > 0;
			const isGm = msgDetails.isGm;

			const menuItemsArray = [];

			// NOTE: View Token Status - available to all (requires selection)
			menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --viewstatus">View Token Status</a></li>`);

			// NOTE: Separator before combat controls
			if (inCombat || isGm) {
				menuItemsArray.push(`<li style="border-top: 1px solid #ccc; margin: 5px 0; padding: 0;"></li>`);
			}

			// NOTE: Group 1 - Combat Controls
			if (inCombat) {
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --next">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B1003" })}</a></li>`);
				if (isGm) {
					menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --prev">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B1004" })}</a></li>`);
					const addItemCmd = `\`!${moduleSettings.chatApiName} --additem|?{Item Name|Round Counter}|?{Starting Value|0}|?{Direction|up|down}`;
					menuItemsArray.push(`<li><a role="button" href="${addItemCmd}">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B100C" })}</a></li>`);
					menuItemsArray.push(`<li data-category="caution"><a role="button" href="\`!${moduleSettings.chatApiName} --stop">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B1006" })}</a></li>`);
				}
			} else {
				if (isGm) {
					menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --start">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B1005" })}</a></li>`);
				}
			}

			// NOTE: Separator before token management
			if (isGm) {
				menuItemsArray.push(`<li style="border-top: 1px solid #ccc; margin: 5px 0; padding: 0;"></li>`);
			}

			// NOTE: Group 2 - Token Management (GM only)
			if (isGm) {
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --syncmarkers">Sync Token Markers</a></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --clearstatuses">Clear All Statuses</a></li>`);
			}

			// NOTE: Separator before config
			if (isGm) {
				menuItemsArray.push(`<li style="border-top: 1px solid #ccc; margin: 5px 0; padding: 0;"></li>`);
			}

			// NOTE: Group 3 - Library Configuration (GM only)
			if (isGm) {
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --effectlibrary">Configure Effect Library</a></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --exportlibrary">Export Config</a></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --importlibrary">Import Config</a></li>`);
				menuItemsArray.push(`<li data-category="caution"><a role="button" href="\`!${moduleSettings.chatApiName} --resetlibrary">Reset to Defaults</a></li>`);
			}

			const footer = inCombat
				? PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B1007", expressions: { round: currentRound } })
				: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B1008" });

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

	// ANCHOR Function: processViewStatus
	/**
	 * @summary Whispers the status display for selected token(s) to the caller.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Allows viewing/editing token status outside of combat or off-turn.
	 */
	const processViewStatus = async (msgDetails) => {
		const thisFuncDebugName = "processViewStatus";

		try {
			// NOTE: Validate token selection
			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: "Please select a token first."
				});
				return 1;
			}

			const tokenId = msgDetails.selectedIds[0];
			const token = getObj("graphic", tokenId);

			if (!token) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Token not found."
				});
				return 1;
			}

			// NOTE: Build status display (blue theme for token status)
			const styles = {
				container: "background-color: #fff; border: 1px solid #4a6785; border-radius: 5px; overflow: hidden; margin: 5px 0;",
				header: "background-color: #4a6785; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;",
				body: "padding: 8px;",
				imageRow: "display: flex; align-items: center; margin-bottom: 8px;",
				image: "width: 50px; height: 50px; border: 1px solid #000; border-radius: 3px; margin-right: 10px;",
				nameText: "font-size: 16px; font-weight: bold;",
				sectionHeader: "display: flex; align-items: center; font-weight: bold; border-bottom: 1px solid #ccc; margin: 8px 0 4px 0; padding-bottom: 2px; font-size: 11px; color: #666;",
				addSectionBtn: "background-color: #4a6785; color: #fff; padding: 1px 5px; border-radius: 3px; text-decoration: none; font-size: 9px; margin-right: 8px;",
				effectGrid: "display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px;",
				effectBtn: "display: flex; align-items: center; padding: 5px 8px; border-radius: 4px; text-decoration: none; font-size: 12px; color: #000;",
				effectCondition: "background-color: #ffcccc; border: 1px solid #cc9999;",
				effectSpell: "background-color: #ccccff; border: 1px solid #9999cc;",
				effectTrait: "background-color: #ccffcc; border: 1px solid #99cc99;",
				effectReminder: "background-color: #ffffcc; border: 1px solid #cccc99;",
				effectIcon: "font-size: 14px; margin-right: 6px;",
				effectName: "flex: 1; font-weight: bold;",
				effectCounter: "font-size: 11px; color: #555; margin-left: 6px;",
				effectNone: "color: #888; font-style: italic; font-size: 11px; padding: 3px 0;",
				buttonRow: "display: flex; gap: 5px; margin-top: 8px;",
				button: "flex: 1; background-color: #4a6785; color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold;"
			};

			// NOTE: Get token name
			let name = token.get("name") || "Unnamed Token";
			const imgSrc = token.get("imgsrc");

			const imageHtml = imgSrc
				? `<img src="${imgSrc}" style="${styles.image}" />`
				: `<div style="${styles.image} background-color: #ccc;"></div>`;

			// NOTE: Get token effects grouped by type
			const effects = getTokenEffects(token);
			const conditions = effects.filter(e => e.type === "condition");
			const spells = effects.filter(e => e.type === "spell");
			const traits = effects.filter(e => e.type === "trait");
			const reminders = effects.filter(e => e.type === "reminder");

			// NOTE: Build effect button
			const buildEffectBtn = (effect, bgStyle) => {
				const iconHtml = effect.icon ? `<span style="${styles.effectIcon}">${getMarkerImage(effect.icon, 14)}</span>` : "";
				let counterHtml = "";
				if (effect.counter !== null && effect.duration !== null) {
					const dirIcon = effect.direction === 1 ? PhraseFactory.get({ transUnitId: "0x0C0B1020" }) : (effect.direction === -1 ? PhraseFactory.get({ transUnitId: "0x0C0B1021" }) : "");
					counterHtml = `<span style="${styles.effectCounter}">${dirIcon} ${effect.counter}/${effect.duration}</span>`;
				}
				const cmd = `!ezcombat --effectdetail|${tokenId}|${encodeURIComponent(effect.name)}`;
				return `<a style="${styles.effectBtn} ${bgStyle}" href="${cmd}">${iconHtml}<span style="${styles.effectName}">${effect.name}</span>${counterHtml}</a>`;
			};

			// NOTE: Build sections (blue theme for token status)
			const addConditionCmd = `!ezcombat --effectmenu|${tokenId}|condition|blue`;
			let conditionsHtml = conditions.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: conditions.map(e => buildEffectBtn(e, styles.effectCondition)).join("");

			const addSpellCmd = `!ezcombat --effectmenu|${tokenId}|spell|blue`;
			let spellsHtml = spells.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: spells.map(e => buildEffectBtn(e, styles.effectSpell)).join("");

			const addTraitCmd = `!ezcombat --effectmenu|${tokenId}|trait|blue`;
			let traitsHtml = traits.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: traits.map(e => buildEffectBtn(e, styles.effectTrait)).join("");

			const addReminderCmd = `!ezcombat --addreminder|${tokenId}|?{Title}|?{Description}`;
			let remindersHtml = reminders.length === 0
				? `<span style="${styles.effectNone}">None</span>`
				: reminders.map(e => buildEffectBtn(e, styles.effectReminder)).join("");

			const addStatusCmd = `!ezcombat --effectmenu|${tokenId}|all|blue`;

			const template = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">Token Status</div>`
				+ `<div style="${styles.body}">`
				+ `<div style="${styles.imageRow}">${imageHtml}<span style="${styles.nameText}">${name}</span></div>`
				+ `<div style="${styles.sectionHeader}"><a style="${styles.addSectionBtn}" href="${addConditionCmd}">+ Add</a><span>Conditions</span></div>`
				+ `<div style="${styles.effectGrid}">${conditionsHtml}</div>`
				+ `<div style="${styles.sectionHeader}"><a style="${styles.addSectionBtn}" href="${addSpellCmd}">+ Add</a><span>Spell Effects</span></div>`
				+ `<div style="${styles.effectGrid}">${spellsHtml}</div>`
				+ `<div style="${styles.sectionHeader}"><a style="${styles.addSectionBtn}" href="${addTraitCmd}">+ Add</a><span>Traits</span></div>`
				+ `<div style="${styles.effectGrid}">${traitsHtml}</div>`
				+ `<div style="${styles.sectionHeader}"><a style="${styles.addSectionBtn}" href="${addReminderCmd}">+ Add</a><span>Reminders</span></div>`
				+ `<div style="${styles.effectGrid}">${remindersHtml}</div>`
				+ `<div style="${styles.buttonRow}"><a style="${styles.button}" href="${addStatusCmd}">Add Status</a><a style="${styles.button}" href="!ezcombat">${PhraseFactory.get({ transUnitId: "0x0C0B1030" })}</a></div>`
				+ `</div>`
				+ `</div>`;

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);

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

	// ANCHOR Function: processStartCombat
	/**
	 * @summary Starts combat with selected tokens, rolling initiative.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processStartCombat = async (msgDetails) => {
		const thisFuncDebugName = "processStartCombat";

		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B1010" })
				});
				return 1;
			}

			// NOTE: Validate token selection
			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0D9A441E" })
				});
				return 1;
			}

			// DEBUG: Log selected IDs
			log(`[${moduleSettings.readableName}] Selected IDs: ${JSON.stringify(msgDetails.selectedIds)}`);

			// NOTE: Open the tracker FIRST (like CombatMaster does on line 2126)
			const pageId = Campaign().get("playerpageid");
			Campaign().set("initiativepage", pageId);
			
			// DEBUG: Verify initiativepage was set
			log(`[${moduleSettings.readableName}] Player page ID: ${pageId}`);
			log(`[${moduleSettings.readableName}] Initiative page after set: ${Campaign().get("initiativepage")}`);

			// NOTE: Build turn order from selected tokens
			const turnOrder = [];

			for (const tokenId of msgDetails.selectedIds) {
				const token = getObj("graphic", tokenId);
				
				// DEBUG: Log token lookup result
				log(`[${moduleSettings.readableName}] Token ${tokenId}: ${token ? token.get("name") : "NOT FOUND"}`);
				
				if (!token) continue;

				const initiative = rollInitiative(token);
				
				// DEBUG: Log initiative roll
				log(`[${moduleSettings.readableName}] Initiative for ${token.get("name")}: ${initiative}`);

				// NOTE: Turn order entry - matching CombatMaster format exactly
				turnOrder.push({
					id: tokenId,
					pr: initiative,
					custom: "",
					_pageid: token.get("pageid")
				});
			}

			// NOTE: Sort by initiative (descending)
			turnOrder.sort((a, b) => b.pr - a.pr);

			// NOTE: Add Round Counter at the top of initiative
			const roundCounter = {
				id: "-1",
				pr: 1,
				custom: "Round Counter",
				formula: "+1",
				_pageid: pageId
			};
			turnOrder.unshift(roundCounter);

			// DEBUG: Log final turn order
			log(`[${moduleSettings.readableName}] Turn order to set: ${JSON.stringify(turnOrder)}`);

			// NOTE: Set turnorder
			Campaign().set("turnorder", JSON.stringify(turnOrder));
			
			EasyCombatVault.round = 1;

			// DEBUG: Verify turn order was set
			const verifyTurnOrder = Campaign().get("turnorder");
			log(`[${moduleSettings.readableName}] Turn order after set: ${verifyTurnOrder}`);

			// NOTE: Announce and auto-advance past custom items (Round Counter)
			if (turnOrder.length > 0) {
				let currentOrder = getCurrentTurnOrder();
				const maxAdvances = currentOrder.length;
				let advances = 0;

				while (isCustomItem(currentOrder[0]) && advances < maxAdvances) {
					announceTurn(currentOrder[0], EasyCombatVault.round);

					// NOTE: Rotate past custom item
					const current = currentOrder.shift();
					currentOrder.push(current);
					setTurnOrder(currentOrder);

					advances++;
					currentOrder = getCurrentTurnOrder();
				}

				// NOTE: Announce the first actual token turn
				if (currentOrder.length > 0 && !isCustomItem(currentOrder[0])) {
					announceTurn(currentOrder[0], EasyCombatVault.round);

					// NOTE: Ping controlling players for the first token
					const token = getObj("graphic", currentOrder[0].id);
					if (token) {
						pingTokenControllers(token);
					}
				}
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

	// ANCHOR Function: processStopCombat
	/**
	 * @summary Stops combat and clears turn order.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processStopCombat = async (msgDetails) => {
		const thisFuncDebugName = "processStopCombat";

		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B1010" })
				});
				return 1;
			}

			// NOTE: Clear turn order and round
			setTurnOrder([]);
			EasyCombatVault.round = 0;

			// NOTE: Close turn order tracker
			Campaign().set("initiativepage", false);

			// NOTE: Build styled combat ended announcement (matches Round Counter style)
			const styles = {
				container: "background-color: #fff; border: 1px solid #4a4a4a; border-radius: 5px; overflow: hidden; margin: 5px 0;",
				header: "background-color: #4a4a4a; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;"
			};

			const endedText = PhraseFactory.get({ transUnitId: "0x0C0B100A" });
			const template = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">${endedText}</div>`
				+ `</div>`;

			sendChat(moduleSettings.readableName, template);

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

	// ANCHOR Function: processNextTurn
	/**
	 * @summary Advances to the next turn in combat.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processNextTurn = async (msgDetails) => {
		const thisFuncDebugName = "processNextTurn";

		try {
			// NOTE: Anyone can advance the turn
			let turnOrder = getCurrentTurnOrder();
			if (turnOrder.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B100B" })
				});
				return 1;
			}

			// NOTE: Track advances to prevent infinite loop (all custom items)
			const maxAdvances = turnOrder.length;
			let advances = 0;

			do {
				// NOTE: Update turn-based effect counters for ending turn
				const endingTurn = turnOrder[0];
				if (!isCustomItem(endingTurn)) {
					const endingToken = getObj("graphic", endingTurn.id);
					if (endingToken) {
						updateEffectCounters(endingToken, "turn");
					}
				}

				// NOTE: Rotate turn order (move first to last)
				const current = turnOrder.shift();
				turnOrder.push(current);

				// NOTE: Apply formula if new current turn is a custom item
				const newCurrent = turnOrder[0];
				if (isCustomItem(newCurrent)) {
					applyCustomItemFormula(newCurrent);

					// NOTE: If this is the Round Counter, update the round from its pr value
					if (newCurrent.custom === "Round Counter") {
						EasyCombatVault.round = newCurrent.pr;

						// NOTE: Update round-based effect counters for all tokens
						updateAllTokensRoundCounters();
					}
				}

				setTurnOrder(turnOrder);
				announceTurn(turnOrder[0], EasyCombatVault.round);

				advances++;

				// NOTE: Re-fetch turn order in case formula changed it
				turnOrder = getCurrentTurnOrder();

			} while (isCustomItem(turnOrder[0]) && advances < maxAdvances);

			// NOTE: Ping controlling players for the new current token
			const finalCurrent = turnOrder[0];
			if (!isCustomItem(finalCurrent)) {
				const token = getObj("graphic", finalCurrent.id);
				if (token) {
					pingTokenControllers(token);
				}
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

	// ANCHOR Function: processPrevTurn
	/**
	 * @summary Goes back to the previous turn in combat.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processPrevTurn = async (msgDetails) => {
		const thisFuncDebugName = "processPrevTurn";

		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B1010" })
				});
				return 1;
			}

			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "WARN",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B100B" })
				});
				return 1;
			}

			// NOTE: Rotate turn order backward (move last to first)
			const last = turnOrder.pop();
			turnOrder.unshift(last);

			setTurnOrder(turnOrder);
			announceTurn(turnOrder[0], EasyCombatVault.round);

			// NOTE: Ping controlling players for the new current token
			const current = turnOrder[0];
			if (!isCustomItem(current)) {
				const token = getObj("graphic", current.id);
				if (token) {
					pingTokenControllers(token);
				}
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

	// ANCHOR Function: processAddEffect
	/**
	 * @summary Adds an effect to specified token, selected tokens, or current turn token.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --addeffect|effectKey or --addeffect|tokenId|effectKey
	 *              When multiple tokens selected, prompts for confirmation.
	 *              Use --addeffectconfirm|effectKey to skip confirmation.
	 */
	const processAddEffect = async (msgDetails) => {
		const thisFuncDebugName = "processAddEffect";

		try {
			// NOTE: Parse command - can be --addeffect|key or --addeffect|tokenId|key
			const content = msgDetails.raw.content;
			const match = content.match(/--addeffect\|([^|]+)(?:\|([^|\s]+))?/i);

			if (!match) {
				return 1;
			}

			let tokens = [];
			let effectKey;

			if (match[2]) {
				// NOTE: Format: --addeffect|tokenId|effectKey - specific token
				const tokenId = match[1].trim();
				effectKey = decodeURIComponent(match[2].trim());
				const token = getObj("graphic", tokenId);
				if (token) tokens.push(token);
			} else {
				// NOTE: Format: --addeffect|effectKey - use selected or current turn
				effectKey = decodeURIComponent(match[1].trim());
				if (msgDetails.selectedIds && msgDetails.selectedIds.length > 0) {
					// NOTE: Get all selected tokens
					for (const tokenId of msgDetails.selectedIds) {
						const token = getObj("graphic", tokenId);
						if (token) tokens.push(token);
					}

					// NOTE: If multiple tokens, prompt for confirmation
					if (tokens.length > 1) {
						const library = getEffectLibrary();
						const effect = library[effectKey];
						const effectName = effect ? effect.name : effectKey;

						const styles = {
							container: "background-color: #fff; border: 1px solid #cc8800; border-radius: 5px; overflow: hidden; margin: 5px 0;",
							header: "background-color: #cc8800; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;",
							body: "padding: 8px;",
							text: "margin-bottom: 8px;",
							btnRow: "display: flex; gap: 5px;",
							btn: "flex: 1; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; font-size: 11px;",
							confirmBtn: "background-color: #4a4; color: #fff;",
							cancelBtn: "background-color: #666; color: #fff;"
						};

						const confirmCmd = `!ezcombat --addeffectconfirm|${effectKey}`;
						const template = `<div style="${styles.container}">`
							+ `<div style="${styles.header}">Confirm Add Effect</div>`
							+ `<div style="${styles.body}">`
							+ `<div style="${styles.text}">Add <b>${effectName}</b> to <b>${tokens.length} tokens</b>?</div>`
							+ `<div style="${styles.btnRow}">`
							+ `<a style="${styles.btn} ${styles.confirmBtn}" href="${confirmCmd}">Yes, Add to All</a>`
							+ `<a style="${styles.btn} ${styles.cancelBtn}" href="!ezcombat">Cancel</a>`
							+ `</div></div></div>`;

						sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);
						return 0;
					}
				} else {
					const token = getCurrentTurnToken();
					if (token) tokens.push(token);
				}
			}

			if (tokens.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Select a token or wait for a token's turn."
				});
				return 1;
			}

			// NOTE: Check if effect is GM-only
			const library = getEffectLibrary();
			const effect = library[effectKey];
			if (effect && effect.visibility === "hide" && !msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Only the GM can add this effect."
				});
				return 1;
			}

			// NOTE: Add effect to all tokens
			for (const token of tokens) {
				addTokenEffect(token, effectKey);
			}

			// NOTE: Redisplay turn announcement if current turn token was affected
			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0) {
				const currentTurnId = turnOrder[0].id;
				if (tokens.some(t => t.id === currentTurnId)) {
					const round = EasyCombatVault.round || 1;
					announceTurn(turnOrder[0], round);
				}
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

	// ANCHOR Function: processAddEffectConfirm
	/**
	 * @summary Adds an effect to all selected tokens without confirmation.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --addeffectconfirm|effectKey
	 */
	const processAddEffectConfirm = async (msgDetails) => {
		const thisFuncDebugName = "processAddEffectConfirm";

		try {
			const content = msgDetails.raw.content;
			const match = content.match(/--addeffectconfirm\|([^|\s]+)/i);

			if (!match) {
				return 1;
			}

			const effectKey = decodeURIComponent(match[1].trim());
			const tokens = [];

			if (msgDetails.selectedIds && msgDetails.selectedIds.length > 0) {
				for (const tokenId of msgDetails.selectedIds) {
					const token = getObj("graphic", tokenId);
					if (token) tokens.push(token);
				}
			} else {
				const token = getCurrentTurnToken();
				if (token) tokens.push(token);
			}

			if (tokens.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Select one or more tokens first."
				});
				return 1;
			}

			// NOTE: Check if effect is GM-only
			const library = getEffectLibrary();
			const effect = library[effectKey];
			if (effect && effect.visibility === "hide" && !msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Only the GM can add this effect."
				});
				return 1;
			}

			// NOTE: Add effect to all tokens
			for (const token of tokens) {
				addTokenEffect(token, effectKey);
			}

			// NOTE: Notify caller
			const effectName = effect ? effect.name : effectKey;

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: `Added ${effectName} to ${tokens.length} token(s).`
			});

			// NOTE: Redisplay turn announcement if current turn token was affected
			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0) {
				const currentTurnId = turnOrder[0].id;
				if (tokens.some(t => t.id === currentTurnId)) {
					const round = EasyCombatVault.round || 1;
					announceTurn(turnOrder[0], round);
				}
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

	// ANCHOR Function: processRemoveEffect
	/**
	 * @summary Removes an effect from specified token.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --removeeffect|tokenId|effectName
	 */
	const processRemoveEffect = async (msgDetails) => {
		const thisFuncDebugName = "processRemoveEffect";

		try {
			// NOTE: Parse tokenId and effect name from command
			const content = msgDetails.raw.content;
			const effectMatch = content.match(/--removeeffect\|([^|]+)\|([^|\s]+)/i);

			if (!effectMatch) {
				return 1;
			}

			const tokenId = effectMatch[1].trim();
			const effectName = decodeURIComponent(effectMatch[2].trim());
			const token = getObj("graphic", tokenId);

			if (!token) {
				return 1;
			}

			// NOTE: Check if caller can remove (GM or token controller)
			let canRemove = false;
			if (msgDetails.isGm) {
				canRemove = true;
			} else {
				const character = getObj("character", token.get("represents"));
				if (character) {
					const controllers = character.get("controlledby").split(",").filter(Boolean);
					canRemove = controllers.includes(msgDetails.callerId) || controllers.includes("all");
				}
			}

			if (!canRemove) {
				return 1;
			}

			// NOTE: Remove effect from token
			removeTokenEffect(token, effectName);

			// NOTE: Redisplay turn announcement
			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0 && turnOrder[0].id === tokenId) {
				const round = EasyCombatVault.round || 1;
				announceTurn(turnOrder[0], round);
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

	// ANCHOR Function: processEffectDetail
	/**
	 * @summary Shows effect edit menu with remove and edit options (whispered).
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --effectdetail|tokenId|effectName
	 */
	const processEffectDetail = async (msgDetails) => {
		const thisFuncDebugName = "processEffectDetail";

		try {
			// NOTE: Parse tokenId and effect name from command
			const content = msgDetails.raw.content;
			const effectMatch = content.match(/--effectdetail\|([^|]+)\|([^|\s]+)/i);

			if (!effectMatch) {
				return 1;
			}

			const tokenId = effectMatch[1].trim();
			const effectName = decodeURIComponent(effectMatch[2].trim());
			const token = getObj("graphic", tokenId);

			if (!token) {
				return 1;
			}

			const library = getEffectLibrary();

			// NOTE: Find effect on token
			const effects = getTokenEffects(token);
			const effect = effects.find(e => e.name.toLowerCase() === effectName.toLowerCase());
			
			if (!effect) {
				return 1;
			}

			// NOTE: Get library description if available
			let description = effect.description;
			if (!description) {
				for (const key in library) {
					if (library[key].name.toLowerCase() === effectName.toLowerCase()) {
						description = library[key].description;
						break;
					}
				}
			}

			// NOTE: Check if caller can edit (GM or token controller)
			let canEdit = false;
			if (msgDetails.isGm) {
				canEdit = true;
			} else {
				const character = getObj("character", token.get("represents"));
				if (character) {
					const controllers = character.get("controlledby").split(",").filter(Boolean);
					canEdit = controllers.includes(msgDetails.callerId) || controllers.includes("all");
				}
			}

			// NOTE: Build edit menu
			const styles = {
				container: "background-color: #fff; border: 1px solid #000; border-radius: 5px; overflow: hidden; margin: 5px 0;",
				header: "background-color: #4a4a4a; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;",
				body: "padding: 8px;",
				desc: "font-size: 12px; margin-bottom: 10px; padding: 5px; background-color: #f5f5f5; border-radius: 3px;",
				statRow: "display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px;",
				statLabel: "color: #666;",
				statValue: "font-weight: bold;",
				btnRow: "display: flex; gap: 5px; margin-top: 10px;",
				btn: "flex: 1; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; font-size: 11px;",
				editBtn: "background-color: #4a4a4a; color: #fff;",
				removeBtn: "background-color: #a33; color: #fff;",
				displayBtn: "background-color: #3a3; color: #fff;",
				backBtn: "display: block; background-color: #666; color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; margin-top: 5px;"
			};

			const descText = description || "No description available.";
			const iconHtml = effect.icon ? `${getMarkerImage(effect.icon, 16)} ` : "";
			
			// NOTE: Effect stats
			const durationText = effect.duration !== null ? effect.duration : PhraseFactory.get({ transUnitId: "0x0C0B1022" });
			const counterText = effect.counter !== null ? effect.counter : PhraseFactory.get({ transUnitId: "0x0C0B1024" });
			const directionText = effect.direction === 1 ? PhraseFactory.get({ transUnitId: "0x0C0B1035" }) : (effect.direction === -1 ? PhraseFactory.get({ transUnitId: "0x0C0B1036" }) : PhraseFactory.get({ transUnitId: "0x0C0B1037" }));
			const autochangeText = effect.autochange || "manual";

			// NOTE: Display to All button - always available
			const displayCmd = `!ezcombat --displayeffect|${tokenId}|${encodeURIComponent(effect.name)}`;
			let buttonsHtml = `<div style="${styles.btnRow}">`;
			buttonsHtml += `<a style="${styles.btn} ${styles.displayBtn}" href="${displayCmd}">Display to All</a>`;
			
			if (canEdit) {
				const editCmd = `!ezcombat --editeffect|${tokenId}|${encodeURIComponent(effect.name)}|?{Duration|${effect.duration || 0}}|?{Autochange|manual|turn|round}`;
				const removeCmd = `!ezcombat --removeeffect|${tokenId}|${encodeURIComponent(effect.name)}`;
				buttonsHtml += `<a style="${styles.btn} ${styles.editBtn}" href="${editCmd}">Edit</a>`;
				buttonsHtml += `<a style="${styles.btn} ${styles.removeBtn}" href="${removeCmd}">Remove</a>`;
			}
			buttonsHtml += `</div>`;

			const template = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">${iconHtml}${effect.name}</div>`
				+ `<div style="${styles.body}">`
				+ `<div style="${styles.desc}">${descText}</div>`
				+ `<div style="${styles.statRow}"><span style="${styles.statLabel}">Type:</span><span style="${styles.statValue}">${effect.type}</span></div>`
				+ `<div style="${styles.statRow}"><span style="${styles.statLabel}">Duration:</span><span style="${styles.statValue}">${durationText}</span></div>`
				+ `<div style="${styles.statRow}"><span style="${styles.statLabel}">Counter:</span><span style="${styles.statValue}">${counterText}</span></div>`
				+ `<div style="${styles.statRow}"><span style="${styles.statLabel}">Direction:</span><span style="${styles.statValue}">${directionText}</span></div>`
				+ `<div style="${styles.statRow}"><span style="${styles.statLabel}">Autochange:</span><span style="${styles.statValue}">${autochangeText}</span></div>`
				+ buttonsHtml
				+ `<a style="${styles.backBtn}" href="!ezcombat --refreshturn">${PhraseFactory.get({ transUnitId: "0x0C0B1031" })}</a>`
				+ `</div></div>`;

			// NOTE: Whisper to the caller
			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);

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

	// ANCHOR Function: processDisplayEffect
	/**
	 * @summary Displays effect info to all players in chat.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --displayeffect|tokenId|effectName
	 */
	const processDisplayEffect = async (msgDetails) => {
		const thisFuncDebugName = "processDisplayEffect";

		try {
			const content = msgDetails.raw.content;
			const effectMatch = content.match(/--displayeffect\|([^|]+)\|([^|\s]+)/i);

			if (!effectMatch) {
				return 1;
			}

			const tokenId = effectMatch[1].trim();
			const effectName = decodeURIComponent(effectMatch[2].trim());
			const token = getObj("graphic", tokenId);

			if (!token) {
				return 1;
			}

			const library = getEffectLibrary();

			// NOTE: Find effect on token
			const effects = getTokenEffects(token);
			const effect = effects.find(e => e.name.toLowerCase() === effectName.toLowerCase());
			
			if (!effect) {
				return 1;
			}

			// NOTE: Get library description if available
			let description = effect.description;
			if (!description) {
				for (const key in library) {
					if (library[key].name.toLowerCase() === effectName.toLowerCase()) {
						description = library[key].description;
						break;
					}
				}
			}

			// NOTE: Get token name for display
			let tokenName = token.get("name") || "Unknown";
			const linkedChar = getObj("character", token.get("represents"));
			if (linkedChar) {
				const controllers = linkedChar.get("controlledby") || "";
				if (controllers.length === 0 && !token.get("showplayers_name")) {
					tokenName = "Unknown Creature";
				}
			}

			// NOTE: Build public display card
			const styles = {
				container: "background-color: #fff; border: 1px solid #000; border-radius: 5px; overflow: hidden; margin: 5px 0;",
				header: "background-color: #4a4a4a; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;",
				body: "padding: 8px;",
				tokenName: "font-size: 11px; color: #666; margin-bottom: 5px;",
				desc: "font-size: 12px; padding: 5px; background-color: #f5f5f5; border-radius: 3px;",
				statRow: "display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 11px;",
				statLabel: "color: #666;",
				statValue: "font-weight: bold;"
			};

			const descText = description || "No description available.";
			const iconHtml = effect.icon ? `${getMarkerImage(effect.icon, 16)} ` : "";
			const counterText = effect.counter !== null ? `${effect.counter}` : PhraseFactory.get({ transUnitId: "0x0C0B1024" });

			const template = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">${iconHtml}${effect.name}</div>`
				+ `<div style="${styles.body}">`
				+ `<div style="${styles.tokenName}">On: ${tokenName}</div>`
				+ `<div style="${styles.desc}">${descText}</div>`
				+ `<div style="${styles.statRow}"><span style="${styles.statLabel}">Type:</span><span style="${styles.statValue}">${effect.type}</span></div>`
				+ `<div style="${styles.statRow}"><span style="${styles.statLabel}">Counter:</span><span style="${styles.statValue}">${counterText}</span></div>`
				+ `</div></div>`;

			// NOTE: Send to all (no whisper)
			sendChat(moduleSettings.readableName, template);

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

	// ANCHOR Function: processEffectInfo
	/**
	 * @summary Whispers effect info to the clicking player only.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --effectinfo|tokenId|effectName
	 *              Used by non-controllers clicking effect buttons in turn announcements.
	 */
	const processEffectInfo = async (msgDetails) => {
		const thisFuncDebugName = "processEffectInfo";

		try {
			const content = msgDetails.raw.content;
			const effectMatch = content.match(/--effectinfo\|([^|]+)\|([^|\s]+)/i);

			if (!effectMatch) {
				return 1;
			}

			const tokenId = effectMatch[1].trim();
			const effectName = decodeURIComponent(effectMatch[2].trim());
			const token = getObj("graphic", tokenId);

			if (!token) {
				return 1;
			}

			const library = getEffectLibrary();

			// NOTE: Find effect on token
			const effects = getTokenEffects(token);
			const effect = effects.find(e => e.name.toLowerCase() === effectName.toLowerCase());
			
			if (!effect) {
				return 1;
			}

			// NOTE: Get library description if available
			let description = effect.description;
			if (!description) {
				for (const key in library) {
					if (library[key].name.toLowerCase() === effectName.toLowerCase()) {
						description = library[key].description;
						break;
					}
				}
			}

			// NOTE: Get token name for display
			let tokenName = token.get("name") || "Unknown";
			const linkedChar = getObj("character", token.get("represents"));
			if (linkedChar) {
				const controllers = linkedChar.get("controlledby") || "";
				if (controllers.length === 0 && !token.get("showplayers_name")) {
					tokenName = "Unknown Creature";
				}
			}

			// NOTE: Build whisper display card
			const styles = {
				container: "background-color: #fff; border: 1px solid #000; border-radius: 5px; overflow: hidden; margin: 5px 0;",
				header: "background-color: #4a4a4a; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;",
				body: "padding: 8px;",
				tokenName: "font-size: 11px; color: #666; margin-bottom: 5px;",
				desc: "font-size: 12px; padding: 5px; background-color: #f5f5f5; border-radius: 3px;",
				statRow: "display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 11px;",
				statLabel: "color: #666;",
				statValue: "font-weight: bold;"
			};

			const descText = description || "No description available.";
			const iconHtml = effect.icon ? `${getMarkerImage(effect.icon, 16)} ` : "";
			const counterText = effect.counter !== null ? `${effect.counter}` : PhraseFactory.get({ transUnitId: "0x0C0B1024" });

			const template = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">${iconHtml}${effect.name}</div>`
				+ `<div style="${styles.body}">`
				+ `<div style="${styles.tokenName}">On: ${tokenName}</div>`
				+ `<div style="${styles.desc}">${descText}</div>`
				+ `<div style="${styles.statRow}"><span style="${styles.statLabel}">Type:</span><span style="${styles.statValue}">${effect.type}</span></div>`
				+ `<div style="${styles.statRow}"><span style="${styles.statLabel}">Counter:</span><span style="${styles.statValue}">${counterText}</span></div>`
				+ `</div></div>`;

			// NOTE: Whisper to the clicking player only
			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);

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

	// ANCHOR Function: processEffectMenu
	/**
	 * @summary Displays effect library as table with add/remove actions.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --effectmenu|tokenId|type|theme (theme: red or blue)
	 */
	const processEffectMenu = async (msgDetails) => {
		const thisFuncDebugName = "processEffectMenu";

		try {
			const content = msgDetails.raw.content;
			const match = content.match(/--effectmenu(?:\|([^|]*)\|([^|]*)(?:\|([^|\s]*))?)?/i);
			
			const tokenId = match && match[1] ? match[1].trim() : null;
			const filterType = match && match[2] ? match[2].trim().toLowerCase() : null;
			const theme = match && match[3] ? match[3].trim().toLowerCase() : "red";
			
			const library = getEffectLibrary();
			let libraryKeys = Object.keys(library);

			// NOTE: Filter out hidden effects for non-GMs
			if (!msgDetails.isGm) {
				libraryKeys = libraryKeys.filter(k => library[k].visibility !== "hide");
			}

			// NOTE: Filter effects by type if specified
			let filteredKeys = libraryKeys;
			let title = "Edit Status";
			let showGrouped = false;
			
			if (filterType === "condition") {
				filteredKeys = libraryKeys.filter(k => library[k].type === "condition");
				title = "Add Condition";
			} else if (filterType === "spell") {
				filteredKeys = libraryKeys.filter(k => library[k].type === "spell");
				title = "Add Spell Effect";
			} else if (filterType === "trait") {
				filteredKeys = libraryKeys.filter(k => library[k].type === "trait");
				title = "Add Trait";
			} else if (filterType === "all" || !filterType) {
				title = "Edit Status";
				showGrouped = true;
			}

			// NOTE: Theme colors
			const themeColors = {
				red: { primary: "#7e2d40", border: "#7e2d40" },
				blue: { primary: "#4a6785", border: "#4a6785" }
			};
			const colors = themeColors[theme] || themeColors.red;

			// NOTE: Table styles with theme
			const styles = {
				container: `background-color: #fff; border: 1px solid ${colors.border}; border-radius: 5px; overflow: hidden; margin: 5px 0;`,
				header: `background-color: ${colors.primary}; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;`,
				body: "padding: 4px;",
				table: "width: 100%; border-collapse: collapse; font-size: 11px;",
				th: `text-align: left; padding: 3px 4px; border-bottom: 2px solid ${colors.primary}; font-size: 10px; color: #666;`,
				thCenter: `text-align: center; padding: 3px 4px; border-bottom: 2px solid ${colors.primary}; font-size: 10px; color: #666;`,
				tr: "border-bottom: 1px solid #eee;",
				td: "padding: 4px; vertical-align: middle;",
				tdCenter: "padding: 4px; vertical-align: middle; text-align: center;",
				tdIcon: "padding: 4px; width: 24px; text-align: center;",
				tdName: "padding: 4px; font-weight: bold;",
				btn: "display: inline-block; padding: 2px 5px; border-radius: 3px; text-decoration: none; font-size: 9px; color: #fff;",
				addBtn: "background-color: #4a4;",
				removeBtn: "background-color: #a44;",
				sectionRow: "background-color: #f0f0f0; font-weight: bold; font-size: 10px; color: #666;",
				backBtn: `display: block; background-color: ${colors.primary}; color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; margin-top: 8px;`
			};

			// NOTE: Build table row for effect
			const buildEffectRow = (key, effect) => {
				const iconHtml = getMarkerImage(effect.icon, 18);
				const addCmd = `!ezcombat --addeffect|${key}`;
				const removeCmd = `!ezcombat --removeeffectselected|${key}`;
				const gmOnlyIndicator = effect.visibility === "hide" ? " " + PhraseFactory.get({ transUnitId: "0x0C0B1027" }) : "";
				
				return `<tr style="${styles.tr}">`
					+ `<td style="${styles.tdIcon}">${iconHtml}</td>`
					+ `<td style="${styles.tdName}">${effect.name}${gmOnlyIndicator}</td>`
					+ `<td style="${styles.tdCenter}"><a style="${styles.btn} ${styles.addBtn}" href="${addCmd}">Add</a></td>`
					+ `<td style="${styles.tdCenter}"><a style="${styles.btn} ${styles.removeBtn}" href="${removeCmd}">Remove</a></td>`
					+ `</tr>`;
			};

			// NOTE: Build section header row
			const buildSectionRow = (label) => {
				return `<tr><td colspan="4" style="${styles.sectionRow} padding: 6px 4px;">${label}</td></tr>`;
			};

			let tableRows = "";

			if (showGrouped) {
				// NOTE: Full view - group by type
				const conditions = libraryKeys.filter(k => library[k].type === "condition");
				const spells = libraryKeys.filter(k => library[k].type === "spell");
				const traits = libraryKeys.filter(k => library[k].type === "trait");
				const reminders = libraryKeys.filter(k => library[k].type === "reminder");

				if (conditions.length > 0) {
					tableRows += buildSectionRow("Conditions");
					tableRows += conditions.map(k => buildEffectRow(k, library[k])).join("");
				}
				if (spells.length > 0) {
					tableRows += buildSectionRow("Spell Effects");
					tableRows += spells.map(k => buildEffectRow(k, library[k])).join("");
				}
				if (traits.length > 0) {
					tableRows += buildSectionRow("Traits");
					tableRows += traits.map(k => buildEffectRow(k, library[k])).join("");
				}
				if (reminders.length > 0) {
					tableRows += buildSectionRow("Reminders");
					tableRows += reminders.map(k => buildEffectRow(k, library[k])).join("");
				}
			} else {
				// NOTE: Filtered view - just show matching effects
				tableRows = filteredKeys.map(k => buildEffectRow(k, library[k])).join("");
			}

			const tableHtml = `<table style="${styles.table}">`
				+ `<thead><tr>`
				+ `<th style="${styles.thCenter}">Icon</th>`
				+ `<th style="${styles.th}">Name</th>`
				+ `<th style="${styles.thCenter}">Add</th>`
				+ `<th style="${styles.thCenter}">Remove</th>`
				+ `</tr></thead>`
				+ `<tbody>${tableRows}</tbody>`
				+ `</table>`;

			// NOTE: Back destination based on theme
			// Red = combat turn announcement, Blue = token status menu
			const backCmd = (theme === "red") ? `!ezcombat --refreshturn` : `!ezcombat --viewstatus`;
			const template = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">${title}</div>`
				+ `<div style="${styles.body}">${tableHtml}`
				+ `<a style="${styles.backBtn}" href="${backCmd}">${PhraseFactory.get({ transUnitId: "0x0C0B1033" })}</a>`
				+ `</div></div>`;

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);

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

	// ANCHOR Function: processAddReminder
	/**
	 * @summary Adds a reminder to specified token.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --addreminder|tokenId|title|description
	 */
	const processAddReminder = async (msgDetails) => {
		const thisFuncDebugName = "processAddReminder";

		try {
			// NOTE: Parse tokenId, title and description from command
			const content = msgDetails.raw.content;
			const match = content.match(/--addreminder\|([^|]+)\|([^|]+)(?:\|(.*))?/i);

			if (!match || !match[2].trim()) {
				return 1;
			}

			const tokenId = match[1].trim();
			const title = match[2].trim();
			const description = match[3] ? match[3].trim() : null;

			const token = getObj("graphic", tokenId);
			if (!token) {
				return 1;
			}

			// NOTE: Add reminder to token
			addReminder(token, title, description);

			// NOTE: Redisplay turn announcement
			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0 && turnOrder[0].id === tokenId) {
				const round = EasyCombatVault.round || 1;
				announceTurn(turnOrder[0], round);
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

	// ANCHOR Function: processEditEffect
	/**
	 * @summary Edits an effect's duration and autochange on a token.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --editeffect|tokenId|effectName|duration|autochange
	 */
	const processEditEffect = async (msgDetails) => {
		const thisFuncDebugName = "processEditEffect";

		try {
			const content = msgDetails.raw.content;
			const match = content.match(/--editeffect\|([^|]+)\|([^|]+)\|([^|]+)\|([^|\s]+)/i);

			if (!match) {
				return 1;
			}

			const tokenId = match[1].trim();
			const effectName = decodeURIComponent(match[2].trim());
			const newDuration = parseInt(match[3].trim(), 10);
			const newAutochange = match[4].trim().toLowerCase();

			const token = getObj("graphic", tokenId);
			if (!token) return 1;

			// NOTE: Check permissions
			let canEdit = false;
			if (msgDetails.isGm) {
				canEdit = true;
			} else {
				const character = getObj("character", token.get("represents"));
				if (character) {
					const controllers = character.get("controlledby").split(",").filter(Boolean);
					canEdit = controllers.includes(msgDetails.callerId) || controllers.includes("all");
				}
			}

			if (!canEdit) return 1;

			// NOTE: Update effect
			const effects = getTokenEffects(token);
			const effect = effects.find(e => e.name.toLowerCase() === effectName.toLowerCase());

			if (effect) {
				effect.duration = isNaN(newDuration) ? null : newDuration;
				effect.counter = isNaN(newDuration) ? null : newDuration;
				effect.direction = (effect.duration !== null) ? -1 : null;
				effect.autochange = (newAutochange === "turn" || newAutochange === "round") ? newAutochange : null;

				setTokenEffects(token, effects);
			}

			// NOTE: Redisplay turn announcement
			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0 && turnOrder[0].id === tokenId) {
				const round = EasyCombatVault.round || 1;
				announceTurn(turnOrder[0], round);
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

	// ANCHOR Function: processRefreshTurn
	/**
	 * @summary Refreshes the current turn announcement.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processRefreshTurn = async (msgDetails) => {
		const thisFuncDebugName = "processRefreshTurn";

		try {
			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0) {
				const round = EasyCombatVault.round || 1;
				announceTurn(turnOrder[0], round);
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

	// ANCHOR Function: processRemoveEffectSelected
	/**
	 * @summary Removes an effect from all selected tokens.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --removeeffectselected|effectKey
	 */
	const processRemoveEffectSelected = async (msgDetails) => {
		const thisFuncDebugName = "processRemoveEffectSelected";

		try {
			const content = msgDetails.raw.content;
			const match = content.match(/--removeeffectselected\|([^|\s]+)/i);

			if (!match) return 1;

			const effectKey = decodeURIComponent(match[1].trim());
			const library = getEffectLibrary();
			const effect = library[effectKey.toLowerCase()];
			const effectName = effect?.name || effectKey;

			// NOTE: Check if effect is GM-only
			if (effect && effect.visibility === "hide" && !msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Only the GM can remove this effect."
				});
				return 1;
			}

			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Select one or more tokens first."
				});
				return 1;
			}

			// NOTE: Remove effect from all selected tokens
			let count = 0;
			for (const tokenId of msgDetails.selectedIds) {
				const token = getObj("graphic", tokenId);
				if (token) {
					removeTokenEffect(token, effectName);
					count++;
				}
			}

			// NOTE: Refresh turn if current turn token was affected
			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0 && msgDetails.selectedIds.includes(turnOrder[0].id)) {
				const round = EasyCombatVault.round || 1;
				announceTurn(turnOrder[0], round);
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

	// ANCHOR Function: processEffectLibrary
	/**
	 * @summary Displays all effects in the library for configuration (GM only).
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Table view with Configure and Purge buttons for library management.
	 */
	const processEffectLibrary = async (msgDetails) => {
		const thisFuncDebugName = "processEffectLibrary";

		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Only the GM can configure the effect library."
				});
				return 1;
			}

			const library = getEffectLibrary();
			const libraryKeys = Object.keys(library).sort();

			// NOTE: Table styles (purple theme for GM config)
			const styles = {
				container: "background-color: #fff; border: 1px solid #44a; border-radius: 5px; overflow: hidden; margin: 5px 0;",
				header: "background-color: #44a; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;",
				body: "padding: 4px;",
				table: "width: 100%; border-collapse: collapse; font-size: 11px;",
				th: "text-align: left; padding: 3px 4px; border-bottom: 2px solid #44a; font-size: 10px; color: #666;",
				thCenter: "text-align: center; padding: 3px 4px; border-bottom: 2px solid #44a; font-size: 10px; color: #666;",
				tr: "border-bottom: 1px solid #eee;",
				tdIcon: "padding: 4px; width: 24px; text-align: center;",
				tdName: "padding: 4px; font-weight: bold;",
				tdCenter: "padding: 4px; vertical-align: middle; text-align: center;",
				btn: "display: inline-block; padding: 2px 5px; border-radius: 3px; text-decoration: none; font-size: 9px; color: #fff;",
				configBtn: "background-color: #44a;",
				purgeBtn: "background-color: #a44;",
				sectionRow: "background-color: #f0f0f0; font-weight: bold; font-size: 10px; color: #666;",
				backBtn: "display: block; background-color: #44a; color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; margin-top: 8px;"
			};

			// NOTE: Build table row for effect
			const buildEffectRow = (key, effect) => {
				const iconHtml = getMarkerImage(effect.icon, 18);
				const configCmd = `!ezcombat --configeffect|${key}`;
				const purgeCmd = `!ezcombat --purgeeffect|${key}`;
				const gmOnlyIndicator = effect.visibility === "hide" ? " " + PhraseFactory.get({ transUnitId: "0x0C0B1027" }) : "";
				
				return `<tr style="${styles.tr}">`
					+ `<td style="${styles.tdIcon}">${iconHtml}</td>`
					+ `<td style="${styles.tdName}">${effect.name}${gmOnlyIndicator}</td>`
					+ `<td style="${styles.tdCenter}"><a style="${styles.btn} ${styles.configBtn}" href="${configCmd}">Configure</a></td>`
					+ `<td style="${styles.tdCenter}"><a style="${styles.btn} ${styles.purgeBtn}" href="${purgeCmd}">Purge</a></td>`
					+ `</tr>`;
			};

			// NOTE: Build section header row
			const buildSectionRow = (label) => {
				return `<tr><td colspan="4" style="${styles.sectionRow} padding: 6px 4px;">${label}</td></tr>`;
			};

			// NOTE: Group by type
			const conditions = libraryKeys.filter(k => library[k].type === "condition");
			const spells = libraryKeys.filter(k => library[k].type === "spell");
			const traits = libraryKeys.filter(k => library[k].type === "trait");
			const reminders = libraryKeys.filter(k => library[k].type === "reminder");

			let tableRows = "";
			
			if (conditions.length > 0) {
				tableRows += buildSectionRow("Conditions");
				tableRows += conditions.map(k => buildEffectRow(k, library[k])).join("");
			}
			if (spells.length > 0) {
				tableRows += buildSectionRow("Spell Effects");
				tableRows += spells.map(k => buildEffectRow(k, library[k])).join("");
			}
			if (traits.length > 0) {
				tableRows += buildSectionRow("Traits");
				tableRows += traits.map(k => buildEffectRow(k, library[k])).join("");
			}
			if (reminders.length > 0) {
				tableRows += buildSectionRow("Reminders");
				tableRows += reminders.map(k => buildEffectRow(k, library[k])).join("");
			}

			const tableHtml = `<table style="${styles.table}">`
				+ `<thead><tr>`
				+ `<th style="${styles.thCenter}">Icon</th>`
				+ `<th style="${styles.th}">Name</th>`
				+ `<th style="${styles.thCenter}">Configure</th>`
				+ `<th style="${styles.thCenter}">Purge</th>`
				+ `</tr></thead>`
				+ `<tbody>${tableRows}</tbody>`
				+ `</table>`;

			const template = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">Effect Library (${libraryKeys.length} effects)</div>`
				+ `<div style="${styles.body}">${tableHtml}`
				+ `<a style="${styles.backBtn}" href="!ezcombat">${PhraseFactory.get({ transUnitId: "0x0C0B1030" })}</a>`
				+ `</div></div>`;

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);

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

	// ANCHOR Function: processConfigEffect
	/**
	 * @summary Opens configuration menu for an effect in the library.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --configeffect|effectKey
	 */
	const processConfigEffect = async (msgDetails) => {
		const thisFuncDebugName = "processConfigEffect";

		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Only the GM can configure effects."
				});
				return 1;
			}

			const content = msgDetails.raw.content;
			const match = content.match(/--configeffect\|([^|\s]+)/i);

			if (!match) return 1;

			const effectKey = match[1].trim().toLowerCase();
			const library = getEffectLibrary();
			const effect = library[effectKey];

			if (!effect) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: `Effect '${effectKey}' not found in library.`
				});
				return 1;
			}

			// NOTE: Build configuration menu (purple theme for GM config)
			const styles = {
				container: "background-color: #fff; border: 1px solid #44a; border-radius: 5px; overflow: hidden; margin: 5px 0;",
				header: "background-color: #44a; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;",
				body: "padding: 8px;",
				row: "display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px;",
				editBtn: "background-color: #44a; color: #fff; padding: 2px 6px; border-radius: 3px; text-decoration: none; font-size: 10px; margin-right: 8px;",
				label: "color: #666; min-width: 100px;",
				value: "font-weight: bold; flex: 1;",
				desc: "font-size: 11px; padding: 5px; background-color: #f5f5f5; border-radius: 3px; margin-bottom: 8px; margin-left: 30px;",
				btnRow: "display: flex; gap: 5px; margin-top: 10px;",
				btn: "flex: 1; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; font-size: 11px;",
				backBtn: "background-color: #44a; color: #fff;"
			};

			const iconHtml = getMarkerImage(effect.icon, 20);
			const durationText = effect.duration !== null ? effect.duration : PhraseFactory.get({ transUnitId: "0x0C0B1034" });
			const directionText = effect.direction === 1 ? PhraseFactory.get({ transUnitId: "0x0C0B1035" }) : (effect.direction === -1 ? PhraseFactory.get({ transUnitId: "0x0C0B1036" }) : PhraseFactory.get({ transUnitId: "0x0C0B1037" }));
			const autochangeText = effect.autochange || "manual";
			const visibilityText = effect.visibility === "hide" ? PhraseFactory.get({ transUnitId: "0x0C0B1039" }) : PhraseFactory.get({ transUnitId: "0x0C0B103A" });

			// NOTE: Build marker dropdown from available markers
			const markers = getAvailableMarkers();
			const markerOptions = ["none", ...markers];
			const markerDropdown = `?{Pick Token Marker|${markerOptions.join("|")}}`;

			// NOTE: Escape description for URL
			const escapedDesc = (effect.description || "").replace(/\|/g, "&#124;").replace(/&/g, "&#38;");

			// NOTE: Build separate update commands for each field
			const editDescCmd = `!ezcombat --setfield|${effectKey}|description|?{Description|${escapedDesc}}`;
			const editTypeCmd = `!ezcombat --setfield|${effectKey}|type|?{Type|condition|spell|trait|reminder}`;
			const editMarkerCmd = `!ezcombat --setfield|${effectKey}|icon|${markerDropdown}`;
			const editDurationCmd = `!ezcombat --setfield|${effectKey}|duration|?{Duration (0 for permanent)|${effect.duration || 0}}`;
			const editDirectionCmd = `!ezcombat --setfield|${effectKey}|direction|?{Direction|Down,-1|Up,1|None,0}`;
			const editAutochangeCmd = `!ezcombat --setfield|${effectKey}|autochange|?{Autochange|manual|turn|round}`;
			const editVisibilityCmd = `!ezcombat --setfield|${effectKey}|visibility|?{Visibility|show,show|hide (GM Only),hide}`;

			const template = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">${iconHtml} Configure: ${effect.name}</div>`
				+ `<div style="${styles.body}">`
				+ `<div style="${styles.row}"><a style="${styles.editBtn}" href="${editDescCmd}">${PhraseFactory.get({ transUnitId: "0x0C0B1026" })}</a><span style="${styles.label}">Description:</span></div>`
				+ `<div style="${styles.desc}">${effect.description || "No description."}</div>`
				+ `<div style="${styles.row}"><a style="${styles.editBtn}" href="${editTypeCmd}">${PhraseFactory.get({ transUnitId: "0x0C0B1026" })}</a><span style="${styles.label}">Type:</span><span style="${styles.value}">${effect.type}</span></div>`
				+ `<div style="${styles.row}"><a style="${styles.editBtn}" href="${editMarkerCmd}">${PhraseFactory.get({ transUnitId: "0x0C0B1026" })}</a><span style="${styles.label}">Token Marker:</span><span style="${styles.value}">${iconHtml} ${effect.icon || "none"}</span></div>`
				+ `<div style="${styles.row}"><a style="${styles.editBtn}" href="${editDurationCmd}">${PhraseFactory.get({ transUnitId: "0x0C0B1026" })}</a><span style="${styles.label}">Duration:</span><span style="${styles.value}">${durationText}</span></div>`
				+ `<div style="${styles.row}"><a style="${styles.editBtn}" href="${editDirectionCmd}">${PhraseFactory.get({ transUnitId: "0x0C0B1026" })}</a><span style="${styles.label}">Direction:</span><span style="${styles.value}">${directionText}</span></div>`
				+ `<div style="${styles.row}"><a style="${styles.editBtn}" href="${editAutochangeCmd}">${PhraseFactory.get({ transUnitId: "0x0C0B1026" })}</a><span style="${styles.label}">Autochange:</span><span style="${styles.value}">${autochangeText}</span></div>`
				+ `<div style="${styles.row}"><a style="${styles.editBtn}" href="${editVisibilityCmd}">${PhraseFactory.get({ transUnitId: "0x0C0B1026" })}</a><span style="${styles.label}">Visibility:</span><span style="${styles.value}">${visibilityText}</span></div>`
				+ `<div style="${styles.btnRow}">`
				+ `<a style="${styles.btn} ${styles.backBtn}" href="!ezcombat --effectlibrary">${PhraseFactory.get({ transUnitId: "0x0C0B1032" })}</a>`
				+ `</div></div></div>`;

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);

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

	// ANCHOR Function: processSetField
	/**
	 * @summary Updates a single field on an effect in the library.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --setfield|effectKey|fieldName|value
	 */
	const processSetField = async (msgDetails) => {
		const thisFuncDebugName = "processSetField";

		try {
			if (!msgDetails.isGm) return 1;

			const content = msgDetails.raw.content;
			const match = content.match(/--setfield\|([^|]+)\|([^|]+)\|(.*)$/i);

			if (!match) return 1;

			const effectKey = match[1].trim().toLowerCase();
			const fieldName = match[2].trim().toLowerCase();
			const fieldValue = match[3].trim();

			// NOTE: Initialize custom library if needed
			if (!EasyCombatVault.customLibrary) {
				EasyCombatVault.customLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));
			}

			const effect = EasyCombatVault.customLibrary[effectKey];
			if (!effect) return 1;

			// NOTE: Update the specific field
			switch (fieldName) {
				case "description":
					effect.description = fieldValue.replace(/&#124;/g, "|").replace(/&#38;/g, "&") || null;
					break;
				case "type":
					const validTypes = ["condition", "spell", "trait", "reminder"];
					if (validTypes.includes(fieldValue)) {
						effect.type = fieldValue;
					}
					break;
				case "icon":
					effect.icon = (fieldValue === "none" || fieldValue === "") ? null : fieldValue;
					break;
				case "duration":
					const dur = parseInt(fieldValue, 10);
					effect.duration = (isNaN(dur) || dur === 0) ? null : dur;
					effect.counter = effect.duration;
					break;
				case "direction":
					const dir = parseInt(fieldValue, 10);
					effect.direction = (dir === 1) ? 1 : (dir === -1) ? -1 : null;
					break;
				case "autochange":
					effect.autochange = (fieldValue === "turn" || fieldValue === "round") ? fieldValue : null;
					break;
				case "visibility":
					effect.visibility = (fieldValue === "hide") ? "hide" : "show";
					break;
				default:
					return 1;
			}

			// NOTE: Save to state for persistence
			if (typeof state !== "undefined") {
				state.EASY_COMBAT = state.EASY_COMBAT || {};
				state.EASY_COMBAT.effectLibrary = JSON.parse(JSON.stringify(EasyCombatVault.customLibrary));
			}

			// NOTE: Return to config menu for this effect
			const configMsgDetails = Object.assign({}, msgDetails);
			configMsgDetails.raw = { content: `!ezcombat --configeffect|${effectKey}` };
			processConfigEffect(configMsgDetails);

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

	// ANCHOR Function: processUpdateEffect
	/**
	 * @summary Updates an effect in the library (GM only).
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --updateeffect|key|icon|description|duration|autochange[|direction]
	 */
	const processUpdateEffect = async (msgDetails) => {
		const thisFuncDebugName = "processUpdateEffect";

		try {
			if (!msgDetails.isGm) return 1;

			const content = msgDetails.raw.content;
			const match = content.match(/--updateeffect\|([^|]+)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)(?:\|([^|\s]*))?/i);

			if (!match) return 1;

			const effectKey = match[1].trim().toLowerCase();
			const newIcon = (match[2].trim() === "none" || match[2].trim() === "") ? null : match[2].trim();
			const newDesc = match[3].trim().replace(/&#124;/g, "|") || null;
			const newDuration = parseInt(match[4].trim(), 10);
			const newAutochange = match[5].trim().toLowerCase();
			const directionParam = match[6] ? match[6].trim() : null;

			// NOTE: Initialize custom library if needed
			if (!EasyCombatVault.customLibrary) {
				EasyCombatVault.customLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));
			}

			if (EasyCombatVault.customLibrary[effectKey]) {
				const effect = EasyCombatVault.customLibrary[effectKey];
				
				effect.icon = newIcon;
				effect.description = newDesc;
				effect.duration = (isNaN(newDuration) || newDuration === 0) ? null : newDuration;
				effect.autochange = (newAutochange === "turn" || newAutochange === "round") ? newAutochange : null;
				effect.counter = effect.duration;

				// NOTE: Handle direction - from param or auto-detect based on duration
				if (directionParam !== null) {
					const dirNum = parseInt(directionParam, 10);
					effect.direction = (dirNum === 1) ? 1 : (dirNum === -1) ? -1 : null;
				} else {
					effect.direction = (effect.duration > 0) ? -1 : null;
				}
			}

			// NOTE: Save to state for persistence
			if (typeof state !== "undefined") {
				state.EASY_COMBAT = state.EASY_COMBAT || {};
				state.EASY_COMBAT.effectLibrary = JSON.parse(JSON.stringify(EasyCombatVault.customLibrary));
			}

			// NOTE: Return to config menu for this effect
			const configMsgDetails = Object.assign({}, msgDetails);
			configMsgDetails.raw = { content: `!ezcombat --configeffect|${effectKey}` };
			processConfigEffect(configMsgDetails);

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

	// ANCHOR Function: processPurgeEffect
	/**
	 * @summary Removes an effect from the library (GM only).
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Command format: --purgeeffect|effectKey
	 */
	const processPurgeEffect = async (msgDetails) => {
		const thisFuncDebugName = "processPurgeEffect";

		try {
			if (!msgDetails.isGm) return 1;

			const content = msgDetails.raw.content;
			const match = content.match(/--purgeeffect\|([^|\s]+)/i);

			if (!match) return 1;

			const effectKey = match[1].trim().toLowerCase();

			// NOTE: Initialize custom library if needed
			if (!EasyCombatVault.customLibrary) {
				EasyCombatVault.customLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));
			}

			// NOTE: Remove effect from library
			if (EasyCombatVault.customLibrary[effectKey]) {
				delete EasyCombatVault.customLibrary[effectKey];
			}

			// NOTE: Also update persistent state if exists
			if (typeof state !== "undefined" && state.EASY_COMBAT && state.EASY_COMBAT.effectLibrary) {
				if (state.EASY_COMBAT.effectLibrary[effectKey]) {
					delete state.EASY_COMBAT.effectLibrary[effectKey];
				}
			}

			// NOTE: Return to effect library menu
			processEffectLibrary(msgDetails);

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

	// ANCHOR Function: processExportLibrary
	/**
	 * @summary Exports the effect library to a handout's gmnotes (GM only).
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Creates handout with editable JSON in gmnotes div.
	 */
	const processExportLibrary = async (msgDetails) => {
		const thisFuncDebugName = "processExportLibrary";

		try {
			if (!msgDetails.isGm) return 1;

			const library = getEffectLibrary();
			const jsonExport = JSON.stringify(library, null, 2);

			// NOTE: Find or create handout for export
			const handoutName = "Easy Combat Config";
			let handout = findObjs({ type: "handout", name: handoutName })[0];

			if (!handout) {
				handout = createObj("handout", {
					name: handoutName,
					inplayerjournals: "",
					archived: false
				});
			}

			// NOTE: Build visible notes content with instructions
			const notesContent = `<h3>Easy Combat - Effect Library</h3>
<p>This handout stores your Easy Combat effect library configuration.</p>
<h4>How to Use</h4>
<ul>
<li><b>Import:</b> Click "Import Config" in the Easy Combat menu to load from this handout.</li>
<li><b>Transfer:</b> Transmogrify this handout to other campaigns, then import.</li>
<li><b>Manual Edit:</b> You can edit the JSON directly in GM Notes below.</li>
</ul>
<h4>Effect Format</h4>
<pre>
"effectkey": {
  "name": "Display Name",
  "type": "condition|spell|trait|reminder",
  "icon": "token-marker-name",
  "description": "What this effect does",
  "duration": null or number,
  "direction": -1 (down), 1 (up), or null,
  "autochange": "turn", "round", or null
}
</pre>`;

			// NOTE: Store formatted JSON in gmnotes - editable by GM
			const gmnotesContent = `<div id="ezcombat-config">
${jsonExport}
</div>`;

			handout.set("notes", notesContent);
			handout.set("gmnotes", gmnotesContent);

			// NOTE: Notify GM
			const styles = {
				container: "background-color: #fff; border: 1px solid #000; border-radius: 5px; overflow: hidden; margin: 5px 0;",
				header: "background-color: #7e2d40; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;",
				body: "padding: 8px;",
				note: "font-size: 12px; margin-bottom: 8px;",
				backBtn: "display: block; background-color: #666; color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; margin-top: 8px;"
			};

			const template = `<div style="${styles.container}">`
				+ `<div style="${styles.header}">Effect Library Exported</div>`
				+ `<div style="${styles.body}">`
				+ `<div style="${styles.note}">Exported to handout <b>"${handoutName}"</b> in the Journal.</div>`
				+ `<div style="${styles.note}">Edit the JSON directly in GM Notes, or transmogrify to other campaigns.</div>`
				+ `<a style="${styles.backBtn}" href="!ezcombat">${PhraseFactory.get({ transUnitId: "0x0C0B1030" })}</a>`
				+ `</div></div>`;

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);

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

	// ANCHOR Function: processImportLibrary
	/**
	 * @summary Imports an effect library from a handout's gmnotes (GM only).
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Reads JSON from ezcombat-config div in gmnotes.
	 */
	const processImportLibrary = async (msgDetails) => {
		const thisFuncDebugName = "processImportLibrary";

		try {
			if (!msgDetails.isGm) return 1;

			// NOTE: Find the config handout
			const handoutName = "Easy Combat Config";
			const handout = findObjs({ type: "handout", name: handoutName })[0];

			if (!handout) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: `Handout "${handoutName}" not found. Export first or create a handout with this name.`
				});
				return 1;
			}

			// NOTE: Read gmnotes asynchronously
			handout.get("gmnotes", (gmnotes) => {
				try {
					if (!gmnotes || gmnotes.trim() === "") {
						sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" No configuration found in handout.`);
						return;
					}

					// NOTE: Decode HTML entities
					const decodedNotes = gmnotes
						.replace(/&lt;/g, "<")
						.replace(/&gt;/g, ">")
						.replace(/&quot;/g, "\"")
						.replace(/&amp;/g, "&")
						.replace(/<br\s*\/?>/gi, "\n")
						.replace(/<\/div>/gi, "</div>\n");

					// NOTE: Extract JSON from ezcombat-config div (handles multiline)
					const divMatch = decodedNotes.match(/<div[^>]*id=["']?ezcombat-config["']?[^>]*>([\s\S]*?)<\/div>/i);
					let jsonData;

					if (divMatch && divMatch[1]) {
						// NOTE: Clean up the extracted content
						jsonData = divMatch[1]
							.replace(/<[^>]+>/g, "")  // Remove any HTML tags
							.replace(/&nbsp;/g, " ")  // Replace nbsp
							.trim();
					} else {
						sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" Could not find ezcombat-config div in handout. Re-export to fix.`);
						return;
					}

					const importedLibrary = JSON.parse(jsonData);

					// NOTE: Validate structure
					const keys = Object.keys(importedLibrary);
					if (keys.length === 0) {
						throw new Error("Empty library");
					}

					const firstEffect = importedLibrary[keys[0]];
					if (!firstEffect.name || !firstEffect.type) {
						throw new Error("Invalid effect structure - missing name or type");
					}

					// NOTE: Store in session and state
					EasyCombatVault.customLibrary = importedLibrary;

					if (typeof state !== "undefined") {
						state.EASY_COMBAT = state.EASY_COMBAT || {};
						state.EASY_COMBAT.effectLibrary = JSON.parse(JSON.stringify(importedLibrary));
					}

					sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" Imported ${keys.length} effects successfully.`);

					// NOTE: Show effect menu
					processEffectMenu(msgDetails);

				} catch (parseErr) {
					sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" Import failed: ${parseErr.message}`);
				}
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

	// ANCHOR Function: processResetLibrary
	/**
	 * @summary Resets the effect library to defaults (GM only).
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processResetLibrary = async (msgDetails) => {
		const thisFuncDebugName = "processResetLibrary";

		try {
			if (!msgDetails.isGm) return 1;

			// NOTE: Reset both session and state
			EasyCombatVault.customLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));

			if (typeof state !== "undefined") {
				state.EASY_COMBAT = state.EASY_COMBAT || {};
				state.EASY_COMBAT.effectLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));
			}

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: "Effect library reset to defaults."
			});

			processEffectMenu(msgDetails);

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

	// ANCHOR Function: processSyncMarkers
	/**
	 * @summary Syncs token status markers with stored effects on selected tokens.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Bidirectional sync - removes effects if markers removed, adds markers if missing.
	 */
	const processSyncMarkers = async (msgDetails) => {
		const thisFuncDebugName = "processSyncMarkers";

		try {
			if (!msgDetails.isGm) return 1;

			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Select one or more tokens first."
				});
				return 1;
			}

			let syncCount = 0;
			let totalEffectsRemoved = 0;
			let totalMarkersAdded = 0;
			let totalEffectsAdded = 0;

			for (const tokenId of msgDetails.selectedIds) {
				const token = getObj("graphic", tokenId);
				if (!token) continue;

				syncCount++;
				const result = syncTokenWithMarkers(token);
				totalEffectsRemoved += result.effectsRemoved;
				totalMarkersAdded += result.markersAdded;
				totalEffectsAdded += result.effectsAdded;
			}

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: `Synced ${syncCount} token(s). Effects: +${totalEffectsAdded}/-${totalEffectsRemoved}. Markers: +${totalMarkersAdded}.`
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

	// ANCHOR Function: processClearStatuses
	/**
	 * @summary Clears all status effects and markers from selected tokens.
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 */
	const processClearStatuses = async (msgDetails) => {
		const thisFuncDebugName = "processClearStatuses";

		try {
			if (!msgDetails.isGm) return 1;

			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: "Select one or more tokens first."
				});
				return 1;
			}

			let clearCount = 0;

			for (const tokenId of msgDetails.selectedIds) {
				const token = getObj("graphic", tokenId);
				if (!token) continue;

				// NOTE: Clear stored effects
				setTokenEffects(token, []);

				// NOTE: Clear status markers
				token.set("statusmarkers", "");

				clearCount++;
			}

			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: `Cleared all statuses from ${clearCount} token(s).`
			});

			// NOTE: Refresh turn announcement if current turn token was affected
			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0 && msgDetails.selectedIds.includes(turnOrder[0].id)) {
				const round = EasyCombatVault.round || 1;
				announceTurn(turnOrder[0], round);
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

	// ANCHOR Function: processAddItem
	/**
	 * @summary Adds a custom item to the turn order (round counter, timer, etc).
	 * @param {Object} msgDetails - Parsed message details from handleApiCall
	 * @returns {Promise<number>} 0 on success, 1 on failure
	 * @description Custom items are always standalone (id: "-1").
	 *              Direction determines if value increments (+1) or decrements (-1) each round.
	 *              Command format: --additem|name|value|direction
	 */
	const processAddItem = async (msgDetails) => {
		const thisFuncDebugName = "processAddItem";

		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0C0B1010" })
				});
				return 1;
			}

			// NOTE: Parse pipe-separated parameters: --additem|name|value|direction
			const content = msgDetails.raw.content;
			const addItemMatch = content.match(/--additem\|([^|]*)\|([^|]*)\|([^|\s]*)/i);

			let itemName = "Custom Item";
			let startValue = 0;
			let direction = "up";

			if (addItemMatch) {
				itemName = addItemMatch[1].trim() || "Custom Item";
				startValue = parseInt(addItemMatch[2], 10) || 0;
				direction = (addItemMatch[3] || "up").toLowerCase();
			}

			const formula = direction === "up" ? "+1" : "-1";

			// NOTE: Custom items are always standalone (no token)
			const pageId = Campaign().get("playerpageid");

			// NOTE: Build turn order entry (matches Aaron's AddCustomTurn format)
			const turnOrderEntry = {
				id: "-1",
				pr: startValue,
				custom: itemName,
				formula: formula,
				_pageid: pageId
			};

			// NOTE: Add to turn order
			const turnOrder = getCurrentTurnOrder();
			turnOrder.push(turnOrderEntry);
			setTurnOrder(turnOrder);

			// NOTE: Confirm addition
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({
					playerId: msgDetails.callerId,
					transUnitId: "0x0C0B100D",
					expressions: { name: itemName, value: startValue, direction }
				})
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
		"--viewstatus": (msgDetails) => processViewStatus(msgDetails),
		"--start": (msgDetails) => processStartCombat(msgDetails),
		"--stop": (msgDetails) => processStopCombat(msgDetails),
		"--next": (msgDetails) => processNextTurn(msgDetails),
		"--prev": (msgDetails) => processPrevTurn(msgDetails),
		"--effectmenu": (msgDetails) => processEffectMenu(msgDetails),
		"--effectlibrary": (msgDetails) => processEffectLibrary(msgDetails),
		"--refreshturn": (msgDetails) => processRefreshTurn(msgDetails),
		"--exportlibrary": (msgDetails) => processExportLibrary(msgDetails),
		"--importlibrary": (msgDetails) => processImportLibrary(msgDetails),
		"--resetlibrary": (msgDetails) => processResetLibrary(msgDetails),
		"--syncmarkers": (msgDetails) => processSyncMarkers(msgDetails),
		"--clearstatuses": (msgDetails) => processClearStatuses(msgDetails)
		// NOTE: --additem, --addeffect, --removeeffect handled specially (pipe-delimited params)
	};

	// NOTE: Set Default Action
	actionMap["--default"] = actionMap["--menu"];

	// ANCHOR Outer Method: registerEventHandlers
	const registerEventHandlers = () => {
		on("chat:message", (apiCall) => {
			if (apiCall.type === "api" && apiCall.content.startsWith(`!${moduleSettings.chatApiName}`)) {
				// NOTE: Build common msgDetails for special handlers
				const buildMsgDetails = () => ({
					raw: apiCall,
					callerId: apiCall.playerid,
					callerName: (getObj("player", apiCall.playerid) || { get: () => "Unknown" }).get("_displayname"),
					isGm: playerIsGM(apiCall.playerid),
					selectedIds: (apiCall.selected || []).map(s => s._id)
				});

				// NOTE: Special handling for pipe-delimited commands
				if (apiCall.content.includes("--additem|")) {
					processAddItem(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--addeffectconfirm|")) {
					processAddEffectConfirm(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--addeffect|")) {
					processAddEffect(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--removeeffect|")) {
					processRemoveEffect(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--effectdetail|")) {
					processEffectDetail(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--addreminder|")) {
					processAddReminder(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--editeffect|")) {
					processEditEffect(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--effectmenu|")) {
					processEffectMenu(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--removeeffectselected|")) {
					processRemoveEffectSelected(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--configeffect|")) {
					processConfigEffect(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--setfield|")) {
					processSetField(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--updateeffect|")) {
					processUpdateEffect(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--purgeeffect|")) {
					processPurgeEffect(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--displayeffect|")) {
					processDisplayEffect(buildMsgDetails());
					return;
				}
				if (apiCall.content.includes("--effectinfo|")) {
					processEffectInfo(buildMsgDetails());
					return;
				}

				Utils.handleApiCall({ actionMap, apiCall });
			}
		});

		// NOTE: Sync effects when token markers change (bidirectional)
		on("change:graphic:statusmarkers", (token, prev) => {
			if (!token) return;

			const currentMarkers = (token.get("statusmarkers") || "").split(",").filter(m => m);
			const prevMarkers = (prev.statusmarkers || "").split(",").filter(m => m);

			// NOTE: Find removed markers
			const removedMarkers = prevMarkers.filter(m => !currentMarkers.includes(m));

			// NOTE: Find added markers
			const addedMarkers = currentMarkers.filter(m => !prevMarkers.includes(m));

			const effects = getTokenEffects(token);
			let changed = false;

			// NOTE: Remove effects whose markers were removed
			if (removedMarkers.length > 0) {
				for (let i = effects.length - 1; i >= 0; i--) {
					if (effects[i].icon && removedMarkers.includes(effects[i].icon)) {
						effects.splice(i, 1);
						changed = true;
					}
				}
			}

			// NOTE: Add effects for markers that were added
			if (addedMarkers.length > 0) {
				const library = getEffectLibrary();
				const effectIcons = effects.map(e => e.icon).filter(i => i);

				for (const marker of addedMarkers) {
					// NOTE: Skip if effect with this icon already exists
					if (effectIcons.includes(marker)) continue;

					// NOTE: Find library effect with matching icon
					for (const [key, libEffect] of Object.entries(library)) {
						if (libEffect.icon === marker) {
							const newEffect = {
								name: libEffect.name,
								type: libEffect.type || "condition",
								icon: libEffect.icon,
								description: libEffect.description || "",
								duration: libEffect.duration !== undefined ? libEffect.duration : null,
								counter: libEffect.duration !== undefined ? libEffect.duration : null,
								direction: libEffect.direction !== undefined ? libEffect.direction : -1,
								autochange: libEffect.autochange || "turn"
							};
							effects.push(newEffect);
							effectIcons.push(marker);
							changed = true;
							break;
						}
					}
				}
			}

			if (changed) {
				setTokenEffects(token, effects);
			}
		});

		// NOTE: Minimal event hooks - only what's essential
		// TODO: Add turn order change handler if needed for external modifications

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
			sharedVault.EasyCombat = sharedVault.EasyCombat || { round: 0 };
			EasyCombatVault = sharedVault.EasyCombat;

			if (moduleSettings.verbose) {
				const msgId = "10000";
				Utils.logSyslogMessage({
					severity: "INFO",
					tag: moduleSettings.readableName,
					transUnitId: msgId,
					message: PhraseFactory.get({ transUnitId: msgId })
				});
			}

			// NOTE: Initialize effect library in state
			initializeEffectLibrary();

			// NOTE: Add localization phrases
			PhraseFactory.add({
				newMap: {
					enUS: {
						"0x0C0B1000": "Combat Tracker",
						"0x0C0B1001": "**Round {{ round }}** - {{ name }}'s turn!",
						"0x0C0B1002": "It's your turn!",
						"0x0C0B1003": "Next Turn",
						"0x0C0B1004": "Previous Turn",
						"0x0C0B1005": "Start Combat",
						"0x0C0B1006": "End Combat",
						"0x0C0B1007": "Round {{ round }}",
						"0x0C0B1008": "No active combat",
						"0x0C0B1009": "Combat started with {{ count }} combatants.",
						"0x0C0B100A": "Combat has ended.",
						"0x0C0B100B": "No active turn order.",
						"0x0C0B100C": "Add Item",
						"0x0C0B100D": "Added '{{ name }}' starting at {{ value }} ({{ direction }}).",
						"0x0C0B100E": "Manage Effects",
						"0x0C0B1010": "Only the GM can control combat.",
						"0x0C0B1020": "\u25B2",
						"0x0C0B1021": "\u25BC",
						"0x0C0B1022": "\u221E",
						"0x0C0B1023": "\u2190",
						"0x0C0B1024": "\u2014",
						"0x0C0B1025": "\u25CF",
						"0x0C0B1026": "\u270E",
						"0x0C0B1027": "\uD83D\uDD12",
						"0x0C0B1028": "\uD83D\uDC41",
						"0x0C0B1030": "\u2190 Back to Menu",
						"0x0C0B1031": "\u2190 Back to Turn",
						"0x0C0B1032": "\u2190 Back to Library",
						"0x0C0B1033": "\u2190 Back",
						"0x0C0B1034": "\u221E (permanent)",
						"0x0C0B1035": "\u25B2 Up",
						"0x0C0B1036": "\u25BC Down",
						"0x0C0B1037": "\u2014 None"
					},
					frFR: {
						"0x0C0B1000": "Suivi de Combat",
						"0x0C0B1001": "**Round {{ round }}** - C'est au tour de {{ name }} !",
						"0x0C0B1002": "C'est votre tour !",
						"0x0C0B1003": "Tour Suivant",
						"0x0C0B1004": "Tour PrÃ©cÃ©dent",
						"0x0C0B1005": "DÃ©marrer le Combat",
						"0x0C0B1006": "Terminer le Combat",
						"0x0C0B1007": "Round {{ round }}",
						"0x0C0B1008": "Pas de combat actif",
						"0x0C0B1009": "Combat dÃ©marrÃ© avec {{ count }} combattants.",
						"0x0C0B100A": "Le combat est terminÃ©.",
						"0x0C0B100B": "Pas d'ordre de tour actif.",
						"0x0C0B100C": "Ajouter un Ã‰lÃ©ment",
						"0x0C0B100D": "AjoutÃ© '{{ name }}' commenÃ§ant Ã  {{ value }} ({{ direction }}).",
						"0x0C0B100E": "GÃ©rer les Effets",
						"0x0C0B1010": "Seul le MJ peut contrÃ´ler le combat."
					}
				}
			});

			// NOTE: Add symbol translations separately to avoid encoding issues
			PhraseFactory.add({
				newMap: {
					enUS: {
						"0x0C0B1038": "None",
						"0x0C0B1039": "\uD83D\uDD12 GM Only",
						"0x0C0B103A": "\uD83D\uDC41 Visible to All"
					},
					frFR: {
						"0x0C0B1020": "\u25B2",
						"0x0C0B1021": "\u25BC",
						"0x0C0B1022": "\u221E",
						"0x0C0B1023": "\u2190",
						"0x0C0B1024": "\u2014",
						"0x0C0B1025": "\u25CF",
						"0x0C0B1026": "\u270E",
						"0x0C0B1027": "\uD83D\uDD12",
						"0x0C0B1028": "\uD83D\uDC41",
						"0x0C0B1030": "\u2190 Retour au Menu",
						"0x0C0B1031": "\u2190 Retour au Tour",
						"0x0C0B1032": "\u2190 Retour a la Bibliotheque",
						"0x0C0B1033": "\u2190 Retour",
						"0x0C0B1034": "\u221E (permanent)",
						"0x0C0B1035": "\u25B2 Haut",
						"0x0C0B1036": "\u25BC Bas",
						"0x0C0B1037": "\u2014 Aucun",
						"0x0C0B1038": "Aucun",
						"0x0C0B1039": "\uD83D\uDD12 MJ uniquement",
						"0x0C0B103A": "\uD83D\uDC41 Visible pour tous"
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

	return {
		// NOTE: Expose for external API integration if needed
		getCurrentRound: () => EasyCombatVault.round || 0,
		isInCombat: () => getCurrentTurnOrder().length > 0
	};

	// !SECTION End of Public Methods: Exposed Interface
	// !SECTION End of Object: EASY_COMBAT
})();