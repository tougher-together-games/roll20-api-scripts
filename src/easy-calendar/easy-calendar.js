/*!
@language: en-US
@title: easy-calendar.js
@description: The EASY_CALENDAR module integrates with EASY_UTILS to provide calendar tracking
	for multiple campaign settings. Supports multiple suns, moons, weather, and astronomical
	calculations with configurable imagery.
@version: 2.0.0
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
		version: "2.0.0",
		author: "Mhykiel",
		sendWelcomeMsg: true,
		verbose: false,
		debug: {
			"onReady": false,
			"processMenuAsync": false,
			"processShowAsync": false,
			"processAdvanceDay": false,
			"processAdvanceHour": false,
			"parseStyleBlock": false
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
			"waxing-crescent": { url: `${IMAGE_BASE_PATH}/moon/waxing-crescent-moon.jpg`, label: "Waxing Crescent" },
			"first-quarter":   { url: `${IMAGE_BASE_PATH}/moon/first-quarter-moon.jpg`, label: "First Quarter" },
			"waxing-gibbous":  { url: `${IMAGE_BASE_PATH}/moon/waxing-gibbous-moon.jpg`, label: "Waxing Gibbous" },
			"full":            { url: `${IMAGE_BASE_PATH}/moon/full-moon.jpg`, label: "Full Moon" },
			"waning-gibbous":  { url: `${IMAGE_BASE_PATH}/moon/waning-gibbous-moon.jpg`, label: "Waning Gibbous" },
			"last-quarter":    { url: `${IMAGE_BASE_PATH}/moon/last-quarter-moon.jpg`, label: "Last Quarter" },
			"waning-crescent": { url: `${IMAGE_BASE_PATH}/moon/waning-crescent-moon.jpg`, label: "Waning Crescent" }
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

	// ANCHOR Constant: DEFAULT_HANDOUT_STYLE
	const DEFAULT_HANDOUT_STYLE = `<style>
--ez-cal-header-bg: #8655b6;
--ez-cal-header-text: #ffffff;
--ez-cal-daynum-bg: #8655b6;
--ez-cal-daynum-text: #ffffff;
--ez-cal-today-bg: #7E2D40;
--ez-cal-today-text: #ffffff;
--ez-cal-holiday-bg: #ffe0b2;
--ez-cal-holiday-text: #e65100;
--ez-cal-moon-bg: #e8eaf6;
--ez-cal-moon-text: #3949ab;
--ez-cal-event-bg: #e3f2fd;
--ez-cal-event-text: #1565c0;
--ez-cal-cell-border: #dddddd;
--ez-cal-empty-bg: #fafafa;
</style>`;

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
			suns: [{ id: "sun", name: "The Sun", riseHour: 6, setHour: 18 }],
			moons: [{ id: "luna", name: "Luna", cycle: 29.53059, offset: 0 }],
			weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
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
			holidays: [
				{ monthIndex: 0, day: 1, name: "New Year's Day" },
				{ monthIndex: 9, day: 31, name: "Halloween" },
				{ monthIndex: 11, day: 25, name: "Christmas" },
				{ monthIndex: 11, day: 31, name: "New Year's Eve" }
			],
			leapYear: (y) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)
		},

		// NOTE: Forgotten Realms (Harptos) Calendar
		faerun: {
			id: "faerun",
			name: "Forgotten Realms (Harptos)",
			hoursInDay: 24,
			epochOffset: -540,
			suns: [{ id: "sun", name: "The Sun", riseHour: 6, setHour: 18 }],
			moons: [{ id: "selune", name: "Selûne", cycle: 30.4375, offset: 0 }],
			weekdays: ["First-day", "Second-day", "Third-day", "Fourth-day", "Fifth-day", "Sixth-day", "Seventh-day", "Eighth-day", "Ninth-day", "Tenth-day"],
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
			holidays: [
				{ monthName: "Midwinter", name: "Midwinter Festival" },
				{ monthName: "Greengrass", name: "Greengrass Festival" },
				{ monthName: "Midsummer", name: "Midsummer Festival" },
				{ monthName: "Shieldmeet", name: "Shieldmeet (Leap Years)" },
				{ monthName: "Highharvestide", name: "Highharvestide Festival" },
				{ monthName: "Feast of the Moon", name: "Feast of the Moon" }
			],
			leapYear: (y) => y % 4 === 0
		},

		// NOTE: Greyhawk (Common Year) Calendar
		greyhawk: {
			id: "greyhawk",
			name: "Greyhawk (Common Year)",
			hoursInDay: 24,
			epochOffset: -1428,
			suns: [{ id: "sun", name: "The Sun", riseHour: 6, setHour: 18 }],
			moons: [
				{ id: "luna", name: "Luna", cycle: 28, offset: 0 },
				{ id: "celene", name: "Celene", cycle: 91, offset: 45 }
			],
			weekdays: ["Starday", "Sunday", "Moonday", "Godsday", "Waterday", "Earthday", "Freeday"],
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
			holidays: [
				{ monthName: "Needfest", name: "Needfest (Midwinter)" },
				{ monthName: "Growfest", name: "Growfest (Spring)" },
				{ monthName: "Richfest", name: "Richfest (Midsummer)" },
				{ monthName: "Brewfest", name: "Brewfest (Autumn)" }
			],
			leapYear: () => false
		},

		// NOTE: Eberron (Year of the Kingdom) Calendar
		eberron: {
			id: "eberron",
			name: "Eberron (Year of the Kingdom)",
			hoursInDay: 24,
			epochOffset: -1028,
			suns: [{ id: "sun", name: "The Sun", riseHour: 6, setHour: 18 }],
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
			weekdays: ["Sul", "Mol", "Zol", "Wir", "Zor", "Far", "Sar"],
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
			holidays: [
				{ monthIndex: 2, day: 11, name: "The Day of Mourning" },
				{ monthIndex: 6, day: 12, name: "Thronehold Treaty Day" }
			],
			leapYear: () => false
		},

		// NOTE: Tal'Dorei (Post-Divergence) Calendar
		taldorei: {
			id: "taldorei",
			name: "Tal'Dorei (Post-Divergence)",
			hoursInDay: 24,
			epochOffset: -1210,
			suns: [{ id: "sun", name: "The Sun", riseHour: 6, setHour: 18 }],
			moons: [
				{ id: "catha", name: "Catha", cycle: 33, offset: 0 },
				{ id: "ruidus", name: "Ruidus", cycle: 328, offset: 0 }
			],
			weekdays: ["Miresen", "Grissen", "Whelsen", "Conthsen", "Folsen", "Yulisen", "Da'leysen"],
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
			holidays: [
				{ monthIndex: 0, day: 11, name: "Hillsgold" },
				{ monthIndex: 5, day: 13, name: "Zenith" }
			],
			leapYear: () => false
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
	const getWorldConfig = (worldId) => {
		return WORLD_CONFIGS[worldId] || WORLD_CONFIGS.modern;
	};

	// ANCHOR Function: getDaysInYear
	const getDaysInYear = (worldId, year) => {
		const config = getWorldConfig(worldId);
		const isLeap = config.leapYear(year);
		return config.months.reduce((total, month) => {
			if (month.leapOnly && !isLeap) return total;
			return total + (isLeap && month.leapDays ? month.leapDays : month.days);
		}, 0);
	};

	// ANCHOR Function: epochDayToDate
	const epochDayToDate = (epochDay, worldId) => {
		const config = getWorldConfig(worldId);
		const offset = config.epochOffset;
		let remainingDays = epochDay;
		let year = 1 - offset;

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
	const dateToEpochDay = (year, monthIndex, day, worldId) => {
		const config = getWorldConfig(worldId);
		const offset = config.epochOffset;
		let epochDay = 0;
		const startYear = 1 - offset;

		if (year >= startYear) {
			for (let y = startYear; y < year; y++) {
				epochDay += getDaysInYear(worldId, y);
			}
		} else {
			for (let y = year; y < startYear; y++) {
				epochDay -= getDaysInYear(worldId, y);
			}
		}

		const isLeap = config.leapYear(year);
		for (let m = 0; m < monthIndex; m++) {
			const month = config.months[m];
			if (month.leapOnly && !isLeap) continue;
			epochDay += (isLeap && month.leapDays) ? month.leapDays : month.days;
		}

		epochDay += day - 1;
		return epochDay;
	};

	// ANCHOR Function: getMoonPhase
	const getMoonPhase = (epochDay, moon) => {
		const daysSinceOffset = epochDay - moon.offset;
		const cyclePosition = ((daysSinceOffset % moon.cycle) + moon.cycle) % moon.cycle;
		const phase = cyclePosition / moon.cycle;
		const phaseIndex = Math.floor(phase * 8) % 8;
		return { phase, phaseIndex, phaseName: PHASE_NAMES[phaseIndex] };
	};

	// ANCHOR Function: getSunState
	const getSunState = (hourOfDay, sun) => {
		const { riseHour, setHour } = sun;
		const dawnStart = riseHour - 1;
		const dawnEnd = riseHour;
		const duskStart = setHour;
		const duskEnd = setHour + 1;

		if (hourOfDay < dawnStart || hourOfDay >= duskEnd) return "night";
		if (hourOfDay >= dawnStart && hourOfDay < dawnEnd) return "dawn";
		if (hourOfDay >= duskStart && hourOfDay < duskEnd) return "dusk";
		return "day";
	};

	// ANCHOR Function: getHourDescription
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
	const getImageData = (category, key) => {
		const custom = EasyCalendarVault.customImages?.[category]?.[key];
		if (custom) return { ...custom, isCustom: true, isOverride: false };

		const override = EasyCalendarVault.imageOverrides?.[category]?.[key];
		if (override) return { ...override, isCustom: false, isOverride: true };

		const defaultImg = DEFAULT_IMAGES[category]?.[key];
		if (defaultImg) return { ...defaultImg, isCustom: false, isOverride: false };

		return null;
	};

	// ANCHOR Function: getAllImageKeys
	const getAllImageKeys = (category) => {
		const defaultKeys = Object.keys(DEFAULT_IMAGES[category] || {});
		const overrideKeys = Object.keys(EasyCalendarVault.imageOverrides?.[category] || {});
		const customKeys = Object.keys(EasyCalendarVault.customImages?.[category] || {});
		return [...new Set([...defaultKeys, ...overrideKeys, ...customKeys])];
	};

	// ANCHOR Function: getMoonImage
	const getMoonImage = (moonName, phaseName) => {
		const override = EasyCalendarVault.overrides?.moon?.[moonName];
		if (override && override !== "auto") {
			const overrideImage = getImageData("moon", override);
			if (overrideImage) return overrideImage;
		}
		return getImageData("moon", phaseName) || getImageData("moon", "full");
	};

	// ANCHOR Function: getSunImage
	const getSunImage = (sunName, stateName) => {
		const override = EasyCalendarVault.overrides?.sun?.[sunName];
		if (override && override !== "auto") {
			const overrideImage = getImageData("sun", override);
			if (overrideImage) return overrideImage;
		}
		return getImageData("sun", stateName) || getImageData("sun", "day");
	};

	// ANCHOR Function: getWeatherImage
	const getWeatherImage = (weatherKey) => {
		return getImageData("weather", weatherKey) || getImageData("weather", "clear");
	};

	// ANCHOR Function: randomizeWeather
	const randomizeWeather = () => {
		const weatherKeys = getAllImageKeys("weather");
		const randomIndex = Math.floor(Math.random() * weatherKeys.length);
		EasyCalendarVault.weather = weatherKeys[randomIndex];
	};

	// ANCHOR Function: getHolidaysForDay
	const getHolidaysForDay = (epochDay, worldId) => {
		const config = getWorldConfig(worldId);
		const date = epochDayToDate(epochDay, worldId);
		const holidays = [];

		if (!config.holidays) return holidays;

		for (const holiday of config.holidays) {
			if (holiday.monthName && holiday.monthName === date.monthName) {
				holidays.push(holiday.name);
			}
			if (holiday.monthIndex !== undefined && holiday.day !== undefined) {
				if (holiday.monthIndex === date.monthIndex && holiday.day === date.day) {
					holidays.push(holiday.name);
				}
			}
		}
		return holidays;
	};

	// ANCHOR Function: getEventsForDay
	const getEventsForDay = (epochDay) => {
		return EasyCalendarVault.events[epochDay] || [];
	};

	// ANCHOR Function: addEventToDay
	const addEventToDay = (epochDay, name, time, description, addedBy) => {
		if (!EasyCalendarVault.events[epochDay]) {
			EasyCalendarVault.events[epochDay] = [];
		}
		const eventIndex = EasyCalendarVault.events[epochDay].length;
		EasyCalendarVault.events[epochDay].push({ name, time, description, addedBy });
		return eventIndex;
	};

	// ANCHOR Function: decodeHtmlEntities
	const decodeHtmlEntities = (str) => {
		if (!str) return str;
		return str
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&#58;/g, ':')
			.replace(/&#45;/g, '-')
			.replace(/<br>/g, '\n')
			.replace(/<br\/>/g, '\n')
			.replace(/<br \/>/g, '\n');
	};

	// ANCHOR Function: parseStyleBlock
	const parseStyleBlock = (gmnotes) => {
		const defaults = {
			headerBg: "#8655b6",
			headerText: "#ffffff",
			dayNumBg: "#8655b6",
			dayNumText: "#ffffff",
			todayBg: "#7E2D40",
			todayText: "#ffffff",
			holidayBg: "#ffe0b2",
			holidayText: "#e65100",
			moonBg: "#e8eaf6",
			moonText: "#3949ab",
			eventBg: "#e3f2fd",
			eventText: "#1565c0",
			cellBorder: "#dddddd",
			emptyBg: "#fafafa"
		};

		if (!gmnotes) {
			if (moduleSettings.debug.parseStyleBlock) log(`[${moduleSettings.readableName}] parseStyleBlock: gmnotes is empty`);
			return defaults;
		}

		// NOTE: Decode both URL encoding and HTML entities
		const decoded = decodeHtmlEntities(unescape(gmnotes));

		if (moduleSettings.debug.parseStyleBlock) log(`[${moduleSettings.readableName}] parseStyleBlock decoded: ${decoded.substring(0, 500)}`);

		const styleMatch = decoded.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
		if (!styleMatch) {
			if (moduleSettings.debug.parseStyleBlock) log(`[${moduleSettings.readableName}] parseStyleBlock: no <style> block found`);
			return defaults;
		}

		const styleContent = styleMatch[1];
		if (moduleSettings.debug.parseStyleBlock) log(`[${moduleSettings.readableName}] parseStyleBlock styleContent: ${styleContent}`);

		const varMap = {
			"--ez-cal-header-bg": "headerBg",
			"--ez-cal-header-text": "headerText",
			"--ez-cal-daynum-bg": "dayNumBg",
			"--ez-cal-daynum-text": "dayNumText",
			"--ez-cal-today-bg": "todayBg",
			"--ez-cal-today-text": "todayText",
			"--ez-cal-holiday-bg": "holidayBg",
			"--ez-cal-holiday-text": "holidayText",
			"--ez-cal-moon-bg": "moonBg",
			"--ez-cal-moon-text": "moonText",
			"--ez-cal-event-bg": "eventBg",
			"--ez-cal-event-text": "eventText",
			"--ez-cal-cell-border": "cellBorder",
			"--ez-cal-empty-bg": "emptyBg"
		};

		for (const [cssVar, key] of Object.entries(varMap)) {
			const regex = new RegExp(`${cssVar}\\s*:\\s*([^;\\n]+)`, "i");
			const match = styleContent.match(regex);
			if (match && match[1]) {
				let colorValue = match[1].trim();
				// NOTE: Strip alpha channel from 8-char hex colors (Roll20 doesn't support them)
				if (/^#[0-9a-fA-F]{8}$/.test(colorValue)) {
					colorValue = colorValue.substring(0, 7);
				}
				defaults[key] = colorValue;
				if (moduleSettings.debug.parseStyleBlock) log(`[${moduleSettings.readableName}] parseStyleBlock found ${cssVar}: ${defaults[key]}`);
			}
		}

		return defaults;
	};

	// !SECTION End of Inner Methods: Image Resolution
	// SECTION Inner Methods: Handout Management

	// ANCHOR Function: findOrCreateHandout
	const findOrCreateHandout = (name, playerId, isPlayerJournal) => {
		let handout = findObjs({ type: "handout", name: name })[0];
		if (!handout) {
			if (isPlayerJournal) {
				handout = createObj("handout", {
					name: name,
					inplayerjournals: playerId,
					controlledby: playerId
				});
			} else {
				handout = createObj("handout", {
					name: name,
					inplayerjournals: "all",
					controlledby: ""
				});
			}
		}
		return handout;
	};

	// ANCHOR Function: buildCalendarGridHtml
	const buildCalendarGridHtml = (year, monthIndex, worldId, colors) => {
		const config = getWorldConfig(worldId);
		const month = config.months[monthIndex];
		const isLeap = config.leapYear(year);
		const daysInMonth = (isLeap && month.leapDays) ? month.leapDays : month.days;
		const weekdays = config.weekdays || ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
		const numCols = weekdays.length;

		const styles = {
			table: "width: 100%; border-collapse: collapse; table-layout: fixed;",
			th: `background-color: ${colors.headerBg}; color: ${colors.headerText}; padding: 8px; text-align: center; border: 1px solid ${colors.cellBorder}; font-size: 12px;`,
			td: `border: 1px solid ${colors.cellBorder}; padding: 5px; vertical-align: top; height: 80px; font-size: 11px;`,
			dayNum: `display: inline-block; background-color: ${colors.dayNumBg}; color: ${colors.dayNumText}; padding: 2px 6px; border-radius: 3px; font-size: 11px; cursor: pointer; text-decoration: none;`,
			dayNumToday: `display: inline-block; background-color: ${colors.todayBg}; color: ${colors.todayText}; padding: 2px 6px; border-radius: 3px; font-size: 11px; cursor: pointer; text-decoration: none;`,
			holiday: `background-color: ${colors.holidayBg}; padding: 2px 4px; border-radius: 2px; font-size: 9px; color: ${colors.holidayText}; display: block; margin-top: 3px;`,
			moonPhase: `background-color: ${colors.moonBg}; padding: 2px 4px; border-radius: 2px; font-size: 9px; color: ${colors.moonText}; display: block; margin-top: 2px;`,
			event: `background-color: ${colors.eventBg}; padding: 2px 4px; border-radius: 2px; font-size: 9px; color: ${colors.eventText}; display: block; margin-top: 2px; text-decoration: none;`,
			empty: `background-color: ${colors.emptyBg};`
		};

		let headerRow = "<tr>";
		if (EasyCalendarVault.showWeekdays) {
			for (const dayName of weekdays) {
				headerRow += `<th style="${styles.th}">${dayName}</th>`;
			}
		} else {
			for (let i = 0; i < numCols; i++) {
				headerRow += `<th style="${styles.th}">${i + 1}</th>`;
			}
		}
		headerRow += "</tr>";

		const currentDate = epochDayToDate(EasyCalendarVault.epochDay, worldId);
		const isCurrentMonth = (currentDate.year === year && currentDate.monthIndex === monthIndex);

		let rows = "";
		let currentDay = 1;

		while (currentDay <= daysInMonth) {
			rows += "<tr>";
			for (let col = 0; col < numCols; col++) {
				if (currentDay > daysInMonth) {
					rows += `<td style="${styles.td} ${styles.empty}"></td>`;
				} else {
					const dayEpoch = dateToEpochDay(year, monthIndex, currentDay, worldId);
					const holidays = getHolidaysForDay(dayEpoch, worldId);
					const events = getEventsForDay(dayEpoch);
					const isToday = isCurrentMonth && currentDate.day === currentDay;

					let cellContent = `<a style="${isToday ? styles.dayNumToday : styles.dayNum}" href="!${moduleSettings.chatApiName} --add-event-menu ${dayEpoch}">${currentDay}</a>`;

					for (const moon of config.moons) {
						const phaseData = getMoonPhase(dayEpoch, moon);
						const prevPhaseData = getMoonPhase(dayEpoch - 1, moon);
						if (phaseData.phaseIndex === 0 && prevPhaseData.phaseIndex !== 0) {
							cellContent += `<span style="${styles.moonPhase}">🌑 ${moon.name} New</span>`;
						} else if (phaseData.phaseIndex === 4 && prevPhaseData.phaseIndex !== 4) {
							cellContent += `<span style="${styles.moonPhase}">🌕 ${moon.name} Full</span>`;
						}
					}

					for (const h of holidays) {
						cellContent += `<span style="${styles.holiday}">🎉 ${h}</span>`;
					}

					for (let i = 0; i < events.length; i++) {
						const e = events[i];
						cellContent += `<a style="${styles.event}" href="!${moduleSettings.chatApiName} --view-event ${dayEpoch}|${i}">📌 ${e.name}</a>`;
					}

					rows += `<td style="${styles.td}">${cellContent}</td>`;
					currentDay++;
				}
			}
			rows += "</tr>";
		}

		return `<table style="${styles.table}">${headerRow}${rows}</table>`;
	};

	// !SECTION End of Inner Methods: Handout Management
	// SECTION Inner Methods: Menu Builders

	// ANCHOR Function: buildCelestialTable
	const buildCelestialTable = (config, hourOfDay, weather) => {
		const imgStyle = "width: 50px; height: 50px; border-radius: 5px;";
		const cellStyle = "text-align: center; padding: 5px; vertical-align: top;";
		const labelStyle = "font-size: 10px; color: var(--ez-color-text-complement);";
		const nameStyle = "font-weight: bold; font-size: 11px;";

		let cells = "";

		// Suns
		for (const sun of config.suns) {
			const sunState = getSunState(hourOfDay, sun);
			const sunImageData = getSunImage(sun.name, sunState);
			cells += `<td style="${cellStyle}"><img src="${sunImageData.url}" style="${imgStyle}" /><div style="${nameStyle}">${sun.name}</div><div style="${labelStyle}">${sunImageData.label}</div></td>`;
		}

		// Moons
		for (const moon of config.moons) {
			const moonPhaseData = getMoonPhase(EasyCalendarVault.epochDay, moon);
			const moonImageData = getMoonImage(moon.name, moonPhaseData.phaseName);
			cells += `<td style="${cellStyle}"><img src="${moonImageData.url}" style="${imgStyle}" /><div style="${nameStyle}">${moon.name}</div><div style="${labelStyle}">${moonImageData.label}</div></td>`;
		}

		// Weather
		const weatherData = getWeatherImage(weather);
		cells += `<td style="${cellStyle}"><img src="${weatherData.url}" style="${imgStyle}" /><div style="${nameStyle}">${PhraseFactory.get({ transUnitId: "0x0CAL0020" })}</div><div style="${labelStyle}">${weatherData.label}</div></td>`;

		return `<table style="width: 100%; border-collapse: collapse;"><tr>${cells}</tr></table>`;
	};

	// ANCHOR Function: buildEventsSection
	const buildEventsSection = (epochDay, worldId) => {
		const holidays = getHolidaysForDay(epochDay, worldId);
		const events = getEventsForDay(epochDay);

		if (holidays.length === 0 && events.length === 0) return "";

		let html = "";

		for (const h of holidays) {
			html += `<div style="background-color: #ffe0b2; padding: 5px 8px; border-radius: 3px; margin-bottom: 4px; font-size: 11px; color: #e65100;">🎉 ${h}</div>`;
		}

		for (let i = 0; i < events.length; i++) {
			const e = events[i];
			html += `<a style="display: block; background-color: #e3f2fd; padding: 5px 8px; border-radius: 3px; margin-bottom: 4px; font-size: 11px; color: #1565c0; text-decoration: none;" href="!${moduleSettings.chatApiName} --view-event ${epochDay}|${i}">📌 <strong>${e.name}</strong> (${e.time})</a>`;
		}

		return html;
	};

	// ANCHOR Function: buildTimeControlButtons
	const buildTimeControlButtons = () => {
		return `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --advance-day -1">−1 Day</a>`
			+ `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --advance-day 1">+1 Day</a>`
			+ `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --advance-hour -1">−1 Hour</a>`
			+ `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --advance-hour 1">+1 Hour</a>`;
	};

	// ANCHOR Function: buildCelestialControlButtons
	const buildCelestialControlButtons = (config) => {
		const sunKeys = getAllImageKeys("sun");
		const sunOptions = sunKeys.join("|");
		const moonKeys = getAllImageKeys("moon");
		const moonOptions = moonKeys.join("|");
		const weatherKeys = getAllImageKeys("weather");
		const weatherOptions = weatherKeys.join("|");

		let html = "";

		for (const s of config.suns) {
			html += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --set-sun ${s.name}|?{State|auto|${sunOptions}}">Set ${s.name}</a>`;
		}

		for (const m of config.moons) {
			html += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --set-moon ${m.name}|?{Phase|auto|${moonOptions}}">Set ${m.name}</a>`;
		}

		html += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --set-weather ?{Weather|${weatherOptions}}">${PhraseFactory.get({ transUnitId: "0x0CAL0021" })}</a>`;

		return html;
	};

	// ANCHOR Function: buildImageTable
	const buildImageTable = (category, label) => {
		const keys = getAllImageKeys(category);
		const cellStyle = "padding: 4px; vertical-align: middle;";
		const imgStyle = "width: 24px; height: 24px; border-radius: 3px;";
		const btnStyle = "display: inline-block; background-color: var(--ez-color-secondary); color: var(--ez-color-text-contrast); padding: 2px 6px; border-radius: 3px; text-decoration: none; font-size: 9px;";
		const badgeCustom = "font-size: 8px; padding: 1px 3px; border-radius: 2px; margin-left: 3px; color: #fff; background-color: var(--ez-color-primary);";
		const badgeEdited = "font-size: 8px; padding: 1px 3px; border-radius: 2px; margin-left: 3px; color: #fff; background-color: var(--ez-color-secondary);";

		let rows = "";
		for (const key of keys) {
			const imgData = getImageData(category, key);
			if (!imgData) continue;

			let badge = "";
			if (imgData.isCustom) {
				badge = `<span style="${badgeCustom}">custom</span>`;
			} else if (imgData.isOverride) {
				badge = `<span style="${badgeEdited}">edited</span>`;
			}

			rows += `<tr style="border-bottom: 1px solid #eee;">`
				+ `<td style="${cellStyle} width: 30px;"><img src="${imgData.url}" style="${imgStyle}" /></td>`
				+ `<td style="${cellStyle}"><strong>${key}</strong>${badge}<br><span style="color: #666; font-size: 10px;">${imgData.label}</span></td>`
				+ `<td style="${cellStyle} width: 40px; text-align: right;"><a style="${btnStyle}" href="!${moduleSettings.chatApiName} --edit-image-menu ${category}|${key}">Edit</a></td>`
				+ `</tr>`;
		}

		const addBtnStyle = "display: inline-block; padding: 3px 8px; border-radius: 3px; text-decoration: none; font-size: 10px; color: #fff; background-color: #4a4; margin-top: 5px;";

		return `<tr style="background-color: #f0f0f0;"><td colspan="3" style="padding: 6px 4px; font-weight: bold; font-size: 10px; color: #666;">${label}</td></tr>`
			+ rows
			+ `<tr><td colspan="3" style="padding: 4px;"><a style="${addBtnStyle}" href="!${moduleSettings.chatApiName} --add-image ${category}|?{Key (no spaces)}|?{Image URL}|?{Label}">+ Add ${label.replace(" Images", "")}</a></td></tr>`;
	};

	// !SECTION End of Inner Methods: Menu Builders
	// SECTION Inner Methods: Action Processors

	// ANCHOR Function: processMenuAsync
	const processMenuAsync = async (msgDetails) => {
		const thisFuncDebugName = "processMenuAsync";

		try {
			const config = getWorldConfig(EasyCalendarVault.world);
			const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
			const hourOfDay = EasyCalendarVault.hourOfDay || 0;
			const weather = EasyCalendarVault.weather || "clear";

			const dateStr = date.isFestival
				? `${date.monthName}, ${date.year}`
				: `${date.day}${getDaySuffix(date.day)} of ${date.monthName}, ${date.year}`;

			const hourDesc = getHourDescription(hourOfDay, config.hoursInDay);
			const timeStr = `Hour ${hourOfDay} of ${config.hoursInDay} (${hourDesc})`;

			// Build body sections
			let body = "";

			// Date and time header
			body += `<div class="ez-content">`;
			body += `<div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${dateStr}</div>`;
			body += `<div style="font-size: 12px; color: var(--ez-color-text-complement); margin-bottom: 10px;">${timeStr}</div>`;
			body += buildCelestialTable(config, hourOfDay, weather);
			body += `</div>`;

			// Events section
			const eventsHtml = buildEventsSection(EasyCalendarVault.epochDay, EasyCalendarVault.world);
			if (eventsHtml) {
				body += `<div class="ez-header">${PhraseFactory.get({ transUnitId: "0x0CAL0010" })}</div>`;
				body += `<div class="ez-content">${eventsHtml}</div>`;
			}

			// Time controls (GM only)
			if (msgDetails.isGm) {
				body += `<div class="ez-header">${PhraseFactory.get({ transUnitId: "0x0CAL0011" })}</div>`;
				body += `<div class="ez-content">${buildTimeControlButtons()}</div>`;

				body += `<div class="ez-header">${PhraseFactory.get({ transUnitId: "0x0CAL0012" })}</div>`;
				body += `<div class="ez-content">${buildCelestialControlButtons(config)}</div>`;
			}

			// Action buttons
			body += `<div class="ez-header">${PhraseFactory.get({ transUnitId: "0x0CAL0013" })}</div>`;
			body += `<div class="ez-content">`;
			body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --log ?{Journal Entry}">${PhraseFactory.get({ transUnitId: "0x0CAL0014" })}</a>`;
			body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --calendar">${PhraseFactory.get({ transUnitId: "0x0CAL0015" })}</a>`;
			body += `</div>`;

			// GM buttons
			if (msgDetails.isGm) {
				body += `<div class="ez-content">`;
				body += `<a class="ez-btn ez-caution" href="\`!${moduleSettings.chatApiName} --show">${PhraseFactory.get({ transUnitId: "0x0CAL0016" })}</a>`;
				body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --settings">⚙ ${PhraseFactory.get({ transUnitId: "0x0CAL0017" })}</a>`;
				body += `</div>`;
			}

			const menuContent = {
				title: PhraseFactory.get({ transUnitId: "0x0CAL0001" }),
				subtitle: config.name,
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

	// ANCHOR Function: processShowAsync
	const processShowAsync = async (msgDetails) => {
		if (!msgDetails.isGm) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0030" })
			});
			return 1;
		}

		const config = getWorldConfig(EasyCalendarVault.world);
		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		const hourOfDay = EasyCalendarVault.hourOfDay || 0;
		const weather = EasyCalendarVault.weather || "clear";

		const dateStr = date.isFestival
			? `${date.monthName}, ${date.year}`
			: `${date.day}${getDaySuffix(date.day)} of ${date.monthName}, ${date.year}`;

		const hourDesc = getHourDescription(hourOfDay, config.hoursInDay);

		let body = `<div class="ez-content">`;
		body += `<div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${dateStr}</div>`;
		body += `<div style="font-size: 12px; color: var(--ez-color-text-complement); margin-bottom: 10px;">${hourDesc}</div>`;
		body += buildCelestialTable(config, hourOfDay, weather);
		body += `</div>`;

		const eventsHtml = buildEventsSection(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		if (eventsHtml) {
			body += `<div class="ez-header">${PhraseFactory.get({ transUnitId: "0x0CAL0010" })}</div>`;
			body += `<div class="ez-content">${eventsHtml}</div>`;
		}

		const menuContent = {
			title: PhraseFactory.get({ transUnitId: "0x0CAL0001" }),
			subtitle: config.name,
			body,
			footer: ""
		};

		const styledMessage = await Utils.renderTemplateAsync({
			template: "chatMenu",
			expressions: menuContent,
			theme: "chatMenu",
			cssVars: {}
		});

		sendChat(moduleSettings.readableName, styledMessage);
		return 0;
	};

	// ANCHOR Function: processSettingsAsync
	const processSettingsAsync = async (msgDetails) => {
		if (!msgDetails.isGm) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0030" })
			});
			return 1;
		}

		const config = getWorldConfig(EasyCalendarVault.world);
		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		const hourOfDay = EasyCalendarVault.hourOfDay || 0;

		const worldOptions = Object.keys(WORLD_CONFIGS).join("|");
		const monthOptions = config.months.filter(m => !m.leapOnly || config.leapYear(date.year)).map(m => m.name).join("|");
		const hourOptions = Array.from({ length: config.hoursInDay }, (_, i) => i).join("|");

		const rowStyle = "display: flex; align-items: center; margin: 5px 0;";
		const labelStyle = "min-width: 100px; font-weight: bold;";
		const btnStyle = "display: inline-block; background-color: var(--ez-color-secondary); color: var(--ez-color-text-contrast); padding: 3px 10px; border-radius: 5px; text-decoration: none; border: 2px solid var(--ez-color-background-secondary);";

		let body = `<div class="ez-content">`;
		body += `<div style="${rowStyle}"><span style="${labelStyle}">${PhraseFactory.get({ transUnitId: "0x0CAL0040" })}:</span><a style="${btnStyle}" href="\`!${moduleSettings.chatApiName} --set-world ?{World|${worldOptions}}">${config.name}</a></div>`;
		body += `<div style="${rowStyle}"><span style="${labelStyle}">${PhraseFactory.get({ transUnitId: "0x0CAL0041" })}:</span><a style="${btnStyle}" href="\`!${moduleSettings.chatApiName} --set-year ?{Year|${date.year}}">${date.year}</a></div>`;
		body += `<div style="${rowStyle}"><span style="${labelStyle}">${PhraseFactory.get({ transUnitId: "0x0CAL0042" })}:</span><a style="${btnStyle}" href="\`!${moduleSettings.chatApiName} --set-month ?{Month|${monthOptions}}">${date.monthName}</a></div>`;
		body += `<div style="${rowStyle}"><span style="${labelStyle}">${PhraseFactory.get({ transUnitId: "0x0CAL0043" })}:</span><a style="${btnStyle}" href="\`!${moduleSettings.chatApiName} --set-day ?{Day|${date.day}}">${date.day}</a></div>`;
		body += `<div style="${rowStyle}"><span style="${labelStyle}">${PhraseFactory.get({ transUnitId: "0x0CAL0044" })}:</span><a style="${btnStyle}" href="\`!${moduleSettings.chatApiName} --set-hour ?{Hour|${hourOptions}}">${hourOfDay}</a></div>`;
		body += `</div>`;

		body += `<div class="ez-header">${PhraseFactory.get({ transUnitId: "0x0CAL0045" })}</div>`;
		body += `<div class="ez-content">`;
		body += `<div style="${rowStyle}"><span style="${labelStyle}">${PhraseFactory.get({ transUnitId: "0x0CAL0046" })}:</span><a style="${btnStyle}" href="\`!${moduleSettings.chatApiName} --toggle-auto-weather">${EasyCalendarVault.autoWeather ? "On" : "Off"}</a></div>`;
		body += `<div style="${rowStyle}"><span style="${labelStyle}">${PhraseFactory.get({ transUnitId: "0x0CAL0047" })}:</span><a style="${btnStyle}" href="\`!${moduleSettings.chatApiName} --toggle-weekdays">${EasyCalendarVault.showWeekdays ? "On" : "Off"}</a></div>`;
		body += `</div>`;

		body += `<div class="ez-content">`;
		body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --images">${PhraseFactory.get({ transUnitId: "0x0CAL0048" })}</a>`;
		body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --handout-colors">${PhraseFactory.get({ transUnitId: "0x0CAL0093" })}</a>`;
		body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --menu">← ${PhraseFactory.get({ transUnitId: "0x0CAL0049" })}</a>`;
		body += `</div>`;

		const menuContent = {
			title: `⚙ ${PhraseFactory.get({ transUnitId: "0x0CAL0017" })}`,
			subtitle: "",
			body,
			footer: ""
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
	};

	// ANCHOR Function: processImagesAsync
	const processImagesAsync = async (msgDetails) => {
		if (!msgDetails.isGm) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0030" })
			});
			return 1;
		}

		let body = `<div class="ez-content">`;
		body += `<table style="width: 100%; border-collapse: collapse; font-size: 11px;">`;
		body += buildImageTable("moon", PhraseFactory.get({ transUnitId: "0x0CAL0050" }));
		body += buildImageTable("sun", PhraseFactory.get({ transUnitId: "0x0CAL0051" }));
		body += buildImageTable("weather", PhraseFactory.get({ transUnitId: "0x0CAL0052" }));
		body += `</table>`;
		body += `</div>`;

		body += `<div class="ez-content">`;
		body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --settings">← ${PhraseFactory.get({ transUnitId: "0x0CAL0053" })}</a>`;
		body += `</div>`;

		const menuContent = {
			title: PhraseFactory.get({ transUnitId: "0x0CAL0048" }),
			subtitle: "",
			body,
			footer: ""
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
	};

	// ANCHOR Function: processHandoutColorsAsync
	const processHandoutColorsAsync = async (msgDetails) => {
		if (!msgDetails.isGm) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0030" })
			});
			return 1;
		}

		const colorDefs = [
			{ cssVar: "--ez-cal-header-bg", label: "Header Background" },
			{ cssVar: "--ez-cal-header-text", label: "Header Text" },
			{ cssVar: "--ez-cal-daynum-bg", label: "Day Number Background" },
			{ cssVar: "--ez-cal-daynum-text", label: "Day Number Text" },
			{ cssVar: "--ez-cal-today-bg", label: "Today Background" },
			{ cssVar: "--ez-cal-today-text", label: "Today Text" },
			{ cssVar: "--ez-cal-holiday-bg", label: "Holiday Background" },
			{ cssVar: "--ez-cal-holiday-text", label: "Holiday Text" },
			{ cssVar: "--ez-cal-moon-bg", label: "Moon Phase Background" },
			{ cssVar: "--ez-cal-moon-text", label: "Moon Phase Text" },
			{ cssVar: "--ez-cal-event-bg", label: "Event Background" },
			{ cssVar: "--ez-cal-event-text", label: "Event Text" },
			{ cssVar: "--ez-cal-cell-border", label: "Cell Border" },
			{ cssVar: "--ez-cal-empty-bg", label: "Empty Cell Background" }
		];

		const rowStyle = "display: flex; align-items: center; padding: 3px 0; border-bottom: 1px solid #eee;";
		const swatchStyle = "width: 20px; height: 20px; border-radius: 3px; border: 1px solid #999; margin-right: 8px;";
		const labelStyle = "flex: 1; font-size: 11px;";
		const varStyle = "font-size: 9px; color: #666; font-family: monospace;";

		let body = `<div class="ez-content">`;
		body += `<p style="font-size: 11px; color: var(--ez-color-text-complement); margin-bottom: 10px;">${PhraseFactory.get({ transUnitId: "0x0CAL0090" })}</p>`;
		body += `</div>`;

		body += `<div class="ez-header">${PhraseFactory.get({ transUnitId: "0x0CAL0091" })}</div>`;
		body += `<div class="ez-content">`;

		for (const def of colorDefs) {
			const defaultMatch = DEFAULT_HANDOUT_STYLE.match(new RegExp(`${def.cssVar}\\s*:\\s*([^;\\n]+)`, "i"));
			const defaultColor = defaultMatch ? defaultMatch[1].trim() : "#888888";

			body += `<div style="${rowStyle}">`;
			body += `<div style="${swatchStyle} background-color: ${defaultColor};"></div>`;
			body += `<div style="${labelStyle}">${def.label}<br><span style="${varStyle}">${def.cssVar}</span></div>`;
			body += `</div>`;
		}

		body += `</div>`;

		body += `<div class="ez-content">`;
		body += `<p style="font-size: 10px; color: var(--ez-color-text-complement);">${PhraseFactory.get({ transUnitId: "0x0CAL0092" })}</p>`;
		body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --settings">← ${PhraseFactory.get({ transUnitId: "0x0CAL0053" })}</a>`;
		body += `</div>`;

		const menuContent = {
			title: PhraseFactory.get({ transUnitId: "0x0CAL0093" }),
			subtitle: "",
			body,
			footer: ""
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
	};

	// ANCHOR Function: processAdvanceDay
	const processAdvanceDay = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) {
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0030" })
			});
			return 1;
		}

		const days = parseInt(Object.keys(parsedArgs)[0], 10) || 0;
		EasyCalendarVault.epochDay += days;

		if (EasyCalendarVault.autoWeather && days !== 0) {
			randomizeWeather();
		}

		return processMenuAsync(msgDetails);
	};

	// ANCHOR Function: processAdvanceHour
	const processAdvanceHour = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) {
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0030" })
			});
			return 1;
		}

		const config = getWorldConfig(EasyCalendarVault.world);
		const hours = parseInt(Object.keys(parsedArgs)[0], 10) || 0;

		let newHour = (EasyCalendarVault.hourOfDay || 0) + hours;
		let dayChanged = false;

		while (newHour >= config.hoursInDay) {
			newHour -= config.hoursInDay;
			EasyCalendarVault.epochDay++;
			dayChanged = true;
		}
		while (newHour < 0) {
			newHour += config.hoursInDay;
			EasyCalendarVault.epochDay--;
			dayChanged = true;
		}

		EasyCalendarVault.hourOfDay = newHour;

		if (EasyCalendarVault.autoWeather && dayChanged) {
			randomizeWeather();
		}

		return processMenuAsync(msgDetails);
	};

	// ANCHOR Function: processSetWorld
	const processSetWorld = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;
		const worldId = Object.keys(parsedArgs)[0];
		if (WORLD_CONFIGS[worldId]) {
			EasyCalendarVault.world = worldId;
		}
		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processSetYear
	const processSetYear = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;
		const year = parseInt(Object.keys(parsedArgs)[0], 10);
		if (isNaN(year)) return 1;
		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		EasyCalendarVault.epochDay = dateToEpochDay(year, date.monthIndex, date.day, EasyCalendarVault.world);
		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processSetMonth
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
	const processSetDay = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;
		const day = parseInt(Object.keys(parsedArgs)[0], 10);
		if (isNaN(day) || day < 1) return 1;
		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		EasyCalendarVault.epochDay = dateToEpochDay(date.year, date.monthIndex, day, EasyCalendarVault.world);
		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processSetHour
	const processSetHour = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;
		const hour = parseInt(Object.keys(parsedArgs)[0], 10);
		const config = getWorldConfig(EasyCalendarVault.world);
		if (isNaN(hour) || hour < 0 || hour >= config.hoursInDay) return 1;
		EasyCalendarVault.hourOfDay = hour;
		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processToggleAutoWeather
	const processToggleAutoWeather = (msgDetails) => {
		if (!msgDetails.isGm) return 1;
		EasyCalendarVault.autoWeather = !EasyCalendarVault.autoWeather;
		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processToggleWeekdays
	const processToggleWeekdays = (msgDetails) => {
		if (!msgDetails.isGm) return 1;
		EasyCalendarVault.showWeekdays = !EasyCalendarVault.showWeekdays;
		return processSettingsAsync(msgDetails);
	};

	// ANCHOR Function: processSetSun
	const processSetSun = (msgDetails) => {
		if (!msgDetails.isGm) return 1;
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
	const processSetMoon = (msgDetails) => {
		if (!msgDetails.isGm) return 1;
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
	const processSetWeather = (msgDetails, parsedArgs) => {
		if (!msgDetails.isGm) return 1;
		const weather = Object.keys(parsedArgs)[0];
		if (weather) {
			EasyCalendarVault.weather = weather;
		}
		return processMenuAsync(msgDetails);
	};

	// ANCHOR Function: processEditImageMenu
	const processEditImageMenu = async (msgDetails) => {
		if (!msgDetails.isGm) return 1;

		const content = msgDetails.raw.content;
		const match = content.match(/--edit-image-menu\s+(\w+)\|(.+)/i);
		if (!match) return 1;

		const category = match[1].trim();
		const key = match[2].trim();
		const imgData = getImageData(category, key);

		if (!imgData) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0060" })
			});
			return 1;
		}

		const defaultData = DEFAULT_IMAGES[category]?.[key];
		const btnStyle = "display: inline-block; background-color: var(--ez-color-secondary); color: var(--ez-color-text-contrast); padding: 3px 8px; border-radius: 3px; text-decoration: none; font-size: 10px;";
		const btnDanger = "display: inline-block; background-color: var(--ez-rainbow-red); color: var(--ez-color-text-contrast); padding: 3px 8px; border-radius: 3px; text-decoration: none; font-size: 10px;";
		const btnReset = "display: inline-block; background-color: #666; color: var(--ez-color-text-contrast); padding: 3px 8px; border-radius: 3px; text-decoration: none; font-size: 10px;";

		let body = `<div class="ez-content" style="text-align: center;">`;
		body += `<img src="${imgData.url}" style="width: 80px; height: 80px; border-radius: 5px; margin-bottom: 5px;" />`;
		body += `<div style="font-weight: bold;">${key}</div>`;
		body += `<div style="font-size: 11px; color: var(--ez-color-text-complement);">${imgData.label}</div>`;
		body += `</div>`;

		body += `<div class="ez-content">`;
		body += `<table style="width: 100%; border-collapse: collapse; font-size: 11px;">`;
		body += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 4px; font-weight: bold; width: 60px;">URL</td><td style="padding: 6px 4px; word-break: break-all;"><span style="font-size: 9px; color: #666;">${imgData.url.substring(0, 40)}...</span></td><td style="padding: 6px 4px; width: 60px; text-align: right;"><a style="${btnStyle}" href="!${moduleSettings.chatApiName} --edit-image ${category}|${key}|?{New URL|${imgData.url}}|${imgData.label}">Edit</a></td></tr>`;
		body += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 4px; font-weight: bold;">Label</td><td style="padding: 6px 4px;">${imgData.label}</td><td style="padding: 6px 4px; text-align: right;"><a style="${btnStyle}" href="!${moduleSettings.chatApiName} --edit-image ${category}|${key}|${imgData.url}|?{New Label|${imgData.label}}">Edit</a></td></tr>`;

		if (imgData.isCustom) {
			body += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 4px; font-weight: bold;">Delete</td><td style="padding: 6px 4px;"><span style="font-size: 10px; color: #888;">Remove this custom image</span></td><td style="padding: 6px 4px; text-align: right;"><a style="${btnDanger}" href="!${moduleSettings.chatApiName} --remove-image ${category}|${key}">Delete</a></td></tr>`;
		} else if (imgData.isOverride && defaultData) {
			body += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 4px; font-weight: bold;">Reset</td><td style="padding: 6px 4px;"><span style="font-size: 10px; color: #888;">Restore to: ${defaultData.label}</span></td><td style="padding: 6px 4px; text-align: right;"><a style="${btnReset}" href="!${moduleSettings.chatApiName} --reset-image ${category}|${key}">Reset</a></td></tr>`;
		}

		body += `</table>`;
		body += `</div>`;

		body += `<div class="ez-content">`;
		body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --images">← ${PhraseFactory.get({ transUnitId: "0x0CAL0061" })}</a>`;
		body += `</div>`;

		const menuContent = {
			title: PhraseFactory.get({ transUnitId: "0x0CAL0062" }),
			subtitle: "",
			body,
			footer: ""
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
	};

	// ANCHOR Function: processAddImage
	const processAddImage = (msgDetails) => {
		if (!msgDetails.isGm) return 1;
		const content = msgDetails.raw.content;
		const match = content.match(/--add-image\s+(\w+)\|([^|]+)\|([^|]+)\|(.+)/i);
		if (!match) return 1;

		const category = match[1].trim();
		const key = match[2].trim().toLowerCase().replace(/\s+/g, "-");
		const url = match[3].trim();
		const label = match[4].trim();

		if (!["moon", "sun", "weather"].includes(category)) return 1;

		if (DEFAULT_IMAGES[category]?.[key]) {
			if (!EasyCalendarVault.imageOverrides) EasyCalendarVault.imageOverrides = {};
			if (!EasyCalendarVault.imageOverrides[category]) EasyCalendarVault.imageOverrides[category] = {};
			EasyCalendarVault.imageOverrides[category][key] = { url, label };
		} else {
			if (!EasyCalendarVault.customImages) EasyCalendarVault.customImages = {};
			if (!EasyCalendarVault.customImages[category]) EasyCalendarVault.customImages[category] = {};
			EasyCalendarVault.customImages[category][key] = { url, label };
		}

		return processImagesAsync(msgDetails);
	};

	// ANCHOR Function: processEditImage
	const processEditImage = (msgDetails) => {
		if (!msgDetails.isGm) return 1;
		const content = msgDetails.raw.content;
		const match = content.match(/--edit-image\s+(\w+)\|([^|]+)\|([^|]+)\|(.+)/i);
		if (!match) return 1;

		const category = match[1].trim();
		const key = match[2].trim();
		const url = match[3].trim();
		const label = match[4].trim();

		if (!["moon", "sun", "weather"].includes(category)) return 1;

		if (EasyCalendarVault.customImages?.[category]?.[key]) {
			EasyCalendarVault.customImages[category][key] = { url, label };
		} else {
			if (!EasyCalendarVault.imageOverrides) EasyCalendarVault.imageOverrides = {};
			if (!EasyCalendarVault.imageOverrides[category]) EasyCalendarVault.imageOverrides[category] = {};
			EasyCalendarVault.imageOverrides[category][key] = { url, label };
		}

		return processEditImageMenu(msgDetails);
	};

	// ANCHOR Function: processRemoveImage
	const processRemoveImage = (msgDetails) => {
		if (!msgDetails.isGm) return 1;
		const content = msgDetails.raw.content;
		const match = content.match(/--remove-image\s+(\w+)\|(.+)/i);
		if (!match) return 1;

		const category = match[1].trim();
		const key = match[2].trim();

		if (EasyCalendarVault.customImages?.[category]?.[key]) {
			delete EasyCalendarVault.customImages[category][key];
		}

		return processImagesAsync(msgDetails);
	};

	// ANCHOR Function: processResetImage
	const processResetImage = (msgDetails) => {
		if (!msgDetails.isGm) return 1;
		const content = msgDetails.raw.content;
		const match = content.match(/--reset-image\s+(\w+)\|(.+)/i);
		if (!match) return 1;

		const category = match[1].trim();
		const key = match[2].trim();

		if (EasyCalendarVault.imageOverrides?.[category]?.[key]) {
			delete EasyCalendarVault.imageOverrides[category][key];
		}

		return processImagesAsync(msgDetails);
	};

	// ANCHOR Function: processLogDay
	const processLogDay = (msgDetails) => {
		const content = msgDetails.raw.content;
		const match = content.match(/--log\s+(.+)/i);

		if (!match || !match[1].trim()) {
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "WARN",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0070" })
			});
			return 0;
		}

		const entryText = match[1].trim();
		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		const hourOfDay = EasyCalendarVault.hourOfDay || 0;
		const dateStr = date.isFestival
			? `${date.monthName}, ${date.year}`
			: `${date.day}${getDaySuffix(date.day)} of ${date.monthName}, ${date.year}`;
		const timeStr = `Hour ${hourOfDay}`;

		const journalName = "Daily Journal";
		const handout = findOrCreateHandout(journalName, msgDetails.callerId, true);

		handout.get("notes", (notes) => {
			const currentNotes = notes || "";
			const newEntry = `<p><strong>${dateStr} (${timeStr})</strong><br>${entryText}</p><hr>`;
			const updatedNotes = currentNotes + newEntry;
			handout.set("notes", updatedNotes);

			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "INFO",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0071" })
			});
		});

		return 0;
	};

	// ANCHOR Function: processOpenCalendar
	const processOpenCalendar = (msgDetails) => {
		const date = epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world);
		const handoutName = `Campaign Calendar: ${date.monthName}`;
		const handout = findOrCreateHandout(handoutName, msgDetails.callerId, false);
		const handoutId = handout.get("id");

		// NOTE: Read GM notes to get style block (used by Easy-Markdown)
		handout.get("gmnotes", (gmnotes) => {
			const rawGmNotes = gmnotes ? unescape(gmnotes) : "";
			
			// DEBUG: Log raw GM notes
			log(`[${moduleSettings.readableName}] RAW GMNOTES (first 800 chars): ${rawGmNotes.substring(0, 800)}`);
			
			const colors = parseStyleBlock(rawGmNotes);
			
			// DEBUG: Log parsed colors
			log(`[${moduleSettings.readableName}] PARSED COLORS: ${JSON.stringify(colors)}`);
			
			const calendarHtml = buildCalendarGridHtml(date.year, date.monthIndex, EasyCalendarVault.world, colors);

			// DEBUG: Log first part of generated HTML
			log(`[${moduleSettings.readableName}] GENERATED HTML (first 300 chars): ${calendarHtml.substring(0, 300)}`);

			// NOTE: Write calendar to visible notes
			handout.get("notes", (notes) => {
				let currentNotes = notes || "";
				
				// DEBUG: Log what we're reading from notes
				log(`[${moduleSettings.readableName}] CURRENT NOTES (first 500 chars): ${currentNotes.substring(0, 500)}`);
				
				// NOTE: Roll20 prefixes custom IDs with "userscript-"
				const divRegex = /<div id="(?:userscript-)?easyCalendarData"[^>]*>[\s\S]*?<\/div>/i;
				const divOpenTag = '<div id="easyCalendarData">';
				const divCloseTag = '</div>';
				
				// DEBUG: Check if regex matches
				log(`[${moduleSettings.readableName}] REGEX MATCH: ${divRegex.test(currentNotes)}`);

				if (divRegex.test(currentNotes)) {
					currentNotes = currentNotes.replace(divRegex, `${divOpenTag}${calendarHtml}${divCloseTag}`);
				} else {
					currentNotes += `${divOpenTag}${calendarHtml}${divCloseTag}`;
				}
				
				// DEBUG: Log what we're about to write
				log(`[${moduleSettings.readableName}] WRITING NOTES (first 500 chars): ${currentNotes.substring(0, 500)}`);

				handout.set("notes", currentNotes);
				
				// DEBUG: Confirm handout was updated
				log(`[${moduleSettings.readableName}] HANDOUT UPDATED: ${handoutName}`);

				Utils.whisperPlayerMessage({
					from: moduleSettings.readableName,
					to: msgDetails.callerName,
					message: `<a href="http://journal.roll20.net/handout/${handoutId}">${PhraseFactory.get({ transUnitId: "0x0CAL0072", expressions: { name: handoutName } })}</a>`
				});
			});
		});

		return 0;
	};

	// ANCHOR Function: processAddEventMenu
	const processAddEventMenu = async (msgDetails, parsedArgs) => {
		const epochDay = parseInt(Object.keys(parsedArgs)[0], 10);

		if (isNaN(epochDay)) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0080" })
			});
			return 1;
		}

		const date = epochDayToDate(epochDay, EasyCalendarVault.world);
		const dateStr = date.isFestival
			? date.monthName
			: `${date.day}${getDaySuffix(date.day)} of ${date.monthName}, ${date.year}`;

		let body = `<div class="ez-content">`;
		body += `<div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">${dateStr}</div>`;
		body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --add-event ${epochDay}|?{Event Name}|?{Time (e.g. Morning, Midday, Evening)}|?{Description}">${PhraseFactory.get({ transUnitId: "0x0CAL0081" })}</a>`;
		body += `<a class="ez-btn" href="\`!${moduleSettings.chatApiName} --calendar">← ${PhraseFactory.get({ transUnitId: "0x0CAL0082" })}</a>`;
		body += `</div>`;

		const menuContent = {
			title: PhraseFactory.get({ transUnitId: "0x0CAL0083" }),
			subtitle: "",
			body,
			footer: ""
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
	};

	// ANCHOR Function: processAddEvent
	const processAddEvent = (msgDetails) => {
		const content = msgDetails.raw.content;
		const match = content.match(/--add-event\s+(\d+)\|([^|]+)\|([^|]*)\|(.+)/i);
		if (!match) {
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0084" })
			});
			return 1;
		}

		const epochDay = parseInt(match[1], 10);
		const name = match[2].trim();
		const time = match[3].trim() || "Unspecified";
		const description = match[4].trim();

		if (isNaN(epochDay) || !name || !description) {
			Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0084" })
			});
			return 1;
		}

		addEventToDay(epochDay, name, time, description, msgDetails.callerId);

		const date = epochDayToDate(epochDay, EasyCalendarVault.world);
		const dateStr = date.isFestival
			? date.monthName
			: `${date.day}${getDaySuffix(date.day)} of ${date.monthName}`;

		Utils.whisperAlertMessageAsync({
			from: moduleSettings.readableName,
			to: msgDetails.callerName,
			toId: msgDetails.callerId,
			severity: "INFO",
			apiCallContent: msgDetails.raw.content,
			remark: PhraseFactory.get({ transUnitId: "0x0CAL0085", expressions: { name, date: dateStr } })
		});

		return processOpenCalendar(msgDetails);
	};

	// ANCHOR Function: processViewEvent
	const processViewEvent = async (msgDetails) => {
		const content = msgDetails.raw.content;
		const match = content.match(/--view-event\s+(\d+)\|(\d+)/i);
		if (!match) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0086" })
			});
			return 1;
		}

		const epochDay = parseInt(match[1], 10);
		const eventIndex = parseInt(match[2], 10);

		const events = getEventsForDay(epochDay);
		if (!events[eventIndex]) {
			await Utils.whisperAlertMessageAsync({
				from: moduleSettings.readableName,
				to: msgDetails.callerName,
				toId: msgDetails.callerId,
				severity: "ERROR",
				apiCallContent: msgDetails.raw.content,
				remark: PhraseFactory.get({ transUnitId: "0x0CAL0087" })
			});
			return 1;
		}

		const event = events[eventIndex];
		const date = epochDayToDate(epochDay, EasyCalendarVault.world);
		const dateStr = date.isFestival
			? `${date.monthName}, ${date.year}`
			: `${date.day}${getDaySuffix(date.day)} of ${date.monthName}, ${date.year}`;

		let body = `<div class="ez-content">`;
		body += `<div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">${dateStr}</div>`;
		body += `<div style="font-size: 12px; color: var(--ez-color-text-complement); margin-bottom: 10px;">⏰ ${event.time}</div>`;
		body += `<p>${event.description}</p>`;
		body += `</div>`;

		const menuContent = {
			title: `📌 ${event.name}`,
			subtitle: "",
			body,
			footer: ""
		};

		const styledMessage = await Utils.renderTemplateAsync({
			template: "chatMenu",
			expressions: menuContent,
			theme: "chatMenu",
			cssVars: {}
		});

		sendChat(moduleSettings.readableName, styledMessage);
		return 0;
	};

	// !SECTION End of Inner Methods: Action Processors
	// SECTION Event Hooks: Roll20 API

	// ANCHOR Member: actionMap
	const actionMap = {
		"--menu":               (msgDetails) => processMenuAsync(msgDetails),
		"--show":               (msgDetails) => processShowAsync(msgDetails),
		"--settings":           (msgDetails) => processSettingsAsync(msgDetails),
		"--images":             (msgDetails) => processImagesAsync(msgDetails),
		"--handout-colors":     (msgDetails) => processHandoutColorsAsync(msgDetails),
		"--advance-day":        (msgDetails, parsedArgs) => processAdvanceDay(msgDetails, parsedArgs),
		"--advance-hour":       (msgDetails, parsedArgs) => processAdvanceHour(msgDetails, parsedArgs),
		"--set-world":          (msgDetails, parsedArgs) => processSetWorld(msgDetails, parsedArgs),
		"--set-year":           (msgDetails, parsedArgs) => processSetYear(msgDetails, parsedArgs),
		"--set-month":          (msgDetails, parsedArgs) => processSetMonth(msgDetails, parsedArgs),
		"--set-day":            (msgDetails, parsedArgs) => processSetDay(msgDetails, parsedArgs),
		"--set-hour":           (msgDetails, parsedArgs) => processSetHour(msgDetails, parsedArgs),
		"--toggle-auto-weather":(msgDetails) => processToggleAutoWeather(msgDetails),
		"--toggle-weekdays":    (msgDetails) => processToggleWeekdays(msgDetails),
		"--set-sun":            (msgDetails) => processSetSun(msgDetails),
		"--set-moon":           (msgDetails) => processSetMoon(msgDetails),
		"--set-weather":        (msgDetails, parsedArgs) => processSetWeather(msgDetails, parsedArgs),
		"--edit-image-menu":    (msgDetails) => processEditImageMenu(msgDetails),
		"--add-image":          (msgDetails) => processAddImage(msgDetails),
		"--edit-image":         (msgDetails) => processEditImage(msgDetails),
		"--remove-image":       (msgDetails) => processRemoveImage(msgDetails),
		"--reset-image":        (msgDetails) => processResetImage(msgDetails),
		"--log":                (msgDetails) => processLogDay(msgDetails),
		"--calendar":           (msgDetails) => processOpenCalendar(msgDetails),
		"--add-event-menu":     (msgDetails, parsedArgs) => processAddEventMenu(msgDetails, parsedArgs),
		"--add-event":          (msgDetails) => processAddEvent(msgDetails),
		"--view-event":         (msgDetails) => processViewEvent(msgDetails)
	};

	actionMap["--default"] = actionMap["--menu"];

	// ANCHOR Function: initializeVault
	const initializeVault = () => {
		const today = new Date();
		const currentYear = today.getFullYear();
		const startOfYear = new Date(currentYear, 0, 1);
		const dayOfYear = Math.floor((today - startOfYear) / (24 * 60 * 60 * 1000)) + 1;

		let epochDay = 0;
		for (let y = 1; y < currentYear; y++) {
			const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
			epochDay += isLeap ? 366 : 365;
		}
		epochDay += dayOfYear - 1;

		if (EasyCalendarVault.world === undefined) EasyCalendarVault.world = "faerun";
		if (EasyCalendarVault.epochDay === undefined) EasyCalendarVault.epochDay = epochDay;
		if (EasyCalendarVault.hourOfDay === undefined) EasyCalendarVault.hourOfDay = today.getHours();
		if (EasyCalendarVault.weather === undefined) EasyCalendarVault.weather = "clear";
		if (EasyCalendarVault.autoWeather === undefined) EasyCalendarVault.autoWeather = true;
		if (EasyCalendarVault.showWeekdays === undefined) EasyCalendarVault.showWeekdays = true;
		if (EasyCalendarVault.events === undefined) EasyCalendarVault.events = {};
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

			const sharedVault = Utils.getSharedVault();
			sharedVault.EasyCalendar = sharedVault.EasyCalendar || {};
			EasyCalendarVault = sharedVault.EasyCalendar;

			initializeVault();

			// NOTE: Add localization phrases
			PhraseFactory.add({
				newMap: {
					enUS: {
						"0x0CAL0001": "Easy Calendar",
						"0x0CAL0010": "Today's Events",
						"0x0CAL0011": "Time Controls",
						"0x0CAL0012": "Celestial Controls",
						"0x0CAL0013": "Actions",
						"0x0CAL0014": "Log Day",
						"0x0CAL0015": "Open Calendar",
						"0x0CAL0016": "Show to Players",
						"0x0CAL0017": "Settings",
						"0x0CAL0020": "Weather",
						"0x0CAL0021": "Set Weather",
						"0x0CAL0030": "Only the GM can perform this action.",
						"0x0CAL0040": "World",
						"0x0CAL0041": "Year",
						"0x0CAL0042": "Month",
						"0x0CAL0043": "Day",
						"0x0CAL0044": "Hour",
						"0x0CAL0045": "Options",
						"0x0CAL0046": "Auto Weather",
						"0x0CAL0047": "Weekday Names",
						"0x0CAL0048": "Manage Images",
						"0x0CAL0049": "Back to Main",
						"0x0CAL0050": "Moon Images",
						"0x0CAL0051": "Sun Images",
						"0x0CAL0052": "Weather Images",
						"0x0CAL0053": "Back to Settings",
						"0x0CAL0060": "Image not found.",
						"0x0CAL0061": "Back to Images",
						"0x0CAL0062": "Edit Image",
						"0x0CAL0070": "No entry provided.",
						"0x0CAL0071": "Entry logged to your Daily Journal.",
						"0x0CAL0072": "Open {{ name }}",
						"0x0CAL0080": "Invalid day selected.",
						"0x0CAL0081": "Create Event",
						"0x0CAL0082": "Back to Calendar",
						"0x0CAL0083": "Add Event",
						"0x0CAL0084": "Invalid event format.",
						"0x0CAL0085": "Event '{{ name }}' added to {{ date }}.",
						"0x0CAL0086": "Invalid event reference.",
						"0x0CAL0087": "Event not found.",
						"0x0CAL0090": "Add --ez-cal-* variables to your handout's GM Notes <style> block (for Easy-Markdown).",
						"0x0CAL0091": "Available CSS Variables",
						"0x0CAL0092": "Edit the GM Notes of your calendar handout. Add variables inside the <style> block, within :root { } or standalone.",
						"0x0CAL0093": "Handout Colors"
					},
					frFR: {
						"0x0CAL0001": "Calendrier Facile",
						"0x0CAL0010": "Événements du Jour",
						"0x0CAL0011": "Contrôles du Temps",
						"0x0CAL0012": "Contrôles Célestes",
						"0x0CAL0013": "Actions",
						"0x0CAL0014": "Enregistrer le Jour",
						"0x0CAL0015": "Ouvrir le Calendrier",
						"0x0CAL0016": "Montrer aux Joueurs",
						"0x0CAL0017": "Paramètres",
						"0x0CAL0020": "Météo",
						"0x0CAL0021": "Définir la Météo",
						"0x0CAL0030": "Seul le MJ peut effectuer cette action.",
						"0x0CAL0040": "Monde",
						"0x0CAL0041": "Année",
						"0x0CAL0042": "Mois",
						"0x0CAL0043": "Jour",
						"0x0CAL0044": "Heure",
						"0x0CAL0045": "Options",
						"0x0CAL0046": "Météo Auto",
						"0x0CAL0047": "Noms des Jours",
						"0x0CAL0048": "Gérer les Images",
						"0x0CAL0049": "Retour au Menu",
						"0x0CAL0050": "Images de Lune",
						"0x0CAL0051": "Images de Soleil",
						"0x0CAL0052": "Images de Météo",
						"0x0CAL0053": "Retour aux Paramètres",
						"0x0CAL0060": "Image non trouvée.",
						"0x0CAL0061": "Retour aux Images",
						"0x0CAL0062": "Modifier l'Image",
						"0x0CAL0070": "Aucune entrée fournie.",
						"0x0CAL0071": "Entrée enregistrée dans votre Journal Quotidien.",
						"0x0CAL0072": "Ouvrir {{ name }}",
						"0x0CAL0080": "Jour sélectionné invalide.",
						"0x0CAL0081": "Créer un Événement",
						"0x0CAL0082": "Retour au Calendrier",
						"0x0CAL0083": "Ajouter un Événement",
						"0x0CAL0084": "Format d'événement invalide.",
						"0x0CAL0085": "Événement '{{ name }}' ajouté à {{ date }}.",
						"0x0CAL0086": "Référence d'événement invalide.",
						"0x0CAL0087": "Événement non trouvé.",
						"0x0CAL0090": "Ajoutez les variables --ez-cal-* au bloc <style> des Notes du MJ (pour Easy-Markdown).",
						"0x0CAL0091": "Variables CSS Disponibles",
						"0x0CAL0092": "Modifiez les Notes du MJ du calendrier. Ajoutez les variables dans le bloc <style>, dans :root { } ou seules.",
						"0x0CAL0093": "Couleurs du Calendrier"
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

	// !SECTION End of Event Hooks: Roll20 API
	// SECTION Public Methods: Exposed Interface

	return {
		getCurrentDate: () => epochDayToDate(EasyCalendarVault.epochDay, EasyCalendarVault.world),
		getCurrentWorld: () => EasyCalendarVault.world,
		getEpochDay: () => EasyCalendarVault.epochDay
	};

	// !SECTION End of Public Methods: Exposed Interface
	// !SECTION End of Object: EASY_CALENDAR
})();
