/*!
@language: en-US
@title: easy-calendar.js
@description: The EASY_CALENDAR module integrates with EASY_UTILS to provide calendar tracking
	for multiple campaign settings. Supports multiple suns, moons, weather, and astronomical
	calculations with configurable imagery.
@version: 1.0.0
@author: Mhykiel
@license: MIT
@repository: {@link https://github.com/tougher-together-games/roll20-api-scripts|GitHub Repository}
*/

// eslint-disable-next-line no-unused-vars
const EASY_CALENDAR = (() => {
	// SECTION Object: EASY_CALENDAR
	/**
	 * @namespace EASY_CALENDAR
	 * @summary Calendar tracking system for Roll20 supporting multiple campaign worlds.
	 *
	 * - **Purpose**:
	 *   - Track dates across multiple calendar systems (Faerun, Greyhawk, Eberron, etc.)
	 *   - Calculate and display moon phases for multiple moons
	 *   - Track sun states for multiple suns with variable day lengths
	 *   - Manage weather display with GM customization
	 *
	 * - **Execution**:
	 *   - Players/GM run !ezcalendar to view current date/time
	 *   - GM can advance time, set celestial states, manage images
	 *   - All calendars sync to a universal epoch for consistent astronomy
	 *
	 * - **Design**:
	 *   - Epoch-based date storage for easy forward/backward time travel
	 *   - Layered image system: defaults → world-specific → GM custom
	 *   - Independent sun/moon cycles with override capability
	 */

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Calendar",
		chatApiName: "ezcalendar",
		globalName: "EASY_CALENDAR",
		version: "1.0.0",
		author: "Mhykiel",
		sendWelcomeMsg: true,
		verbose: false,
		debug: {
			"onReady": false,
			"processMenuAsync": false,
			"processShowAsync": false,
			"processAdvanceDay": false,
			"processAdvanceHour": false
		}
	};

	// ANCHOR Member: Factory References
	let Utils = {};
	let PhraseFactory = {};

	// ANCHOR Member: Vault Reference
	let EasyCalendarVault = {};

	// SECTION Constants: Default Images
	// ANCHOR Constant: IMAGE_BASE_PATH
	const IMAGE_BASE_PATH = "https://raw.githubusercontent.com/tougher-together-games/roll20-api-scripts/refs/heads/main/src/easy-calendar/images";

	// ANCHOR Constant: DEFAULT_IMAGES
	const DEFAULT_IMAGES = {
		moon: {
			"new":             { url: `${IMAGE_BASE_PATH}/moon/new-moon.jpg`, label: "New Moon" },
			"waxing-crescent": { url: `${IMAGE_BASE_PATH}/moon/waxing-crescent.jpg`, label: "Waxing Crescent" },
			"first-quarter":   { url: `${IMAGE_BASE_PATH}/moon/first-quarter.jpg`, label: "First Quarter" },
			"waxing-gibbous":  { url: `${IMAGE_BASE_PATH}/moon/waxing-gibbous.jpg`, label: "Waxing Gibbous" },
			"full":            { url: `${IMAGE_BASE_PATH}/moon/full-moon.jpg`, label: "Full Moon" },
			"waning-gibbous":  { url: `${IMAGE_BASE_PATH}/moon/waning-gibbous.jpg`, label: "Waning Gibbous" },
			"last-quarter":    { url: `${IMAGE_BASE_PATH}/moon/last-quarter.jpg`, label: "Last Quarter" },
			"waning-crescent": { url: `${IMAGE_BASE_PATH}/moon/waning-crescent.jpg`, label: "Waning Crescent" }
		},
		sun: {
			"night": { url: `${IMAGE_BASE_PATH}/sun/night.jpg`, label: "Night" },
			"dawn":  { url: `${IMAGE_BASE_PATH}/sun/dawn.jpg`, label: "Dawn" },
			"day":   { url: `${IMAGE_BASE_PATH}/sun/day.jpg`, label: "Day" },
			"dusk":  { url: `${IMAGE_BASE_PATH}/sun/dusk.jpg`, label: "Dusk" }
		},
		weather: {
			"clear":      { url: `${IMAGE_BASE_PATH}/weather/clear.jpg`, label: "Clear" },
			"cloudy":     { url: `${IMAGE_BASE_PATH}/weather/cloudy.jpg`, label: "Cloudy" },
			"overcast":   { url: `${IMAGE_BASE_PATH}/weather/overcast.jpg`, label: "Overcast" },
			"rain":       { url: `${IMAGE_BASE_PATH}/weather/rain.jpg`, label: "Rain" },
			"heavy-rain": { url: `${IMAGE_BASE_PATH}/weather/heavy-rain.jpg`, label: "Heavy Rain" },
			"storm":      { url: `${IMAGE_BASE_PATH}/weather/storm.jpg`, label: "Thunderstorm" },
			"snow":       { url: `${IMAGE_BASE_PATH}/weather/snow.jpg`, label: "Snow" },
			"blizzard":   { url: `${IMAGE_BASE_PATH}/weather/blizzard.jpg`, label: "Blizzard" },
			"fog":        { url: `${IMAGE_BASE_PATH}/weather/fog.jpg`, label: "Fog" }
		}
	};

	// !SECTION End of Constants: Default Images
	// SECTION Constants: World Configurations

	// ANCHOR Constant: WORLD_CONFIGS
	const WORLD_CONFIGS = {
		// NOTE: Modern (Gregorian) Calendar
		modern: {
			id: "modern",
			name: "Modern (Gregorian)",
			hoursInDay: 24,
			epochOffset: 0,

			suns: [
				{ id: "sun", name: "The Sun", riseHour: 6, setHour: 18 }
			],

			moons: [
				{ id: "luna", name: "Luna", cycle: 29.53059, offset: 0 }
			],

			months: [
				{ name: "January", days: 31 },
				{ name: "February", days: 28, leapDays: 29 },
				{ name: "March", days: 31 },
				{ name: "April", days: 30 },
				{ name: "May", days: 31 },
				{ name: "June", days: 30 },
				{ name: "July", days: 31 },
				{ name: "August", days: 31 },
				{ name: "September", days: 30 },
				{ name: "October", days: 31 },
				{ name: "November", days: 30 },
				{ name: "December", days: 31 }
			],

			leapYear: (y) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)
		},

		// NOTE: Forgotten Realms (Harptos) Calendar
		faerun: {
			id: "faerun",
			name: "Forgotten Realms (Harptos)",
			hoursInDay: 24,
			epochOffset: -540,  // DR 1486 = Modern 2026

			suns: [
				{ id: "sun", name: "The Sun", riseHour: 6, setHour: 18 }
			],

			moons: [
				{ id: "selune", name: "Selûne", cycle: 30.4375, offset: 0 }
			],

			months: [
				{ name: "Hammer", days: 30 },
				{ name: "Midwinter", days: 1, festival: true },
				{ name: "Alturiak", days: 30 },
				{ name: "Ches", days: 30 },
				{ name: "Tarsakh", days: 30 },
				{ name: "Greengrass", days: 1, festival: true },
				{ name: "Mirtul", days: 30 },
				{ name: "Kythorn", days: 30 },
				{ name: "Flamerule", days: 30 },
				{ name: "Midsummer", days: 1, festival: true },
				{ name: "Shieldmeet", days: 1, festival: true, leapOnly: true },
				{ name: "Eleasis", days: 30 },
				{ name: "Eleint", days: 30 },
				{ name: "Highharvestide", days: 1, festival: true },
				{ name: "Marpenoth", days: 30 },
				{ name: "Uktar", days: 30 },
				{ name: "Feast of the Moon", days: 1, festival: true },
				{ name: "Nightal", days: 30 }
			],

			leapYear: (y) => y % 4 === 0
		},

		// NOTE: Greyhawk (Common Year) Calendar
		greyhawk: {
			id: "greyhawk",
			name: "Greyhawk (Common Year)",
			hoursInDay: 24,
			epochOffset: -1428,  // CY 598 = Modern 2026

			suns: [
				{ id: "sun", name: "The Sun", riseHour: 6, setHour: 18 }
			],

			moons: [
				{ id: "luna", name: "Luna", cycle: 28, offset: 0 },
				{ id: "celene", name: "Celene", cycle: 91, offset: 45 }
			],

			months: [
				{ name: "Needfest", days: 7, festival: true },
				{ name: "Fireseek", days: 28 },
				{ name: "Readying", days: 28 },
				{ name: "Coldeven", days: 28 },
				{ name: "Growfest", days: 7, festival: true },
				{ name: "Planting", days: 28 },
				{ name: "Flocktime", days: 28 },
				{ name: "Wealsun", days: 28 },
				{ name: "Richfest", days: 7, festival: true },
				{ name: "Reaping", days: 28 },
				{ name: "Goodmonth", days: 28 },
				{ name: "Harvester", days: 28 },
				{ name: "Brewfest", days: 7, festival: true },
				{ name: "Patchwall", days: 28 },
				{ name: "Ready'reat", days: 28 },
				{ name: "Sunsebb", days: 28 }
			],

			leapYear: () => false
		},

		// NOTE: Eberron (Year of the Kingdom) Calendar
		eberron: {
			id: "eberron",
			name: "Eberron (Year of the Kingdom)",
			hoursInDay: 24,
			epochOffset: -1028,  // YK 998 = Modern 2026

			suns: [
				{ id: "sun", name: "The Sun", riseHour: 6, setHour: 18 }
			],

			moons: [
				{ id: "zarantyr", name: "Zarantyr", cycle: 28, offset: 0 },
				{ id: "olarune", name: "Olarune", cycle: 28, offset: 2 },
				{ id: "therendor", name: "Therendor", cycle: 28, offset: 5 },
				{ id: "eyre", name: "Eyre", cycle: 28, offset: 7 },
				{ id: "dravago", name: "Dravago", cycle: 28, offset: 10 },
				{ id: "nymm", name: "Nymm", cycle: 28, offset: 12 },
				{ id: "lharvion", name: "Lharvion", cycle: 28, offset: 14 },
				{ id: "barrakas", name: "Barrakas", cycle: 28, offset: 17 },
				{ id: "rhaan", name: "Rhaan", cycle: 28, offset: 19 },
				{ id: "sypheros", name: "Sypheros", cycle: 28, offset: 21 },
				{ id: "aryth", name: "Aryth", cycle: 28, offset: 24 },
				{ id: "vult", name: "Vult", cycle: 28, offset: 26 }
			],

			months: [
				{ name: "Zarantyr", days: 28 },
				{ name: "Olarune", days: 28 },
				{ name: "Therendor", days: 28 },
				{ name: "Eyre", days: 28 },
				{ name: "Dravago", days: 28 },
				{ name: "Nymm", days: 28 },
				{ name: "Lharvion", days: 28 },
				{ name: "Barrakas", days: 28 },
				{ name: "Rhaan", days: 28 },
				{ name: "Sypheros", days: 28 },
				{ name: "Aryth", days: 28 },
				{ name: "Vult", days: 28 }
			],

			leapYear: () => false
		},

		// NOTE: Tal'Dorei (Post-Divergence) Calendar
		taldorei: {
			id: "taldorei",
			name: "Tal'Dorei (Post-Divergence)",
			hoursInDay: 24,
			epochOffset: -1210,  // PD 836 = Modern 2026 (approximate)

			suns: [
				{ id: "sun", name: "The Sun", riseHour: 6, setHour: 18 }
			],

			moons: [
				{ id: "catha", name: "Catha", cycle: 33, offset: 0 },
				{ id: "ruidus", name: "Ruidus", cycle: 328, offset: 0 }
			],

			months: [
				{ name: "Horisal", days: 29 },
				{ name: "Misuthar", days: 30 },
				{ name: "Dualahei", days: 30 },
				{ name: "Thunsheer", days: 31 },
				{ name: "Unndilar", days: 28 },
				{ name: "Brussendar", days: 31 },
				{ name: "Sydenstar", days: 32 },
				{ name: "Fessuran", days: 29 },
				{ name: "Quen'pillar", days: 27 },
				{ name: "Cuersaar", days: 29 },
				{ name: "Duscar", days: 32 }
			],

			leapYear: () => false
		},

		// NOTE: Dark Sun (Athas) Calendar - Example multi-sun world
		athas: {
			id: "athas",
			name: "Dark Sun (Athas)",
			hoursInDay: 30,  // Longer days

			suns: [
				{ id: "ral", name: "Ral", riseHour: 5, setHour: 20 },
				{ id: "guthay", name: "Guthay", riseHour: 7, setHour: 18 }
			],

			moons: [
				{ id: "ral-moon", name: "Ral", cycle: 34, offset: 0 },
				{ id: "guthay-moon", name: "Guthay", cycle: 125, offset: 60 }
			],

			months: [
				{ name: "Scorch", days: 30 },
				{ name: "Morrow", days: 30 },
				{ name: "Rest", days: 30 },
				{ name: "Gather", days: 30 },
				{ name: "Cooling Sun", days: 30 },
				{ name: "Breeze", days: 30 },
				{ name: "Mist", days: 30 },
				{ name: "Bloom", days: 30 },
				{ name: "Haze", days: 30 },
				{ name: "Hoard", days: 30 },
				{ name: "Wind", days: 30 },
				{ name: "Sorrow", days: 30 }
			],

			leapYear: () => false,
			epochOffset: -1726  // Year 190 (Free Year) = Modern 2026
		}
	};

	// ANCHOR Constant: PHASE_NAMES
	const PHASE_NAMES = [
		"new", "waxing-crescent", "first-quarter", "waxing-gibbous",
		"full", "waning-gibbous", "last-quarter", "waning-crescent"
	];

	// !SECTION End of Constants: World Configurations
	// SECTION Inner Methods: Core Calculations

	// ANCHOR Function: getWorldConfig
	/**
	 * @summary Retrieves world configuration by ID.
	 * @param {string} worldId - World identifier
	 * @returns {Object} World configuration object
	 */
	const getWorldConfig = (worldId) => {
		return WORLD_CONFIGS[worldId] || WORLD_CONFIGS.modern;
	};

	// ANCHOR Function: getDaysInYear
	/**
	 * @summary Calculates total days in a year for a given world.
	 * @param {string} worldId - World identifier
	 * @param {number} year - Year to calculate
	 * @returns {number} Total days in that year
	 */
	const getDaysInYear = (worldId, year) => {
		const config = getWorldConfig(worldId);
		const isLeap = config.leapYear(year);

		return config.months.reduce((total, month) => {
			if (month.leapOnly && !isLeap) return total;
			return total + (isLeap && month.leapDays ? month.leapDays : month.days);
		}, 0);
	};

	// ANCHOR Function: epochDayToDate
	/**
	 * @summary Converts epoch day to a date in the specified world's calendar.
	 * @param {number} epochDay - Days since universal epoch
	 * @param {string} worldId - World identifier
	 * @returns {Object} Date object with year, monthIndex, monthName, day, isFestival
	 */
	const epochDayToDate = (epochDay, worldId) => {
		const config = getWorldConfig(worldId);
		const offset = config.epochOffset;

		let remainingDays = epochDay;
		let year = 1 - offset;

		// NOTE: Find year by counting days
		if (remainingDays >= 0) {
			while (remainingDays >= getDaysInYear(worldId, year)) {
				remainingDays -= getDaysInYear(worldId, year);
				year++;
			}
		} else {
			while (remainingDays < 0) {
				year--;
				remainingDays += getDaysInYear(worldId, year);
			}
		}

		// NOTE: Find month and day
		const isLeap = config.leapYear(year);
		let monthIndex = 0;

		for (let i = 0; i < config.months.length; i++) {
			const month = config.months[i];
			if (month.leapOnly && !isLeap) continue;

			const daysInMonth = (isLeap && month.leapDays) ? month.leapDays : month.days;

			if (remainingDays < daysInMonth) {
				monthIndex = i;
				break;
			}

			remainingDays -= daysInMonth;
			monthIndex = i + 1;
		}

		// NOTE: Handle edge case where monthIndex exceeds array
		if (monthIndex >= config.months.length) {
			monthIndex = config.months.length - 1;
		}

		const currentMonth = config.months[monthIndex];

		return {
			year,
			monthIndex,
			monthName: currentMonth.name,
			day: remainingDays + 1,
			isFestival: currentMonth.festival || false
		};
	};

	// ANCHOR Function: dateToEpochDay
	/**
	 * @summary Converts a date to epoch day.
	 * @param {number} year - Year
	 * @param {number} monthIndex - Month index (0-based)
	 * @param {number} day - Day of month (1-based)
	 * @param {string} worldId - World identifier
	 * @returns {number} Epoch day
	 */
	const dateToEpochDay = (year, monthIndex, day, worldId) => {
		const config = getWorldConfig(worldId);
		const offset = config.epochOffset;

		let epochDay = 0;
		const startYear = 1 - offset;

		// NOTE: Add days for complete years
		if (year >= startYear) {
			for (let y = startYear; y < year; y++) {
				epochDay += getDaysInYear(worldId, y);
			}
		} else {
			for (let y = year; y < startYear; y++) {
				epochDay -= getDaysInYear(worldId, y);
			}
		}

		// NOTE: Add days for complete months
		const isLeap = config.leapYear(year);
		for (let m = 0; m < monthIndex; m++) {
			const month = config.months[m];
			if (month.leapOnly && !isLeap) continue;
			epochDay += (isLeap && month.leapDays) ? month.leapDays : month.days;
		}

		// NOTE: Add remaining days (day is 1-based)
		epochDay += day - 1;

		return epochDay;
	};

	// ANCHOR Function: getMoonPhase
	/**
	 * @summary Calculates moon phase for a given epoch day.
	 * @param {number} epochDay - Days since universal epoch
	 * @param {Object} moon - Moon configuration object
	 * @returns {Object} Phase info with phase (0-1), phaseIndex (0-7), phaseName
	 */
	const getMoonPhase = (epochDay, moon) => {
		const daysSinceOffset = epochDay - moon.offset;
		const cyclePosition = ((daysSinceOffset % moon.cycle) + moon.cycle) % moon.cycle;
		const phase = cyclePosition / moon.cycle;

		const phaseIndex = Math.floor(phase * 8) % 8;

		return {
			phase,
			phaseIndex,
			phaseName: PHASE_NAMES[phaseIndex]
		};
	};

	// ANCHOR Function: getSunState
	/**
	 * @summary Calculates sun state based on hour of day.
	 * @param {number} hourOfDay - Current hour
	 * @param {Object} sun - Sun configuration object
	 * @param {number} hoursInDay - Total hours in the world's day
	 * @returns {string} Sun state: "night", "dawn", "day", or "dusk"
	 */
	const getSunState = (hourOfDay, sun) => {
		const { riseHour, setHour } = sun;

		const dawnStart = riseHour - 1;
		const dawnEnd = riseHour;
		const duskStart = setHour;
		const duskEnd = setHour + 1;

		if (hourOfDay < dawnStart || hourOfDay >= duskEnd) {
			return "night";
		} else if (hourOfDay >= dawnStart && hourOfDay < dawnEnd) {
			return "dawn";
		} else if (hourOfDay >= duskStart && hourOfDay < duskEnd) {
			return "dusk";
		} else {
			return "day";
		}
	};

	// ANCHOR Function: getHourDescription
	/**
	 * @summary Gets descriptive label for time of day.
	 * @param {number} hourOfDay - Current hour
	 * @param {number} hoursInDay - Total hours in the world's day
	 * @returns {string} Descriptive time label
	 */
	const getHourDescription = (hourOfDay, hoursInDay) => {
		const ratio = hourOfDay / hoursInDay;

		if (ratio < 0.125) return "Late Night";
		if (ratio < 0.25) return "Early Morning";
		if (ratio < 0.375) return "Morning";
		if (ratio < 0.5) return "Late Morning";
		if (ratio < 0.625) return "Afternoon";
		if (ratio < 0.75) return "Late Afternoon";
		if (ratio < 0.875) return "Evening";
		return "Night";
	};

	// ANCHOR Function: getDaySuffix
	/**
	 * @summary Gets ordinal suffix for a day number.
	 * @param {number} day - Day of month
	 * @returns {string} Ordinal suffix (st, nd, rd, th)
	 */
	const getDaySuffix = (day) => {
		if (day >= 11 && day <= 13) return "th";
		switch (day % 10) {
			case 1: return "st";
			case 2: return "nd";
			case 3: return "rd";
			default: return "th";
		}
	};

	// !SECTION End of Inner Methods: Core Calculations
	// SECTION Inner Methods: Image Resolution

	// ANCHOR Function: getImageData
	/**
	 * @summary Gets image data for a specific key, checking overrides first.
	 * @param {string} category - "moon", "sun", or "weather"
	 * @param {string} key - Image key
	 * @returns {Object|null} Image object with url and label, or null if not found
	 */
	const getImageData = (category, key) => {
		// NOTE: Check custom images first (user-added)
		const custom = EasyCalendarVault.customImages?.[category]?.[key];
		if (custom) return { ...custom, isCustom: true, isOverride: false };

		// NOTE: Check overrides (edited defaults)
		const override = EasyCalendarVault.imageOverrides?.[category]?.[key];
		if (override) return { ...override, isCustom: false, isOverride: true };

		// NOTE: Fall back to defaults
		const defaultImg = DEFAULT_IMAGES[category]?.[key];
		if (defaultImg) return { ...defaultImg, isCustom: false, isOverride: false };

		return null;
	};

	// ANCHOR Function: getAllImageKeys
	/**
	 * @summary Gets all available image keys for a category.
	 * @param {string} category - "moon", "sun", or "weather"
	 * @returns {string[]} Array of unique keys
	 */
	const getAllImageKeys = (category) => {
		const defaultKeys = Object.keys(DEFAULT_IMAGES[category] || {});
		const overrideKeys = Object.keys(EasyCalendarVault.imageOverrides?.[category] || {});
		const customKeys = Object.keys(EasyCalendarVault.customImages?.[category] || {});

		return [...new Set([...defaultKeys, ...overrideKeys, ...customKeys])];
	};

	// ANCHOR Function: getMoonImage
	/**
	 * @summary Resolves the correct image URL for a moon's current state.
	 * @param {string} moonName - Name of the moon
	 * @param {string} phaseName - Calculated phase name
	 * @returns {Object} Image object with url and label
	 */
	const getMoonImage = (moonName, phaseName) => {
		// NOTE: Check for active celestial override
		const override = EasyCalendarVault.overrides?.moon?.[moonName];
		if (override && override !== "auto") {
			const overrideImage = getImageData("moon", override);
			if (overrideImage) return overrideImage;
		}

		// NOTE: Return calculated phase image
		return getImageData("moon", phaseName) || getImageData("moon", "full");
	};

	// ANCHOR Function: getSunImage
	/**
	 * @summary Resolves the correct image URL for a sun's current state.
	 * @param {string} sunName - Name of the sun
	 * @param {string} stateName - Calculated state name
	 * @returns {Object} Image object with url and label
	 */
	const getSunImage = (sunName, stateName) => {
		// NOTE: Check for active celestial override
		const override = EasyCalendarVault.overrides?.sun?.[sunName];
		if (override && override !== "auto") {
			const overrideImage = getImageData("sun", override);
			if (overrideImage) return overrideImage;
		}

		// NOTE: Return calculated state image
		return getImageData("sun", stateName) || getImageData("sun", "day");
	};

	// ANCHOR Function: getWeatherImage
	/**
	 * @summary Resolves the correct image URL for current weather.
	 * @param {string} weatherKey - Weather condition key
	 * @returns {Object} Image object with url and label
	 */
	const getWeatherImage = (weatherKey) => {
		return getImageData("weather", weatherKey) || getImageData("weather", "clear");
	};

	// !SECTION End of Inner Methods: Image Resolution
	// SECTION Inner Methods: Menu Rendering

	// ANCHOR Constant: MENU_STYLES
	const MENU_STYLES = {
		container: "background-color: #fff; border: 1px solid #8655b6; border-radius: 5px; overflow: hidden; margin: 5px 0;",
		header: "background-color: #8655b6; color: #fff; padding: 8px 10px; font-size: 14px; font-weight: bold;",
		subheader: "font-size: 11px; font-weight: normal; opacity: 0.9;",
		body: "padding: 10px;",
		dateSection: "font-size: 16px; font-weight: bold; margin-bottom: 5px;",
		timeSection: "font-size: 12px; color: #555; margin-bottom: 10px;",
		celestialRow: "display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;",
		celestialImage: "width: 50px; height: 50px; border-radius: 5px; margin-right: 10px;",
		celestialText: "display: flex; flex-direction: column;",
		celestialName: "font-weight: bold; font-size: 13px; color: #333;",
		celestialLabel: "font-size: 11px; color: #666; margin-top: 2px;",
		buttonRow: "display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0;",
		button: "background-color: #8655b6; color: #fff; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-size: 11px; text-align: center;",
		buttonSmall: "background-color: #34627b; color: #fff; padding: 3px 8px; border-radius: 3px; text-decoration: none; font-size: 10px;",
		buttonGm: "background-color: #7E2D40; color: #fff; padding: 5px 10px; border-radius: 3px; text-decoration: none; font-size: 11px; text-align: center;",
		divider: "border-top: 1px solid #ddd; margin: 10px 0;"
	};

	// ANCHOR Function: buildCelestialRow
	/**
	 * @summary Builds HTML for a celestial body row.
	 * @param {string} name - Body name
	 * @param {string} imageUrl - Image URL
	 * @param {string} label - State/phase label
	 * @returns {string} HTML string
	 */
	const buildCelestialRow = (name, imageUrl, label) => {
		return `<div style="${MENU_STYLES.celestialRow}">`
			+ `<img src="${imageUrl}" style="${MENU_STYLES.celestialImage}" />`
			+ `<div style="${MENU_STYLES.celestialText}">`
			+ `<div style="${MENU_STYLES.celestialName}">${name}</div>`
			+ `<div style="${MENU_STYLES.celestialLabel}">${label}</div>`
			+ `</div>`
			+ `</div>`;
	};

	// ANCHOR Function: buildMenuHtml
	/**
	 * @summary Builds the main calendar menu HTML.
	 * @param {boolean} isGm - Whether caller is GM
	 * @returns {string} Complete menu HTML
	 */
	const buildMenuHtml = (isGm) => {
		const config = getWorldConfig(EasyCalendarVault.world);
		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		const hourOfDay = EasyCalendarVault.hourOfDay || 0;
		const weather = EasyCalendarVault.weather || "clear";

		// NOTE: Build date string
		const dateStr = date.isFestival
			? `${date.monthName}, ${date.year}`
			: `${date.day}${getDaySuffix(date.day)} of ${date.monthName}, ${date.year}`;

		// NOTE: Build time string
		const hourDesc = getHourDescription(hourOfDay, config.hoursInDay);
		const timeStr = `Hour ${hourOfDay} of ${config.hoursInDay} (${hourDesc})`;

		// NOTE: Build celestial rows
		let celestialHtml = "";

		// Suns
		for (const sun of config.suns) {
			const state = getSunState(hourOfDay, sun);
			const imageData = getSunImage(sun.name, state);
			celestialHtml += buildCelestialRow(sun.name, imageData.url, imageData.label);
		}

		// Moons
		for (const moon of config.moons) {
			const phaseData = getMoonPhase(EasyCalendarVault.epochDay, moon);
			const imageData = getMoonImage(moon.name, phaseData.phaseName);
			celestialHtml += buildCelestialRow(moon.name, imageData.url, imageData.label);
		}

		// Weather
		const weatherData = getWeatherImage(weather);
		celestialHtml += buildCelestialRow("Weather", weatherData.url, weatherData.label);

		// NOTE: Build time control buttons (GM only)
		let timeControlsHtml = "";
		if (isGm) {
			timeControlsHtml = `<div style="${MENU_STYLES.buttonRow}">`
				+ `<a style="${MENU_STYLES.buttonSmall}" href="!${moduleSettings.chatApiName} --advance-day -1">−1 Day</a>`
				+ `<a style="${MENU_STYLES.buttonSmall}" href="!${moduleSettings.chatApiName} --advance-day 1">+1 Day</a>`
				+ `<a style="${MENU_STYLES.buttonSmall}" href="!${moduleSettings.chatApiName} --advance-hour -1">−1 Hour</a>`
				+ `<a style="${MENU_STYLES.buttonSmall}" href="!${moduleSettings.chatApiName} --advance-hour 1">+1 Hour</a>`
				+ `</div>`;
		}

		// NOTE: Build celestial control buttons (GM only)
		let celestialControlsHtml = "";
		if (isGm) {
			// Build sun options
			const sunKeys = getAllImageKeys("sun");
			const sunOptions = sunKeys.join("|");

			// Build moon options
			const moonKeys = getAllImageKeys("moon");
			const moonOptions = moonKeys.join("|");

			// Build weather options
			const weatherKeys = getAllImageKeys("weather");
			const weatherOptions = weatherKeys.join("|");

			celestialControlsHtml = `<div style="${MENU_STYLES.buttonRow}">`;

			// Sun controls (one per sun)
			for (const sun of config.suns) {
				celestialControlsHtml += `<a style="${MENU_STYLES.buttonSmall}" href="!${moduleSettings.chatApiName} --set-sun ${sun.name}|?{State|auto|${sunOptions}}">Set ${sun.name}</a>`;
			}

			// Moon controls (one per moon)
			for (const moon of config.moons) {
				celestialControlsHtml += `<a style="${MENU_STYLES.buttonSmall}" href="!${moduleSettings.chatApiName} --set-moon ${moon.name}|?{Phase|auto|${moonOptions}}">Set ${moon.name}</a>`;
			}

			// Weather control
			celestialControlsHtml += `<a style="${MENU_STYLES.buttonSmall}" href="!${moduleSettings.chatApiName} --set-weather ?{Weather|${weatherOptions}}">Set Weather</a>`;

			celestialControlsHtml += `</div>`;
		}

		// NOTE: Build action buttons
		let actionsHtml = `<div style="${MENU_STYLES.divider}"></div>`
			+ `<div style="${MENU_STYLES.buttonRow}">`
			+ `<a style="${MENU_STYLES.button}" href="!${moduleSettings.chatApiName} --log">Log Day</a>`
			+ `<a style="${MENU_STYLES.button}" href="!${moduleSettings.chatApiName} --calendar">Open Calendar</a>`
			+ `</div>`;

		// NOTE: Build GM-only buttons
		let gmButtonsHtml = "";
		if (isGm) {
			gmButtonsHtml = `<div style="${MENU_STYLES.divider}"></div>`
				+ `<div style="${MENU_STYLES.buttonRow}">`
				+ `<a style="${MENU_STYLES.buttonGm}" href="!${moduleSettings.chatApiName} --show">Show to Players</a>`
				+ `<a style="${MENU_STYLES.buttonGm}" href="!${moduleSettings.chatApiName} --settings">⚙ Settings</a>`
				+ `</div>`;
		}

		// NOTE: Assemble complete menu
		return `<div style="${MENU_STYLES.container}">`
			+ `<div style="${MENU_STYLES.header}">Easy Calendar<br><span style="${MENU_STYLES.subheader}">${config.name}</span></div>`
			+ `<div style="${MENU_STYLES.body}">`
			+ `<div style="${MENU_STYLES.dateSection}">${dateStr}</div>`
			+ `<div style="${MENU_STYLES.timeSection}">${timeStr}</div>`
			+ celestialHtml
			+ timeControlsHtml
			+ celestialControlsHtml
			+ actionsHtml
			+ gmButtonsHtml
			+ `</div>`
			+ `</div>`;
	};

	// ANCHOR Function: buildSettingsHtml
	/**
	 * @summary Builds the settings menu HTML.
	 * @returns {string} Complete settings menu HTML
	 */
	const buildSettingsHtml = () => {
		const config = getWorldConfig(EasyCalendarVault.world);
		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		const hourOfDay = EasyCalendarVault.hourOfDay || 0;

		// NOTE: Build world options
		const worldOptions = Object.keys(WORLD_CONFIGS).join("|");

		// NOTE: Build month options for current world
		const monthOptions = config.months
			.filter(m => !m.leapOnly || config.leapYear(date.year))
			.map(m => m.name)
			.join("|");

		// NOTE: Build hour options
		const hourOptions = Array.from({ length: config.hoursInDay }, (_, i) => i).join("|");

		return `<div style="${MENU_STYLES.container}">`
			+ `<div style="${MENU_STYLES.header}">⚙ Calendar Settings</div>`
			+ `<div style="${MENU_STYLES.body}">`
			+ `<div style="${MENU_STYLES.buttonRow}">`
			+ `<span style="min-width: 60px;">World:</span>`
			+ `<a style="${MENU_STYLES.button}" href="!${moduleSettings.chatApiName} --set-world ?{World|${worldOptions}}">${config.name}</a>`
			+ `</div>`
			+ `<div style="${MENU_STYLES.buttonRow}">`
			+ `<span style="min-width: 60px;">Year:</span>`
			+ `<a style="${MENU_STYLES.button}" href="!${moduleSettings.chatApiName} --set-year ?{Year|${date.year}}">${date.year}</a>`
			+ `</div>`
			+ `<div style="${MENU_STYLES.buttonRow}">`
			+ `<span style="min-width: 60px;">Month:</span>`
			+ `<a style="${MENU_STYLES.button}" href="!${moduleSettings.chatApiName} --set-month ?{Month|${monthOptions}}">${date.monthName}</a>`
			+ `</div>`
			+ `<div style="${MENU_STYLES.buttonRow}">`
			+ `<span style="min-width: 60px;">Day:</span>`
			+ `<a style="${MENU_STYLES.button}" href="!${moduleSettings.chatApiName} --set-day ?{Day|${date.day}}">${date.day}</a>`
			+ `</div>`
			+ `<div style="${MENU_STYLES.buttonRow}">`
			+ `<span style="min-width: 60px;">Hour:</span>`
			+ `<a style="${MENU_STYLES.button}" href="!${moduleSettings.chatApiName} --set-hour ?{Hour|${hourOptions}}">${hourOfDay}</a>`
			+ `</div>`
			+ `<div style="${MENU_STYLES.divider}"></div>`
			+ `<div style="${MENU_STYLES.buttonRow}">`
			+ `<a style="${MENU_STYLES.button}" href="!${moduleSettings.chatApiName} --images">Manage Images</a>`
			+ `</div>`
			+ `<div style="${MENU_STYLES.divider}"></div>`
			+ `<div style="${MENU_STYLES.buttonRow}">`
			+ `<a style="${MENU_STYLES.buttonGm}" href="!${moduleSettings.chatApiName} --menu">← Back to Main</a>`
			+ `</div>`
			+ `</div>`
			+ `</div>`;
	};

	// ANCHOR Function: buildImagesHtml
	/**
	 * @summary Builds the image management menu HTML.
	 * @returns {string} Complete image management menu HTML
	 */
	const buildImagesHtml = () => {
		// NOTE: Table styles matching Easy-Combat pattern
		const tableStyles = {
			table: "width: 100%; border-collapse: collapse; font-size: 11px;",
			th: "text-align: left; padding: 3px 4px; border-bottom: 2px solid #8655b6; font-size: 10px; color: #666;",
			thCenter: "text-align: center; padding: 3px 4px; border-bottom: 2px solid #8655b6; font-size: 10px; color: #666;",
			tr: "border-bottom: 1px solid #eee;",
			td: "padding: 4px; vertical-align: middle;",
			tdIcon: "padding: 4px; width: 30px; text-align: center;",
			tdName: "padding: 4px;",
			tdAction: "padding: 4px; width: 40px; text-align: center;",
			btn: "display: inline-block; padding: 2px 6px; border-radius: 3px; text-decoration: none; font-size: 9px; color: #fff; background-color: #34627b;",
			addBtn: "display: inline-block; padding: 3px 8px; border-radius: 3px; text-decoration: none; font-size: 10px; color: #fff; background-color: #4a4; margin-top: 5px;",
			sectionRow: "background-color: #f0f0f0; font-weight: bold; font-size: 10px; color: #666;",
			badge: "font-size: 8px; padding: 1px 3px; border-radius: 2px; margin-left: 3px; color: #fff;",
			badgeCustom: "background-color: #8655b6;",
			badgeEdited: "background-color: #34627b;"
		};

		// NOTE: Build table row for image
		const buildImageRow = (category, key) => {
			const imgData = getImageData(category, key);
			if (!imgData) return "";

			let badge = "";
			if (imgData.isCustom) {
				badge = `<span style="${tableStyles.badge} ${tableStyles.badgeCustom}">custom</span>`;
			} else if (imgData.isOverride) {
				badge = `<span style="${tableStyles.badge} ${tableStyles.badgeEdited}">edited</span>`;
			}

			return `<tr style="${tableStyles.tr}">`
				+ `<td style="${tableStyles.tdIcon}"><img src="${imgData.url}" style="width: 24px; height: 24px; border-radius: 3px;" /></td>`
				+ `<td style="${tableStyles.tdName}"><strong>${key}</strong>${badge}<br><span style="color: #666; font-size: 10px;">${imgData.label}</span></td>`
				+ `<td style="${tableStyles.tdAction}"><a style="${tableStyles.btn}" href="!${moduleSettings.chatApiName} --edit-image-menu ${category}|${key}">Edit</a></td>`
				+ `</tr>`;
		};

		// NOTE: Build section header row
		const buildSectionRow = (label) => {
			return `<tr><td colspan="3" style="${tableStyles.sectionRow} padding: 6px 4px;">${label}</td></tr>`;
		};

		// NOTE: Build section with add button
		const buildSection = (category, label) => {
			const keys = getAllImageKeys(category);
			let rows = buildSectionRow(label);
			rows += keys.map(k => buildImageRow(category, k)).join("");
			return rows;
		};

		const tableHtml = `<table style="${tableStyles.table}">`
			+ `<thead><tr>`
			+ `<th style="${tableStyles.thCenter}"></th>`
			+ `<th style="${tableStyles.th}">Image</th>`
			+ `<th style="${tableStyles.thCenter}"></th>`
			+ `</tr></thead>`
			+ `<tbody>`
			+ buildSection("moon", "Moon Images")
			+ `<tr><td colspan="3" style="padding: 4px;"><a style="${tableStyles.addBtn}" href="!${moduleSettings.chatApiName} --add-image moon|?{Key (no spaces)}|?{Image URL}|?{Label}">+ Add Moon</a></td></tr>`
			+ buildSection("sun", "Sun Images")
			+ `<tr><td colspan="3" style="padding: 4px;"><a style="${tableStyles.addBtn}" href="!${moduleSettings.chatApiName} --add-image sun|?{Key (no spaces)}|?{Image URL}|?{Label}">+ Add Sun</a></td></tr>`
			+ buildSection("weather", "Weather Images")
			+ `<tr><td colspan="3" style="padding: 4px;"><a style="${tableStyles.addBtn}" href="!${moduleSettings.chatApiName} --add-image weather|?{Key (no spaces)}|?{Image URL}|?{Label}">+ Add Weather</a></td></tr>`
			+ `</tbody></table>`;

		return `<div style="${MENU_STYLES.container}">`
			+ `<div style="${MENU_STYLES.header}">Image Management</div>`
			+ `<div style="${MENU_STYLES.body}">`
			+ tableHtml
			+ `<div style="${MENU_STYLES.divider}"></div>`
			+ `<a style="${MENU_STYLES.buttonGm}; display: block; text-align: center;" href="!${moduleSettings.chatApiName} --settings">← Back to Settings</a>`
			+ `</div>`
			+ `</div>`;
	};

	// ANCHOR Function: buildEditImageHtml
	/**
	 * @summary Builds the edit image submenu HTML.
	 * @param {string} category - Image category
	 * @param {string} key - Image key
	 * @returns {string} Complete edit image menu HTML
	 */
	const buildEditImageHtml = (category, key) => {
		const imgData = getImageData(category, key);
		if (!imgData) {
			return `<div style="${MENU_STYLES.container}">`
				+ `<div style="${MENU_STYLES.header}">Edit Image</div>`
				+ `<div style="${MENU_STYLES.body}">Image not found.</div>`
				+ `</div>`;
		}

		const defaultData = DEFAULT_IMAGES[category]?.[key];

		// NOTE: Table styles for edit actions
		const tableStyles = {
			table: "width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;",
			tr: "border-bottom: 1px solid #eee;",
			tdLabel: "padding: 6px 4px; font-weight: bold; width: 60px; vertical-align: middle;",
			tdValue: "padding: 6px 4px; vertical-align: middle; word-break: break-all;",
			tdAction: "padding: 6px 4px; width: 60px; text-align: right; vertical-align: middle;",
			btn: "display: inline-block; padding: 3px 8px; border-radius: 3px; text-decoration: none; font-size: 10px; color: #fff; background-color: #34627b;",
			btnDanger: "display: inline-block; padding: 3px 8px; border-radius: 3px; text-decoration: none; font-size: 10px; color: #fff; background-color: #7E2D40;",
			btnReset: "display: inline-block; padding: 3px 8px; border-radius: 3px; text-decoration: none; font-size: 10px; color: #fff; background-color: #666;"
		};

		// NOTE: Build preview section
		let previewHtml = `<div style="${MENU_STYLES.celestialRow}">`
			+ `<img src="${imgData.url}" style="${MENU_STYLES.celestialImage}" />`
			+ `<div style="${MENU_STYLES.celestialText}">`
			+ `<div style="${MENU_STYLES.celestialName}">${key}</div>`
			+ `<div style="${MENU_STYLES.celestialLabel}">${imgData.label}</div>`
			+ `</div>`
			+ `</div>`;

		// NOTE: Build edit table
		let tableHtml = `<table style="${tableStyles.table}">`
			+ `<tr style="${tableStyles.tr}">`
			+ `<td style="${tableStyles.tdLabel}">URL</td>`
			+ `<td style="${tableStyles.tdValue}"><span style="font-size: 9px; color: #666;">${imgData.url.substring(0, 40)}...</span></td>`
			+ `<td style="${tableStyles.tdAction}"><a style="${tableStyles.btn}" href="!${moduleSettings.chatApiName} --edit-image ${category}|${key}|?{New URL|${imgData.url}}|${imgData.label}">Edit</a></td>`
			+ `</tr>`
			+ `<tr style="${tableStyles.tr}">`
			+ `<td style="${tableStyles.tdLabel}">Label</td>`
			+ `<td style="${tableStyles.tdValue}">${imgData.label}</td>`
			+ `<td style="${tableStyles.tdAction}"><a style="${tableStyles.btn}" href="!${moduleSettings.chatApiName} --edit-image ${category}|${key}|${imgData.url}|?{New Label|${imgData.label}}">Edit</a></td>`
			+ `</tr>`;

		// NOTE: Add delete/reset row
		if (imgData.isCustom) {
			tableHtml += `<tr style="${tableStyles.tr}">`
				+ `<td style="${tableStyles.tdLabel}">Delete</td>`
				+ `<td style="${tableStyles.tdValue}"><span style="font-size: 10px; color: #888;">Remove this custom image</span></td>`
				+ `<td style="${tableStyles.tdAction}"><a style="${tableStyles.btnDanger}" href="!${moduleSettings.chatApiName} --remove-image ${category}|${key}">Delete</a></td>`
				+ `</tr>`;
		} else if (imgData.isOverride && defaultData) {
			tableHtml += `<tr style="${tableStyles.tr}">`
				+ `<td style="${tableStyles.tdLabel}">Reset</td>`
				+ `<td style="${tableStyles.tdValue}"><span style="font-size: 10px; color: #888;">Restore to: ${defaultData.label}</span></td>`
				+ `<td style="${tableStyles.tdAction}"><a style="${tableStyles.btnReset}" href="!${moduleSettings.chatApiName} --reset-image ${category}|${key}">Reset</a></td>`
				+ `</tr>`;
		}

		tableHtml += `</table>`;

		return `<div style="${MENU_STYLES.container}">`
			+ `<div style="${MENU_STYLES.header}">Edit Image</div>`
			+ `<div style="${MENU_STYLES.body}">`
			+ previewHtml
			+ tableHtml
			+ `<div style="${MENU_STYLES.divider}"></div>`
			+ `<a style="${MENU_STYLES.buttonGm}; display: block; text-align: center;" href="!${moduleSettings.chatApiName} --images">← Back to Images</a>`
			+ `</div>`
			+ `</div>`;
	};

	// !SECTION End of Inner Methods: Menu Rendering
	// SECTION Inner Methods: Action Processors

	// ANCHOR Function: processMenuAsync
	/**
	 * @summary Displays the main calendar menu.
	 * @param {Object} msgDetails - Parsed message details
	 * @returns {number} 0 on success
	 */
	const processMenuAsync = (msgDetails) => {
		const menuHtml = buildMenuHtml(msgDetails.isGm);

		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			message: menuHtml
		});

		return 0;
	};

	// ANCHOR Function: processShowAsync
	/**
	 * @summary Shows calendar to all players in chat.
	 * @param {Object} msgDetails - Parsed message details
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processShowAsync = (msgDetails) => {
		if (!msgDetails.isGm) {
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: "Only the GM can show the calendar to all players."
			});
			return 1;
		}

		const menuHtml = buildMenuHtml(false);
		sendChat(moduleSettings.readableName, menuHtml);

		return 0;
	};

	// ANCHOR Function: processSettingsAsync
	/**
	 * @summary Displays the settings menu.
	 * @param {Object} msgDetails - Parsed message details
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processSettingsAsync = (msgDetails) => {
		if (!msgDetails.isGm) {
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: "Only the GM can access settings."
			});
			return 1;
		}

		const settingsHtml = buildSettingsHtml();

		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			message: settingsHtml
		});

		return 0;
	};

	// ANCHOR Function: processImagesAsync
	/**
	 * @summary Displays the image management menu.
	 * @param {Object} msgDetails - Parsed message details
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processImagesAsync = (msgDetails) => {
		if (!msgDetails.isGm) {
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: "Only the GM can manage images."
			});
			return 1;
		}

		const imagesHtml = buildImagesHtml();

		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			message: imagesHtml
		});

		return 0;
	};

	// ANCHOR Function: processAdvanceDay
	/**
	 * @summary Advances the calendar by a number of days.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processAdvanceDay = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) {
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: "Only the GM can advance time."
			});
			return 1;
		}

		// NOTE: Get days from first argument key
		const days = parseInt(Object.keys(parsedArgs)[0], 10) || 0;
		EasyCalendarVault.epochDay += days;

		// NOTE: Show updated menu
		return processMenuAsync(msgDetails);
	};

	// ANCHOR Function: processAdvanceHour
	/**
	 * @summary Advances the calendar by a number of hours.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processAdvanceHour = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) {
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: "Only the GM can advance time."
			});
			return 1;
		}

		const config = getWorldConfig(EasyCalendarVault.world);
		const hours = parseInt(Object.keys(parsedArgs)[0], 10) || 0;

		let newHour = (EasyCalendarVault.hourOfDay || 0) + hours;

		// NOTE: Handle day rollover
		while (newHour >= config.hoursInDay) {
			newHour -= config.hoursInDay;
			EasyCalendarVault.epochDay++;
		}
		while (newHour < 0) {
			newHour += config.hoursInDay;
			EasyCalendarVault.epochDay--;
		}

		EasyCalendarVault.hourOfDay = newHour;

		// NOTE: Show updated menu
		return processMenuAsync(msgDetails);
	};

	// ANCHOR Function: processSetWorld
	/**
	 * @summary Sets the active world/calendar system.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processSetWorld = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) {
			Utils.whisperPlayerMessage({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				message: "Only the GM can change settings."
			});
			return 1;
		}

		const worldId = Object.keys(parsedArgs)[0];
		if (WORLD_CONFIGS[worldId]) {
			EasyCalendarVault.world = worldId;
		}

		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processSetYear
	/**
	 * @summary Sets the current year.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processSetYear = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		const year = parseInt(Object.keys(parsedArgs)[0], 10);
		if (isNaN(year)) return 1;

		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		EasyCalendarVault.epochDay = dateToEpochDay(year, date.monthIndex, date.day, EasyCalendarVault.world);

		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processSetMonth
	/**
	 * @summary Sets the current month.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processSetMonth = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		const monthName = Object.keys(parsedArgs)[0];
		const config = getWorldConfig(EasyCalendarVault.world);
		const monthIndex = config.months.findIndex(m => m.name === monthName);

		if (monthIndex === -1) return 1;

		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		const targetMonth = config.months[monthIndex];
		const maxDay = targetMonth.leapDays && config.leapYear(date.year) ? targetMonth.leapDays : targetMonth.days;
		const newDay = Math.min(date.day, maxDay);

		EasyCalendarVault.epochDay = dateToEpochDay(date.year, monthIndex, newDay, EasyCalendarVault.world);

		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processSetDay
	/**
	 * @summary Sets the current day.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processSetDay = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		const day = parseInt(Object.keys(parsedArgs)[0], 10);
		if (isNaN(day) || day < 1) return 1;

		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		EasyCalendarVault.epochDay = dateToEpochDay(date.year, date.monthIndex, day, EasyCalendarVault.world);

		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processSetHour
	/**
	 * @summary Sets the current hour.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processSetHour = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		const hour = parseInt(Object.keys(parsedArgs)[0], 10);
		const config = getWorldConfig(EasyCalendarVault.world);

		if (isNaN(hour) || hour < 0 || hour >= config.hoursInDay) return 1;

		EasyCalendarVault.hourOfDay = hour;

		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processSetSun
	/**
	 * @summary Sets a sun's display state override.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments (from pipe-delimited content)
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processSetSun = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		// NOTE: Parse "SunName|state" from raw content
		const content = msgDetails.raw.content;
		const match = content.match(/--set-sun\s+(.+)\|(.+)/i);
		if (!match) return 1;

		const sunName = match[1].trim();
		const state = match[2].trim();

		if (!EasyCalendarVault.overrides) EasyCalendarVault.overrides = {};
		if (!EasyCalendarVault.overrides.sun) EasyCalendarVault.overrides.sun = {};

		if (state === "auto") {
			delete EasyCalendarVault.overrides.sun[sunName];
		} else {
			EasyCalendarVault.overrides.sun[sunName] = state;
		}

		return processMenuAsync(msgDetails);
	};

	// ANCHOR Function: processSetMoon
	/**
	 * @summary Sets a moon's display state override.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processSetMoon = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		// NOTE: Parse "MoonName|state" from raw content
		const content = msgDetails.raw.content;
		const match = content.match(/--set-moon\s+(.+)\|(.+)/i);
		if (!match) return 1;

		const moonName = match[1].trim();
		const state = match[2].trim();

		if (!EasyCalendarVault.overrides) EasyCalendarVault.overrides = {};
		if (!EasyCalendarVault.overrides.moon) EasyCalendarVault.overrides.moon = {};

		if (state === "auto") {
			delete EasyCalendarVault.overrides.moon[moonName];
		} else {
			EasyCalendarVault.overrides.moon[moonName] = state;
		}

		return processMenuAsync(msgDetails);
	};

	// ANCHOR Function: processSetWeather
	/**
	 * @summary Sets the current weather.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processSetWeather = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		const weather = Object.keys(parsedArgs)[0];
		if (weather) {
			EasyCalendarVault.weather = weather;
		}

		return processMenuAsync(msgDetails);
	};

	// ANCHOR Function: processEditImageMenu
	/**
	 * @summary Displays the edit image submenu.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processEditImageMenu = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		// NOTE: Parse "category|key" from raw content
		const content = msgDetails.raw.content;
		const match = content.match(/--edit-image-menu\s+(\w+)\|(.+)/i);
		if (!match) return 1;

		const category = match[1].trim();
		const key = match[2].trim();

		const editHtml = buildEditImageHtml(category, key);

		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			message: editHtml
		});

		return 0;
	};

	// ANCHOR Function: processAddImage
	/**
	 * @summary Adds a custom image.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processAddImage = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		// NOTE: Parse "category|key|url|label" from raw content
		const content = msgDetails.raw.content;
		const match = content.match(/--add-image\s+(\w+)\|([^|]+)\|([^|]+)\|(.+)/i);
		if (!match) return 1;

		const category = match[1].trim();
		const key = match[2].trim().toLowerCase().replace(/\s+/g, "-");
		const url = match[3].trim();
		const label = match[4].trim();

		if (!["moon", "sun", "weather"].includes(category)) return 1;

		// NOTE: Check if this key exists in defaults - if so, it's an override
		if (DEFAULT_IMAGES[category]?.[key]) {
			if (!EasyCalendarVault.imageOverrides) EasyCalendarVault.imageOverrides = {};
			if (!EasyCalendarVault.imageOverrides[category]) EasyCalendarVault.imageOverrides[category] = {};
			EasyCalendarVault.imageOverrides[category][key] = { url, label };
		} else {
			// New custom image
			if (!EasyCalendarVault.customImages) EasyCalendarVault.customImages = {};
			if (!EasyCalendarVault.customImages[category]) EasyCalendarVault.customImages[category] = {};
			EasyCalendarVault.customImages[category][key] = { url, label };
		}

		return processImagesAsync(msgDetails);
	};

	// ANCHOR Function: processEditImage
	/**
	 * @summary Edits an image (custom or default via override).
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processEditImage = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		// NOTE: Parse "category|key|url|label" from raw content
		const content = msgDetails.raw.content;
		const match = content.match(/--edit-image\s+(\w+)\|([^|]+)\|([^|]+)\|(.+)/i);
		if (!match) return 1;

		const category = match[1].trim();
		const key = match[2].trim();
		const url = match[3].trim();
		const label = match[4].trim();

		if (!["moon", "sun", "weather"].includes(category)) return 1;

		// NOTE: Check if it's a custom image
		if (EasyCalendarVault.customImages?.[category]?.[key]) {
			EasyCalendarVault.customImages[category][key] = { url, label };
		} else {
			// It's a default or already-overridden image - store as override
			if (!EasyCalendarVault.imageOverrides) EasyCalendarVault.imageOverrides = {};
			if (!EasyCalendarVault.imageOverrides[category]) EasyCalendarVault.imageOverrides[category] = {};
			EasyCalendarVault.imageOverrides[category][key] = { url, label };
		}

		return processEditImageMenu(msgDetails, parsedArgs);
	};

	// ANCHOR Function: processRemoveImage
	/**
	 * @summary Removes a custom image.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processRemoveImage = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		// NOTE: Parse "category|key" from raw content
		const content = msgDetails.raw.content;
		const match = content.match(/--remove-image\s+(\w+)\|(.+)/i);
		if (!match) return 1;

		const category = match[1].trim();
		const key = match[2].trim();

		// NOTE: Only remove custom images (not defaults or overrides)
		if (EasyCalendarVault.customImages?.[category]?.[key]) {
			delete EasyCalendarVault.customImages[category][key];
		}

		return processImagesAsync(msgDetails);
	};

	// ANCHOR Function: processResetImage
	/**
	 * @summary Resets an image override back to default.
	 * @param {Object} msgDetails - Parsed message details
	 * @param {Object} parsedArgs - Parsed arguments
	 * @returns {number} 0 on success, 1 on failure
	 */
	const processResetImage = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;

		// NOTE: Parse "category|key" from raw content
		const content = msgDetails.raw.content;
		const match = content.match(/--reset-image\s+(\w+)\|(.+)/i);
		if (!match) return 1;

		const category = match[1].trim();
		const key = match[2].trim();

		// NOTE: Remove the override to restore default
		if (EasyCalendarVault.imageOverrides?.[category]?.[key]) {
			delete EasyCalendarVault.imageOverrides[category][key];
		}

		return processImagesAsync(msgDetails);
	};

	// ANCHOR Function: processLogDay
	/**
	 * @summary Placeholder for log day feature.
	 * @param {Object} msgDetails - Parsed message details
	 * @returns {number} 0
	 */
	const processLogDay = (msgDetails) => {
		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			message: "Log Day feature coming soon!"
		});
		return 0;
	};

	// ANCHOR Function: processOpenCalendar
	/**
	 * @summary Placeholder for open calendar feature.
	 * @param {Object} msgDetails - Parsed message details
	 * @returns {number} 0
	 */
	const processOpenCalendar = (msgDetails) => {
		Utils.whisperPlayerMessage({
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			message: "Open Calendar feature coming soon!"
		});
		return 0;
	};

	// !SECTION End of Inner Methods: Action Processors
	// SECTION Event Hooks: Roll20 API

	// ANCHOR Member: actionMap
	const actionMap = {
		"--menu":            (msgDetails) => processMenuAsync(msgDetails),
		"--show":            (msgDetails) => processShowAsync(msgDetails),
		"--settings":        (msgDetails) => processSettingsAsync(msgDetails),
		"--images":          (msgDetails) => processImagesAsync(msgDetails),
		"--advance-day":     (msgDetails, parsedArgs) => processAdvanceDay(msgDetails, parsedArgs),
		"--advance-hour":    (msgDetails, parsedArgs) => processAdvanceHour(msgDetails, parsedArgs),
		"--set-world":       (msgDetails, parsedArgs) => processSetWorld(msgDetails, parsedArgs),
		"--set-year":        (msgDetails, parsedArgs) => processSetYear(msgDetails, parsedArgs),
		"--set-month":       (msgDetails, parsedArgs) => processSetMonth(msgDetails, parsedArgs),
		"--set-day":         (msgDetails, parsedArgs) => processSetDay(msgDetails, parsedArgs),
		"--set-hour":        (msgDetails, parsedArgs) => processSetHour(msgDetails, parsedArgs),
		"--set-sun":         (msgDetails, parsedArgs) => processSetSun(msgDetails, parsedArgs),
		"--set-moon":        (msgDetails, parsedArgs) => processSetMoon(msgDetails, parsedArgs),
		"--set-weather":     (msgDetails, parsedArgs) => processSetWeather(msgDetails, parsedArgs),
		"--edit-image-menu": (msgDetails, parsedArgs) => processEditImageMenu(msgDetails, parsedArgs),
		"--add-image":       (msgDetails, parsedArgs) => processAddImage(msgDetails, parsedArgs),
		"--edit-image":      (msgDetails, parsedArgs) => processEditImage(msgDetails, parsedArgs),
		"--remove-image":    (msgDetails, parsedArgs) => processRemoveImage(msgDetails, parsedArgs),
		"--reset-image":     (msgDetails, parsedArgs) => processResetImage(msgDetails, parsedArgs),
		"--log":             (msgDetails) => processLogDay(msgDetails),
		"--calendar":        (msgDetails) => processOpenCalendar(msgDetails)
	};

	// Set default action
	actionMap["--default"] = actionMap["--menu"];

	// ANCHOR Function: initializeVault
	/**
	 * @summary Initializes the vault with default values if needed.
	 */
	const initializeVault = () => {
		// NOTE: Calculate current epoch day based on today's date
		const today = new Date();
		const currentYear = today.getFullYear();
		const startOfYear = new Date(currentYear, 0, 1);
		const dayOfYear = Math.floor((today - startOfYear) / (24 * 60 * 60 * 1000)) + 1;

		// NOTE: Calculate epoch day (days since year 1)
		let epochDay = 0;
		for (let y = 1; y < currentYear; y++) {
			const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
			epochDay += isLeap ? 366 : 365;
		}
		epochDay += dayOfYear - 1;

		// NOTE: Set defaults if not present
		if (EasyCalendarVault.world === undefined) EasyCalendarVault.world = "faerun";
		if (EasyCalendarVault.epochDay === undefined) EasyCalendarVault.epochDay = epochDay;
		if (EasyCalendarVault.hourOfDay === undefined) EasyCalendarVault.hourOfDay = today.getHours();
		if (EasyCalendarVault.weather === undefined) EasyCalendarVault.weather = "clear";
		if (EasyCalendarVault.customImages === undefined) EasyCalendarVault.customImages = { moon: {}, sun: {}, weather: {} };
		if (EasyCalendarVault.imageOverrides === undefined) EasyCalendarVault.imageOverrides = { moon: {}, sun: {}, weather: {} };
		if (EasyCalendarVault.overrides === undefined) EasyCalendarVault.overrides = { moon: {}, sun: {} };
	};

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
			sharedVault.EasyCalendar = sharedVault.EasyCalendar || {};
			EasyCalendarVault = sharedVault.EasyCalendar;

			// NOTE: Initialize vault with defaults
			initializeVault();

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

	// !SECTION End of Event Hooks: Roll20 API
	// SECTION Public Methods: Exposed Interface

	return {
		// NOTE: Expose for external API integration
		getCurrentDate: () => epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world),
		getCurrentWorld: () => EasyCalendarVault.world,
		getEpochDay: () => EasyCalendarVault.epochDay
	};

	// !SECTION End of Public Methods: Exposed Interface
	// !SECTION End of Object: EASY_CALENDAR
})();