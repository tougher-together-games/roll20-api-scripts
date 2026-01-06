/**
 * @name easy-equip
 * @version 1.2.0
 * @description Component system for merging character sheet data
 * @author Clint & Claude
 */

/* global log, findObjs, createObj, on, playerIsGM, getObj, EASY_UTILS */

const EASY_EQUIP = (() => {
	"use strict";

	// SECTION Module Configuration

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Equip",
		chatApiName: "ezequip",
		globalName: "EASY_EQUIP",
		version: "1.2.0",
		author: "Mhykiel",
		sendWelcomeMsg: true,
		verbose: false,
		debug: {}
	};

	// ANCHOR Member: Factory References
	let Utils = {};
	let PhraseFactory = {};

	// ANCHOR Member: Section Definitions
	const SECTION_DEFS = {
		traits: { prefix: "repeating_traits", primaryField: "name" },
		proficiencies: { prefix: "repeating_proficiencies", primaryField: "name" },
		inventory: { prefix: "repeating_inventory", primaryField: "itemname" },
		attack: { prefix: "repeating_attack", primaryField: "atkname" },
		resource: { prefix: "repeating_resource", primaryField: "resource_left_name" },
		savemod: { prefix: "repeating_savemod", primaryField: "global_save_name" },
		skillmod: { prefix: "repeating_skillmod", primaryField: "global_skill_name" },
		tohitmod: { prefix: "repeating_tohitmod", primaryField: "global_attack_name" },
		acmod: { prefix: "repeating_acmod", primaryField: "global_ac_name" },
		damagemod: { prefix: "repeating_damagemod", primaryField: "global_damage_name" },
		"spell-cantrip": { prefix: "repeating_spell-cantrip", primaryField: "spellname" },
		"spell-1": { prefix: "repeating_spell-1", primaryField: "spellname" },
		"spell-2": { prefix: "repeating_spell-2", primaryField: "spellname" },
		"spell-3": { prefix: "repeating_spell-3", primaryField: "spellname" },
		"spell-4": { prefix: "repeating_spell-4", primaryField: "spellname" },
		"spell-5": { prefix: "repeating_spell-5", primaryField: "spellname" },
		"spell-6": { prefix: "repeating_spell-6", primaryField: "spellname" },
		"spell-7": { prefix: "repeating_spell-7", primaryField: "spellname" },
		"spell-8": { prefix: "repeating_spell-8", primaryField: "spellname" },
		"spell-9": { prefix: "repeating_spell-9", primaryField: "spellname" }
	};

	// ANCHOR Member: Global Mod Flags
	const GLOBAL_MOD_FLAGS = {
		savemod: "global_save_mod_flag",
		skillmod: "global_skill_mod_flag",
		tohitmod: "global_attack_mod_flag",
		acmod: "global_ac_mod_flag",
		damagemod: "global_damage_mod_flag"
	};

	// ANCHOR Member: Attribute Name Map
	const ATTRIBUTE_MAP = {
		"strength": "strength_base", "str": "strength_base",
		"dexterity": "dexterity_base", "dex": "dexterity_base",
		"constitution": "constitution_base", "con": "constitution_base",
		"intelligence": "intelligence_base", "int": "intelligence_base",
		"wisdom": "wisdom_base", "wis": "wisdom_base",
		"charisma": "charisma_base", "cha": "charisma_base",
		"speed": "speed", "ac": "ac", "hp": "hp",
		"initiative": "initiative_bonus", "init": "initiative_bonus"
	};

	// ANCHOR Member: NPC Section Definitions
	const NPC_SECTION_DEFS = {
		npctrait: { prefix: "repeating_npctrait", primaryField: "name" },
		npcaction: { prefix: "repeating_npcaction", primaryField: "name" }
	};

	// ANCHOR Member: NPC to PC Attack Field Map
	const NPC_ATTACK_FIELD_MAP = {
		"name": "atkname",
		"attack_tohit": "atkbonus",
		"attack_damage": "dmgbase",
		"attack_damagetype": "dmgtype",
		"attack_damage2": "dmg2base",
		"attack_damagetype2": "dmg2type",
		"attack_range": "atkrange",
		"description": "atk_desc"
	};

	// !SECTION End Module Configuration
	// SECTION Utility Functions

	// ANCHOR Function: generateRowID
	const generateRowID = () => {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let id = "-";
		for (let i = 0; i < 19; i++) {
			id += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return id;
	};

	// ANCHOR Function: getSelectedCharacter
	const getSelectedCharacter = (msgDetails, targetId) => {
		let token;

		if (targetId) {
			token = getObj("graphic", targetId);
			if (!token) return { token: null, character: null };
		} else {
			if (!msgDetails.selectedIds || msgDetails.selectedIds.length === 0) return { token: null, character: null };
			token = getObj("graphic", msgDetails.selectedIds[0]);
			if (!token) return { token: null, character: null };
		}

		const char = getObj("character", token.get("represents"));
		if (!char) return { token, character: null };
		return { token, character: char };
	};

	// ANCHOR Function: getAccessibleComponents
	const getAccessibleComponents = (playerId, isGm) => {
		const allComponents = findObjs({ _type: "character" })
			.filter(c => c.get("name").startsWith("Component: "));

		if (isGm) return allComponents;

		return allComponents.filter(comp => {
			const inJournals = comp.get("inplayerjournals") || "";
			return inJournals.split(",").includes(playerId) || inJournals.includes("all");
		});
	};

	// !SECTION End Utility Functions
	// SECTION GM Notes Storage

	// ANCHOR Function: getEquipJSON
	const getEquipJSON = (character, callback) => {
		character.get("gmnotes", (gmnotes) => {
			const notes = gmnotes ? unescape(gmnotes) : "";
			const match = notes.match(/<div[^>]*id=["']easyEquipData["'][^>]*>([\s\S]*?)<\/div>/i);
			if (match && match[1]) {
				try {
					callback(JSON.parse(match[1].trim()));
				} catch (e) {
					log(`[EZEQUIP] JSON parse error: ${e}`);
					callback(null);
				}
			} else {
				callback(null);
			}
		});
	};

	// ANCHOR Function: setEquipJSON
	const setEquipJSON = (character, data) => {
		const jsonStr = JSON.stringify(data);
		const newDiv = `<div id="easyEquipData" style="display:none;">${jsonStr}</div>`;
		character.set({ gmnotes: newDiv });
	};

	// ANCHOR Function: getCharacterTracking
	const getCharacterTracking = (character, callback) => {
		getEquipJSON(character, (data) => {
			callback(data || { active: {}, inactive: {} });
		});
	};

	// !SECTION End GM Notes Storage
	// SECTION Data Extraction

	// ANCHOR Function: extractSectionData
	const extractSectionData = (characterId, sectionDef) => {
		const allAttrs = findObjs({ _type: "attribute", _characterid: characterId });
		const validRowIds = new Set();

		const rowIdPattern = "(-[A-Za-z0-9-]{19})";
		const primaryPattern = new RegExp(`^${sectionDef.prefix}_${rowIdPattern}_${sectionDef.primaryField}$`);

		allAttrs.forEach(attr => {
			const name = attr.get("name");
			if (!name) return;
			const match = name.match(primaryPattern);
			if (match) {
				const value = attr.get("current");
				if (value && value.toString().trim() !== "") {
					validRowIds.add(match[1]);
				}
			}
		});

		if (validRowIds.size === 0) {
			const anyRowPattern = new RegExp(`^${sectionDef.prefix}_${rowIdPattern}_`);
			allAttrs.forEach(attr => {
				const name = attr.get("name");
				if (!name) return;
				const match = name.match(anyRowPattern);
				if (match) {
					const value = attr.get("current");
					if (value && value.toString().trim() !== "") {
						validRowIds.add(match[1]);
					}
				}
			});
		}

		if (validRowIds.size === 0) return [];

		const rows = {};
		const rowPattern = new RegExp(`^${sectionDef.prefix}_${rowIdPattern}_(.+)$`);

		allAttrs.forEach(attr => {
			const name = attr.get("name");
			if (!name) return;
			const match = name.match(rowPattern);
			if (!match) return;

			const rowId = match[1];
			const fieldName = match[2];
			if (!validRowIds.has(rowId)) return;

			if (!rows[rowId]) rows[rowId] = {};
			const current = attr.get("current");
			const max = attr.get("max");

			if (current !== "" && current !== undefined) rows[rowId][fieldName] = current;
			if (max !== "" && max !== undefined) rows[rowId][fieldName + "_max"] = max;
		});

		return Object.values(rows);
	};

	// ANCHOR Function: parseAttributeTraits
	const parseAttributeTraits = (traits) => {
		const cleanTraits = [];
		const attributes = {};
		const attrPattern = /^(SET|ADD):(\w+)=(.+)$/i;

		traits.forEach(trait => {
			const name = trait.name || "";
			const match = name.match(attrPattern);
			if (match) {
				const mode = match[1].toLowerCase();
				const friendlyName = match[2].toLowerCase();
				const value = match[3];
				const attrName = ATTRIBUTE_MAP[friendlyName] || friendlyName;
				attributes[attrName] = { mode, value: isNaN(value) ? value : Number(value) };
			} else {
				cleanTraits.push(trait);
			}
		});

		return { cleanTraits, attributes };
	};

	// !SECTION End Data Extraction
	// SECTION Row Management

	// ANCHOR Function: createRepeatingRow
	const createRepeatingRow = (characterId, prefix, rowData) => {
		const newRowId = generateRowID();
		for (const [fieldName, value] of Object.entries(rowData)) {
			if (fieldName.endsWith("_max")) {
				const baseField = fieldName.slice(0, -4);
				const attrName = `${prefix}_${newRowId}_${baseField}`;
				let attr = findObjs({ _type: "attribute", _characterid: characterId, name: attrName })[0];
				if (attr) {
					attr.set("max", value);
				} else {
					createObj("attribute", { characterid: characterId, name: attrName, current: "", max: value });
				}
			} else {
				const attrName = `${prefix}_${newRowId}_${fieldName}`;
				createObj("attribute", { characterid: characterId, name: attrName, current: value });
			}
		}
		return newRowId;
	};

	// ANCHOR Function: removeRepeatingRows
	const removeRepeatingRows = (characterId, prefix, rowIds) => {
		rowIds.forEach(rowId => {
			findObjs({ _type: "attribute", _characterid: characterId })
				.filter(attr => attr.get("name")?.startsWith(`${prefix}_${rowId}_`))
				.forEach(attr => attr.remove());
		});
	};

	// ANCHOR Function: applyAttributeMods
	const applyAttributeMods = (characterId, attributes) => {
		const originals = {};
		for (const [attrName, mod] of Object.entries(attributes)) {
			let attr = findObjs({ _type: "attribute", _characterid: characterId, name: attrName })[0];
			const originalValue = attr ? attr.get("current") : "";
			const originalNum = parseFloat(originalValue) || 0;

			let newValue;
			let shouldApply = true;

			if (mod.mode === "set") {
				const modNum = parseFloat(mod.value) || 0;
				if (modNum > originalNum) {
					newValue = mod.value;
				} else {
					shouldApply = false;
				}
			} else if (mod.mode === "add") {
				newValue = originalNum + (parseFloat(mod.value) || 0);
			}

			if (shouldApply) {
				originals[attrName] = originalValue;
				if (attr) {
					attr.set("current", newValue);
				} else {
					createObj("attribute", { characterid: characterId, name: attrName, current: newValue });
				}
			}
		}
		return originals;
	};

	// ANCHOR Function: restoreOriginalAttrs
	const restoreOriginalAttrs = (characterId, originals) => {
		for (const [attrName, originalValue] of Object.entries(originals)) {
			let attr = findObjs({ _type: "attribute", _characterid: characterId, name: attrName })[0];
			if (attr) attr.set("current", originalValue);
		}
	};

	// ANCHOR Function: setGlobalModFlag
	const setGlobalModFlag = (characterId, sectionKey) => {
		const flagName = GLOBAL_MOD_FLAGS[sectionKey];
		if (!flagName) return;
		let attr = findObjs({ _type: "attribute", _characterid: characterId, name: flagName })[0];
		if (attr) {
			attr.set("current", "1");
		} else {
			createObj("attribute", { characterid: characterId, name: flagName, current: "1" });
		}
	};

	// !SECTION End Row Management
	// SECTION Token Management

	// ANCHOR Function: parseSides
	const parseSides = (sidesStr) => {
		if (!sidesStr || sidesStr === "") return [];
		return sidesStr.split("|").map(s => decodeURIComponent(s));
	};

	// ANCHOR Function: serializeSides
	const serializeSides = (sidesArr) => {
		return sidesArr.map(s => encodeURIComponent(s)).join("|");
	};

	// ANCHOR Function: addTokenImage
	const addTokenImage = (token, imageUrl) => {
		if (!token || !imageUrl) return null;

		const rawCurrentSide = token.get("currentside");
		const originalSide = (rawCurrentSide !== undefined && rawCurrentSide !== null && rawCurrentSide !== "")
			? parseInt(rawCurrentSide, 10)
			: 0;

		let sides = parseSides(token.get("sides"));

		if (sides.length === 0) {
			const currentImg = token.get("imgsrc");
			if (currentImg) {
				sides.push(currentImg);
			}
		}

		sides.push(imageUrl);
		const newIndex = sides.length - 1;

		token.set({
			sides: serializeSides(sides),
			currentside: newIndex,
			imgsrc: imageUrl
		});

		return { originalSide, addedImageUrl: imageUrl, sides };
	};

	// ANCHOR Function: removeTokenImage
	const removeTokenImage = (token, imageUrl) => {
		if (!token) return null;

		let sides = parseSides(token.get("sides"));

		// Try to remove the image if found
		if (imageUrl) {
			const imageIndex = sides.findIndex(s => s === imageUrl);
			if (imageIndex !== -1) {
				sides.splice(imageIndex, 1);
			}
		}

		const newImg = sides[0] || "";

		token.set({
			sides: serializeSides(sides),
			currentside: 0,
			imgsrc: newImg
		});

		return sides;
	};

	// ANCHOR Function: syncDefaultTokenSides
	const syncDefaultTokenSides = (character, sides) => {
		character.get("defaulttoken", (defaulttoken) => {
			if (!defaulttoken) return;
			try {
				const tokenData = JSON.parse(defaulttoken);
				tokenData.sides = serializeSides(sides);
				tokenData.currentside = 0;
				tokenData.imgsrc = sides[0] || "";
				character.set("defaulttoken", JSON.stringify(tokenData));
			} catch (e) {
				log(`[EZEQUIP] syncDefaultTokenSides: failed - ${e}`);
			}
		});
	};

	// !SECTION End Token Management
	// SECTION Menu Processors

	// ANCHOR Function: processMenuAsync
	const processMenuAsync = async (msgDetails) => {
		const thisFuncDebugName = "processMenuAsync";

		try {
			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001001" });

			const mainButtons = [
				`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --list">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001002" })}</a>`,
				`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --modify">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001003" })}</a>`
			];

			let body = `<div class="ez-content">${mainButtons.join("\n")}</div>`;

			if (msgDetails.isGm) {
				const gmHeader = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001023" });
				const gmButtons = [
					`<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --shifter">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001022" })}</a>`
				];
				body += `<div class="ez-header">${gmHeader}</div>`;
				body += `<div class="ez-content">${gmButtons.join("\n")}</div>`;
			}

			const menuContent = {
				title,
				subtitle: "",
				body,
				footer: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001004" })
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

	// ANCHOR Function: getComponentImage
	const getComponentImage = (compChar) => {
		return new Promise((resolve) => {
			compChar.get("defaulttoken", (defaultToken) => {
				let tokenImage = null;
				if (defaultToken) {
					try {
						const tokenData = JSON.parse(defaultToken);
						if (tokenData.imgsrc) {
							tokenImage = tokenData.imgsrc;
						}
					} catch (e) {
						// Silently skip if parse fails
					}
				}
				// Fallback to avatar if no token image
				if (!tokenImage) {
					tokenImage = compChar.get("avatar") || null;
				}
				resolve(tokenImage);
			});
		});
	};

	// ANCHOR Function: processListAsync
	const processListAsync = async (msgDetails) => {
		const thisFuncDebugName = "processListAsync";

		try {
			const title = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001005" });
			const components = getAccessibleComponents(msgDetails.callerId, msgDetails.isGm);

			let bodyContent = "";

			if (components.length === 0) {
				bodyContent = `<p style="color: var(--ez-color-text-complement); font-style: italic; margin: 5px 0;">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001006" })}</p>`;
			} else {
				// Get images for all components
				const componentData = await Promise.all(components.map(async (comp) => {
					const name = comp.get("name").replace("Component: ", "");
					const image = await getComponentImage(comp);
					return { name, image };
				}));

				let tableRows = "";
				componentData.forEach(({ name, image }) => {
					const imgCell = image 
						? `<img src="${image}" style="width: 50px; height: 50px; border-radius: 5px; vertical-align: middle;">` 
						: "";
					const addBtn = `<a class="ez-btn" style="background: #008000;" href="\`!${moduleSettings.chatApiName} --add prompt|${name}">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001007" })}</a>`;
					const buildBtn = msgDetails.isGm
						? `<a class="ez-btn" style="background: #0000ff;" href="\`!${moduleSettings.chatApiName} --build prompt|${name}">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001008" })}</a>`
						: "";
					tableRows += `<tr><td style="width: 55px;">${imgCell}</td><td style="color: var(--ez-color-text-contrast); padding: 5px; font-weight: bold;">${name}</td><td>${addBtn}</td>${msgDetails.isGm ? `<td>${buildBtn}</td>` : ""}</tr>`;
				});
				bodyContent = `<table style="width: 100%; border-collapse: collapse;">${tableRows}</table>`;
			}

			const menuContent = {
				title,
				subtitle: "",
				body: `<div class="ez-content">${bodyContent}</div>`,
				footer: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001009" })
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

	// ANCHOR Function: processModifyAsync
	const processModifyAsync = async (msgDetails, parsedArgs) => {
		const thisFuncDebugName = "processModifyAsync";

		try {
			const targetId = parsedArgs.target || null;
			const { character: char } = getSelectedCharacter(msgDetails, targetId);

			if (!char) {
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "ERROR",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100A" })
				});
				return 1;
			}

			getCharacterTracking(char, async (tracking) => {
				const charName = char.get("name");
				const activeNames = Object.keys(tracking.active || {});
				const inactiveNames = Object.keys(tracking.inactive || {});

				// Get images for all components
				const allNames = [...activeNames, ...inactiveNames];
				const imageMap = {};
				await Promise.all(allNames.map(async (name) => {
					const compChar = findObjs({ _type: "character", name: `Component: ${name}` })[0];
					if (compChar) {
						imageMap[name] = await getComponentImage(compChar);
					}
				}));

				let body = "";

				// Active section
				const activeHeader = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100B" });
				body += `<div class="ez-header">${activeHeader}</div>`;

				if (activeNames.length === 0) {
					body += `<div class="ez-content"><p style="color: var(--ez-color-text-complement); font-style: italic; margin: 5px 0;">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100C" })}</p></div>`;
				} else {
					let tableRows = "";
					activeNames.forEach(name => {
						const tokenImg = imageMap[name] || "";
						const imgCell = tokenImg 
							? `<img src="${tokenImg}" style="width: 50px; height: 50px; border-radius: 5px; vertical-align: middle;">` 
							: "";
						const disableBtn = `<a class="ez-btn" style="background: #ffff00; color: #000000;" href="\`!${moduleSettings.chatApiName} --disable prompt|${name}">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100D" })}</a>`;
						const removeBtn = `<a class="ez-btn" style="background: #ff0000;" href="\`!${moduleSettings.chatApiName} --remove prompt|${name}">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100E" })}</a>`;
						tableRows += `<tr><td style="width: 55px;">${imgCell}</td><td style="color: var(--ez-color-text-contrast); padding: 5px; font-weight: bold;">${name}</td><td>${disableBtn}</td><td>${removeBtn}</td></tr>`;
					});
					body += `<div class="ez-content"><table style="width: 100%; border-collapse: collapse;">${tableRows}</table></div>`;
				}

				// Inactive section
				const inactiveHeader = PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100F" });
				body += `<div class="ez-header">${inactiveHeader}</div>`;

				if (inactiveNames.length === 0) {
					body += `<div class="ez-content"><p style="color: var(--ez-color-text-complement); font-style: italic; margin: 5px 0;">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100C" })}</p></div>`;
				} else {
					let tableRows = "";
					inactiveNames.forEach(name => {
						const tokenImg = imageMap[name] || "";
						const imgCell = tokenImg 
							? `<img src="${tokenImg}" style="width: 50px; height: 50px; border-radius: 5px; vertical-align: middle;">` 
							: "";
						const enableBtn = `<a class="ez-btn" style="background: #008000;" href="\`!${moduleSettings.chatApiName} --enable prompt|${name}">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001010" })}</a>`;
						const removeBtn = `<a class="ez-btn" style="background: #ff0000;" href="\`!${moduleSettings.chatApiName} --remove prompt|${name}">${PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100E" })}</a>`;
						tableRows += `<tr><td style="width: 55px;">${imgCell}</td><td style="color: var(--ez-color-text-contrast); padding: 5px; font-weight: bold;">${name}</td><td>${enableBtn}</td><td>${removeBtn}</td></tr>`;
					});
					body += `<div class="ez-content"><table style="width: 100%; border-collapse: collapse;">${tableRows}</table></div>`;
				}

				const menuContent = {
					title: charName,
					subtitle: "",
					body,
					footer: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001011" })
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

	// !SECTION End Menu Processors
	// SECTION Action Processors

	// ANCHOR Function: processBuild
	const processBuild = async (msgDetails, parsedArgs) => {
		const thisFuncDebugName = "processBuild";

		if (!msgDetails.isGm) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001012" })
			});
			return 1;
		}

		const componentName = parsedArgs.prompt;
		if (!componentName) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001013" })
			});
			return 1;
		}

		const compChar = findObjs({ _type: "character", name: `Component: ${componentName}` })[0];
		if (!compChar) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001014", expressions: { name: componentName } })
			});
			return 1;
		}

		return new Promise((resolve) => {
			compChar.get("defaulttoken", async (defaultToken) => {
				let tokenImage = null;
				if (defaultToken) {
					try {
						const tokenData = JSON.parse(defaultToken);
						if (tokenData.imgsrc) {
							tokenImage = tokenData.imgsrc;
						}
					} catch (e) {
						// Silently skip if parse fails
					}
				}

				// Fallback to avatar if no token image
				if (!tokenImage) {
					tokenImage = compChar.get("avatar") || null;
				}

				const componentData = {
					version: 1,
					name: componentName,
					built: new Date().toISOString(),
					sections: {},
					attributes: {},
					tokenImage: tokenImage
				};

				let sectionCount = 0;
				for (const [sectionKey, sectionDef] of Object.entries(SECTION_DEFS)) {
					const rows = extractSectionData(compChar.id, sectionDef);
					if (rows.length > 0) {
						if (sectionKey === "traits") {
							const { cleanTraits, attributes } = parseAttributeTraits(rows);
							if (cleanTraits.length > 0) {
								componentData.sections[sectionKey] = cleanTraits;
								sectionCount++;
							}
							Object.assign(componentData.attributes, attributes);
						} else {
							componentData.sections[sectionKey] = rows;
							sectionCount++;
						}
					}
				}

				setEquipJSON(compChar, componentData);

				const attrCount = Object.keys(componentData.attributes).length;
				const imageCount = tokenImage ? 1 : 0;
				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "INFO",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0E001015",
						expressions: { name: componentName, sections: sectionCount, attrs: attrCount, images: imageCount }
					})
				});

				resolve(0);
			});
		});
	};

	// ANCHOR Function: processAdd
	const processAdd = async (msgDetails, parsedArgs) => {
		const thisFuncDebugName = "processAdd";

		const componentName = parsedArgs.prompt;
		if (!componentName) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001013" })
			});
			return 1;
		}

		const targetId = parsedArgs.target || null;
		const { token: targetToken, character: targetChar } = getSelectedCharacter(msgDetails, targetId);
		if (!targetChar) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100A" })
			});
			return 1;
		}

		const compChar = findObjs({ _type: "character", name: `Component: ${componentName}` })[0];
		if (!compChar) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001014", expressions: { name: componentName } })
			});
			return 1;
		}

		return new Promise((resolve) => {
			getEquipJSON(compChar, (componentData) => {
				if (!componentData || !componentData.sections) {
					Utils.whisperAlertMessageAsync({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "ERROR",
						apiCallContent: msgDetails.raw.content,
						remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001016", expressions: { name: componentName } })
					});
					resolve(1);
					return;
				}

				getCharacterTracking(targetChar, async (tracking) => {
					if (tracking.active[componentName] || tracking.inactive[componentName]) {
						await Utils.whisperAlertMessageAsync({
							from: moduleSettings.readableName,
							to: msgDetails.callerName,
							toId: msgDetails.callerId,
							severity: "WARN",
							apiCallContent: msgDetails.raw.content,
							remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001017", expressions: { name: componentName } })
						});
						resolve(1);
						return;
					}

					const entry = { rows: {}, originals: {}, data: componentData };

					for (const [sectionKey, rows] of Object.entries(componentData.sections)) {
						const sectionDef = SECTION_DEFS[sectionKey];
						if (!sectionDef) continue;

						entry.rows[sectionKey] = [];
						rows.forEach(rowData => {
							const newRowId = createRepeatingRow(targetChar.id, sectionDef.prefix, rowData);
							entry.rows[sectionKey].push(newRowId);
						});

						if (GLOBAL_MOD_FLAGS[sectionKey]) {
							setGlobalModFlag(targetChar.id, sectionKey);
						}
					}

					if (componentData.attributes && Object.keys(componentData.attributes).length > 0) {
						entry.originals = applyAttributeMods(targetChar.id, componentData.attributes);
					}

					if (componentData.tokenImage && targetToken) {
						const tokenResult = addTokenImage(targetToken, componentData.tokenImage);
						if (tokenResult) {
							entry.tokenData = { originalSide: tokenResult.originalSide, addedImageUrl: tokenResult.addedImageUrl };
							syncDefaultTokenSides(targetChar, tokenResult.sides);
						}
					}

					tracking.active[componentName] = entry;
					setEquipJSON(targetChar, tracking);

					await processModifyAsync(msgDetails, parsedArgs);
					resolve(0);
				});
			});
		});
	};

	// ANCHOR Function: processRemove
	const processRemove = async (msgDetails, parsedArgs) => {
		const thisFuncDebugName = "processRemove";

		const componentName = parsedArgs.prompt;
		if (!componentName) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001013" })
			});
			return 1;
		}

		const targetId = parsedArgs.target || null;
		const { token: targetToken, character: targetChar } = getSelectedCharacter(msgDetails, targetId);
		if (!targetChar) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100A" })
			});
			return 1;
		}

		return new Promise((resolve) => {
			getCharacterTracking(targetChar, async (tracking) => {
				let entry = tracking.active[componentName];
				let wasActive = true;

				if (!entry) {
					entry = tracking.inactive[componentName];
					wasActive = false;
				}

				if (!entry) {
					await Utils.whisperAlertMessageAsync({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "WARN",
						apiCallContent: msgDetails.raw.content,
						remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001019", expressions: { name: componentName } })
					});
					resolve(1);
					return;
				}

				if (wasActive) {
					for (const [sectionKey, rowIds] of Object.entries(entry.rows || {})) {
						const sectionDef = SECTION_DEFS[sectionKey];
						if (sectionDef) removeRepeatingRows(targetChar.id, sectionDef.prefix, rowIds);
					}
					if (entry.originals) restoreOriginalAttrs(targetChar.id, entry.originals);
				}

				// Always reset token to index 0 and remove component image
				if (targetToken) {
					const imageToRemove = entry.tokenData?.addedImageUrl || null;
					const updatedSides = removeTokenImage(targetToken, imageToRemove);
					if (updatedSides) {
						syncDefaultTokenSides(targetChar, updatedSides);
					}
				}

				delete tracking.active[componentName];
				delete tracking.inactive[componentName];
				setEquipJSON(targetChar, tracking);

				await processModifyAsync(msgDetails, parsedArgs);
				resolve(0);
			});
		});
	};

	// ANCHOR Function: processDisable
	const processDisable = async (msgDetails, parsedArgs) => {
		const thisFuncDebugName = "processDisable";

		const componentName = parsedArgs.prompt;
		if (!componentName) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001013" })
			});
			return 1;
		}

		const targetId = parsedArgs.target || null;
		const { token: targetToken, character: targetChar } = getSelectedCharacter(msgDetails, targetId);
		if (!targetChar) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100A" })
			});
			return 1;
		}

		return new Promise((resolve) => {
			getCharacterTracking(targetChar, async (tracking) => {
				const entry = tracking.active[componentName];
				if (!entry) {
					await Utils.whisperAlertMessageAsync({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "WARN",
						apiCallContent: msgDetails.raw.content,
						remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00101B", expressions: { name: componentName } })
					});
					resolve(1);
					return;
				}

				for (const [sectionKey, rowIds] of Object.entries(entry.rows || {})) {
					const sectionDef = SECTION_DEFS[sectionKey];
					if (sectionDef) removeRepeatingRows(targetChar.id, sectionDef.prefix, rowIds);
				}
				if (entry.originals) restoreOriginalAttrs(targetChar.id, entry.originals);

				if (entry.tokenData && targetToken) {
					const sides = parseSides(targetToken.get("sides"));
					const originalSide = entry.tokenData.originalSide;
					const originalImg = sides[originalSide] || sides[0];
					targetToken.set({
						currentside: originalSide,
						imgsrc: originalImg
					});
				}

				entry.rows = {};
				tracking.inactive[componentName] = entry;
				delete tracking.active[componentName];
				setEquipJSON(targetChar, tracking);

				await processModifyAsync(msgDetails, parsedArgs);
				resolve(0);
			});
		});
	};

	// ANCHOR Function: processEnable
	const processEnable = async (msgDetails, parsedArgs) => {
		const thisFuncDebugName = "processEnable";

		const componentName = parsedArgs.prompt;
		if (!componentName) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001013" })
			});
			return 1;
		}

		const targetId = parsedArgs.target || null;
		const { token: targetToken, character: targetChar } = getSelectedCharacter(msgDetails, targetId);
		if (!targetChar) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100A" })
			});
			return 1;
		}

		return new Promise((resolve) => {
			getCharacterTracking(targetChar, async (tracking) => {
				const entry = tracking.inactive[componentName];
				if (!entry) {
					await Utils.whisperAlertMessageAsync({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "WARN",
						apiCallContent: msgDetails.raw.content,
						remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00101D", expressions: { name: componentName } })
					});
					resolve(1);
					return;
				}

				const componentData = entry.data;
				if (!componentData) {
					await Utils.whisperAlertMessageAsync({
						from: moduleSettings.readableName,
						to: msgDetails.callerName,
						toId: msgDetails.callerId,
						severity: "ERROR",
						apiCallContent: msgDetails.raw.content,
						remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00101E", expressions: { name: componentName } })
					});
					resolve(1);
					return;
				}

				entry.rows = {};
				for (const [sectionKey, rows] of Object.entries(componentData.sections || {})) {
					const sectionDef = SECTION_DEFS[sectionKey];
					if (!sectionDef) continue;

					entry.rows[sectionKey] = [];
					rows.forEach(rowData => {
						const newRowId = createRepeatingRow(targetChar.id, sectionDef.prefix, rowData);
						entry.rows[sectionKey].push(newRowId);
					});

					if (GLOBAL_MOD_FLAGS[sectionKey]) {
						setGlobalModFlag(targetChar.id, sectionKey);
					}
				}

				if (componentData.attributes && Object.keys(componentData.attributes).length > 0) {
					entry.originals = applyAttributeMods(targetChar.id, componentData.attributes);
				}

				if (entry.tokenData && targetToken) {
					let sides = parseSides(targetToken.get("sides"));
					const imageUrl = entry.tokenData.addedImageUrl;
					let imageIndex = sides.findIndex(s => s === imageUrl);

					if (imageIndex === -1) {
						sides.push(imageUrl);
						imageIndex = sides.length - 1;
						targetToken.set({ sides: serializeSides(sides) });
						syncDefaultTokenSides(targetChar, sides);
					}

					const currentSide = parseInt(targetToken.get("currentside"), 10) || 0;
					entry.tokenData.originalSide = currentSide;

					targetToken.set({
						currentside: imageIndex,
						imgsrc: imageUrl
					});
				}

				tracking.active[componentName] = entry;
				delete tracking.inactive[componentName];
				setEquipJSON(targetChar, tracking);

				await processModifyAsync(msgDetails, parsedArgs);
				resolve(0);
			});
		});
	};

	// ANCHOR Function: processShifter
	const processShifter = async (msgDetails, parsedArgs) => {
		const thisFuncDebugName = "processShifter";

		if (!msgDetails.isGm) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001012" })
			});
			return 1;
		}

		const targetId = parsedArgs.target || null;
		const { token: npcToken, character: npcChar } = getSelectedCharacter(msgDetails, targetId);

		if (!npcChar) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E00100A" })
			});
			return 1;
		}

		const npcFlag = findObjs({ _type: "attribute", _characterid: npcChar.id, name: "npc" })[0];
		if (!npcFlag || npcFlag.get("current") !== "1") {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ playerId: msgDetails.callerId, transUnitId: "0x0E001020" })
			});
			return 1;
		}

		const npcName = npcChar.get("name");

		let baseName = `Shift ${npcName}`;
		let componentName = baseName;
		let counter = 1;
		while (findObjs({ _type: "character", name: `Component: ${componentName}` }).length > 0) {
			counter++;
			componentName = `${baseName} ${counter}`;
		}

		const compChar = createObj("character", {
			name: `Component: ${componentName}`,
			inplayerjournals: "",
			controlledby: ""
		});

		createObj("attribute", { characterid: compChar.id, name: "l1mancer_status", current: "complete" });
		createObj("attribute", { characterid: compChar.id, name: "mancer_cancel", current: "on" });

		const getNpcAttr = (attrName) => {
			const attr = findObjs({ _type: "attribute", _characterid: npcChar.id, name: attrName })[0];
			return attr ? attr.get("current") : "";
		};

		const statAttrs = [
			{ npc: "strength", label: "STR" },
			{ npc: "dexterity", label: "DEX" },
			{ npc: "constitution", label: "CON" },
			{ npc: "intelligence", label: "INT" },
			{ npc: "wisdom", label: "WIS" },
			{ npc: "charisma", label: "CHA" }
		];

		statAttrs.forEach(stat => {
			const value = getNpcAttr(stat.npc);
			if (value && value !== "0") {
				const rowId = generateRowID();
				createObj("attribute", {
					characterid: compChar.id,
					name: `repeating_traits_${rowId}_name`,
					current: `SET:${stat.label}=${value}`
				});
				createObj("attribute", {
					characterid: compChar.id,
					name: `repeating_traits_${rowId}_source`,
					current: "Shifter"
				});
			}
		});

		const otherAttrs = [
			{ npc: "npc_speed", label: "speed" },
			{ npc: "npc_ac", label: "ac" },
			{ npc: "hp", label: "hp" }
		];

		otherAttrs.forEach(attr => {
			const value = getNpcAttr(attr.npc);
			if (value && value !== "0") {
				const rowId = generateRowID();
				createObj("attribute", {
					characterid: compChar.id,
					name: `repeating_traits_${rowId}_name`,
					current: `SET:${attr.label}=${value}`
				});
				createObj("attribute", {
					characterid: compChar.id,
					name: `repeating_traits_${rowId}_source`,
					current: "Shifter"
				});
			}
		});

		const npcTraits = extractSectionData(npcChar.id, NPC_SECTION_DEFS.npctrait);
		npcTraits.forEach(trait => {
			const rowId = generateRowID();
			if (trait.name) {
				createObj("attribute", {
					characterid: compChar.id,
					name: `repeating_traits_${rowId}_name`,
					current: trait.name
				});
			}
			if (trait.description) {
				createObj("attribute", {
					characterid: compChar.id,
					name: `repeating_traits_${rowId}_description`,
					current: trait.description
				});
			}
			createObj("attribute", {
				characterid: compChar.id,
				name: `repeating_traits_${rowId}_source`,
				current: npcName
			});
		});

		const npcActions = extractSectionData(npcChar.id, NPC_SECTION_DEFS.npcaction);
		npcActions.forEach(action => {
			const rowId = generateRowID();
			for (const [npcField, pcField] of Object.entries(NPC_ATTACK_FIELD_MAP)) {
				if (action[npcField]) {
					createObj("attribute", {
						characterid: compChar.id,
						name: `repeating_attack_${rowId}_${pcField}`,
						current: action[npcField]
					});
				}
			}
			createObj("attribute", {
				characterid: compChar.id,
				name: `repeating_attack_${rowId}_options-flag`,
				current: "0"
			});
		});

		return new Promise((resolve) => {
			let tokenImage = null;
			if (npcToken) {
				tokenImage = npcToken.get("imgsrc");
			}

			if (tokenImage) {
				compChar.set("avatar", tokenImage);
			}

			npcChar.get("defaulttoken", async (defaultToken) => {
				if (tokenImage) {
					let tokenData = {};
					if (defaultToken) {
						try {
							tokenData = JSON.parse(defaultToken);
						} catch (e) {
							// Start fresh if parse fails
						}
					}
					tokenData.imgsrc = tokenImage;
					tokenData.represents = compChar.id;
					compChar.set("defaulttoken", JSON.stringify(tokenData));
				} else if (defaultToken) {
					compChar.set("defaulttoken", defaultToken);
				}

				const buildArgs = { prompt: componentName };
				await processBuild(msgDetails, buildArgs);

				if (tokenImage) {
					await new Promise((resolveUpdate) => {
						getEquipJSON(compChar, (componentData) => {
							if (componentData) {
								componentData.tokenImage = tokenImage;
								setEquipJSON(compChar, componentData);
							}
							resolveUpdate();
						});
					});
				}

				await Utils.whisperAlertMessageAsync({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					toId: msgDetails.callerId,
					severity: "INFO",
					apiCallContent: msgDetails.raw.content,
					remark: PhraseFactory.get({
						playerId: msgDetails.callerId,
						transUnitId: "0x0E001021",
						expressions: { name: componentName, npc: npcName }
					})
				});

				resolve(0);
			});
		});
	};

	// !SECTION End Action Processors
	// SECTION Event Hooks

	// ANCHOR Member: actionMap
	const actionMap = {
		"--menu": (msgDetails) => processMenuAsync(msgDetails),
		"--list": (msgDetails) => processListAsync(msgDetails),
		"--modify": (msgDetails, parsedArgs) => processModifyAsync(msgDetails, parsedArgs),
		"--build": (msgDetails, parsedArgs) => processBuild(msgDetails, parsedArgs),
		"--add": (msgDetails, parsedArgs) => processAdd(msgDetails, parsedArgs),
		"--remove": (msgDetails, parsedArgs) => processRemove(msgDetails, parsedArgs),
		"--disable": (msgDetails, parsedArgs) => processDisable(msgDetails, parsedArgs),
		"--enable": (msgDetails, parsedArgs) => processEnable(msgDetails, parsedArgs),
		"--shifter": (msgDetails, parsedArgs) => processShifter(msgDetails, parsedArgs)
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

			// Add localization phrases
			PhraseFactory.add({
				newMap: {
					enUS: {
						"0x0E001001": "Easy Equip",
						"0x0E001002": "List Components",
						"0x0E001003": "Modify Character",
						"0x0E001004": "Select a token before clicking Modify Character.",
						"0x0E001005": "Components",
						"0x0E001006": "No components available.",
						"0x0E001007": "Add",
						"0x0E001008": "Build",
						"0x0E001009": "Select target token, then click Add.",
						"0x0E00100A": "No valid token selected or token not linked to a character.",
						"0x0E00100B": "Active",
						"0x0E00100C": "None",
						"0x0E00100D": "Disable",
						"0x0E00100E": "Remove",
						"0x0E00100F": "Inactive",
						"0x0E001010": "Enable",
						"0x0E001011": "Keep token selected when clicking buttons.",
						"0x0E001012": "This command is restricted to GM.",
						"0x0E001013": "Missing component name.",
						"0x0E001014": "Component '{{ name }}' not found.",
						"0x0E001015": "Built '{{ name }}' — {{ sections }} section(s), {{ attrs }} attribute(s), {{ images }} image(s).",
						"0x0E001016": "Component '{{ name }}' not built. Click Build first.",
						"0x0E001017": "'{{ name }}' already on this character.",
						"0x0E001018": "Added '{{ component }}' to {{ character }}.",
						"0x0E001019": "'{{ name }}' not on this character.",
						"0x0E00101A": "Removed '{{ component }}' from {{ character }}.",
						"0x0E00101B": "'{{ name }}' not active on this character.",
						"0x0E00101C": "Disabled '{{ component }}' on {{ character }}.",
						"0x0E00101D": "'{{ name }}' not inactive on this character.",
						"0x0E00101E": "No data for '{{ name }}'.",
						"0x0E00101F": "Enabled '{{ component }}' on {{ character }}.",
						"0x0E001020": "Selected character is not an NPC.",
						"0x0E001021": "Created '{{ name }}' from '{{ npc }}'.",
						"0x0E001022": "Make Shifter",
						"0x0E001023": "GM Tools"
					}
				}
			});

			if (moduleSettings.verbose) {
				const msgId = "10000";
				Utils.logSyslogMessage({
					severity: "INFO",
					tag: moduleSettings.readableName,
					transUnitId: msgId,
					message: PhraseFactory.get({ transUnitId: msgId })
				});
			}

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

	// !SECTION End Event Hooks

	return { version: moduleSettings.version };
})();
