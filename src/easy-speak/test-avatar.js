/*!
 * @title: easy-dialog.js
 * @description: RPG-style dialog boxes with character avatars alternating left/right.
 * @author: Mhykiel
 * @version: 0.1.0
 * @license: MIT
 */

// eslint-disable-next-line no-unused-vars
const EASY_DIALOG = (() => {
	// SECTION Object: EASY_DIALOG

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Dialog",
		chatApiName: "speak",
		version: "0.1.0"
	};

	// ANCHOR Member: Dialog State
	const dialogState = {
		lastSpeakerId: null,
		currentSide: "right" // Start right so first speaker goes left
	};

	// ANCHOR Member: Style Constants
	const STYLES = {
		avatarWidth: 126,
		avatarHeight: 210,  // Maintains 210:350 ratio (0.6)
		boxPadding: 8,
		nameColor: "#c9a227",
		messageColor: "#f0f0f0",
		borderColor: "#444444",
		bgColor: "#1a1a1a"
	};

	// SECTION Inner Methods: Helpers

	// ANCHOR Function: getSpeakerInfo
	/**
	 * @summary Extracts speaker info from selected token.
	 * Priority: character avatar > token image > letter fallback
	 * @param {Object} msg - Chat message object
	 * @returns {Object} { speakerId, charName, avatarUrl }
	 */
	const getSpeakerInfo = (msg) => {
		let speakerId = msg.playerid;
		let charName = msg.who || "Unknown";
		let avatarUrl = null;

		// Check for selected token
		if (msg.selected && msg.selected.length > 0) {
			const token = getObj("graphic", msg.selected[0]._id);

			if (token) {
				const tokenImg = token.get("imgsrc");
				const charId = token.get("represents");

				if (charId) {
					const character = getObj("character", charId);
					if (character) {
						charName = character.get("name");
						speakerId = charId;

						// Priority 1: Character avatar
						const charAvatar = character.get("avatar");
						if (charAvatar && charAvatar.length > 0) {
							avatarUrl = charAvatar;
						}
						// Priority 2: Token image
						else if (tokenImg) {
							avatarUrl = tokenImg;
						}
					}
				} else {
					// Token doesn't represent a character
					charName = token.get("name") || charName;
					speakerId = token.id;

					// Use token image if available
					if (tokenImg) {
						avatarUrl = tokenImg;
					}
				}
			}
		}

		return { speakerId, charName, avatarUrl };
	};

	// ANCHOR Function: getLetterColor
	/**
	 * @summary Generates a consistent color based on character name.
	 * @param {string} name - Character name
	 * @returns {string} Hex color
	 */
	const getLetterColor = (name) => {
		const colors = [
			"#e74c3c", "#e67e22", "#f1c40f", "#2ecc71",
			"#1abc9c", "#3498db", "#9b59b6", "#e91e63"
		];

		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}

		return colors[Math.abs(hash) % colors.length];
	};

	// ANCHOR Function: buildAvatarHtml
	/**
	 * @summary Builds avatar image or letter fallback HTML.
	 * @param {string|null} avatarUrl - Avatar URL or null
	 * @param {string} charName - Character name for fallback
	 * @param {string} side - "left" or "right"
	 * @returns {string} HTML string
	 */
	const buildAvatarHtml = (avatarUrl, charName, side) => {
		const width = STYLES.avatarWidth;
		const height = STYLES.avatarHeight;
		const margin = side === "left" ? "margin-right: 10px;" : "margin-left: 10px;";
		const floatDir = side === "left" ? "float: left;" : "float: right;";

		if (avatarUrl) {
			// Image avatar
			return `<img src="${avatarUrl}" style="${floatDir} ${margin} max-width: ${width}px; max-height: ${height}px; width: auto; height: auto; border-radius: 5px; border: 2px solid ${STYLES.borderColor};">`;
		} else {
			// Letter fallback
			const letter = charName.charAt(0).toUpperCase();
			const bgColor = getLetterColor(charName);

			return `<div style="${floatDir} ${margin} width: ${width}px; height: ${height}px; background-color: ${bgColor}; border-radius: 5px; border: 2px solid ${STYLES.borderColor}; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; color: #ffffff; font-family: Arial, sans-serif;">${letter}</div>`;
		}
	};

	// ANCHOR Function: buildDialogHtml
	/**
	 * @summary Constructs the full dialog box HTML.
	 * @param {string} charName - Character name
	 * @param {string} message - Dialog message
	 * @param {string|null} avatarUrl - Avatar URL or null
	 * @param {string} side - "left" or "right"
	 * @returns {string} Complete HTML string
	 */
	const buildDialogHtml = (charName, message, avatarUrl, side) => {
		const avatarHtml = buildAvatarHtml(avatarUrl, charName, side);
		const textAlign = side === "left" ? "text-align: left;" : "text-align: right;";

		return `<div style="background-color: ${STYLES.bgColor}; border: 2px solid ${STYLES.borderColor}; border-radius: 8px; padding: ${STYLES.boxPadding}px; margin: 5px 0; overflow: hidden;">` +
			avatarHtml +
			`<div style="${textAlign}">` +
			`<div style="color: ${STYLES.nameColor}; font-weight: bold; font-size: 14px; margin-bottom: 4px;">${charName}</div>` +
			`<div style="color: ${STYLES.messageColor}; font-size: 13px; font-style: italic;">"${message}"</div>` +
			`</div>` +
			`<div style="clear: both;"></div>` +
			`</div>`;
	};

	// ANCHOR Function: determineSide
	/**
	 * @summary Determines which side avatar should appear on.
	 * @param {string} speakerId - Current speaker's character ID or name
	 * @returns {string} "left" or "right"
	 */
	const determineSide = (speakerId) => {
		if (speakerId !== dialogState.lastSpeakerId) {
			// New speaker, flip side
			dialogState.currentSide = dialogState.currentSide === "left" ? "right" : "left";
			dialogState.lastSpeakerId = speakerId;
		}

		return dialogState.currentSide;
	};

	// !SECTION End of Inner Methods: Helpers
	// SECTION Inner Methods: Command Processing

	// ANCHOR Function: processSpeak
	/**
	 * @summary Processes the !speak command and outputs dialog.
	 * @param {Object} msg - Chat message object
	 */
	const processSpeak = (msg) => {
		// Extract message content after command
		const content = msg.content.replace(/^!speak\s*/i, "").trim();

		if (!content) {
			sendChat(moduleSettings.readableName, `/w "${msg.who}" Please provide a message: !speak Your message here`);
			return;
		}

		// Check for selected token
		if (!msg.selected || msg.selected.length === 0) {
			sendChat(moduleSettings.readableName, `/w "${msg.who}" Please select a token first.`);
			return;
		}

		// Get speaker info from selected token
		const { speakerId, charName, avatarUrl } = getSpeakerInfo(msg);

		// Determine side
		const side = determineSide(speakerId);

		// Build and send dialog
		const dialogHtml = buildDialogHtml(charName, content, avatarUrl, side);

		sendChat(charName, dialogHtml);
	};

	// !SECTION End of Inner Methods: Command Processing
	// SECTION Event Hooks: Roll20 API

	// ANCHOR Outer Method: registerEventHandlers
	const registerEventHandlers = () => {
		on("chat:message", (msg) => {
			if (msg.type !== "api") return;
			if (!msg.content.startsWith(`!${moduleSettings.chatApiName}`)) return;

			processSpeak(msg);
		});

		return 0;
	};

	// ANCHOR Event: on(ready)
	on("ready", () => {
		registerEventHandlers();
		log(`${moduleSettings.readableName} v${moduleSettings.version} ready. Use !speak [message] or !speak ?{Message|}`);
	});

	// !SECTION End of Event Hooks: Roll20 API

	return {};
})();