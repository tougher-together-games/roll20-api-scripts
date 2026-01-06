/*!
@language: en-US
@title: easy-combat.js
@description: The EASY_COMBAT module integrates with EASY_UTILS to provide a lightweight combat
	tracker for Roll20. Manages turn order, round tracking, and turn announcements.
@version: 2.0.0
@author: Mhykiel
@license: MIT
@repository: {@link https://github.com/tougher-together-games/roll20-api-scripts|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_COMBAT = (() => {
	// SECTION Object: EASY_COMBAT

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Combat",
		chatApiName: "ezcombat",
		globalName: "EASY_COMBAT",
		version: "2.0.0",
		author: "Mhykiel",
		sendWelcomeMsg: true,
		verbose: false,
		debug: {
			"onReady": false,
			"processMenuAsync": false,
			"processStartCombat": false,
			"processStopCombat": false,
			"processNextTurn": false,
			"processPrevTurn": false,
			"renderTemplateAsync": false
		}
	};

	// ANCHOR Member: Factory References
	let Utils = {};
	let PhraseFactory = {};
	let TemplateFactory = {};
	let ThemeFactory = {};

	// ANCHOR Member: Vault Reference
	let EasyCombatVault = {};

	// ANCHOR Member: Default Effect Library
	const DEFAULT_EFFECT_LIBRARY = {
		blinded: { name: "Blinded", type: "condition", icon: "bleeding-eye", description: "Cannot see. Auto-fails sight checks. Attacks against have advantage, attacks by have disadvantage.", duration: null, direction: null, autochange: null },
		charmed: { name: "Charmed", type: "spell", icon: "broken-heart", description: "Can't attack the charmer. Charmer has advantage on social checks.", duration: 10, direction: -1, autochange: "round" },
		concentration: { name: "Concentration", type: "spell", icon: "trophy", description: "Maintaining a spell. Taking damage requires CON save to maintain.", duration: null, direction: null, autochange: null },
		deafened: { name: "Deafened", type: "condition", icon: "edge-crack", description: "Cannot hear. Auto-fails hearing checks.", duration: null, direction: null, autochange: null },
		frightened: { name: "Frightened", type: "condition", icon: "screaming", description: "Disadvantage on checks/attacks while source in sight. Can't move closer to source.", duration: null, direction: null, autochange: null },
		grappled: { name: "Grappled", type: "condition", icon: "grab", description: "Speed is 0. Ends if grappler is incapacitated or effect moves you out of reach.", duration: null, direction: null, autochange: null },
		incapacitated: { name: "Incapacitated", type: "condition", icon: "interdiction", description: "Cannot take actions or reactions.", duration: null, direction: null, autochange: null },
		invisibility: { name: "Invisibility", type: "spell", icon: "ninja-mask", description: "Impossible to see. Attacks against have disadvantage, attacks by have advantage.", duration: 10, direction: -1, autochange: "round" },
		paralyzed: { name: "Paralyzed", type: "condition", icon: "pummeled", description: "Incapacitated, can't move or speak. Auto-fails STR/DEX saves. Attacks have advantage, hits within 5ft are crits.", duration: null, direction: null, autochange: null },
		petrified: { name: "Petrified", type: "condition", icon: "frozen-orb", description: "Transformed to stone. Incapacitated, unaware. Resistance to all damage. Immune to poison/disease.", duration: null, direction: null, autochange: null },
		poisoned: { name: "Poisoned", type: "condition", icon: "chemical-bolt", description: "Disadvantage on attack rolls and ability checks.", duration: null, direction: null, autochange: null },
		prone: { name: "Prone", type: "condition", icon: "back-pain", description: "Can only crawl. Disadvantage on attacks. Attacks within 5ft have advantage, beyond have disadvantage.", duration: null, direction: null, autochange: null },
		restrained: { name: "Restrained", type: "condition", icon: "fishing-net", description: "Speed is 0. Attacks against have advantage, attacks by have disadvantage. Disadvantage on DEX saves.", duration: null, direction: null, autochange: null },
		stunned: { name: "Stunned", type: "condition", icon: "fist", description: "Incapacitated, can't move, speaks falteringly. Auto-fails STR/DEX saves. Attacks have advantage.", duration: 1, direction: -1, autochange: "turn" },
		unconscious: { name: "Unconscious", type: "condition", icon: "sleepy", description: "Incapacitated, can't move/speak, unaware. Drops items, falls prone. Auto-fails STR/DEX saves. Attacks have advantage, hits within 5ft are crits.", duration: null, direction: null, autochange: null },
		rage: { name: "Rage", type: "trait", icon: "strong", description: "Advantage on STR checks/saves. Bonus rage damage on melee. Resistance to bludgeoning, piercing, slashing.", duration: 10, direction: -1, autochange: "round" },
		reckless: { name: "Reckless Attack", type: "trait", icon: "overdrive", description: "Advantage on melee attacks this turn. Attacks against you have advantage until next turn.", duration: 1, direction: -1, autochange: "turn" },
		defensive: { name: "Defensive Stance", type: "trait", icon: "white-tower", description: "+2 AC. Movement speed reduced by half.", duration: null, direction: null, autochange: null },
		dodge: { name: "Dodging", type: "trait", icon: "flying-flag", description: "Attacks against have disadvantage. Advantage on DEX saves.", duration: 1, direction: -1, autochange: "turn" },
		hiding: { name: "Hiding", type: "trait", icon: "ninja-mask", description: "Cannot be seen. Attacks have advantage. Revealed if you attack or make noise.", duration: null, direction: null, autochange: null }
	};

	// ANCHOR Member: Attribute Name for Storage
	const COMBAT_DATA_ATTR = "ez_combat_data";

	// SECTION Inner Methods: Utility Functions

	// ANCHOR Function: getCharacterFromToken
	const getCharacterFromToken = (token) => {
		if (!token) return null;
		const charId = token.get("represents");
		if (!charId) return null;
		return getObj("character", charId);
	};

	// ANCHOR Function: getCombatData
	const getCombatData = (character) => {
		if (!character) return null;
		const attr = findObjs({ _type: "attribute", _characterid: character.id, name: COMBAT_DATA_ATTR })[0];
		if (!attr) return null;
		const value = attr.get("current");
		if (!value || value.trim() === "") return null;
		try { return JSON.parse(value); } catch (e) { return null; }
	};

	// ANCHOR Function: setCombatData
	const setCombatData = (character, data) => {
		if (!character) return;
		const jsonStr = JSON.stringify(data);
		let attr = findObjs({ _type: "attribute", _characterid: character.id, name: COMBAT_DATA_ATTR })[0];
		if (attr) { attr.set("current", jsonStr); }
		else { createObj("attribute", { characterid: character.id, name: COMBAT_DATA_ATTR, current: jsonStr }); }
	};

	// ANCHOR Function: getTokenEffectsFromGMNotes
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
		} catch (err) { return []; }
	};

	// ANCHOR Function: setTokenEffectsToGMNotes
	const setTokenEffectsToGMNotes = (token, effects) => {
		if (!token) return;
		const data = JSON.stringify({ effects: effects || [] });
		const newDiv = `<div style="display: none;" id="easyCombatStatus">${data}</div>`;
		let gmNotes = token.get("gmnotes") || "";
		gmNotes = unescape(gmNotes);
		const divRegex = /<div[^>]*id=["']easyCombatStatus["'][^>]*>.*?<\/div>/i;
		if (divRegex.test(gmNotes)) { gmNotes = gmNotes.replace(divRegex, newDiv); }
		else { gmNotes = gmNotes + newDiv; }
		token.set("gmnotes", gmNotes);
	};

	// ANCHOR Function: updateDefaultToken
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
				} catch (e) { /* Skip */ }
			});
		} catch (err) { /* Skip */ }
	};

	// ANCHOR Function: getCurrentTurnOrder
	const getCurrentTurnOrder = () => {
		const turnOrderRaw = Campaign().get("turnorder");
		if (!turnOrderRaw || turnOrderRaw === "") return [];
		try { return JSON.parse(turnOrderRaw); } catch (err) { return []; }
	};

	// ANCHOR Function: setTurnOrder
	const setTurnOrder = (turnOrder) => {
		Campaign().set({ turnorder: JSON.stringify(turnOrder) });
	};

	// ANCHOR Function: applyCustomItemFormula
	const applyCustomItemFormula = (entry) => {
		if (!entry || !entry.formula) return entry;
		const formulaValue = parseInt(entry.formula, 10) || 0;
		entry.pr = (parseInt(entry.pr, 10) || 0) + formulaValue;
		return entry;
	};

	// ANCHOR Function: isCustomItem
	const isCustomItem = (entry) => {
		return entry && entry.id === "-1" && entry.custom;
	};

	// ANCHOR Function: getTokenEffects
	const getTokenEffects = (token) => {
		if (!token) return [];
		const character = getCharacterFromToken(token);
		if (character) {
			const data = getCombatData(character);
			return (data && Array.isArray(data.effects)) ? data.effects : [];
		} else {
			return getTokenEffectsFromGMNotes(token);
		}
	};

	// ANCHOR Function: setTokenEffects
	const setTokenEffects = (token, effects) => {
		if (!token) return;
		const character = getCharacterFromToken(token);
		if (character) {
			setCombatData(character, { effects: effects || [] });
			updateDefaultToken(token, character);
		} else {
			setTokenEffectsToGMNotes(token, effects);
		}
	};

	// ANCHOR Function: addTokenEffect
	const addTokenEffect = (token, effectKey, customProps = {}) => {
		if (!token || !effectKey) return false;
		const library = getEffectLibrary();
		let effect;
		if (library[effectKey.toLowerCase()]) {
			const libEffect = library[effectKey.toLowerCase()];
			effect = { name: libEffect.name, type: libEffect.type, icon: libEffect.icon, description: libEffect.description, duration: libEffect.duration, direction: libEffect.direction, autochange: libEffect.autochange, counter: libEffect.duration, ...customProps };
		} else {
			effect = { name: effectKey, type: customProps.type || "reminder", icon: customProps.icon || null, description: customProps.description || null, duration: customProps.duration !== undefined ? customProps.duration : null, direction: customProps.direction !== undefined ? customProps.direction : null, autochange: customProps.autochange || null, counter: customProps.duration !== undefined ? customProps.duration : null };
		}
		const effects = getTokenEffects(token);
		const existingIndex = effects.findIndex(e => e.name.toLowerCase() === effect.name.toLowerCase());
		if (existingIndex >= 0) { effects[existingIndex] = effect; }
		else { effects.push(effect); }
		setTokenEffects(token, effects);
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
	const removeTokenEffect = (token, effectName) => {
		if (!token || !effectName) return false;
		const effects = getTokenEffects(token);
		const effectIndex = effects.findIndex(e => e.name.toLowerCase() === effectName.toLowerCase());
		if (effectIndex < 0) return false;
		const removedEffect = effects[effectIndex];
		effects.splice(effectIndex, 1);
		setTokenEffects(token, effects);
		if (removedEffect.icon) {
			const currentMarkers = token.get("statusmarkers") || "";
			const markerList = currentMarkers.split(",").filter(m => m && m !== removedEffect.icon);
			token.set("statusmarkers", markerList.join(","));
		}
		return true;
	};

	// ANCHOR Function: syncTokenWithMarkers
	const syncTokenWithMarkers = (token) => {
		if (!token) return { effectsRemoved: 0, markersAdded: 0, effectsAdded: 0 };
		let effectsRemoved = 0, markersAdded = 0, effectsAdded = 0;
		const effects = getTokenEffects(token);
		const currentMarkersStr = token.get("statusmarkers") || "";
		const currentMarkers = currentMarkersStr.split(",").filter(m => m);
		const effectsToRemove = [];
		for (const effect of effects) {
			if (effect.icon && !currentMarkers.includes(effect.icon)) { effectsToRemove.push(effect.name); }
		}
		for (const effectName of effectsToRemove) {
			const idx = effects.findIndex(e => e.name === effectName);
			if (idx >= 0) { effects.splice(idx, 1); effectsRemoved++; }
		}
		const newMarkers = [...currentMarkers];
		for (const effect of effects) {
			if (effect.icon && !newMarkers.includes(effect.icon)) { newMarkers.push(effect.icon); markersAdded++; }
		}
		const library = getEffectLibrary();
		const effectIcons = effects.map(e => e.icon).filter(i => i);
		for (const marker of currentMarkers) {
			if (effectIcons.includes(marker)) continue;
			for (const [key, libEffect] of Object.entries(library)) {
				if (libEffect.icon === marker) {
					const newEffect = { name: libEffect.name, type: libEffect.type || "condition", icon: libEffect.icon, description: libEffect.description || "", duration: libEffect.duration !== undefined ? libEffect.duration : null, counter: libEffect.duration !== undefined ? libEffect.duration : null, direction: libEffect.direction !== undefined ? libEffect.direction : -1, autochange: libEffect.autochange || "turn" };
					effects.push(newEffect);
					effectIcons.push(marker);
					effectsAdded++;
					break;
				}
			}
		}
		if (effectsRemoved > 0 || effectsAdded > 0) { setTokenEffects(token, effects); }
		if (markersAdded > 0) { token.set("statusmarkers", newMarkers.join(",")); }
		return { effectsRemoved, markersAdded, effectsAdded };
	};

	// ANCHOR Function: getCurrentTurnToken
	const getCurrentTurnToken = () => {
		const turnOrder = getCurrentTurnOrder();
		if (turnOrder.length === 0) return null;
		const current = turnOrder[0];
		if (isCustomItem(current)) return null;
		return getObj("graphic", current.id);
	};

	// ANCHOR Function: updateEffectCounters
	const updateEffectCounters = (token, trigger) => {
		if (!token) return;
		const effects = getTokenEffects(token);
		const toRemove = [];
		let changed = false;
		for (const effect of effects) {
			if (effect.autochange !== trigger) continue;
			if (effect.duration === null || effect.counter === null || effect.direction === null) continue;
			effect.counter = effect.counter + effect.direction;
			changed = true;
			if (effect.counter <= 0) { toRemove.push(effect.name); }
		}
		if (changed) { setTokenEffects(token, effects); }
		for (const effectName of toRemove) { removeTokenEffect(token, effectName); }
	};

	// ANCHOR Function: updateAllTokensRoundCounters
	const updateAllTokensRoundCounters = () => {
		const turnOrder = getCurrentTurnOrder();
		for (const entry of turnOrder) {
			if (isCustomItem(entry)) continue;
			const token = getObj("graphic", entry.id);
			if (token) { updateEffectCounters(token, "round"); }
		}
	};

	// ANCHOR Function: addReminder
	const addReminder = (token, title, description) => {
		if (!token || !title) return false;
		const effects = getTokenEffects(token);
		effects.push({ name: title, type: "reminder", icon: null, description: description || null, duration: null, direction: null, autochange: null, counter: null });
		setTokenEffects(token, effects);
		return true;
	};

	// ANCHOR Function: getEffectLibrary
	const getEffectLibrary = () => {
		if (EasyCombatVault.customLibrary) { return EasyCombatVault.customLibrary; }
		if (typeof state !== "undefined" && state.EASY_COMBAT && state.EASY_COMBAT.effectLibrary) { return state.EASY_COMBAT.effectLibrary; }
		return DEFAULT_EFFECT_LIBRARY;
	};

	// ANCHOR Function: initializeEffectLibrary
	const initializeEffectLibrary = () => {
		if (typeof state !== "undefined") {
			state.EASY_COMBAT = state.EASY_COMBAT || {};
			if (!state.EASY_COMBAT.effectLibrary) {
				state.EASY_COMBAT.effectLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));
			}
		}
	};

	// ANCHOR Function: getInitiativeBonus
	const getInitiativeBonus = (token) => {
		const characterId = token.get("represents");
		if (!characterId) return 0;
		const attrNames = ["initiative_bonus", "initiative", "init_bonus", "init"];
		for (const attrName of attrNames) {
			const attr = findObjs({ _type: "attribute", _characterid: characterId, name: attrName })[0];
			if (attr) { const value = parseInt(attr.get("current"), 10); if (!isNaN(value)) return value; }
		}
		return 0;
	};

	// ANCHOR Function: rollInitiative
	const rollInitiative = (token) => {
		const bonus = getInitiativeBonus(token);
		const roll = randomInteger(20);
		return roll + bonus;
	};

	// ANCHOR Function: pingTokenControllers
	const pingTokenControllers = (token) => {
		if (!token) return;
		const pageId = token.get("_pageid");
		const left = token.get("left");
		const top = token.get("top");
		const character = getObj("character", token.get("represents"));
		const controllerIds = [];
		if (character) {
			const controllers = character.get("controlledby").split(",").filter(Boolean);
			for (const id of controllers) { if (id !== "all") { controllerIds.push(id); } }
		}
		if (controllerIds.length > 0) {
			for (const playerId of controllerIds) {
				const player = getObj("player", playerId);
				if (player) { sendPing(left, top, pageId, playerId, false, playerId); }
			}
		} else {
			const gmPlayers = findObjs({ _type: "player" }).filter(p => playerIsGM(p.id));
			for (const gm of gmPlayers) { sendPing(left, top, pageId, gm.id, false, gm.id); }
		}
	};

	// ANCHOR Function: getAvailableMarkers
	const getAvailableMarkers = () => {
		const markers = [];
		if (typeof libTokenMarkers !== "undefined" && libTokenMarkers.getOrderedList) {
			const orderedList = libTokenMarkers.getOrderedList();
			for (const marker of orderedList) { if (marker.tag) { markers.push(marker.tag); } }
		}
		if (markers.length === 0) {
			try {
				const campaignMarkers = JSON.parse(Campaign().get("token_markers") || "[]");
				for (const marker of campaignMarkers) { if (marker.tag) { markers.push(marker.tag); } }
			} catch (err) { /* Ignore */ }
			const defaultMarkers = ["red", "blue", "green", "brown", "purple", "pink", "yellow", "dead", "skull", "sleepy", "half-heart", "half-haze", "interdiction", "snail", "lightning-helix", "spanner", "chained-heart", "chemical-bolt", "death-zone", "drink-me", "edge-crack", "ninja-mask", "stopwatch", "fishing-net", "overdrive", "strong", "fist", "padlock", "three-leaves", "fluffy-wing", "pummeled", "tread", "arrowed", "aura", "back-pain", "black-flag", "bleeding-eye", "bolt-shield", "broken-heart", "cobweb", "broken-skull", "frozen-orb", "rolling-bomb", "white-tower", "grab", "screaming", "grenade", "sentry-gun", "all-for-one", "angel-outfit", "archery-target"];
			for (const m of defaultMarkers) { if (!markers.includes(m)) { markers.push(m); } }
		}
		return markers.sort();
	};

	// ANCHOR Function: getMarkerImage
	const getMarkerImage = (marker, size = 18) => {
		if (!marker) return "";
		if (typeof libTokenMarkers !== "undefined" && libTokenMarkers.getStatus) {
			const markerInfo = libTokenMarkers.getStatus(marker);
			if (markerInfo && markerInfo.url) {
				return `<img src="${markerInfo.url}" style="width: ${size}px; height: ${size}px; vertical-align: middle;" />`;
			}
		}
		return `<span style="font-size: ${size}px;">\u25CF</span>`;
	};

	// !SECTION End of Utility Functions

	// SECTION Combat Templates and Themes
	// NOTE: These are registered with TemplateFactory and ThemeFactory in checkInstall

	// ANCHOR Member: COMBAT_TEMPLATES
	const COMBAT_TEMPLATES = {
		// Main menu uses chatMenu template from Easy-Utils

		// Turn announcement template
		combatTurnAnnouncement: `
<div id="rootContainer" class="ez-box ez-combat-turn {{ turnClass }}">
	<div class="ez-cap ez-cap-top"></div>
	<div class="ez-title">{{ title }}</div>
	<div class="ez-body">
		<div class="ez-token-row">{{ tokenImage }}<span class="ez-token-name">{{ tokenName }}</span></div>
		<div class="ez-section-header"><a class="ez-section-btn" href="{{ addConditionCmd }}">+ Add</a><span>Conditions</span></div>
		<div class="ez-effect-grid">{{ conditionsHtml }}</div>
		<div class="ez-section-header"><a class="ez-section-btn" href="{{ addSpellCmd }}">+ Add</a><span>Spell Effects</span></div>
		<div class="ez-effect-grid">{{ spellsHtml }}</div>
		<div class="ez-section-header"><a class="ez-section-btn" href="{{ addTraitCmd }}">+ Add</a><span>Traits</span></div>
		<div class="ez-effect-grid">{{ traitsHtml }}</div>
		<div class="ez-section-header"><a class="ez-section-btn" href="{{ addReminderCmd }}">+ Add</a><span>Reminders</span></div>
		<div class="ez-effect-grid">{{ remindersHtml }}</div>
		<div class="ez-button-row">
			<a class="ez-btn" href="{{ addStatusCmd }}">Add Status</a>
			<a class="ez-btn" href="!ezcombat --next">End Turn</a>
		</div>
	</div>
	<div class="ez-cap ez-cap-bottom"></div>
</div>`,

		// Turn announcement read-only (for non-controllers)
		combatTurnReadOnly: `
<div id="rootContainer" class="ez-box ez-combat-turn {{ turnClass }}">
	<div class="ez-cap ez-cap-top"></div>
	<div class="ez-title">{{ title }}</div>
	<div class="ez-body">
		<div class="ez-token-row">{{ tokenImage }}<span class="ez-token-name">{{ tokenName }}</span></div>
		<div class="ez-section-label">Conditions</div>
		<div class="ez-effect-grid">{{ conditionsHtml }}</div>
		<div class="ez-section-label">Spell Effects</div>
		<div class="ez-effect-grid">{{ spellsHtml }}</div>
		<div class="ez-section-label">Traits</div>
		<div class="ez-effect-grid">{{ traitsHtml }}</div>
	</div>
	<div class="ez-cap ez-cap-bottom"></div>
</div>`,

		// Custom item (round counter) template
		combatCustomItem: `
<div id="rootContainer" class="ez-box ez-combat-custom">
	<div class="ez-cap ez-cap-top"></div>
	<div class="ez-title">{{ name }}</div>
	<div class="ez-body">
		<div class="ez-custom-value">{{ value }}</div>
	</div>
	<div class="ez-cap ez-cap-bottom"></div>
</div>`,

		// Token status view (blue theme)
		combatTokenStatus: `
<div id="rootContainer" class="ez-box ez-combat-status">
	<div class="ez-cap ez-cap-top"></div>
	<div class="ez-title">Token Status</div>
	<div class="ez-body">
		<div class="ez-token-row">{{ tokenImage }}<span class="ez-token-name">{{ tokenName }}</span></div>
		<div class="ez-section-header"><a class="ez-section-btn" href="{{ addConditionCmd }}">+ Add</a><span>Conditions</span></div>
		<div class="ez-effect-grid">{{ conditionsHtml }}</div>
		<div class="ez-section-header"><a class="ez-section-btn" href="{{ addSpellCmd }}">+ Add</a><span>Spell Effects</span></div>
		<div class="ez-effect-grid">{{ spellsHtml }}</div>
		<div class="ez-section-header"><a class="ez-section-btn" href="{{ addTraitCmd }}">+ Add</a><span>Traits</span></div>
		<div class="ez-effect-grid">{{ traitsHtml }}</div>
		<div class="ez-section-header"><a class="ez-section-btn" href="{{ addReminderCmd }}">+ Add</a><span>Reminders</span></div>
		<div class="ez-effect-grid">{{ remindersHtml }}</div>
		<div class="ez-button-row">
			<a class="ez-btn" href="{{ addStatusCmd }}">Add Status</a>
			<a class="ez-btn" href="!ezcombat">Back to Menu</a>
		</div>
	</div>
	<div class="ez-cap ez-cap-bottom"></div>
</div>`,

		// Effect detail card
		combatEffectDetail: `
<div id="rootContainer" class="ez-box ez-combat-detail">
	<div class="ez-cap ez-cap-top"></div>
	<div class="ez-title">{{ iconHtml }}{{ effectName }}</div>
	<div class="ez-body">
		<div class="ez-description">{{ description }}</div>
		<div class="ez-stat-row"><span class="ez-stat-label">Type:</span><span class="ez-stat-value">{{ effectType }}</span></div>
		<div class="ez-stat-row"><span class="ez-stat-label">Duration:</span><span class="ez-stat-value">{{ duration }}</span></div>
		<div class="ez-stat-row"><span class="ez-stat-label">Counter:</span><span class="ez-stat-value">{{ counter }}</span></div>
		<div class="ez-stat-row"><span class="ez-stat-label">Direction:</span><span class="ez-stat-value">{{ direction }}</span></div>
		<div class="ez-stat-row"><span class="ez-stat-label">Autochange:</span><span class="ez-stat-value">{{ autochange }}</span></div>
		<div class="ez-button-row">{{ buttonsHtml }}</div>
		<a class="ez-back-btn" href="!ezcombat --refreshturn">\u2190 Back to Turn</a>
	</div>
	<div class="ez-cap ez-cap-bottom"></div>
</div>`,

		// Effect info (public display)
		combatEffectInfo: `
<div id="rootContainer" class="ez-box ez-combat-info">
	<div class="ez-cap ez-cap-top"></div>
	<div class="ez-title">{{ iconHtml }}{{ effectName }}</div>
	<div class="ez-body">
		<div class="ez-token-label">On: {{ tokenName }}</div>
		<div class="ez-description">{{ description }}</div>
		<div class="ez-stat-row"><span class="ez-stat-label">Type:</span><span class="ez-stat-value">{{ effectType }}</span></div>
		<div class="ez-stat-row"><span class="ez-stat-label">Counter:</span><span class="ez-stat-value">{{ counter }}</span></div>
	</div>
	<div class="ez-cap ez-cap-bottom"></div>
</div>`,

		// Combat ended
		combatEnded: `
<div id="rootContainer" class="ez-box ez-combat-ended">
	<div class="ez-cap ez-cap-top"></div>
	<div class="ez-title">{{ message }}</div>
	<div class="ez-cap ez-cap-bottom"></div>
</div>`,

		// Confirmation dialog
		combatConfirm: `
<div id="rootContainer" class="ez-box ez-combat-confirm">
	<div class="ez-cap ez-cap-top"></div>
	<div class="ez-title">{{ title }}</div>
	<div class="ez-body">
		<div class="ez-confirm-text">{{ message }}</div>
		<div class="ez-button-row">
			<a class="ez-btn ez-confirm" href="{{ confirmCmd }}">{{ confirmText }}</a>
			<a class="ez-btn ez-cancel" href="{{ cancelCmd }}">{{ cancelText }}</a>
		</div>
	</div>
	<div class="ez-cap ez-cap-bottom"></div>
</div>`
	};

	// ANCHOR Member: COMBAT_THEMES
	const COMBAT_THEMES = {
		// Turn announcement theme (red/combat)
		combatTurnAnnouncement: `
:root {
	--ezcombat-color-primary: #7e2d40;
	--ezcombat-color-secondary: #5a1f2d;
	--ezcombat-color-condition: #ffcccc;
	--ezcombat-color-condition-border: #cc9999;
	--ezcombat-color-spell: #ccccff;
	--ezcombat-color-spell-border: #9999cc;
	--ezcombat-color-trait: #ccffcc;
	--ezcombat-color-trait-border: #99cc99;
	--ezcombat-color-reminder: #ffffcc;
	--ezcombat-color-reminder-border: #cccc99;
}

#rootContainer.ez-box { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.4; color: #000; max-width: 100%; margin: 0; padding: 0; background-color: #fff; border: 1px solid var(--ezcombat-color-primary); border-radius: 5px; overflow: hidden; }
.ez-cap { min-height: 8px; }
.ez-cap-top { background: var(--ezcombat-color-primary); border-radius: 5px 5px 0 0; }
.ez-cap-bottom { background: var(--ezcombat-color-primary); border-radius: 0 0 5px 5px; }
.ez-combat-turn .ez-title { background: var(--ezcombat-color-primary); color: #fff; font-weight: bold; text-align: center; padding: 5px 8px; font-size: 14px; }
.ez-combat-turn .ez-body { padding: 8px; }
.ez-token-row { display: flex; align-items: center; margin-bottom: 8px; }
.ez-token-row img { width: 50px; height: 50px; border: 1px solid #000; border-radius: 3px; margin-right: 10px; }
.ez-token-name { font-size: 16px; font-weight: bold; }
.ez-section-header { display: flex; align-items: center; font-weight: bold; border-bottom: 1px solid #ccc; margin: 8px 0 4px 0; padding-bottom: 2px; font-size: 11px; color: #666; }
.ez-section-btn { background-color: var(--ezcombat-color-primary); color: #fff; padding: 1px 5px; border-radius: 3px; text-decoration: none; font-size: 9px; margin-right: 8px; }
.ez-section-label { font-weight: bold; border-bottom: 1px solid #ccc; margin: 8px 0 4px 0; padding-bottom: 2px; font-size: 11px; color: #666; }
.ez-effect-grid { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
.ez-effect-btn { display: flex; align-items: center; padding: 5px 8px; border-radius: 4px; text-decoration: none; font-size: 12px; color: #000; }
.ez-effect-condition { background-color: var(--ezcombat-color-condition); border: 1px solid var(--ezcombat-color-condition-border); }
.ez-effect-spell { background-color: var(--ezcombat-color-spell); border: 1px solid var(--ezcombat-color-spell-border); }
.ez-effect-trait { background-color: var(--ezcombat-color-trait); border: 1px solid var(--ezcombat-color-trait-border); }
.ez-effect-reminder { background-color: var(--ezcombat-color-reminder); border: 1px solid var(--ezcombat-color-reminder-border); }
.ez-effect-icon { font-size: 14px; margin-right: 6px; }
.ez-effect-name { flex: 1; font-weight: bold; }
.ez-effect-counter { font-size: 11px; color: #555; margin-left: 6px; }
.ez-effect-none { color: #888; font-style: italic; font-size: 11px; padding: 3px 0; }
.ez-button-row { display: flex; gap: 5px; margin-top: 8px; }
.ez-btn { flex: 1; background-color: var(--ezcombat-color-primary); color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; }
`,

		// Turn announcement read-only theme
		combatTurnReadOnly: `
:root {
	--ezcombat-color-primary: #7e2d40;
	--ezcombat-color-condition: #ffcccc;
	--ezcombat-color-condition-border: #cc9999;
	--ezcombat-color-spell: #ccccff;
	--ezcombat-color-spell-border: #9999cc;
	--ezcombat-color-trait: #ccffcc;
	--ezcombat-color-trait-border: #99cc99;
}

#rootContainer.ez-box { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.4; color: #000; max-width: 100%; margin: 0; padding: 0; background-color: #fff; border: 1px solid var(--ezcombat-color-primary); border-radius: 5px; overflow: hidden; }
.ez-cap { min-height: 8px; }
.ez-cap-top { background: var(--ezcombat-color-primary); border-radius: 5px 5px 0 0; }
.ez-cap-bottom { background: var(--ezcombat-color-primary); border-radius: 0 0 5px 5px; }
.ez-combat-turn .ez-title { background: var(--ezcombat-color-primary); color: #fff; font-weight: bold; text-align: center; padding: 5px 8px; font-size: 14px; }
.ez-combat-turn .ez-body { padding: 8px; }
.ez-token-row { display: flex; align-items: center; margin-bottom: 8px; }
.ez-token-row img { width: 50px; height: 50px; border: 1px solid #000; border-radius: 3px; margin-right: 10px; }
.ez-token-name { font-size: 16px; font-weight: bold; }
.ez-section-label { font-weight: bold; border-bottom: 1px solid #ccc; margin: 8px 0 4px 0; padding-bottom: 2px; font-size: 11px; color: #666; }
.ez-effect-grid { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
.ez-effect-btn { display: flex; align-items: center; padding: 5px 8px; border-radius: 4px; text-decoration: none; font-size: 12px; color: #000; }
.ez-effect-condition { background-color: var(--ezcombat-color-condition); border: 1px solid var(--ezcombat-color-condition-border); }
.ez-effect-spell { background-color: var(--ezcombat-color-spell); border: 1px solid var(--ezcombat-color-spell-border); }
.ez-effect-trait { background-color: var(--ezcombat-color-trait); border: 1px solid var(--ezcombat-color-trait-border); }
.ez-effect-icon { font-size: 14px; margin-right: 6px; }
.ez-effect-name { flex: 1; font-weight: bold; }
.ez-effect-counter { font-size: 11px; color: #555; margin-left: 6px; }
.ez-effect-none { color: #888; font-style: italic; font-size: 11px; padding: 3px 0; }
`,

		// Custom item theme (gray)
		combatCustomItem: `
:root { --ezcombat-color-custom: #4a4a4a; }
#rootContainer.ez-box { font-family: Arial, sans-serif; font-size: 13px; color: #000; background-color: #fff; border: 1px solid var(--ezcombat-color-custom); border-radius: 5px; overflow: hidden; }
.ez-cap { min-height: 8px; }
.ez-cap-top { background: var(--ezcombat-color-custom); border-radius: 5px 5px 0 0; }
.ez-cap-bottom { background: var(--ezcombat-color-custom); border-radius: 0 0 5px 5px; }
.ez-combat-custom .ez-title { background: var(--ezcombat-color-custom); color: #fff; font-weight: bold; text-align: center; padding: 5px 8px; font-size: 14px; }
.ez-combat-custom .ez-body { padding: 8px; text-align: center; }
.ez-custom-value { font-size: 24px; font-weight: bold; color: var(--ezcombat-color-custom); }
`,

		// Token status theme (blue)
		combatTokenStatus: `
:root {
	--ezcombat-color-status: #4a6785;
	--ezcombat-color-condition: #ffcccc;
	--ezcombat-color-condition-border: #cc9999;
	--ezcombat-color-spell: #ccccff;
	--ezcombat-color-spell-border: #9999cc;
	--ezcombat-color-trait: #ccffcc;
	--ezcombat-color-trait-border: #99cc99;
	--ezcombat-color-reminder: #ffffcc;
	--ezcombat-color-reminder-border: #cccc99;
}

#rootContainer.ez-box { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.4; color: #000; background-color: #fff; border: 1px solid var(--ezcombat-color-status); border-radius: 5px; overflow: hidden; }
.ez-cap { min-height: 8px; }
.ez-cap-top { background: var(--ezcombat-color-status); border-radius: 5px 5px 0 0; }
.ez-cap-bottom { background: var(--ezcombat-color-status); border-radius: 0 0 5px 5px; }
.ez-combat-status .ez-title { background: var(--ezcombat-color-status); color: #fff; font-weight: bold; text-align: center; padding: 5px 8px; font-size: 14px; }
.ez-combat-status .ez-body { padding: 8px; }
.ez-token-row { display: flex; align-items: center; margin-bottom: 8px; }
.ez-token-row img { width: 50px; height: 50px; border: 1px solid #000; border-radius: 3px; margin-right: 10px; }
.ez-token-name { font-size: 16px; font-weight: bold; }
.ez-section-header { display: flex; align-items: center; font-weight: bold; border-bottom: 1px solid #ccc; margin: 8px 0 4px 0; padding-bottom: 2px; font-size: 11px; color: #666; }
.ez-section-btn { background-color: var(--ezcombat-color-status); color: #fff; padding: 1px 5px; border-radius: 3px; text-decoration: none; font-size: 9px; margin-right: 8px; }
.ez-effect-grid { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
.ez-effect-btn { display: flex; align-items: center; padding: 5px 8px; border-radius: 4px; text-decoration: none; font-size: 12px; color: #000; }
.ez-effect-condition { background-color: var(--ezcombat-color-condition); border: 1px solid var(--ezcombat-color-condition-border); }
.ez-effect-spell { background-color: var(--ezcombat-color-spell); border: 1px solid var(--ezcombat-color-spell-border); }
.ez-effect-trait { background-color: var(--ezcombat-color-trait); border: 1px solid var(--ezcombat-color-trait-border); }
.ez-effect-reminder { background-color: var(--ezcombat-color-reminder); border: 1px solid var(--ezcombat-color-reminder-border); }
.ez-effect-icon { font-size: 14px; margin-right: 6px; }
.ez-effect-name { flex: 1; font-weight: bold; }
.ez-effect-counter { font-size: 11px; color: #555; margin-left: 6px; }
.ez-effect-none { color: #888; font-style: italic; font-size: 11px; padding: 3px 0; }
.ez-button-row { display: flex; gap: 5px; margin-top: 8px; }
.ez-btn { flex: 1; background-color: var(--ezcombat-color-status); color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; }
`,

		// Effect detail theme
		combatEffectDetail: `
:root { --ezcombat-color-detail: #4a4a4a; }
#rootContainer.ez-box { font-family: Arial, sans-serif; font-size: 13px; color: #000; background-color: #fff; border: 1px solid #000; border-radius: 5px; overflow: hidden; }
.ez-cap { min-height: 8px; }
.ez-cap-top { background: var(--ezcombat-color-detail); border-radius: 5px 5px 0 0; }
.ez-cap-bottom { background: var(--ezcombat-color-detail); border-radius: 0 0 5px 5px; }
.ez-combat-detail .ez-title { background: var(--ezcombat-color-detail); color: #fff; font-weight: bold; text-align: left; padding: 5px 8px; font-size: 14px; }
.ez-combat-detail .ez-body { padding: 8px; }
.ez-description { font-size: 12px; margin-bottom: 10px; padding: 5px; background-color: #f5f5f5; border-radius: 3px; }
.ez-stat-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px; }
.ez-stat-label { color: #666; }
.ez-stat-value { font-weight: bold; }
.ez-button-row { display: flex; gap: 5px; margin-top: 10px; }
.ez-btn { flex: 1; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; font-size: 11px; }
.ez-btn-display { background-color: #3a3; color: #fff; }
.ez-btn-edit { background-color: #4a4a4a; color: #fff; }
.ez-btn-remove { background-color: #a33; color: #fff; }
.ez-back-btn { display: block; background-color: #666; color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; margin-top: 5px; }
`,

		// Effect info theme
		combatEffectInfo: `
:root { --ezcombat-color-info: #4a4a4a; }
#rootContainer.ez-box { font-family: Arial, sans-serif; font-size: 13px; color: #000; background-color: #fff; border: 1px solid #000; border-radius: 5px; overflow: hidden; }
.ez-cap { min-height: 8px; }
.ez-cap-top { background: var(--ezcombat-color-info); border-radius: 5px 5px 0 0; }
.ez-cap-bottom { background: var(--ezcombat-color-info); border-radius: 0 0 5px 5px; }
.ez-combat-info .ez-title { background: var(--ezcombat-color-info); color: #fff; font-weight: bold; text-align: left; padding: 5px 8px; font-size: 14px; }
.ez-combat-info .ez-body { padding: 8px; }
.ez-token-label { font-size: 11px; color: #666; margin-bottom: 5px; }
.ez-description { font-size: 12px; padding: 5px; background-color: #f5f5f5; border-radius: 3px; }
.ez-stat-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 11px; }
.ez-stat-label { color: #666; }
.ez-stat-value { font-weight: bold; }
`,

		// Combat ended theme
		combatEnded: `
:root { --ezcombat-color-ended: #4a4a4a; }
#rootContainer.ez-box { font-family: Arial, sans-serif; font-size: 13px; color: #000; background-color: #fff; border: 1px solid var(--ezcombat-color-ended); border-radius: 5px; overflow: hidden; }
.ez-cap { min-height: 8px; }
.ez-cap-top { background: var(--ezcombat-color-ended); border-radius: 5px 5px 0 0; }
.ez-cap-bottom { background: var(--ezcombat-color-ended); border-radius: 0 0 5px 5px; }
.ez-combat-ended .ez-title { background: var(--ezcombat-color-ended); color: #fff; font-weight: bold; text-align: center; padding: 5px 8px; font-size: 14px; }
`,

		// Confirmation dialog theme
		combatConfirm: `
:root { --ezcombat-color-confirm: #cc8800; }
#rootContainer.ez-box { font-family: Arial, sans-serif; font-size: 13px; color: #000; background-color: #fff; border: 1px solid var(--ezcombat-color-confirm); border-radius: 5px; overflow: hidden; }
.ez-cap { min-height: 8px; }
.ez-cap-top { background: var(--ezcombat-color-confirm); border-radius: 5px 5px 0 0; }
.ez-cap-bottom { background: var(--ezcombat-color-confirm); border-radius: 0 0 5px 5px; }
.ez-combat-confirm .ez-title { background: var(--ezcombat-color-confirm); color: #fff; font-weight: bold; text-align: center; padding: 5px 8px; font-size: 14px; }
.ez-combat-confirm .ez-body { padding: 8px; }
.ez-confirm-text { margin-bottom: 8px; }
.ez-button-row { display: flex; gap: 5px; }
.ez-btn { flex: 1; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; font-size: 11px; }
.ez-confirm { background-color: #4a4; color: #fff; }
.ez-cancel { background-color: #666; color: #fff; }
`
	};

	// !SECTION End of Combat Templates and Themes

	// SECTION Inner Methods: Display Helpers

	// ANCHOR Function: buildEffectButton
	const buildEffectButton = (effect, tokenId, isController) => {
		const iconHtml = effect.icon ? `<span class="ez-effect-icon">${getMarkerImage(effect.icon, 14)}</span>` : "";
		let counterHtml = "";
		if (effect.counter !== null && effect.duration !== null) {
			const dirIcon = effect.direction === 1 ? "\u25B2" : (effect.direction === -1 ? "\u25BC" : "");
			counterHtml = `<span class="ez-effect-counter">${dirIcon} ${effect.counter}/${effect.duration}</span>`;
		}
		const typeClass = `ez-effect-${effect.type}`;
		const cmd = isController
			? `!ezcombat --effectdetail|${tokenId}|${encodeURIComponent(effect.name)}`
			: `!ezcombat --effectinfo|${tokenId}|${encodeURIComponent(effect.name)}`;
		return `<a class="ez-effect-btn ${typeClass}" href="${cmd}">${iconHtml}<span class="ez-effect-name">${effect.name}</span>${counterHtml}</a>`;
	};

	// ANCHOR Function: buildEffectsHtml
	const buildEffectsHtml = (effects, type, tokenId, isController) => {
		const filtered = effects.filter(e => e.type === type);
		if (filtered.length === 0) {
			return `<span class="ez-effect-none">None</span>`;
		}
		return filtered.map(e => buildEffectButton(e, tokenId, isController)).join("");
	};

	// ANCHOR Function: getTokenDisplayName
	const getTokenDisplayName = (token) => {
		let name = token.get("name") || "Unnamed Token";
		const linkedChar = getObj("character", token.get("represents"));
		if (linkedChar) {
			const controllers = linkedChar.get("controlledby") || "";
			const isPlayerControlled = controllers.length > 0;
			if (!isPlayerControlled && !token.get("showplayers_name")) {
				name = "Unknown Creature";
			}
		} else {
			if (!token.get("showplayers_name")) {
				name = "Unknown Creature";
			}
		}
		return name;
	};

	// !SECTION End of Display Helpers

	// SECTION Inner Methods: Action Processors

	// ANCHOR Function: processMenuAsync
	const processMenuAsync = async (msgDetails) => {
		const thisFuncDebugName = "processMenuAsync";
		try {
			const title = "Easy Combat";
			const currentRound = EasyCombatVault.round || 0;
			const turnOrder = getCurrentTurnOrder();
			const inCombat = turnOrder.length > 0;
			const isGm = msgDetails.isGm;

			const menuItemsArray = [];

			// View Token Status - available to all
			menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --viewstatus">View Token Status</a></li>`);

			if (inCombat || isGm) {
				menuItemsArray.push(`<li style="border-top: 1px solid #ccc; margin: 5px 0; padding: 0;"></li>`);
			}

			// Combat Controls
			if (inCombat) {
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --next">Next Turn</a></li>`);
				if (isGm) {
					menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --prev">Previous Turn</a></li>`);
					const addItemCmd = `\`!${moduleSettings.chatApiName} --additem|?{Item Name|Round Counter}|?{Starting Value|0}|?{Direction|up|down}`;
					menuItemsArray.push(`<li><a role="button" href="${addItemCmd}">Add Custom Item</a></li>`);
					menuItemsArray.push(`<li data-category="caution"><a role="button" href="\`!${moduleSettings.chatApiName} --stop">End Combat</a></li>`);
				}
			} else {
				if (isGm) {
					menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --start">Start Combat</a></li>`);
				}
			}

			// Token Management (GM only)
			if (isGm) {
				menuItemsArray.push(`<li style="border-top: 1px solid #ccc; margin: 5px 0; padding: 0;"></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --syncmarkers">Sync Token Markers</a></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --clearstatuses">Clear All Statuses</a></li>`);
			}

			// Library Configuration (GM only)
			if (isGm) {
				menuItemsArray.push(`<li style="border-top: 1px solid #ccc; margin: 5px 0; padding: 0;"></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --effectlibrary">Configure Effect Library</a></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --exportlibrary">Export Config</a></li>`);
				menuItemsArray.push(`<li><a role="button" href="\`!${moduleSettings.chatApiName} --importlibrary">Import Config</a></li>`);
				menuItemsArray.push(`<li data-category="caution"><a role="button" href="\`!${moduleSettings.chatApiName} --resetlibrary">Reset to Defaults</a></li>`);
			}

			const footer = inCombat ? `Round ${currentRound}` : "No active combat";

			const menuContent = {
				title,
				subtitle: "",
				body: `<div class="ez-content"><ul class="ez-menu-list">${menuItemsArray.join("\n")}</ul></div>`,
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
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processViewStatus
	const processViewStatus = async (msgDetails) => {
		const thisFuncDebugName = "processViewStatus";
		try {
			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "WARN", apiCallContent: msgDetails.raw.content, remark: "Please select a token first." });
				return 1;
			}
			const tokenId = msgDetails.selectedIds[0];
			const token = getObj("graphic", tokenId);
			if (!token) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Token not found." });
				return 1;
			}

			const name = token.get("name") || "Unnamed Token";
			const imgSrc = token.get("imgsrc");
			const tokenImage = imgSrc ? `<img src="${imgSrc}" />` : `<div style="width: 50px; height: 50px; background-color: #ccc; border: 1px solid #000; border-radius: 3px;"></div>`;
			const effects = getTokenEffects(token);

			const expressions = {
				tokenImage,
				tokenName: name,
				conditionsHtml: buildEffectsHtml(effects, "condition", tokenId, true),
				spellsHtml: buildEffectsHtml(effects, "spell", tokenId, true),
				traitsHtml: buildEffectsHtml(effects, "trait", tokenId, true),
				remindersHtml: buildEffectsHtml(effects, "reminder", tokenId, true),
				addConditionCmd: `!ezcombat --effectmenu|${tokenId}|condition|blue`,
				addSpellCmd: `!ezcombat --effectmenu|${tokenId}|spell|blue`,
				addTraitCmd: `!ezcombat --effectmenu|${tokenId}|trait|blue`,
				addReminderCmd: `!ezcombat --addreminder|${tokenId}|?{Title}|?{Description}`,
				addStatusCmd: `!ezcombat --effectmenu|${tokenId}|all|blue`
			};

			const styledMessage = await Utils.renderTemplateAsync({
				template: "combatTokenStatus",
				expressions,
				theme: "combatTokenStatus",
				cssVars: {}
			});

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${styledMessage}`);
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processStartCombat
	const processStartCombat = async (msgDetails) => {
		const thisFuncDebugName = "processStartCombat";
		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Only the GM can control combat." });
				return 1;
			}
			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Select tokens first." });
				return 1;
			}

			// Open the tracker
			const pageId = Campaign().get("playerpageid");
			Campaign().set("initiativepage", pageId);

			// Build turn order
			const turnOrder = [];
			for (const tokenId of msgDetails.selectedIds) {
				const token = getObj("graphic", tokenId);
				if (!token) continue;
				const initiative = rollInitiative(token);
				turnOrder.push({ id: tokenId, pr: initiative, custom: "", _pageid: token.get("pageid") });
			}

			// Sort by initiative
			turnOrder.sort((a, b) => b.pr - a.pr);

			// Add Round Counter
			const roundCounter = { id: "-1", pr: 1, custom: "Round Counter", formula: "+1", _pageid: pageId };
			turnOrder.unshift(roundCounter);

			Campaign().set("turnorder", JSON.stringify(turnOrder));
			EasyCombatVault.round = 1;

			// Auto-advance past custom items and announce
			if (turnOrder.length > 0) {
				let currentOrder = getCurrentTurnOrder();
				const maxAdvances = currentOrder.length;
				let advances = 0;

				while (isCustomItem(currentOrder[0]) && advances < maxAdvances) {
					await announceTurn(currentOrder[0], EasyCombatVault.round);
					const current = currentOrder.shift();
					currentOrder.push(current);
					setTurnOrder(currentOrder);
					advances++;
					currentOrder = getCurrentTurnOrder();
				}

				if (currentOrder.length > 0 && !isCustomItem(currentOrder[0])) {
					await announceTurn(currentOrder[0], EasyCombatVault.round);
					const token = getObj("graphic", currentOrder[0].id);
					if (token) { pingTokenControllers(token); }
				}
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processStopCombat
	const processStopCombat = async (msgDetails) => {
		const thisFuncDebugName = "processStopCombat";
		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Only the GM can control combat." });
				return 1;
			}

			setTurnOrder([]);
			EasyCombatVault.round = 0;
			Campaign().set("initiativepage", false);

			const styledMessage = await Utils.renderTemplateAsync({
				template: "combatEnded",
				expressions: { message: "Combat has ended." },
				theme: "combatEnded",
				cssVars: {}
			});

			sendChat(moduleSettings.readableName, styledMessage);
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processNextTurn
	const processNextTurn = async (msgDetails) => {
		const thisFuncDebugName = "processNextTurn";
		try {
			let turnOrder = getCurrentTurnOrder();
			if (turnOrder.length === 0) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "WARN", apiCallContent: msgDetails.raw.content, remark: "No active turn order." });
				return 1;
			}

			const maxAdvances = turnOrder.length;
			let advances = 0;

			do {
				const endingTurn = turnOrder[0];
				if (!isCustomItem(endingTurn)) {
					const endingToken = getObj("graphic", endingTurn.id);
					if (endingToken) { updateEffectCounters(endingToken, "turn"); }
				}

				const current = turnOrder.shift();
				turnOrder.push(current);

				const newCurrent = turnOrder[0];
				if (isCustomItem(newCurrent)) {
					applyCustomItemFormula(newCurrent);
					if (newCurrent.custom === "Round Counter") {
						EasyCombatVault.round = newCurrent.pr;
						updateAllTokensRoundCounters();
					}
				}

				setTurnOrder(turnOrder);
				await announceTurn(turnOrder[0], EasyCombatVault.round);
				advances++;
				turnOrder = getCurrentTurnOrder();
			} while (isCustomItem(turnOrder[0]) && advances < maxAdvances);

			const finalCurrent = turnOrder[0];
			if (!isCustomItem(finalCurrent)) {
				const token = getObj("graphic", finalCurrent.id);
				if (token) { pingTokenControllers(token); }
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processPrevTurn
	const processPrevTurn = async (msgDetails) => {
		const thisFuncDebugName = "processPrevTurn";
		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Only the GM can control combat." });
				return 1;
			}
			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length === 0) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "WARN", apiCallContent: msgDetails.raw.content, remark: "No active turn order." });
				return 1;
			}

			const last = turnOrder.pop();
			turnOrder.unshift(last);
			setTurnOrder(turnOrder);
			await announceTurn(turnOrder[0], EasyCombatVault.round);

			const current = turnOrder[0];
			if (!isCustomItem(current)) {
				const token = getObj("graphic", current.id);
				if (token) { pingTokenControllers(token); }
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: announceTurn
	const announceTurn = async (turnEntry, round) => {
		const isCustom = isCustomItem(turnEntry);

		if (isCustom) {
			const styledMessage = await Utils.renderTemplateAsync({
				template: "combatCustomItem",
				expressions: { name: turnEntry.custom, value: turnEntry.pr },
				theme: "combatCustomItem",
				cssVars: {}
			});
			sendChat(moduleSettings.readableName, styledMessage);
		} else {
			const tokenId = turnEntry.id;
			const token = getObj("graphic", tokenId);
			if (!token) return;

			syncTokenWithMarkers(token);

			const name = getTokenDisplayName(token);
			const imgSrc = token.get("imgsrc");
			const tokenImage = imgSrc ? `<img src="${imgSrc}" />` : `<div style="width: 50px; height: 50px; background-color: #ccc; border: 1px solid #000; border-radius: 3px;"></div>`;
			const effects = getTokenEffects(token);

			// Get controllers
			const character = getObj("character", token.get("represents"));
			const controllerIds = [];
			if (character) {
				const controllers = character.get("controlledby").split(",").filter(Boolean);
				for (const id of controllers) { if (id !== "all") { controllerIds.push(id); } }
			}
			const gmPlayers = findObjs({ _type: "player" }).filter(p => playerIsGM(p.id));
			const gmIds = gmPlayers.map(p => p.id);
			const controllerSet = new Set([...controllerIds, ...gmIds]);

			// Build controller template
			const controllerExpressions = {
				title: `Round ${round}`,
				tokenImage,
				tokenName: name,
				conditionsHtml: buildEffectsHtml(effects, "condition", tokenId, true),
				spellsHtml: buildEffectsHtml(effects, "spell", tokenId, true),
				traitsHtml: buildEffectsHtml(effects, "trait", tokenId, true),
				remindersHtml: buildEffectsHtml(effects, "reminder", tokenId, true),
				addConditionCmd: `!ezcombat --effectmenu|${tokenId}|condition|red`,
				addSpellCmd: `!ezcombat --effectmenu|${tokenId}|spell|red`,
				addTraitCmd: `!ezcombat --effectmenu|${tokenId}|trait|red`,
				addReminderCmd: `!ezcombat --addreminder|${tokenId}|?{Title}|?{Description}`,
				addStatusCmd: `!ezcombat --effectmenu|${tokenId}|all|red`,
				turnClass: ""
			};

			const controllerMessage = await Utils.renderTemplateAsync({
				template: "combatTurnAnnouncement",
				expressions: controllerExpressions,
				theme: "combatTurnAnnouncement",
				cssVars: {}
			});

			// Build read-only template
			const readOnlyExpressions = {
				title: `Round ${round}`,
				tokenImage,
				tokenName: name,
				conditionsHtml: buildEffectsHtml(effects, "condition", tokenId, false),
				spellsHtml: buildEffectsHtml(effects, "spell", tokenId, false),
				traitsHtml: buildEffectsHtml(effects, "trait", tokenId, false),
				turnClass: ""
			};

			const readOnlyMessage = await Utils.renderTemplateAsync({
				template: "combatTurnReadOnly",
				expressions: readOnlyExpressions,
				theme: "combatTurnReadOnly",
				cssVars: {}
			});

			// Send to players
			const allPlayers = findObjs({ _type: "player" }).filter(p => p.get("_online"));
			const whisperedIds = new Set();

			for (const player of allPlayers) {
				const playerId = player.id;
				if (whisperedIds.has(playerId)) continue;
				const displayName = player.get("_displayname");
				const isController = controllerSet.has(playerId);
				if (isController) {
					sendChat(moduleSettings.readableName, `/w "${displayName}" ${controllerMessage}`);
				} else {
					sendChat(moduleSettings.readableName, `/w "${displayName}" ${readOnlyMessage}`);
				}
				whisperedIds.add(playerId);
			}
		}
	};

	// ANCHOR Function: processRefreshTurn
	const processRefreshTurn = async (msgDetails) => {
		try {
			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0) {
				const round = EasyCombatVault.round || 1;
				await announceTurn(turnOrder[0], round);
			}
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.processRefreshTurn`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processEffectDetail
	const processEffectDetail = async (msgDetails) => {
		const thisFuncDebugName = "processEffectDetail";
		try {
			const content = msgDetails.raw.content;
			const effectMatch = content.match(/--effectdetail\|([^|]+)\|([^|\s]+)/i);
			if (!effectMatch) return 1;

			const tokenId = effectMatch[1].trim();
			const effectName = decodeURIComponent(effectMatch[2].trim());
			const token = getObj("graphic", tokenId);
			if (!token) return 1;

			const library = getEffectLibrary();
			const effects = getTokenEffects(token);
			const effect = effects.find(e => e.name.toLowerCase() === effectName.toLowerCase());
			if (!effect) return 1;

			let description = effect.description;
			if (!description) {
				for (const key in library) {
					if (library[key].name.toLowerCase() === effectName.toLowerCase()) {
						description = library[key].description;
						break;
					}
				}
			}

			// Check permissions
			let canEdit = msgDetails.isGm;
			if (!canEdit) {
				const character = getObj("character", token.get("represents"));
				if (character) {
					const controllers = character.get("controlledby").split(",").filter(Boolean);
					canEdit = controllers.includes(msgDetails.callerId) || controllers.includes("all");
				}
			}

			const iconHtml = effect.icon ? `${getMarkerImage(effect.icon, 16)} ` : "";
			const durationText = effect.duration !== null ? effect.duration : "\u221E";
			const counterText = effect.counter !== null ? effect.counter : "\u2014";
			const directionText = effect.direction === 1 ? "\u25B2 Up" : (effect.direction === -1 ? "\u25BC Down" : "\u2014 None");
			const autochangeText = effect.autochange || "manual";

			let buttonsHtml = `<a class="ez-btn ez-btn-display" href="!ezcombat --displayeffect|${tokenId}|${encodeURIComponent(effect.name)}">Display to All</a>`;
			if (canEdit) {
				const editCmd = `!ezcombat --editeffect|${tokenId}|${encodeURIComponent(effect.name)}|?{Duration|${effect.duration || 0}}|?{Autochange|manual|turn|round}`;
				const removeCmd = `!ezcombat --removeeffect|${tokenId}|${encodeURIComponent(effect.name)}`;
				buttonsHtml += `<a class="ez-btn ez-btn-edit" href="${editCmd}">Edit</a>`;
				buttonsHtml += `<a class="ez-btn ez-btn-remove" href="${removeCmd}">Remove</a>`;
			}

			const expressions = {
				iconHtml,
				effectName: effect.name,
				description: description || "No description available.",
				effectType: effect.type,
				duration: durationText,
				counter: counterText,
				direction: directionText,
				autochange: autochangeText,
				buttonsHtml
			};

			const styledMessage = await Utils.renderTemplateAsync({
				template: "combatEffectDetail",
				expressions,
				theme: "combatEffectDetail",
				cssVars: {}
			});

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${styledMessage}`);
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processDisplayEffect
	const processDisplayEffect = async (msgDetails) => {
		const thisFuncDebugName = "processDisplayEffect";
		try {
			const content = msgDetails.raw.content;
			const effectMatch = content.match(/--displayeffect\|([^|]+)\|([^|\s]+)/i);
			if (!effectMatch) return 1;

			const tokenId = effectMatch[1].trim();
			const effectName = decodeURIComponent(effectMatch[2].trim());
			const token = getObj("graphic", tokenId);
			if (!token) return 1;

			const library = getEffectLibrary();
			const effects = getTokenEffects(token);
			const effect = effects.find(e => e.name.toLowerCase() === effectName.toLowerCase());
			if (!effect) return 1;

			let description = effect.description;
			if (!description) {
				for (const key in library) {
					if (library[key].name.toLowerCase() === effectName.toLowerCase()) {
						description = library[key].description;
						break;
					}
				}
			}

			const tokenName = getTokenDisplayName(token);
			const iconHtml = effect.icon ? `${getMarkerImage(effect.icon, 16)} ` : "";
			const counterText = effect.counter !== null ? `${effect.counter}` : "\u2014";

			const expressions = {
				iconHtml,
				effectName: effect.name,
				tokenName,
				description: description || "No description available.",
				effectType: effect.type,
				counter: counterText
			};

			const styledMessage = await Utils.renderTemplateAsync({
				template: "combatEffectInfo",
				expressions,
				theme: "combatEffectInfo",
				cssVars: {}
			});

			sendChat(moduleSettings.readableName, styledMessage);
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processEffectInfo
	const processEffectInfo = async (msgDetails) => {
		const thisFuncDebugName = "processEffectInfo";
		try {
			const content = msgDetails.raw.content;
			const effectMatch = content.match(/--effectinfo\|([^|]+)\|([^|\s]+)/i);
			if (!effectMatch) return 1;

			const tokenId = effectMatch[1].trim();
			const effectName = decodeURIComponent(effectMatch[2].trim());
			const token = getObj("graphic", tokenId);
			if (!token) return 1;

			const library = getEffectLibrary();
			const effects = getTokenEffects(token);
			const effect = effects.find(e => e.name.toLowerCase() === effectName.toLowerCase());
			if (!effect) return 1;

			let description = effect.description;
			if (!description) {
				for (const key in library) {
					if (library[key].name.toLowerCase() === effectName.toLowerCase()) {
						description = library[key].description;
						break;
					}
				}
			}

			const tokenName = getTokenDisplayName(token);
			const iconHtml = effect.icon ? `${getMarkerImage(effect.icon, 16)} ` : "";
			const counterText = effect.counter !== null ? `${effect.counter}` : "\u2014";

			const expressions = {
				iconHtml,
				effectName: effect.name,
				tokenName,
				description: description || "No description available.",
				effectType: effect.type,
				counter: counterText
			};

			const styledMessage = await Utils.renderTemplateAsync({
				template: "combatEffectInfo",
				expressions,
				theme: "combatEffectInfo",
				cssVars: {}
			});

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${styledMessage}`);
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processAddEffect
	const processAddEffect = async (msgDetails) => {
		const thisFuncDebugName = "processAddEffect";
		try {
			const content = msgDetails.raw.content;
			const match = content.match(/--addeffect\|([^|]+)(?:\|([^|\s]+))?/i);
			if (!match) return 1;

			let tokens = [];
			let effectKey;

			if (match[2]) {
				const tokenId = match[1].trim();
				effectKey = decodeURIComponent(match[2].trim());
				const token = getObj("graphic", tokenId);
				if (token) tokens.push(token);
			} else {
				effectKey = decodeURIComponent(match[1].trim());
				if (msgDetails.selectedIds && msgDetails.selectedIds.length > 0) {
					for (const tokenId of msgDetails.selectedIds) {
						const token = getObj("graphic", tokenId);
						if (token) tokens.push(token);
					}

					if (tokens.length > 1) {
						const library = getEffectLibrary();
						const effect = library[effectKey];
						const effectName = effect ? effect.name : effectKey;

						const expressions = {
							title: "Confirm Add Effect",
							message: `Add <b>${effectName}</b> to <b>${tokens.length} tokens</b>?`,
							confirmCmd: `!ezcombat --addeffectconfirm|${effectKey}`,
							cancelCmd: "!ezcombat",
							confirmText: "Yes, Add to All",
							cancelText: "Cancel"
						};

						const styledMessage = await Utils.renderTemplateAsync({
							template: "combatConfirm",
							expressions,
							theme: "combatConfirm",
							cssVars: {}
						});

						sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${styledMessage}`);
						return 0;
					}
				} else {
					const token = getCurrentTurnToken();
					if (token) tokens.push(token);
				}
			}

			if (tokens.length === 0) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Select a token or wait for a token's turn." });
				return 1;
			}

			const library = getEffectLibrary();
			const effect = library[effectKey];
			if (effect && effect.visibility === "hide" && !msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Only the GM can add this effect." });
				return 1;
			}

			for (const token of tokens) { addTokenEffect(token, effectKey); }

			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0) {
				const currentTurnId = turnOrder[0].id;
				if (tokens.some(t => t.id === currentTurnId)) {
					const round = EasyCombatVault.round || 1;
					await announceTurn(turnOrder[0], round);
				}
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processAddEffectConfirm
	const processAddEffectConfirm = async (msgDetails) => {
		const thisFuncDebugName = "processAddEffectConfirm";
		try {
			const content = msgDetails.raw.content;
			const match = content.match(/--addeffectconfirm\|([^|\s]+)/i);
			if (!match) return 1;

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
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Select one or more tokens first." });
				return 1;
			}

			const library = getEffectLibrary();
			const effect = library[effectKey];
			if (effect && effect.visibility === "hide" && !msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Only the GM can add this effect." });
				return 1;
			}

			for (const token of tokens) { addTokenEffect(token, effectKey); }

			const effectName = effect ? effect.name : effectKey;
			await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "INFO", apiCallContent: msgDetails.raw.content, remark: `Added ${effectName} to ${tokens.length} token(s).` });

			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0) {
				const currentTurnId = turnOrder[0].id;
				if (tokens.some(t => t.id === currentTurnId)) {
					const round = EasyCombatVault.round || 1;
					await announceTurn(turnOrder[0], round);
				}
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processRemoveEffect
	const processRemoveEffect = async (msgDetails) => {
		const thisFuncDebugName = "processRemoveEffect";
		try {
			const content = msgDetails.raw.content;
			const effectMatch = content.match(/--removeeffect\|([^|]+)\|([^|\s]+)/i);
			if (!effectMatch) return 1;

			const tokenId = effectMatch[1].trim();
			const effectName = decodeURIComponent(effectMatch[2].trim());
			const token = getObj("graphic", tokenId);
			if (!token) return 1;

			let canRemove = msgDetails.isGm;
			if (!canRemove) {
				const character = getObj("character", token.get("represents"));
				if (character) {
					const controllers = character.get("controlledby").split(",").filter(Boolean);
					canRemove = controllers.includes(msgDetails.callerId) || controllers.includes("all");
				}
			}
			if (!canRemove) return 1;

			removeTokenEffect(token, effectName);

			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0 && turnOrder[0].id === tokenId) {
				const round = EasyCombatVault.round || 1;
				await announceTurn(turnOrder[0], round);
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processRemoveEffectSelected
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

			if (effect && effect.visibility === "hide" && !msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Only the GM can remove this effect." });
				return 1;
			}

			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Select one or more tokens first." });
				return 1;
			}

			for (const tokenId of msgDetails.selectedIds) {
				const token = getObj("graphic", tokenId);
				if (token) { removeTokenEffect(token, effectName); }
			}

			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0 && msgDetails.selectedIds.includes(turnOrder[0].id)) {
				const round = EasyCombatVault.round || 1;
				await announceTurn(turnOrder[0], round);
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processAddReminder
	const processAddReminder = async (msgDetails) => {
		const thisFuncDebugName = "processAddReminder";
		try {
			const content = msgDetails.raw.content;
			const match = content.match(/--addreminder\|([^|]+)\|([^|]+)(?:\|(.*))?/i);
			if (!match || !match[2].trim()) return 1;

			const tokenId = match[1].trim();
			const title = match[2].trim();
			const description = match[3] ? match[3].trim() : null;
			const token = getObj("graphic", tokenId);
			if (!token) return 1;

			addReminder(token, title, description);

			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0 && turnOrder[0].id === tokenId) {
				const round = EasyCombatVault.round || 1;
				await announceTurn(turnOrder[0], round);
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processEditEffect
	const processEditEffect = async (msgDetails) => {
		const thisFuncDebugName = "processEditEffect";
		try {
			const content = msgDetails.raw.content;
			const match = content.match(/--editeffect\|([^|]+)\|([^|]+)\|([^|]+)\|([^|\s]+)/i);
			if (!match) return 1;

			const tokenId = match[1].trim();
			const effectName = decodeURIComponent(match[2].trim());
			const newDuration = parseInt(match[3].trim(), 10);
			const newAutochange = match[4].trim().toLowerCase();
			const token = getObj("graphic", tokenId);
			if (!token) return 1;

			let canEdit = msgDetails.isGm;
			if (!canEdit) {
				const character = getObj("character", token.get("represents"));
				if (character) {
					const controllers = character.get("controlledby").split(",").filter(Boolean);
					canEdit = controllers.includes(msgDetails.callerId) || controllers.includes("all");
				}
			}
			if (!canEdit) return 1;

			const effects = getTokenEffects(token);
			const effect = effects.find(e => e.name.toLowerCase() === effectName.toLowerCase());
			if (effect) {
				effect.duration = isNaN(newDuration) ? null : newDuration;
				effect.counter = isNaN(newDuration) ? null : newDuration;
				effect.direction = (effect.duration !== null) ? -1 : null;
				effect.autochange = (newAutochange === "turn" || newAutochange === "round") ? newAutochange : null;
				setTokenEffects(token, effects);
			}

			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0 && turnOrder[0].id === tokenId) {
				const round = EasyCombatVault.round || 1;
				await announceTurn(turnOrder[0], round);
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processEffectMenu
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

			if (!msgDetails.isGm) {
				libraryKeys = libraryKeys.filter(k => library[k].visibility !== "hide");
			}

			let filteredKeys = libraryKeys;
			let title = "Edit Status";

			if (filterType === "condition") {
				filteredKeys = libraryKeys.filter(k => library[k].type === "condition");
				title = "Add Condition";
			} else if (filterType === "spell") {
				filteredKeys = libraryKeys.filter(k => library[k].type === "spell");
				title = "Add Spell Effect";
			} else if (filterType === "trait") {
				filteredKeys = libraryKeys.filter(k => library[k].type === "trait");
				title = "Add Trait";
			}

			const themeColor = theme === "blue" ? "#4a6785" : "#7e2d40";

			// Build table rows
			let tableRows = "";
			for (const key of filteredKeys) {
				const effect = library[key];
				const iconHtml = getMarkerImage(effect.icon, 18);
				const addCmd = `!ezcombat --addeffect|${key}`;
				const removeCmd = `!ezcombat --removeeffectselected|${key}`;
				const gmOnlyIndicator = effect.visibility === "hide" ? " \uD83D\uDD12" : "";
				tableRows += `<tr style="border-bottom: 1px solid #eee;">`
					+ `<td style="padding: 4px; width: 24px; text-align: center;">${iconHtml}</td>`
					+ `<td style="padding: 4px; font-weight: bold;">${effect.name}${gmOnlyIndicator}</td>`
					+ `<td style="padding: 4px; text-align: center;"><a style="display: inline-block; padding: 2px 5px; border-radius: 3px; text-decoration: none; font-size: 9px; color: #fff; background-color: #4a4;" href="${addCmd}">Add</a></td>`
					+ `<td style="padding: 4px; text-align: center;"><a style="display: inline-block; padding: 2px 5px; border-radius: 3px; text-decoration: none; font-size: 9px; color: #fff; background-color: #a44;" href="${removeCmd}">Remove</a></td>`
					+ `</tr>`;
			}

			const backCmd = (theme === "red") ? `!ezcombat --refreshturn` : `!ezcombat --viewstatus`;

			const template = `<div style="background-color: #fff; border: 1px solid ${themeColor}; border-radius: 5px; overflow: hidden; margin: 5px 0;">`
				+ `<div style="background-color: ${themeColor}; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;">${title}</div>`
				+ `<div style="padding: 4px;">`
				+ `<table style="width: 100%; border-collapse: collapse; font-size: 11px;">`
				+ `<thead><tr>`
				+ `<th style="text-align: center; padding: 3px 4px; border-bottom: 2px solid ${themeColor}; font-size: 10px; color: #666;">Icon</th>`
				+ `<th style="text-align: left; padding: 3px 4px; border-bottom: 2px solid ${themeColor}; font-size: 10px; color: #666;">Name</th>`
				+ `<th style="text-align: center; padding: 3px 4px; border-bottom: 2px solid ${themeColor}; font-size: 10px; color: #666;">Add</th>`
				+ `<th style="text-align: center; padding: 3px 4px; border-bottom: 2px solid ${themeColor}; font-size: 10px; color: #666;">Remove</th>`
				+ `</tr></thead>`
				+ `<tbody>${tableRows}</tbody>`
				+ `</table>`
				+ `<a style="display: block; background-color: ${themeColor}; color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; margin-top: 8px;" href="${backCmd}">\u2190 Back</a>`
				+ `</div></div>`;

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processEffectLibrary
	const processEffectLibrary = async (msgDetails) => {
		const thisFuncDebugName = "processEffectLibrary";
		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Only the GM can configure the effect library." });
				return 1;
			}

			const library = getEffectLibrary();
			const libraryKeys = Object.keys(library).sort();

			let tableRows = "";
			for (const key of libraryKeys) {
				const effect = library[key];
				const iconHtml = getMarkerImage(effect.icon, 18);
				const configCmd = `!ezcombat --configeffect|${key}`;
				const purgeCmd = `!ezcombat --purgeeffect|${key}`;
				const gmOnlyIndicator = effect.visibility === "hide" ? " \uD83D\uDD12" : "";
				tableRows += `<tr style="border-bottom: 1px solid #eee;">`
					+ `<td style="padding: 4px; width: 24px; text-align: center;">${iconHtml}</td>`
					+ `<td style="padding: 4px; font-weight: bold;">${effect.name}${gmOnlyIndicator}</td>`
					+ `<td style="padding: 4px; text-align: center;"><a style="display: inline-block; padding: 2px 5px; border-radius: 3px; text-decoration: none; font-size: 9px; color: #fff; background-color: #44a;" href="${configCmd}">Configure</a></td>`
					+ `<td style="padding: 4px; text-align: center;"><a style="display: inline-block; padding: 2px 5px; border-radius: 3px; text-decoration: none; font-size: 9px; color: #fff; background-color: #a44;" href="${purgeCmd}">Purge</a></td>`
					+ `</tr>`;
			}

			const template = `<div style="background-color: #fff; border: 1px solid #44a; border-radius: 5px; overflow: hidden; margin: 5px 0;">`
				+ `<div style="background-color: #44a; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;">Effect Library (${libraryKeys.length} effects)</div>`
				+ `<div style="padding: 4px;">`
				+ `<table style="width: 100%; border-collapse: collapse; font-size: 11px;">`
				+ `<thead><tr>`
				+ `<th style="text-align: center; padding: 3px 4px; border-bottom: 2px solid #44a; font-size: 10px; color: #666;">Icon</th>`
				+ `<th style="text-align: left; padding: 3px 4px; border-bottom: 2px solid #44a; font-size: 10px; color: #666;">Name</th>`
				+ `<th style="text-align: center; padding: 3px 4px; border-bottom: 2px solid #44a; font-size: 10px; color: #666;">Configure</th>`
				+ `<th style="text-align: center; padding: 3px 4px; border-bottom: 2px solid #44a; font-size: 10px; color: #666;">Purge</th>`
				+ `</tr></thead>`
				+ `<tbody>${tableRows}</tbody>`
				+ `</table>`
				+ `<a style="display: block; background-color: #44a; color: #fff; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; margin-top: 8px;" href="!ezcombat">\u2190 Back to Menu</a>`
				+ `</div></div>`;

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processConfigEffect
	const processConfigEffect = async (msgDetails) => {
		const thisFuncDebugName = "processConfigEffect";
		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Only the GM can configure effects." });
				return 1;
			}

			const content = msgDetails.raw.content;
			const match = content.match(/--configeffect\|([^|\s]+)/i);
			if (!match) return 1;

			const effectKey = match[1].trim().toLowerCase();
			const library = getEffectLibrary();
			const effect = library[effectKey];

			if (!effect) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: `Effect '${effectKey}' not found in library.` });
				return 1;
			}

			const iconHtml = getMarkerImage(effect.icon, 20);
			const durationText = effect.duration !== null ? effect.duration : "\u221E (permanent)";
			const directionText = effect.direction === 1 ? "\u25B2 Up" : (effect.direction === -1 ? "\u25BC Down" : "\u2014 None");
			const autochangeText = effect.autochange || "manual";
			const visibilityText = effect.visibility === "hide" ? "\uD83D\uDD12 GM Only" : "\uD83D\uDC41 Visible to All";

			const markers = getAvailableMarkers();
			const markerOptions = ["none", ...markers];
			const markerDropdown = `?{Pick Token Marker|${markerOptions.join("|")}}`;

			const escapedDesc = (effect.description || "").replace(/\|/g, "&#124;").replace(/&/g, "&#38;");

			const editDescCmd = `!ezcombat --setfield|${effectKey}|description|?{Description|${escapedDesc}}`;
			const editTypeCmd = `!ezcombat --setfield|${effectKey}|type|?{Type|condition|spell|trait|reminder}`;
			const editMarkerCmd = `!ezcombat --setfield|${effectKey}|icon|${markerDropdown}`;
			const editDurationCmd = `!ezcombat --setfield|${effectKey}|duration|?{Duration (0 for permanent)|${effect.duration || 0}}`;
			const editDirectionCmd = `!ezcombat --setfield|${effectKey}|direction|?{Direction|Down,-1|Up,1|None,0}`;
			const editAutochangeCmd = `!ezcombat --setfield|${effectKey}|autochange|?{Autochange|manual|turn|round}`;
			const editVisibilityCmd = `!ezcombat --setfield|${effectKey}|visibility|?{Visibility|show,show|hide (GM Only),hide}`;

			const template = `<div style="background-color: #fff; border: 1px solid #44a; border-radius: 5px; overflow: hidden; margin: 5px 0;">`
				+ `<div style="background-color: #44a; color: #fff; padding: 5px 8px; font-size: 14px; font-weight: bold;">${iconHtml} Configure: ${effect.name}</div>`
				+ `<div style="padding: 8px;">`
				+ `<div style="display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px;"><a style="background-color: #44a; color: #fff; padding: 2px 6px; border-radius: 3px; text-decoration: none; font-size: 10px; margin-right: 8px;" href="${editDescCmd}">\u270E</a><span style="color: #666; min-width: 100px;">Description:</span></div>`
				+ `<div style="font-size: 11px; padding: 5px; background-color: #f5f5f5; border-radius: 3px; margin-bottom: 8px; margin-left: 30px;">${effect.description || "No description."}</div>`
				+ `<div style="display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px;"><a style="background-color: #44a; color: #fff; padding: 2px 6px; border-radius: 3px; text-decoration: none; font-size: 10px; margin-right: 8px;" href="${editTypeCmd}">\u270E</a><span style="color: #666; min-width: 100px;">Type:</span><span style="font-weight: bold; flex: 1;">${effect.type}</span></div>`
				+ `<div style="display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px;"><a style="background-color: #44a; color: #fff; padding: 2px 6px; border-radius: 3px; text-decoration: none; font-size: 10px; margin-right: 8px;" href="${editMarkerCmd}">\u270E</a><span style="color: #666; min-width: 100px;">Token Marker:</span><span style="font-weight: bold; flex: 1;">${iconHtml} ${effect.icon || "none"}</span></div>`
				+ `<div style="display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px;"><a style="background-color: #44a; color: #fff; padding: 2px 6px; border-radius: 3px; text-decoration: none; font-size: 10px; margin-right: 8px;" href="${editDurationCmd}">\u270E</a><span style="color: #666; min-width: 100px;">Duration:</span><span style="font-weight: bold; flex: 1;">${durationText}</span></div>`
				+ `<div style="display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px;"><a style="background-color: #44a; color: #fff; padding: 2px 6px; border-radius: 3px; text-decoration: none; font-size: 10px; margin-right: 8px;" href="${editDirectionCmd}">\u270E</a><span style="color: #666; min-width: 100px;">Direction:</span><span style="font-weight: bold; flex: 1;">${directionText}</span></div>`
				+ `<div style="display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px;"><a style="background-color: #44a; color: #fff; padding: 2px 6px; border-radius: 3px; text-decoration: none; font-size: 10px; margin-right: 8px;" href="${editAutochangeCmd}">\u270E</a><span style="color: #666; min-width: 100px;">Autochange:</span><span style="font-weight: bold; flex: 1;">${autochangeText}</span></div>`
				+ `<div style="display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px;"><a style="background-color: #44a; color: #fff; padding: 2px 6px; border-radius: 3px; text-decoration: none; font-size: 10px; margin-right: 8px;" href="${editVisibilityCmd}">\u270E</a><span style="color: #666; min-width: 100px;">Visibility:</span><span style="font-weight: bold; flex: 1;">${visibilityText}</span></div>`
				+ `<div style="display: flex; gap: 5px; margin-top: 10px;">`
				+ `<a style="flex: 1; text-align: center; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-weight: bold; font-size: 11px; background-color: #44a; color: #fff;" href="!ezcombat --effectlibrary">\u2190 Back to Library</a>`
				+ `</div></div></div>`;

			sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" ${template}`);
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processSetField
	const processSetField = async (msgDetails) => {
		try {
			if (!msgDetails.isGm) return 1;

			const content = msgDetails.raw.content;
			const match = content.match(/--setfield\|([^|]+)\|([^|]+)\|(.*)$/i);
			if (!match) return 1;

			const effectKey = match[1].trim().toLowerCase();
			const fieldName = match[2].trim().toLowerCase();
			const fieldValue = match[3].trim();

			if (!EasyCombatVault.customLibrary) {
				EasyCombatVault.customLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));
			}

			const effect = EasyCombatVault.customLibrary[effectKey];
			if (!effect) return 1;

			switch (fieldName) {
				case "description": effect.description = fieldValue.replace(/&#124;/g, "|").replace(/&#38;/g, "&") || null; break;
				case "type": if (["condition", "spell", "trait", "reminder"].includes(fieldValue)) { effect.type = fieldValue; } break;
				case "icon": effect.icon = (fieldValue === "none" || fieldValue === "") ? null : fieldValue; break;
				case "duration": const dur = parseInt(fieldValue, 10); effect.duration = (isNaN(dur) || dur === 0) ? null : dur; effect.counter = effect.duration; break;
				case "direction": const dir = parseInt(fieldValue, 10); effect.direction = (dir === 1) ? 1 : (dir === -1) ? -1 : null; break;
				case "autochange": effect.autochange = (fieldValue === "turn" || fieldValue === "round") ? fieldValue : null; break;
				case "visibility": effect.visibility = (fieldValue === "hide") ? "hide" : "show"; break;
				default: return 1;
			}

			if (typeof state !== "undefined") {
				state.EASY_COMBAT = state.EASY_COMBAT || {};
				state.EASY_COMBAT.effectLibrary = JSON.parse(JSON.stringify(EasyCombatVault.customLibrary));
			}

			const configMsgDetails = Object.assign({}, msgDetails);
			configMsgDetails.raw = { content: `!ezcombat --configeffect|${effectKey}` };
			processConfigEffect(configMsgDetails);

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.processSetField`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processPurgeEffect
	const processPurgeEffect = async (msgDetails) => {
		try {
			if (!msgDetails.isGm) return 1;

			const content = msgDetails.raw.content;
			const match = content.match(/--purgeeffect\|([^|\s]+)/i);
			if (!match) return 1;

			const effectKey = match[1].trim().toLowerCase();

			if (!EasyCombatVault.customLibrary) {
				EasyCombatVault.customLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));
			}

			if (EasyCombatVault.customLibrary[effectKey]) {
				delete EasyCombatVault.customLibrary[effectKey];
			}

			if (typeof state !== "undefined" && state.EASY_COMBAT && state.EASY_COMBAT.effectLibrary) {
				if (state.EASY_COMBAT.effectLibrary[effectKey]) {
					delete state.EASY_COMBAT.effectLibrary[effectKey];
				}
			}

			processEffectLibrary(msgDetails);
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.processPurgeEffect`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processExportLibrary
	const processExportLibrary = async (msgDetails) => {
		try {
			if (!msgDetails.isGm) return 1;

			const library = getEffectLibrary();
			const jsonExport = JSON.stringify(library, null, 2);

			const handoutName = "Easy Combat Config";
			let handout = findObjs({ type: "handout", name: handoutName })[0];
			if (!handout) {
				handout = createObj("handout", { name: handoutName, inplayerjournals: "", archived: false });
			}

			const notesContent = `<h3>Easy Combat - Effect Library</h3><p>This handout stores your Easy Combat effect library configuration.</p>`;
			const gmnotesContent = `<div id="ezcombat-config">${jsonExport}</div>`;

			handout.set("notes", notesContent);
			handout.set("gmnotes", gmnotesContent);

			await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "INFO", apiCallContent: msgDetails.raw.content, remark: `Exported to handout "${handoutName}".` });
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.processExportLibrary`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processImportLibrary
	const processImportLibrary = async (msgDetails) => {
		try {
			if (!msgDetails.isGm) return 1;

			const handoutName = "Easy Combat Config";
			const handout = findObjs({ type: "handout", name: handoutName })[0];

			if (!handout) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: `Handout "${handoutName}" not found.` });
				return 1;
			}

			handout.get("gmnotes", (gmnotes) => {
				try {
					if (!gmnotes || gmnotes.trim() === "") {
						sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" No configuration found in handout.`);
						return;
					}

					const decodedNotes = gmnotes.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/<br\s*\/?>/gi, "\n").replace(/<\/div>/gi, "</div>\n");
					const divMatch = decodedNotes.match(/<div[^>]*id=["']?ezcombat-config["']?[^>]*>([\s\S]*?)<\/div>/i);
					let jsonData;

					if (divMatch && divMatch[1]) {
						jsonData = divMatch[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
					} else {
						sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" Could not find ezcombat-config div.`);
						return;
					}

					const importedLibrary = JSON.parse(jsonData);
					const keys = Object.keys(importedLibrary);
					if (keys.length === 0) { throw new Error("Empty library"); }

					EasyCombatVault.customLibrary = importedLibrary;
					if (typeof state !== "undefined") {
						state.EASY_COMBAT = state.EASY_COMBAT || {};
						state.EASY_COMBAT.effectLibrary = JSON.parse(JSON.stringify(importedLibrary));
					}

					sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" Imported ${keys.length} effects successfully.`);
					processEffectMenu(msgDetails);
				} catch (parseErr) {
					sendChat(moduleSettings.readableName, `/w "${msgDetails.callerName}" Import failed: ${parseErr.message}`);
				}
			});

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.processImportLibrary`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processResetLibrary
	const processResetLibrary = async (msgDetails) => {
		try {
			if (!msgDetails.isGm) return 1;

			EasyCombatVault.customLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));
			if (typeof state !== "undefined") {
				state.EASY_COMBAT = state.EASY_COMBAT || {};
				state.EASY_COMBAT.effectLibrary = JSON.parse(JSON.stringify(DEFAULT_EFFECT_LIBRARY));
			}

			await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "INFO", apiCallContent: msgDetails.raw.content, remark: "Effect library reset to defaults." });
			processEffectMenu(msgDetails);
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.processResetLibrary`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processSyncMarkers
	const processSyncMarkers = async (msgDetails) => {
		try {
			if (!msgDetails.isGm) return 1;

			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Select one or more tokens first." });
				return 1;
			}

			let syncCount = 0, totalEffectsRemoved = 0, totalMarkersAdded = 0, totalEffectsAdded = 0;
			for (const tokenId of msgDetails.selectedIds) {
				const token = getObj("graphic", tokenId);
				if (!token) continue;
				syncCount++;
				const result = syncTokenWithMarkers(token);
				totalEffectsRemoved += result.effectsRemoved;
				totalMarkersAdded += result.markersAdded;
				totalEffectsAdded += result.effectsAdded;
			}

			await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "INFO", apiCallContent: msgDetails.raw.content, remark: `Synced ${syncCount} token(s). Effects: +${totalEffectsAdded}/-${totalEffectsRemoved}. Markers: +${totalMarkersAdded}.` });
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.processSyncMarkers`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processClearStatuses
	const processClearStatuses = async (msgDetails) => {
		try {
			if (!msgDetails.isGm) return 1;

			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Select one or more tokens first." });
				return 1;
			}

			let clearCount = 0;
			for (const tokenId of msgDetails.selectedIds) {
				const token = getObj("graphic", tokenId);
				if (!token) continue;
				setTokenEffects(token, []);
				token.set("statusmarkers", "");
				clearCount++;
			}

			await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "INFO", apiCallContent: msgDetails.raw.content, remark: `Cleared all statuses from ${clearCount} token(s).` });

			const turnOrder = getCurrentTurnOrder();
			if (turnOrder.length > 0 && msgDetails.selectedIds.includes(turnOrder[0].id)) {
				const round = EasyCombatVault.round || 1;
				await announceTurn(turnOrder[0], round);
			}

			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.processClearStatuses`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// ANCHOR Function: processAddItem
	const processAddItem = async (msgDetails) => {
		const thisFuncDebugName = "processAddItem";
		try {
			if (!msgDetails.isGm) {
				await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "ERROR", apiCallContent: msgDetails.raw.content, remark: "Only the GM can control combat." });
				return 1;
			}

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
			const pageId = Campaign().get("playerpageid");
			const turnOrderEntry = { id: "-1", pr: startValue, custom: itemName, formula: formula, _pageid: pageId };

			const turnOrder = getCurrentTurnOrder();
			turnOrder.push(turnOrderEntry);
			setTurnOrder(turnOrder);

			await Utils.whisperAlertMessageAsync({ from: moduleSettings.readableName, to: msgDetails.callerName, toId: msgDetails.callerId, severity: "INFO", apiCallContent: msgDetails.raw.content, remark: `Added '${itemName}' starting at ${startValue} (${direction}).` });
			return 0;
		} catch (err) {
			Utils.logSyslogMessage({ severity: "ERROR", tag: `${moduleSettings.readableName}.${thisFuncDebugName}`, transUnitId: "50000", message: String(err) });
			return 1;
		}
	};

	// !SECTION End of Action Processors

	// SECTION Event Hooks: Roll20 API

	// ANCHOR Member: actionMap
	const actionMap = {
		"--menu": (msgDetails) => processMenuAsync(msgDetails),
		"--viewstatus": (msgDetails) => processViewStatus(msgDetails),
		"--start": (msgDetails) => processStartCombat(msgDetails),
		"--stop": (msgDetails) => processStopCombat(msgDetails),
		"--next": (msgDetails) => processNextTurn(msgDetails),
		"--prev": (msgDetails) => processPrevTurn(msgDetails),
		"--refreshturn": (msgDetails) => processRefreshTurn(msgDetails),
		"--effectlibrary": (msgDetails) => processEffectLibrary(msgDetails),
		"--exportlibrary": (msgDetails) => processExportLibrary(msgDetails),
		"--importlibrary": (msgDetails) => processImportLibrary(msgDetails),
		"--resetlibrary": (msgDetails) => processResetLibrary(msgDetails),
		"--syncmarkers": (msgDetails) => processSyncMarkers(msgDetails),
		"--clearstatuses": (msgDetails) => processClearStatuses(msgDetails)
	};

	// Set Default Action
	actionMap["--default"] = actionMap["--menu"];

	// ANCHOR Outer Method: registerEventHandlers
	const registerEventHandlers = () => {
		on("chat:message", (apiCall) => {
			if (apiCall.type === "api" && apiCall.content.startsWith(`!${moduleSettings.chatApiName}`)) {
				const buildMsgDetails = () => ({
					raw: apiCall,
					callerId: apiCall.playerid,
					callerName: (getObj("player", apiCall.playerid) || { get: () => "Unknown" }).get("_displayname"),
					isGm: playerIsGM(apiCall.playerid),
					selectedIds: (apiCall.selected || []).map(s => s._id)
				});

				// Special handling for pipe-delimited commands
				if (apiCall.content.includes("--additem|")) { processAddItem(buildMsgDetails()); return; }
				if (apiCall.content.includes("--addeffectconfirm|")) { processAddEffectConfirm(buildMsgDetails()); return; }
				if (apiCall.content.includes("--addeffect|")) { processAddEffect(buildMsgDetails()); return; }
				if (apiCall.content.includes("--removeeffect|")) { processRemoveEffect(buildMsgDetails()); return; }
				if (apiCall.content.includes("--effectdetail|")) { processEffectDetail(buildMsgDetails()); return; }
				if (apiCall.content.includes("--addreminder|")) { processAddReminder(buildMsgDetails()); return; }
				if (apiCall.content.includes("--editeffect|")) { processEditEffect(buildMsgDetails()); return; }
				if (apiCall.content.includes("--effectmenu|")) { processEffectMenu(buildMsgDetails()); return; }
				if (apiCall.content.includes("--removeeffectselected|")) { processRemoveEffectSelected(buildMsgDetails()); return; }
				if (apiCall.content.includes("--configeffect|")) { processConfigEffect(buildMsgDetails()); return; }
				if (apiCall.content.includes("--setfield|")) { processSetField(buildMsgDetails()); return; }
				if (apiCall.content.includes("--purgeeffect|")) { processPurgeEffect(buildMsgDetails()); return; }
				if (apiCall.content.includes("--displayeffect|")) { processDisplayEffect(buildMsgDetails()); return; }
				if (apiCall.content.includes("--effectinfo|")) { processEffectInfo(buildMsgDetails()); return; }

				Utils.handleApiCall({ actionMap, apiCall });
			}
		});

		// Sync effects when token markers change
		on("change:graphic:statusmarkers", (token, prev) => {
			if (!token) return;
			const currentMarkers = (token.get("statusmarkers") || "").split(",").filter(m => m);
			const prevMarkers = (prev.statusmarkers || "").split(",").filter(m => m);
			const removedMarkers = prevMarkers.filter(m => !currentMarkers.includes(m));
			const addedMarkers = currentMarkers.filter(m => !prevMarkers.includes(m));

			const effects = getTokenEffects(token);
			let changed = false;

			if (removedMarkers.length > 0) {
				for (let i = effects.length - 1; i >= 0; i--) {
					if (effects[i].icon && removedMarkers.includes(effects[i].icon)) {
						effects.splice(i, 1);
						changed = true;
					}
				}
			}

			if (addedMarkers.length > 0) {
				const library = getEffectLibrary();
				const effectIcons = effects.map(e => e.icon).filter(i => i);
				for (const marker of addedMarkers) {
					if (effectIcons.includes(marker)) continue;
					for (const [key, libEffect] of Object.entries(library)) {
						if (libEffect.icon === marker) {
							const newEffect = { name: libEffect.name, type: libEffect.type || "condition", icon: libEffect.icon, description: libEffect.description || "", duration: libEffect.duration !== undefined ? libEffect.duration : null, counter: libEffect.duration !== undefined ? libEffect.duration : null, direction: libEffect.direction !== undefined ? libEffect.direction : -1, autochange: libEffect.autochange || "turn" };
							effects.push(newEffect);
							effectIcons.push(marker);
							changed = true;
							break;
						}
					}
				}
			}

			if (changed) { setTokenEffects(token, effects); }
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

			Utils = EASY_UTILS.fetchUtilities({ requiredFunctions, moduleSettings });

			const easySharedForge = Utils.getSharedForge();
			PhraseFactory = easySharedForge.getFactory({ name: "PhraseFactory" });
			TemplateFactory = easySharedForge.getFactory({ name: "TemplateFactory" });
			ThemeFactory = easySharedForge.getFactory({ name: "ThemeFactory" });

			const sharedVault = Utils.getSharedVault();
			sharedVault.EasyCombat = sharedVault.EasyCombat || { round: 0 };
			EasyCombatVault = sharedVault.EasyCombat;

			// Initialize effect library
			initializeEffectLibrary();

			// Register combat templates and themes
			TemplateFactory.add({ newTemplates: COMBAT_TEMPLATES });
			ThemeFactory.add({ newThemes: COMBAT_THEMES });

			return 0;
		} else {
			const _getSyslogTimestamp = () => new Date().toISOString();
			const logMessage = `<ERROR> ${_getSyslogTimestamp()} [${moduleSettings.readableName}](checkInstall): {"transUnitId": 50000, "message": "Not Found: EASY_UTILS is unavailable."}`;
			log(logMessage);
			return 1;
		}
	};

	// ANCHOR Event: on(ready)
	on("ready", () => {
		const continueMod = checkInstall();
		if (continueMod === 0) {
			registerEventHandlers();

			Utils.logSyslogMessage({ severity: "INFO", tag: moduleSettings.readableName, transUnitId: "20000", message: PhraseFactory.get({ transUnitId: "20000" }) });

			if (moduleSettings.sendWelcomeMsg) {
				Utils.whisperPlayerMessage({ from: moduleSettings.readableName, to: "gm", message: `${moduleSettings.readableName} v${moduleSettings.version} ready. Type !${moduleSettings.chatApiName} to open menu.` });
			}
		}
	});

	// !SECTION End of Event Hooks

	// SECTION Public Methods: Exposed Interface
	return {
		getCurrentRound: () => EasyCombatVault.round || 0,
		isInCombat: () => getCurrentTurnOrder().length > 0,
		getEffectLibrary: getEffectLibrary,
		addTokenEffect: addTokenEffect,
		removeTokenEffect: removeTokenEffect,
		getTokenEffects: getTokenEffects,
		syncTokenWithMarkers: syncTokenWithMarkers
	};
	// !SECTION End of Public Interface
})();
