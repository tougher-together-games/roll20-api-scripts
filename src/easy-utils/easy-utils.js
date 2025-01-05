/*!
 * @language: en-US
 * @title: easy-utils.js
 * @description: Utility library for Easy Modules in Roll20. Provides reusable, memory-efficient functions to simplify module development and reduce boilerplate.
 * @comment: Developed using VSCode with extensions: Comment Anchors, ESLint, Inline Hasher (for ELF hash of dictionary transUnitIds), Spell Checker, and Live Server, along with Grunt for task automation.
 * @author: Mhykiel
 * @version: 0.1.0
 * @license: MIT License
 * @repository: {@link https://github.com/tougher-together-games/roll20-api-scripts/blob/main/src/easy-utils/easy-utils.js|GitHub Repository}
 */

/* SECTION Object: EASY_FORGE *****************************************************************************************/
/**
 * @namespace EASY_FORGE
 * @summary A global registry for managing factories shared across all Easy Modules.
 * 
 * - **Purpose**:
 *   - Acts as a shared registry for storing and retrieving factories across Easy Modules.
 *   - Simplifies access to modular resources like HTML templates, CSS themes, and localization strings.
 * 
 * - **Execution**:
 *   - Uses an Immediately Invoked Function Expression (IIFE) to create a singleton instance.
 *   - The following EASY_UTILS will initialize the "Forge" with factories.
 * 
 * - **Design**:
 *   - Maintains a central registry of factories keyed by name.
 *   - Factories follow a standardized interface, including methods like `add`, `remove`, `set`, `get`, and `init`.
 *   - Designed for sharing complex, reusable objects between modules without duplication.
 */
// eslint-disable-next-line no-unused-vars
const EASY_FORGE = (() => {
	const factories = {};

	return {

		// ANCHOR Method: getFactory
		/**
		 * @summary Retrieves a factory by its name.
		 * 
		 * @function getFactory
		 * @memberof EASY_FORGE
		 * @param {Object} params - Parameters for retrieving the factory.
		 * @param {string} params.name - The unique name of the factory to retrieve.
		 * @returns {Object|null} The factory object if found, or `null` if no factory exists with the specified name.
		 * 
		 * @example
		 * const templateFactory = EASY_FORGE.getFactory({ name: "templateFactory" });
		 * if (templateFactory) {
		 *     templateFactory.createTemplate("example");
		 * }
		 */
		getFactory: ({ name }) => {
			if (!factories.hasOwnProperty(name)) {
				return null;
			}

			return factories[name];
		},

		// ANCHOR Method: getFactory
		/**
		 * @summary Registers a factory under a specific name.
		 * 
		 * @function setFactory
		 * @memberof EASY_FORGE
		 * @param {Object} params - Parameters for registering the factory.
		 * @param {string} params.name - The unique name to associate with the factory.
		 * @param {Object} params.factory - The factory object to register.
		 * 
		 * @example
		 * EASY_FORGE.setFactory({
		 *     name: "templateFactory",
		 *     factory: { createTemplate: () => "<div></div>" }
		 * });
		 */
		setFactory: ({ name, factory }) => {
			factories[name] = factory;
		},

		// ANCHOR Method: getFactoryNames
		/**
		 * @summary Retrieves a list of all registered factory names.
		 * 
		 * @function getFactoryNames
		 * @memberof EASY_FORGE
		 * @returns {string[]} An array of names of all registered factories.
		 * 
		 * @example
		 * const factoryNames = EASY_FORGE.getFactoryNames();
		 * console.log(factoryNames); // ["templateFactory", "themeFactory"]
		 */
		getFactoryNames: () => {
			return Object.keys(factories);
		},
	};
})();

/* !SECTION End of EASY_FORGE *****************************************************************************************/

/* SECTION Object: EASY_UTILS *****************************************************************************************/
/**
 * @namespace EASY_UTILS
 * @summary A utility library for Easy Modules in Roll20, providing reusable functions to simplify module development.
 * 
 * - **Purpose**:
 *   - Reduces repetitive coding by centralizing common tasks like CSS/HTML manipulation, logging, and messaging.
 *   - Provides tools to streamline creating, rendering, and managing templates and themes.
 * 
 * - **Execution**:
 *   - Must be uploaded as the first script (farthest left tab) in the Roll20 API sandbox to ensure availability for dependent modules.
 *   - Designed to work seamlessly with the `EASY_FORGE` for managing shared factories.
 * 
 * - **Design**:
 *   - Functions use closures for memory efficiency and to customize per module.
 *   - Only required functions are loaded to save memory.
 *   - Functions use destructured parameters (objects) to ensure consistent interfaces.
 *   - Relies on a global object for factory functions and shared state.
 *   - Designed for CSS/HTML template tasks common in Roll20.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
 * @see https://dev.to/ahmedgmurtaza/use-closures-for-memory-optimizations-in-javascript-a-case-study-43h9
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
 * @see https://www.geeksforgeeks.org/parameter-destructuring/
 * @see https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/What_is_CSS#how_is_css_applied_to_html
 */
// eslint-disable-next-line no-unused-vars
const EASY_UTILS = (() => {

	// ANCHOR Member: globalSettings
	const globalSettings = {
		sharedVaultName: "EASY_VAULT",
		sharedForgeName: "EASY_FORGE",
		defaultLanguage: "enUS",
		factoryFunctions: [
			"createPhraseFactory",
			"createTemplateFactory",
			"createThemeFactory",
		],
		defaultStyle: `
			/* Primary Palette */
			--ez-color-primary: #8655b6;
			--ez-color-secondary: #34627b;
			--ez-color-tertiary: #17aee8;
			--ez-color-accent: #cc6699;
			--ez-color-complement: #fcec52;
			--ez-color-contrast: #c3b9c8;

			/* Backgrounds and Borders */
			--ez-color-background-primary: #252b2c;
			--ez-color-background-secondary: #2d3e43;
			--ez-color-background-tertiary: #8c888e;
			--ez-color-background-accent: #fbe2c4;
			--ez-color-background-complement: #3f3f3f;
			--ez-color-background-contrast: #f2f2f2;

			--ez-color-border-primary: #000000;
			--ez-color-border-shadow: #3f3f3f;
			--ez-color-border-contrast: #f2f2f2;

			/* Text */
			--ez-color-text-primary: #000000;
			--ez-color-text-secondary: #2d3e43;
			--ez-color-text-tertiary: #660000;
			--ez-color-text-accent: #cc6699;
			--ez-color-text-complement: #c9ad6a;
			--ez-color-text-contrast: #ffffff;

			/* Rainbow Colors */
			--ez-rainbow-red: #ff0000;
			--ez-rainbow-orange: #ffa500;
			--ez-rainbow-yellow: #ffff00;
			--ez-rainbow-olive: #808000;
			--ez-rainbow-green: #008000;
			--ez-rainbow-teal: #008080;
			--ez-rainbow-blue: #0000ff;
			--ez-rainbow-violet: #ee82ee;
			--ez-rainbow-purple: #800080;
			--ez-rainbow-pink: #ffc0cb;
			--ez-rainbow-brown: #a52a2a;
			--ez-rainbow-grey: #808080;
			--ez-rainbow-black: #000000;

			/* Typography Constants */
			--ez-line-height: 1.6;
			--ez-font-weight: 400;
			--ez-font-size: 62.5%;

			--ez-font-family-emoji: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
			--ez-font-family-serif: 'Times New Roman', Times, Garamond, serif, var(--ez-font-family-emoji);
			--ez-font-family-sans-serif: Ubuntu, Cantarell, Helvetica, Arial, "Helvetica Neue", sans-serif, var(--ez-font-family-emoji);
			--ez-font-family-monospace: Consolas, monospace;

			/* Layout */
			--ez-block-padding: 5px 10px;
			--ez-block-margin: .5em 0em;
			--ez-block-radius: 5px;
		`
	};

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Utils",
		chatApiName: "ezutils",
		globalName: "EASY_UTILS",
		version: "1.0.0",
		author: "Mhykiel",
		verbose: false,
		debug: {
			"applyCssToHtmlJson": false,
			"convertCssToJson": false,
			"convertHtmlToJson": false,
			"convertMarkdownToHtml": false,
			"convertJsonToHtml": false,
			"convertToSingleLine": false,
			"createPhraseFactory": false,
			"createTemplateFactory": false,
			"createThemeFactory": false,
			"decodeCodeBlock": false,
			"encodeCodeBlock": false,
			"decodeNoteContent": false,
			"encodeNoteContent": false,
			"getGlobalSettings": false,
			"getSharedForge": false,
			"getSharedVault": false,
			"logSyslogMessage": false,
			"parseChatCommands": false,
			"parseChatSubcommands": false,
			"replacePlaceholders": false,
			"renderTemplateAsync": false,
			"whisperAlertMessageAsync": false,
			"whisperPlayerMessage": false
		}
	};

	// ANCHOR Factory References
	// References to factories, reassigned during checkInstall to initialize and provide basic syslog messages to EASY_UTILS.
	let Utils = {};
	let PhraseFactory = {};
	// let TemplateFactory = {};
	// let ThemeFactory = {};

	/* SECTION Private Methods: functionLoaders ***********************************************************************/
	/**
	 * @namespace functionLoaders
	 * @memberof EASY_UTILS
	 * @summary Utility functions for Roll20 modules, built with double closures for efficiency and flexibility.
	 * 
	 * - **Purpose**:
	 *   - Reduce memory usage by only instantiating functions when requested.
	 *   - Provide customized behavior for each module by wrapping functions with `moduleSettings`.
	 *   - Ensure consistency across modules with standardized implementations of routine functions.
	 * 
	 * - **Design**:
	 *   - The first closure caches dependencies and module-specific settings, while the second returns the customized function.
	 * 
	 * @example
	 * // Retrieve a customized function instance:
	 * const customizedFunction = EASY_UTILS.functionLoaders.getFunction({
	 *     functionName: "functionName", 
	 *     moduleSettings
	 * });
	 */
	const functionLoaders = {

		/* SECTION Utilities: Low Level *******************************************************************************/
		/**
		 * @summary Basic, reusable, and stateless functions for small, specific tasks. 
		 * 
		 * - Support higher-level functions but can be used independently.
		 * - Do not require `moduleSettings` but include it for consistency and optional logging.
		 * - Handle errors gracefully (e.g., return default values or log warnings) without throwing exceptions.
		 */

		// ANCHOR Utilities: applyCssToHtmlJson
		/**
		 * @summary Applies CSS rules (provided as JSON) to an HTML-like structure (also provided as JSON).
		 * 
		 * - Parses and processes CSS rules, including `:root` variables, selectors, and pseudo-classes.
		 * - Applies matching CSS styles as inline styles to nodes in the HTML JSON structure.
		 * - Resolves `var(--css-variable)` values from `:root` variables or default values.
		 * 
		 * @function applyCssToHtmlJson
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function for applying CSS.
		 * 
		 * @param {Object} params - Parameters for the function.
		 * @param {Array|Object} params.cssJson - The JSON representation of the CSS rules.
		 * @param {Array|Object} params.htmlJson - The JSON representation of the HTML structure.
		 * 
		 * @returns {string} The resulting HTML JSON with styles applied as inline styles.
		 * 
		 * @example
		 * const cssJson = [
		 *   { selector: ":root", style: { "--main-color": "blue" } },
		 *   { selector: "div", style: { color: "var(--main-color)", background: "white" } }
		 * ];
		 * const htmlJson = [
		 *   {
		 *     element: "div",
		 *     attributes: { id: "rootContainer" },
		 *     children: [
		 *       { element: "span", attributes: { class: ["highlight"] }, children: [{ element: "text", innerText: "Hello" }] }
		 *     ]
		 *   }
		 * ];
		 * 
		 * const updatedHtmlJson = applyCssToHtmlJson()(moduleSettings)({ cssJson, htmlJson });
		 * log(updatedHtmlJson);
		 * // Output: JSON with styles applied to matching nodes
		 * // [
		 * //   {
		 * //     element: "div",
		 * //     attributes: {
		 * //       id: "rootContainer",
		 * //       style: { color: "blue", background: "white" }
		 * //     },
		 * //     children: [...]
		 * //   }
		 * // ]
		 */
		applyCssToHtmlJson: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings, });
				const replacePlaceholders = EASY_UTILS.getFunction({ functionName: "replacePlaceholders", moduleSettings, });

				// Subroutine: preprocessRootRules
				/**
				 * @function preprocessRootRules
				 * @summary Extracts CSS variables from the `:root` selector and applies non-variable properties 
				 *          to the `#rootContainer` element in the HTML tree. It also removes the `:root` rule 
				 *          from the CSS rules array for subsequent processing.
				 *
				 * @param {Array<Object>} cssRules - The array of CSS rule objects, where each rule contains a `selector` and `style` object.
				 * @param {Array|Object} htmlTree - The HTML structure in JSON format, either as a single root node or an array of nodes.
				 * 
				 * @returns {Object} An object containing:
				 *                   - `rootVariables` {Object}: Extracted CSS variables (key-value pairs from `:root`).
				 *                   - `updatedRules` {Array<Object>}: The remaining CSS rules after removing the `:root` rule.
				 */
				function preprocessRootRules(cssRules, htmlTree) {
					const rootIndex = cssRules.findIndex((r) => { return r.selector === ":root"; });
					if (rootIndex < 0) {
						return { rootVariables: {}, updatedRules: cssRules };
					}

					const rootRule = cssRules[rootIndex];
					const rootStyle = rootRule.style ?? {};

					// Separate variables from normal css declarations
					const rootVariables = {};
					const rootNonVars = {};
					for (const [propKey, propValue] of Object.entries(rootStyle)) {
						if (propKey.startsWith("--")) {
							rootVariables[propKey] = propValue;
						} else {
							rootNonVars[propKey] = propValue;
						}
					}

					// See if #rootContainer exists
					const allNodes = flattenHtmlTree(htmlTree);
					const rootContainerNode = allNodes.find(
						(node) => { return node.attributes?.id === "rootContainer"; }
					);
					if (rootContainerNode) {
						rootContainerNode.attributes = rootContainerNode.attributes || {};
						rootContainerNode.attributes.style =
							rootContainerNode.attributes.style || {};
						mergeStyles(rootContainerNode.attributes.style, rootNonVars, rootVariables);
					}

					// Remove :root rule
					const updatedRules = cssRules.filter((r) => { return r.selector !== ":root"; });

					return { rootVariables, updatedRules };
				}

				// Subroutine: flattenHtmlTree
				/**
				 * @function flattenHtmlTree
				 * @summary Depth-first traversal to collect all nodes in one flat array.
				 *          Also adds `.parentNode` to each node.
				 */
				function flattenHtmlTree(nodeOrArray, results = [], parent = null) {
					if (Array.isArray(nodeOrArray)) {
						for (const child of nodeOrArray) {
							flattenHtmlTree(child, results, parent);
						}
					} else if (nodeOrArray && typeof nodeOrArray === "object") {
						nodeOrArray.parentNode = parent;
						results.push(nodeOrArray);
						if (Array.isArray(nodeOrArray.children)) {
							for (const c of nodeOrArray.children) {
								flattenHtmlTree(c, results, nodeOrArray);
							}
						}
					}

					return results;
				}

				// Subroutine: tokenizeSelector
				/**
				 * @function tokenizeSelector
				 * @summary Splits a CSS selector string by `,` into groups, then parses each
				 *          group to handle space (descendant) and `>` (direct child).
				 *
				 * @example
				 *   "ul p, .class #id > span"
				 *   => an array of chains, each chain is an array of
				 *      { combinator: " " or ">", segment: "..." }
				 * 
				 *   For instance: "ul p" => [
				 *       { combinator: null, segment: "ul" },
				 *       { combinator: " ", segment: "p" }
				 *   ]
				 */
				function tokenizeSelector(selector) {
					// First, split by commas to handle multiple selectors:
					const groups = selector.split(",").map((s) => { return s.trim(); });

					// For each group, parse out direct child (>) vs descendant (space).
					// We'll do a simple approach: split on whitespace or '>' to detect combinators.
					const chainsArray = [];

					for (const group of groups) {
						const tokens = splitSelectorGroup(group);
						// tokens might look like:
						//   [
						//     { combinator: null, segment: "ul" },
						//     { combinator: " ", segment: "p" }
						//   ]
						chainsArray.push(tokens);
					}

					return chainsArray;
				}

				// Subroutine: splitSelectorGroup
				/**
				 * @function splitSelectorGroup
				 * @summary Splits a single CSS selector group (no commas) into an array of objects, 
				 *          each containing a `combinator` and a `segment`. This helps differentiate
				 *          between direct child (`>`) and descendant (` `) relationships in CSS selectors.
				 *
				 * @param {string} group - A single CSS selector group without commas (e.g., "ul > li p").
				 *
				 * @returns {Array<Object>} An array of objects, where each object has:
				 *                          - `combinator` {string|null}: The relationship between the current and next segment:
				 *                            - `null` for the first segment.
				 *                            - `" "` for descendant combinators (space-separated).
				 *                            - `">"` for direct child combinators.
				 *                          - `segment` {string}: The CSS selector part (e.g., "ul", "li", "p").
				 *
				 * @example
				 * const group = "ul > li p";
				 * const result = splitSelectorGroup(group);
				 * console.log(result);
				 * // Output:
				 * // [
				 * //   { combinator: null, segment: "ul" },
				 * //   { combinator: ">", segment: "li" },
				 * //   { combinator: " ", segment: "p" }
				 * // ]
				 *
				 * @example
				 * const group = "div > .class #id";
				 * const result = splitSelectorGroup(group);
				 * console.log(result);
				 * // Output:
				 * // [
				 * //   { combinator: null, segment: "div" },
				 * //   { combinator: ">", segment: ".class" },
				 * //   { combinator: " ", segment: "#id" }
				 * // ]
				 */
				function splitSelectorGroup(group) {
					// Easiest is to insert space around '>' to ensure we can split on whitespace:
					// "ul>li p" => "ul > li p"
					// Then we split by whitespace to get tokens: ["ul", ">", "li", "p"]
					// We'll walk them to see if they're ">" or a segment.
					const spaced = group.replace(/>/g, " > ");
					const rawTokens = spaced.split(/\s+/).filter(Boolean);

					const results = [];
					// We'll track the "current combinator" for the next segment.
					let combinator = null;
					for (const token of rawTokens) {
						if (token === ">") {
							// Next segment is a direct child
							combinator = ">";
						} else {
							// It's a segment
							results.push({ combinator, segment: token });
							combinator = " "; // default any future segments to "descendant" if not '>'
						}
					}

					// If the first item is a segment with combinator = null => it's the first part
					// all subsequent ones get either ">" or " "
					return results;
				}

				// Subroutine: parseSegment
				/**
				 * @function parseSegment
				 * @summary Parses a single CSS selector segment to extract its components, such as tag name, ID, classes, attributes, and pseudo-classes.
				 *
				 * @param {string} segment - A CSS selector segment (e.g., "div#main.container[role='button']:nth-child(2):empty").
				 *
				 * @returns {Object} An object containing the parsed information:
				 *                   - `tag` {string|null}: The tag name (e.g., "div").
				 *                   - `id` {string|null}: The ID (e.g., "main").
				 *                   - `classes` {Array<string>}: A list of classes (e.g., ["container"]).
				 *                   - `attributes` {Object}: A map of attribute key-value pairs (e.g., { role: "button" }).
				 *                   - `pseudo` {Object}:
				 *                     - `nthChild` {string|number|null}: Specifies the `:nth-child()` pseudo-class value (e.g., "even", "odd", or a number).
				 *                     - `firstChild` {boolean}: Whether the segment specifies `:first-child`.
				 *                     - `lastChild` {boolean}: Whether the segment specifies `:last-child`.
				 *                     - `empty` {boolean}: Whether the segment specifies `:empty`.
				 */
				function parseSegment(segment) {
					const data = {
						tag: null,
						id: null,
						classes: [],
						attributes: {},
						pseudo: {
							nthChild: null,
							firstChild: false,
							lastChild: false,
							empty: false,
						},
					};

					let working = segment.trim();

					// [attr="val"]
					const attrRegex = /\[([\w-]+)\s*=\s*"([^"]+)"\]/g;
					let attrMatch;
					while ((attrMatch = attrRegex.exec(working)) !== null) {
						const attrKey = attrMatch[1];
						const attrVal = attrMatch[2];
						data.attributes[attrKey] = attrVal;
					}
					working = working.replace(attrRegex, "");

					// #id
					const idRegex = /#([\w-]+)/;
					const idMatch = idRegex.exec(working);
					if (idMatch) {
						data.id = idMatch[1];
						working = working.replace(idRegex, "");
					}

					// .class
					const classRegex = /\.([\w-]+)/g;
					let cMatch;
					while ((cMatch = classRegex.exec(working)) !== null) {
						data.classes.push(cMatch[1]);
					}
					working = working.replace(classRegex, "");

					// :first-child
					if (/:first-child/.test(working)) {
						data.pseudo.firstChild = true;
						working = working.replace(":first-child", "");
					}
					// :last-child
					if (/:last-child/.test(working)) {
						data.pseudo.lastChild = true;
						working = working.replace(":last-child", "");
					}

					// :nth-child(even|odd|number)
					const nthRegex = /:nth-child\(\s*(even|odd|\d+)\s*\)/;
					const nthMatch = nthRegex.exec(working);
					if (nthMatch) {
						const val = nthMatch[1];
						if (val === "even" || val === "odd") {
							data.pseudo.nthChild = val;
						} else {
							data.pseudo.nthChild = parseInt(val, 10);
						}
						working = working.replace(nthRegex, "");
					}

					// :empty
					if (/:empty/.test(working)) {
						data.pseudo.empty = true;
						working = working.replace(":empty", "");
					}

					// leftover => tag
					const leftover = working.trim();
					if (leftover) {
						data.tag = leftover;
					}

					return data;
				}

				// ---------------------------------------------------------------------------
				// Subroutine doesNodeMatchSegment
				// ---------------------------------------------------------------------------
				function doesNodeMatchSegment(node, segmentData) {
					// 1) tag
					if (segmentData.tag && segmentData.tag !== node.element) {
						return false;
					}
					// 2) id
					if (segmentData.id && node.attributes?.id !== segmentData.id) {
						return false;
					}
					// 3) classes
					if (segmentData.classes.length > 0) {
						const nodeClasses = node.attributes?.classList || [];
						for (const neededClass of segmentData.classes) {
							if (!nodeClasses.includes(neededClass)) {
								return false;
							}
						}
					}
					// 4) attributes
					for (const [k, v] of Object.entries(segmentData.attributes)) {
						if (node.attributes?.[k] !== v) {
							return false;
						}
					}
					// 5) pseudo
					const { firstChild, lastChild, nthChild, empty } = segmentData.pseudo;

					// :empty => must have no children
					if (empty) {
						const hasChildren = Array.isArray(node.children) && node.children.length > 0;
						if (hasChildren) {
							return false;
						}
					}

					// handle :first-child, :last-child, :nth-child
					if (firstChild || lastChild || nthChild !== null) {
						const parent = node.parentNode;
						if (!parent || !Array.isArray(parent.children)) {
							return false;
						}
						const idx = parent.children.indexOf(node); // 0-based
						if (firstChild && idx !== 0) {
							return false;
						}
						if (lastChild && idx !== parent.children.length - 1) {
							return false;
						}
						if (nthChild !== null) {
							if (nthChild === "odd") {
								if (idx % 2 !== 0) return false;
							} else if (nthChild === "even") {
								if (idx % 2 !== 1) return false;
							} else {
								// numeric => e.g. 3 => idx=2
								if (idx !== nthChild - 1) return false;
							}
						}
					}

					return true;
				}

				// ---------------------------------------------------------------------------
				// Subroutine filterNodesBySegment
				// ---------------------------------------------------------------------------
				function filterNodesBySegment(nodes, segmentData) {
					const results = [];
					for (const n of nodes) {
						if (doesNodeMatchSegment(n, segmentData)) {
							results.push(n);
						}
					}

					return results;
				}

				// ---------------------------------------------------------------------------
				// Descendant Gather Helpers
				// ---------------------------------------------------------------------------
				/**
				 * Returns *all descendants* of `node` (including children, grandchildren, etc.).
				 * We'll gather them in a flat list.
				 */
				function gatherDescendants(node) {
					const result = [];
					if (!node.children) return result;
					for (const child of node.children) {
						result.push(child);
						result.push(...gatherDescendants(child));
					}

					return result;
				}

				// Subroutine: filterByChain
				/**
				 * @function filterByChain
				 * @summary Given a single array of steps (with combinator/segment pairs), find all matching nodes.
				 * @param {Object|Array<Object>} htmlRoot - The root of the HTML JSON tree.
				 * @param {Array<{combinator: string|null, segment: string}>} chain
				 */
				function filterByChain(htmlRoot, chain) {
					// Flatten tree once
					const allNodes = flattenHtmlTree(htmlRoot, []);
					// Parse the first segment
					const { segment: firstSeg, combinator: firstComb } = chain[0];
					const firstData = parseSegment(firstSeg);

					// We'll filter from all nodes for the first segment
					let currentSet = filterNodesBySegment(allNodes, firstData);

					// Process subsequent steps
					for (let i = 1; i < chain.length; i++) {
						const { combinator, segment } = chain[i];
						const segData = parseSegment(segment);
						const nextSet = [];

						// For each node in currentSet, we look for matches among either its direct children or all descendants
						for (const matchedNode of currentSet) {
							// direct child combinator '>'
							if (combinator === ">") {
								if (Array.isArray(matchedNode.children)) {
									for (const childNode of matchedNode.children) {
										if (doesNodeMatchSegment(childNode, segData)) {
											nextSet.push(childNode);
										}
									}
								}
							}
							// descendant combinator ' '
							else {
								// gather *all* descendants
								const descendants = gatherDescendants(matchedNode);
								// filter them
								const matched = filterNodesBySegment(descendants, segData);
								nextSet.push(...matched);
							}
						}
						currentSet = nextSet;
					}

					return currentSet;
				}

				// Subroutine: filterBySelector
				/**
				 * @function filterBySelector
				 * @summary Handles multiple comma-separated groups; each group can have
				 *          ">" or " " (descendant) combinators.
				 */
				function filterBySelector(htmlRoot, selector) {
					const chainsArray = tokenizeSelector(selector);
					const resultSet = new Set();

					// For each chain (one group of the selector string), get matching nodes
					for (const chain of chainsArray) {
						const matched = filterByChain(htmlRoot, chain);
						for (const node of matched) {
							resultSet.add(node);
						}
					}

					return [...resultSet];
				}

				// ---------------------------------------------------------------------------
				// Subroutine mergeStyles
				// ---------------------------------------------------------------------------
				function mergeStyles(nodeStyle, newStyles, rootVars) {
					for (const [prop, val] of Object.entries(newStyles)) {
						nodeStyle[prop] = replacePlaceholders({ text: val, cssVars: rootVars });
					}
				}

				// ---------------------------------------------------------------------------
				// Subroutine removeParentRefs
				// ---------------------------------------------------------------------------
				function removeParentRefs(objOrArray) {
					if (Array.isArray(objOrArray)) {
						for (const item of objOrArray) {
							removeParentRefs(item);
						}
					} else if (objOrArray && typeof objOrArray === "object") {
						delete objOrArray.parentNode;
						if (Array.isArray(objOrArray.children)) {
							for (const child of objOrArray.children) {
								removeParentRefs(child);
							}
						}
					}
				}

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ cssJson, htmlJson }) => {
					try {
						// Convert inputs if needed
						let cssRules = typeof cssJson === "string" ? JSON.parse(cssJson) : cssJson;
						let htmlTree = typeof htmlJson === "string" ? JSON.parse(htmlJson) : htmlJson;

						if (!Array.isArray(cssRules)) {
							cssRules = [];
						}
						if (!Array.isArray(htmlTree)) {
							htmlTree = [htmlTree];
						}

						// Preprocess :root => rootVariables + #rootContainer
						const { rootVariables, updatedRules } = preprocessRootRules(cssRules, htmlTree);
						cssRules = updatedRules;

						// For each rule => find matched => merge style
						for (const rule of cssRules) {
							const { selector, style } = rule;
							// filter nodes
							const matchedNodes = filterBySelector(htmlTree, selector);
							// merge style
							for (const node of matchedNodes) {
								node.attributes = node.attributes || {};
								node.attributes.style = node.attributes.style || {};
								mergeStyles(node.attributes.style, style, rootVariables);
							}
						}

						// remove .parentNode
						removeParentRefs(htmlTree);
						const output = JSON.stringify(htmlTree, null, 2);

						// Debug logging if desired
						if (moduleSettings?.debug?.applyCssToHtmlJson ?? false) {
							logSyslogMessage({
								severity: 7, // DEBUG
								tag: "applyCssToHtmlJson",
								transUnitId: "70000",
								message: output,
							});
						}

						return output;
					} catch (err) {
						logSyslogMessage({
							severity: 3,
							tag: "applyCssToHtmlJson",
							transUnitId: "50000",
							message: `${err}`,
						});

						return htmlJson;
					}
				};
			};
		},

		// ANCHOR Utilities: convertCssToJson
		/**
		 * @summary Converts a CSS string into a JSON representation of CSS rules.
		 * 
		 * - Parses CSS selectors, properties, and values into structured JSON.
		 * - Calculates specificity for each selector and sorts the rules accordingly.
		 * - Handles multiple selectors, inline styles, and block comments.
		 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity
		 * 
		 * @function convertCssToJson
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function for CSS-to-JSON conversion.
		 * 
		 * @param {Object} params - Parameters for the conversion.
		 * @param {string} params.css - The input CSS string to convert.
		 * 
		 * @returns {string} The resulting JSON string representing the parsed CSS rules.
		 * 
		 * @example
		 * // Example usage
		 * const css = `
		 *   div, p {
		 *     color: red;
		 *     background: blue;
		 *   }
		 *   #myId {
		 *     margin: 10px;
		 *   }
		 *   .myClass:hover {
		 *     font-weight: bold;
		 *   }
		 * `;
		 * 
		 * const cssJsonStr = convertCssToJson()(moduleSettings)({ css });
		 * log(cssJsonStr);
		 * // Output: JSON representation of the CSS rules
		 * // [
		 * //   {
		 * //     "selector": "div",
		 * //     "style": {
		 * //       "color": "red",
		 * //       "background": "blue"
		 * //     },
		 * //     "weight": 1,
		 * //     "index": 0
		 * //   },
		 * //   {
		 * //     "selector": "p",
		 * //     "style": {
		 * //       "color": "red",
		 * //       "background": "blue"
		 * //     },
		 * //     "weight": 1,
		 * //     "index": 1
		 * //   },
		 * //   {
		 * //     "selector": "#myId",
		 * //     "style": {
		 * //       "margin": "10px"
		 * //     },
		 * //     "weight": 100,
		 * //     "index": 2
		 * //   },
		 * //   {
		 * //     "selector": ".myClass:hover",
		 * //     "style": {
		 * //       "font-weight": "bold"
		 * //     },
		 * //     "weight": 11,
		 * //     "index": 3
		 * //   }
		 * // ]
		 */
		convertCssToJson: function () {
			return (moduleSettings) => {
				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings, });

				// Subroutine: calculateSpecificity
				/**
				 * @function calculateSpecificity
				 * @description Calculates the specificity of a CSS selector as a single numeric value.
				 *              - ID selectors contribute 100 each.
				 *              - Class selectors, pseudo-classes, and attribute selectors contribute 10 each.
				 *              - Type selectors and pseudo-elements contribute 1 each.
				 * 
				 * @param {string} selector - The CSS selector to analyze.
				 * @returns {number} The calculated specificity value.
				 */
				const calculateSpecificity = (selector) => {

					// Remove spacing around combinator like '>', '+', '~' to simplify splitting
					const cleanedSelector = selector
						.replace(/\s*>\s*/g, ">")
						.replace(/\s*\+\s*/g, "+")
						.replace(/\s*~\s*/g, "~")
						.replace(/,\n/g, ",")
						.trim();

					// Split on combinator (space, >, +, ~) to evaluate each target element separately
					const targetElementsArray = cleanedSelector.split(/\s|>|\+|~(?![^\[]*\])/g).filter(Boolean);

					let a = 0; // ID count
					let b = 0; // Class, pseudo-class, attribute
					let c = 0; // Type, pseudo-element

					targetElementsArray.forEach((aTargetElement) => {

						// Split aTargetElement by sub-selectors that might appear together
						// e.g., "div.myClass:hover" => ["div", ".myClass", ":hover"]
						const elementIdentifiers = aTargetElement.split(/(?=[#.:\[])/).filter(Boolean);

						elementIdentifiers.forEach((propertyType) => {
							if (propertyType.startsWith("#")) {
								// ID => a
								a += 1;
							} else if (propertyType.startsWith(".")) {
								// Class => b
								b += 1;
							} else if (propertyType.startsWith("[")) {
								// Attribute => b
								b += 1;
							} else if (propertyType.startsWith(":")) {
								// Pseudo-class or pseudo-element
								// Single-colon => pseudo-class => b
								// Double-colon => pseudo-element => c
								if (propertyType.startsWith("::")) {
									c += 1; // pseudo-element
								} else {
									b += 1; // pseudo-class
								}
							} else {
								// Type selector => c
								if (propertyType.trim() !== "") {
									c += 1;
								}
							}
						});
					});

					// Calculate single specificity number
					const specificity = a * 100 + b * 10 + c * 1;

					return specificity;
				};

				// Subroutine: compareSpecificity
				/**
				 * @function compareSpecificity
				 * @description Compares two CSS rule objects by specificity and index for sorting.
				 *              - Higher specificity weight comes first.
				 *              - For ties, earlier rules (lower index) come first.
				 * 
				 * @param {Object} ruleA - The first CSS rule object to compare.
				 * @param {Object} ruleB - The second CSS rule object to compare.
				 * 
				 * @returns {number} A negative number if `ruleA` should come before `ruleB`,
				 *                   a positive number if `ruleB` should come before `ruleA`,
				 *                   or 0 if they are equal.
				 */
				const compareSpecificity = (ruleA, ruleB) => {
					if (ruleA.weight !== ruleB.weight) {
						return ruleA.weight - ruleB.weight;
					}

					// Tie-breaker => rule index
					return ruleA.index - ruleB.index;
				};

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ css }) => {
					try {

						/* Clean up the raw CSS
						============================================================================================= */
						const cleanedCss = css
							.replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
							.replace(/\n/g, " ") // Replace newlines with spaces
							.replace(/\s+/g, " ") // Collapse multiple spaces
							.trim();

						/* Prepare the array that will hold all CSS rules objects
						============================================================================================= */
						const ruleList = [];

						/* Define regex patterns to capture selectors and their style blocks
						============================================================================================= */
						const ruleRegex = /([^\{]+)\{([^\}]+)\}/g;
						const propertiesRegex = /([\w-]+)\s*:\s*([^;]+);/g;

						/* Iterate over each CSS rule block
						============================================================================================= */
						let ruleMatch;
						let ruleIndex = 0;
						while ((ruleMatch = ruleRegex.exec(cleanedCss))) {
							const selectorsRaw = ruleMatch[1].trim(); // e.g., "div, p:hover, .myClass"
							const declarationsRaw = ruleMatch[2].trim(); // e.g., "color: red; background: blue;"

							// Parse the rule's declarations into an object
							const declarationsObj = {};
							let propMatch;
							while ((propMatch = propertiesRegex.exec(declarationsRaw))) {
								const propertyKey = propMatch[1].trim();
								const propertyValue = propMatch[2].trim();
								declarationsObj[propertyKey] = propertyValue;
							}

							// Split group, comma-separated, selectors => e.g., "div, p" => ["div", "p"]
							// Then trim spaces from around combinator like ">,+,~"
							const individualSelectors = selectorsRaw
								.split(",")
								.map((aSelector) => {
									return aSelector.replace(/\s*>\s*/g, ">")
										.replace(/\s*\+\s*/g, "+")
										.replace(/\s*~\s*/g, "~")
										.trim();
								});

							// For each selector in the group, we add to the json representation as if the each tag in
							// the group was written separately.
							individualSelectors.forEach((aSelector) => {
								const specificity = calculateSpecificity(aSelector);
								ruleList.push({
									selector: aSelector,
									style: { ...declarationsObj },
									weight: specificity,
									index: ruleIndex,
								});

								// Increment for next rule (as a tie-breaker)
								ruleIndex++;
							});
						}

						/* Sort the array by weight (specificity) and index
						============================================================================================= */
						ruleList.sort(compareSpecificity);

						/* Convert the nested object structure into a JSON string 
						============================================================================================= */
						const output = JSON.stringify(ruleList, null, 2);

						// Optional: debug logging
						if (moduleSettings?.debug?.convertCssToJson ?? false) {
							logSyslogMessage({
								severity: 7, // DEBUG
								tag: "convertCssToJson",
								transUnitId: "70000",
								message: output,
							});
						}

						return output;

					} catch (err) {

						logSyslogMessage({
							severity: 3,
							tag: "applyCssToHtmlJson",
							// "50000": "Error: {{ remark }}",
							transUnitId: "50000",
							message: `${err}`,
						});

						// Return an empty array fallback
						return JSON.stringify([]);
					}
				};
			};
		},

		// ANCHOR Utilities: convertHtmlToJson
		/**
		 * @summary Converts an HTML string into an HTML JSON structure.
		 * 
		 * - Parses HTML elements, attributes, and text nodes into a hierarchical JSON representation.
		 * - Handles malformed or unclosed tags gracefully by logging warnings or errors.
		 * - Supports inline styles, classListes, and custom attributes.
		 * 
		 * @function convertHtmlToJson
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function for HTML-to-JSON conversion.
		 * 
		 * @param {Object} params - Parameters for the conversion.
		 * @param {string} params.html - The input HTML string to convert.
		 * 
		 * @returns {string} The resulting JSON string representing the HTML structure.
		 * 
		 * @example
		 * // Example usage
		 * const htmlJsonStr = convertHtmlToJson()(moduleSettings)({ 
		 *     html: "<div id='container'><p>Hello, World!</p><img src='image.png' /></div>"
		 * });
		 * log(htmlJsonStr);
		 * // Output:
		 * // [
		 * //   {
		 * //     "element": "div",
		 * //     "attributes": {
		 * //       "id": "container",
		 * //       "style": {},
		 * //       "classList": [],
		 * //       "inlineStyle": {}
		 * //     },
		 * //     "children": [
		 * //       {
		 * //         "element": "p",
		 * //         "attributes": { "style": {}, "classList": [], "id": null, "inlineStyle": {} },
		 * //         "children": [
		 * //           { "element": "text", "children": [{ "innerText": "Hello, World!" }] }
		 * //         ]
		 * //       },
		 * //       {
		 * //         "element": "img",
		 * //         "attributes": { "src": "image.png", "style": {}, "classList": [], "id": null, "inlineStyle": {} },
		 * //         "children": []
		 * //       }
		 * //     ]
		 * //   }
		 * // ]
		 */
		convertHtmlToJson: function () {
			return (moduleSettings) => {

				// Cache Dependencies (or any custom logging function you have)
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

				// A known set of tags that are ALWAYS treated as self-closing (even if the HTML doesn't have a slash)
				const SELF_CLOSING_TAGS = new Set([
					"br",
					"hr",
					"img",
					"input",
					"link",
					"meta",
					"base",
					"area",
					"source",
					"track",
					"col",
					"embed"
				]);

				// Subroutine: parseAttributes
				/**
				 * @function parseAttributes
				 * @description Parses a raw attribute string (e.g. `id="foo" style="color: red;"`) into
				 *              an attributes object with `style`, `inlineStyle`, `classList`, etc.
				 *              - `style` is kept as an **empty** object for future use.
				 *              - `inlineStyle` stores the parsed CSS from `style="..."`.
				 */
				function parseAttributes(rawAttributes) {
					const thisElementAttributes = {
						style: {},      // remains empty
						inlineStyle: {},
						classList: [],
						id: null
					};

					if (!rawAttributes) { return thisElementAttributes; }

					// A simple regex to capture key="value" pairs
					const attributeRegex = /([\w-]+)\s*=\s*["']([^"']+)["']/g;
					let attributeMatch;
					while ((attributeMatch = attributeRegex.exec(rawAttributes))) {
						const [, aAttrName, aAttrValue] = attributeMatch;

						switch (aAttrName) {
						case "style":
							// Convert inline style from "key: val; key2: val2" into an object
							const thisInlineStyle = {};
							aAttrValue.split(";").forEach((styleDecl) => {
								const [key, val] = styleDecl.split(":").map((s) => { return s.trim(); });
								if (key && val) {
									thisInlineStyle[key] = val;
								}
							});
							thisElementAttributes.inlineStyle = thisInlineStyle;
							break;

						case "class":
							// Could appear as class="foo bar"
							// .filter(Boolean) removes empty strings from new array
							thisElementAttributes.classList = aAttrValue.split(" ").filter(Boolean);
							break;

						case "id":
							thisElementAttributes.id = aAttrValue;
							break;

						default:
							// Catch-all for other attributes: src, alt, name, etc.
							thisElementAttributes[aAttrName] = aAttrValue;
							break;
						}
					}

					return thisElementAttributes;
				}

				// Subroutine: appendChild
				/**
				 * @function appendChild
				 * @description Attaches a new child node to the given parent node, 
				 *              setting the child's childIndex automatically.
				 * @param {Object} parent - The parent node in the JSON structure.
				 * @param {Object} child - The new child node to append.
				 */
				function appendChild(parent, child) {
					child.childIndex = parent.children.length + 1;
					parent.children.push(child);
				}

				// Subroutine: parseHtmlToObj
				/**
				 * @function parseHtmlToObj
				 * @description Converts tokens into a structured JSON tree.
				 *              The root is always a <div id="rootContainer"> with children.
				 *              Any existing HTML style attributes go to `inlineStyle`.
				 *              `style` remains empty.
				 */
				function parseHtmlToObj(tokens) {

					const htmlJsonStack = [];

					// Standard container for api rendered html
					const rootContainer = {
						element: "div",
						attributes: {
							id: "rootContainer",
							style: {},
							classList: [],
							inlineStyle: {}
						},
						children: [],
						childIndex: 1
					};

					htmlJsonStack.push(rootContainer);

					// Regex for opening or self-closing tags like <div>, <img/>, <br>, etc.
					const openingTagRegex = /^<(\w+)([^>]*)\/?>$/;

					// Regex for closing tags like </div>, </p>, etc.
					const closingTagRegex = /^<\/(\w+)>$/;

					for (const token of tokens) {
						const cleanedToken = token.trim();
						if (!cleanedToken) continue;

						// Check for closing tag (e.g. </div>)
						const closingMatch = cleanedToken.match(closingTagRegex);
						if (closingMatch) {
							htmlJsonStack.pop();
							continue;
						}

						// Check for an opening or self-closing tag
						const openMatch = cleanedToken.match(openingTagRegex);
						if (openMatch) {
							const [fullMatch, tagName, rawAttrPart] = openMatch;

							// Determine if physically self-closing (ends with "/>") or if in known set
							let isSelfClosing = /\/>$/.test(fullMatch);
							if (SELF_CLOSING_TAGS.has(tagName.toLowerCase())) {
								isSelfClosing = true;
							}

							// Parse the attributes
							const thisElementAttributes = parseAttributes(rawAttrPart);

							// Build the node
							const newNode = {
								element: tagName,
								attributes: thisElementAttributes,
								children: [],
								childIndex: 0 // will set below
							};

							// Attach it to the current parent
							const parent = htmlJsonStack[htmlJsonStack.length - 1];
							if (parent) {
								appendChild(parent, newNode);
							}

							// If it's NOT self-closing, push it onto the htmlJsonStack, so future tokens become its children
							if (!isSelfClosing) {
								htmlJsonStack.push(newNode);
							}

							continue;
						}

						// Otherwise, assume it is text node
						const textVal = cleanedToken;
						if (textVal) {
							const textNode = {
								element: "text",
								// We can store the actual text in a child array or directly
								children: [{ innerText: textVal }],
								childIndex: 0
							};

							// Attach to current parent
							const parent = htmlJsonStack[htmlJsonStack.length - 1];
							if (parent) {
								appendChild(parent, textNode);
							}
						}
					}

					// If htmlJsonStack > 1, we have unclosed tags
					if (htmlJsonStack.length !== 1) {
						throw new Error("Invalid HTML: Unclosed tags detected. Ensure HTML is well-formed.");
					}

					// Return the array containing only the root container at top level
					return [rootContainer];
				}

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                           Main Closure                                                            │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ html }) => {
					try {

						/* Normalize the raw HTML
						============================================================================================= */
						// Remove HTML comments
						// Replace newlines with spaces
						// Collapse multiple spaces
						// Trim leading/trailing whitespace
						const cleanedHtml = html
							.replace(/<!--[\s\S]*?-->/g, "")
							.replace(/\n/g, " ")
							.replace(/\s+/g, " ")
							.trim();

						/* Parse html tags into opening, self closing, closing, and text tokens.
						============================================================================================= */
						// e.g. "<div> Hello <br/> World </div>" -> ["<div>", "Hello", "<br/>", "World", "</div>"]
						const tokenRegex = /<\/?\w+[^>]*>|[^<>]+/g;
						const rawTokens = cleanedHtml.match(tokenRegex) || [];
						const tokenArray = rawTokens.map((t) => { return t.trim(); }).filter(Boolean);

						/* Create a nested object structure from the array of tokens
						============================================================================================= */
						const nestedHtmlObj = parseHtmlToObj(tokenArray);

						/* Convert the nested object structure into a JSON string 
						============================================================================================= */
						const output = JSON.stringify(nestedHtmlObj, null, 2);

						// Optional: debug logging
						if (moduleSettings?.debug?.convertHtmlToJson) {

							logSyslogMessage({
								severity: 7, // DEBUG
								tag: "convertHtmlToJson",
								transUnitId: "70000",
								message: output
							});
						}

						return output;
					} catch (err) {

						logSyslogMessage({
							severity: 3,
							tag: "convertHtmlToJson",
							// "50000": "Error: {{ remark }}",
							transUnitId: "50000",
							message: `${err}`,
						});

						// Return a fallback JSON
						return JSON.stringify([
							{
								element: "div",
								attributes: {
									style: {},
									classList: [],
									id: "rootContainer",
									inlineStyle: {}
								},
								children: [
									{
										element: "h1",
										attributes: { style: {}, classList: [], id: null, inlineStyle: {} },
										children: [
											{
												element: "text",
												children: [{ innerText: "Malformed HTML" }],
												childIndex: 1
											}
										],
										childIndex: 1
									}
								],
								childIndex: 1
							}
						]);
					}
				};
			};
		},

		// ANCHOR Utilities: convertMarkdownToHtml
		/**
		 * @summary Converts a Markdown document to an HTML string.
		 * 
		 * - Supports common Markdown syntax, including headings, lists, block quotes, code blocks, links, images, and tables.
		 * - Processes inline formatting (e.g., bold, italics, links) and custom extensions (e.g., custom fenced blocks).
		 * - Maintains structure and indentation for nested elements such as lists and block quotes.
		 * 
		 * @function convertMarkdownToHtml
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function for Markdown-to-HTML conversion.
		 * 
		 * @param {Object} params - Parameters for the conversion.
		 * @param {string} params.content - The Markdown content as a single string or array of lines.
		 * 
		 * @returns {string} The resulting HTML string.
		 * 
		 * @example
		 * // Example usage
		 * const markdownContent = `
		 * # Heading 1
		 * ## Heading 2
		 * 
		 * - Item 1
		 * - Item 2
		 *   - Nested Item 2.1
		 *   - Nested Item 2.2
		 * 
		 * > This is a blockquote.
		 * 
		 * **Bold text** and *italic text* with [a link](https://example.com).
		 * 
		 * \`\`\`js
		 * const code = "This is a code block";
		 * console.log(code);
		 * \`\`\`
		 * `;
		 * 
		 * const htmlStr = convertMarkdownToHtml()(moduleSettings)({ content: markdownContent });
		 * log(htmlStr);
		 * // Output: A valid HTML string based on the Markdown input
		 */
		convertMarkdownToHtml: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {

				// Cache Dependencies
				// const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });
				const encodeCodeBlock = EASY_UTILS.getFunction({ functionName: "encodeCodeBlock", moduleSettings });

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ content }) => {

					const htmlArray = [];
					const tagStack = [];

					/**
					 * Adds a processed HTML line to the htmlArray.
					 * @param {string} html - The HTML string to add.
					 */
					function addToHtmlArray(html, raw = false) {
						if (raw) {
							htmlArray.push(html);
						} else {
							htmlArray.push(processInline(html));
						}
					}

					/**
					 * Handles the closing of the most recently opened HTML tag.
					 */
					function handleTagClosing() {
						if (tagStack.length === 0) return; // No tags to close
						const tag = tagStack.pop();
						addToHtmlArray(`</${tag}>`, true);
					}

					/**
					 * Closes all open tags in the tagStack.
					 */
					function closeAllTags() {
						while (tagStack.length > 0) {
							handleTagClosing();
						}
					}

					/**
					 * Generates a slugified ID from a heading text.
					 * @param {string} text - The heading text.
					 * @returns {string} The slugified ID.
					 */
					function slugify(text) {
						return text.toLowerCase()
							.replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric characters
							.trim()
							.replace(/\s+/g, "-"); // Replace spaces with hyphens
					}

					/**
					 * Processes inline Markdown syntax such as code, strong, italics, etc.
					 * Does not escape HTML; inserts it as-is.
					 * @param {string} text - The text to process.
					 * @returns {string} The text with inline HTML tags.
					 */
					function processInline(text) {
						if (typeof text !== "string") {
							console.error("Invalid input to processInline. Expected a string, got:", text);

							return "";
						}

						return text
							// Escaped Characters
							// asterisk -> &#42;
							.replace(/\\\*/g, "&#42;")
							// Inline Code
							.replace(/`([^`]+)`(?!`)/g, (match, code) => {

								//const escapedCode = encodeNoteContent({ text: code });
								const escapedCode = encodeCodeBlock({ text: code });

								return `<code class="inline-code">${escapedCode}</code>`;
							})
							// Images
							.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, "<img src=\"$2\" alt=\"$1\" title=\"$3\" />")
							// Links
							.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, "<a href=\"$2\" title=\"$3\">$1</a>")
							// Superscript
							.replace(/\^\^([^=]+)\^\^/g, "<sup>$1</sup>")
							// Subscript
							.replace(/\^\_([^=]+)\_\^/g, "<sub>$1</sub>")
							// Horizontal Rules
							.replace(/^-{3,}$/gm, "<hr class=\"dash-hr\" />") // Dash Horizontal Rule
							.replace(/^\*{3,}$/gm, "<hr class=\"asterisk-hr\" />") // Asterisk Horizontal Rule
							.replace(/^_{3,}$/gm, "<hr class=\"underscore-hr\" />") // Underscore Horizontal Rule
							// Bold and italics
							.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong class=\"asterisk-strong\"><em class=\"asterisk-em\">$1</em></strong>")
							.replace(/___([^_]+)___/g, "<strong class=\"underscore-strong\"><em class=\"underscore-em\">$1</em></strong>")
							// Bold
							.replace(/\*\*([^*]+)\*\*/g, "<strong class=\"asterisk-strong\">$1</strong>")
							.replace(/__([^_]+)__/g, "<strong class=\"underscore-strong\">$1</strong>")
							// Italics
							.replace(/\*([^*]+)\*/g, "<em class=\"asterisk-em\">$1</em>")
							.replace(/_((?!<[^>]*>).+?)_/g, "<em class=\"underscore-em\">$1</em>")
							// Strikethrough
							.replace(/~~([^~]+)~~/g, "<del>$1</del>")
							// Mark
							.replace(/==([^=]+)==/g, "<mark>$1</mark>")
							// Headers with Slugified IDs
							.replace(/^#{6} (.+)$/gm, (match, text) => { return `<h6 id="${slugify(text)}">${text}</h6>`; })
							.replace(/^#{5} (.+)$/gm, (match, text) => { return `<h5 id="${slugify(text)}">${text}</h5>`; })
							.replace(/^#{4} (.+)$/gm, (match, text) => { return `<h4 id="${slugify(text)}">${text}</h4>`; })
							.replace(/^#{3} (.+)$/gm, (match, text) => { return `<h3 id="${slugify(text)}">${text}</h3>`; })
							.replace(/^#{2} (.+)$/gm, (match, text) => { return `<h2 id="${slugify(text)}">${text}</h2>`; })
							.replace(/^#{1} (.+)$/gm, (match, text) => { return `<h1 id="${slugify(text)}">${text}</h1>`; });
					}

					/**
					 * Recursively processes a block of Markdown lines.
					 * @param {string[]} lines - The array of Markdown lines to process.
					 */
					function parseBlock(lines) {

						while (lines.length > 0) {
							const originalLine = lines.shift();

							// Normalize indentation: Convert tabs to 3 spaces, normalize leading spaces
							const normalizedLine = originalLine
								.replace(/\t/g, "   ")
								.replace(/<style([^>]*)>/g, "<div$1 style=\"display:none\">")
								.replace(/<template([^>]*)>/g, "<div$1 style=\"display:none\">")
								.replace(/<\/style>/g, "</div>")
								.replace(/<\/template>/g, "</div>")

								// Convert tabs to 3 spaces
								// REVIEW I do not believe the normalization for list items matters; more testing to refactor
								.replace(/^ \*(.*)/, "*$1")
								.replace(/^ -/, "-")
								.replace(/^\+/, "+")
								.replace(/^(\s*)/, (match) => {

									// Normalize to multiples of 3
									const spaces = Math.ceil(match.length / 3) * 3;


									return " ".repeat(spaces);
								});

							const meta = {
								isEmpty: /^\s*$/.test(originalLine),
								thisLine: normalizedLine.trim(),//.replace(/\\?\s*$/, ""), // Remove trailing backslashes and whitespace
								indentLevel: normalizedLine.match(/^\s*/)[0].length, // Calculate the indentation level
							};

							let doContinue = false;

							switch (true) {

							case /^:::/.test(meta.thisLine): {
								// Match "::: " and grab everything after it
								const openFenceMatch = meta.thisLine.match(/^:::\s*(.+)$/);
								const closeFenceMatch = meta.thisLine.trim() === ":::";

								if (openFenceMatch && openFenceMatch[1]) {
									// Extract and trim everything after ":::"
									const className = openFenceMatch[1].trim();
									addToHtmlArray(`<div class="${className}">`, true);
								} else if (closeFenceMatch) {
									// Handle closing ":::"
									addToHtmlArray("</div>", true);
								}

								// Prevent further processing of this line
								doContinue = true;
								break;
							}

							case /^```/.test(meta.thisLine): {
								// 1) Determine if this is an open or close Code
								const openCodeMatch = meta.thisLine.match(/^```(\S.*)$/); // "::: some-class" => open
								const closeCodeMatch = meta.thisLine.match(/^```$/);       // ":::        " => close (no text)

								// If it's a close Code, we do not open a new div. Instead, we break out.
								if (closeCodeMatch) {
									// This scenario can happen if there's a stray ":::" or if a nested close is found.
									// Usually you'd decrement a nesting counter if you track that at a higher level.
									// But let's assume parseBlock is handling this scenario. We'll just skip or handle.
									// For demonstration, let's just skip further processing so it doesn't become a paragraph.
									doContinue = true;
									break;
								}

								// 2) It's an open Code if there's text after ":::"
								if (openCodeMatch) {
									const codeBlockType = openCodeMatch[1].trim() || "text";  // e.g. "two-columns", "left hidden", etc.

									// Open the custom block
									addToHtmlArray(`<pre data-role="code-block" data-info="${codeBlockType}" class="${codeBlockType}"><code>`, true);

									// Consume lines inside this block
									let nextLine = lines.shift();
									while (nextLine !== undefined) {
										const nextCloseCodeMatch = nextLine.match(/^```$/);

										if (!nextCloseCodeMatch) {
											// Process normal code line
											const escapedLine = encodeCodeBlock({ text: nextLine });
											addToHtmlArray(`${escapedLine}<br />`, true);
											nextLine = lines.shift();
										} else {
											// Found the closing fence => break out
											break;
										}
									}

									addToHtmlArray("</code></pre>", true);

									// Prevent further processing of this line
									doContinue = true;
									break;
								}

								// If the line started with ":::", but didn't match open or close, 
								// it might be malformed or empty. Let's just skip it.
								doContinue = true;
								break;
							}

							// Block quotes
							case /^>/.test(meta.thisLine): {
								addToHtmlArray("<blockquote>", true);
								const blockquotePocketDimension = [];

								// Remove the first ">" and normalize the current line
								blockquotePocketDimension.push(meta.thisLine.replace(/^>\s*/, ""));

								let nextLine = lines.shift();

								// Process lines recursively within the blockquote
								while (nextLine) {
									if (/^>/.test(nextLine)) {
										// If the line starts with ">", remove one level of ">" and add it
										const updatedLine = nextLine.replace(/^>\s?/, "");
										blockquotePocketDimension.push(updatedLine);

									} else {
										// If a non-blockquote line is encountered, stop processing
										lines.unshift(nextLine); // Return the line to the stack for later processing
										break;
									}
									nextLine = lines.shift();
								}

								// Recursively parse the contents of the blockquote
								parseBlock(blockquotePocketDimension);

								// Close the blockquote
								addToHtmlArray("</blockquote>", true);

								// Skip further processing for this blockquote
								doContinue = true;
								break;
							}

							// Unordered Lists
							case /^[-+*]\s+/.test(meta.thisLine): {
								// Capture the bullet type and the content
								const listMatch = meta.thisLine.match(/^([-+*])\s+(.*)/);
								const bulletType = listMatch ? listMatch[1] : "-"; // Default to `-` if match fails
								const listItemContent = listMatch ? listMatch[2].trim() : "";

								const indentLevel = (Math.floor(meta.indentLevel / 3)) + 1; // Each 3 spaces represent a nesting level

								// Determine the current ordered list nesting level
								const currentListLevel = tagStack.filter(tag => { return tag === "ul"; }).length;

								// Map bullet types to class names
								const bulletClassMap = {
									"-": "dash-bullet",
									"+": "plus-bullet",
									"*": "asterisk-bullet"
								};
								const bulletClass = bulletClassMap[bulletType] || "dash-bullet"; // Fallback to `dash-bullet`

								if (indentLevel > currentListLevel) {
									addToHtmlArray("<ul>");
									tagStack.push("ul");
								} else if (indentLevel < currentListLevel) {

									// Close <ul> tags for decreased indentation
									for (let i = currentListLevel; i > indentLevel; i--) {
										addToHtmlArray("</ul>", true);
										tagStack.pop();
									}
								}

								// Add <li> for the current list item with the specific class for the bullet type
								const processedContent = processInline(listItemContent);
								addToHtmlArray(`<li class="${bulletClass}">${processedContent}</li>`);

								break;
							}


							// Ordered Lists
							case /^\d+\.\s+/.test(meta.thisLine): {
								// Capture the list number and the content
								const listMatch = meta.thisLine.match(/^(\d+)\.\s+(.*)/);
								const listNumber = listMatch ? parseInt(listMatch[1], 10) : 1; // Default to `1` if match fails
								const listItemContent = listMatch ? listMatch[2].trim() : "";
								const indentLevel = (Math.floor(meta.indentLevel / 3)) + 1; // Each 3 spaces represent a nesting level

								// Determine the current ordered list nesting level
								const currentListLevel = tagStack.filter(tag => { return tag === "ol"; }).length;

								if (indentLevel > currentListLevel) {
									// Open new <ol> tags for increased indentation
									for (let i = currentListLevel; i < indentLevel; i++) {
										if (listNumber > 1) {
											addToHtmlArray(`<ol start="${listNumber}">`);
										} else {
											addToHtmlArray("<ol>");
										}
										tagStack.push("ol");
									}
								} else if (indentLevel < currentListLevel) {
									// Close <ol> tags for decreased indentation
									for (let i = currentListLevel; i > indentLevel; i--) {
										addToHtmlArray("</ol>", true);
										tagStack.pop();
									}
								}

								// Add the current list item
								const processedContent = processInline(listItemContent);
								addToHtmlArray(`<li>${processedContent}</li>`);

								break;
							}

							case /^\|/.test(meta.thisLine): {
								// 1. Collect all lines starting with '|'
								const tableLines = [meta.thisLine];
								let nextLine = lines.shift();
								while (nextLine && /^\|/.test(nextLine)) {
									tableLines.push(nextLine);
									nextLine = lines.shift();
								}

								// 2. Check if the next line (the "stopper" line) is a valid footer:
								//    - must be non-empty
								//    - must NOT start with '|'
								//    If it doesn't match those criteria, we push it back and let the normal parser handle it
								let footerLine = null;
								if (nextLine && nextLine.trim() !== "" && !/^\|/.test(nextLine)) {
									footerLine = nextLine; // We'll treat this as our footer text
								} else if (nextLine) {
									lines.unshift(nextLine); // Not a footer, so restore it for normal parsing
								}

								// 3. Check if the second line is a valid header separator
								const separator = tableLines[1];
								if (
									separator &&
										/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(separator)
								) {
									// => We have a valid table with a header row

									// Parse headers and alignments
									const headers = tableLines[0]
										.slice(1, -1)
										.split("|")
										.map((h) => { return h.trim(); });
									const alignments = separator
										.slice(1, -1)
										.split("|")
										.map((s) => { return s.trim(); });

									addToHtmlArray("<table>");
									// THEAD
									addToHtmlArray("<thead><tr>");
									headers.forEach((header, index) => {
										let style = "";
										if (/^:-+:?$/.test(alignments[index])) {
											style = " style=\"text-align:center\"";
										} else if (/^:-+$/.test(alignments[index])) {
											style = " style=\"text-align:left\"";
										} else if (/^-+:$/.test(alignments[index])) {
											style = " style=\"text-align:right\"";
										}
										addToHtmlArray(`<th${style}>${processInline(header)}</th>`);
									});
									addToHtmlArray("</tr></thead>");

									// TBODY
									addToHtmlArray("<tbody>");
									for (let i = 2; i < tableLines.length; i++) {
										const row = tableLines[i];
										const cells = row.slice(1, -1).split("|").map((c) => { return c.trim(); });
										addToHtmlArray("<tr>");
										cells.forEach((cell, index) => {
											let style = "";
											if (/^:-+:?$/.test(alignments[index])) {
												style = " style=\"text-align:center\"";
											} else if (/^:-+$/.test(alignments[index])) {
												style = " style=\"text-align:left\"";
											} else if (/^-+:$/.test(alignments[index])) {
												style = " style=\"text-align:right\"";
											}
											addToHtmlArray(`<td${style}>${processInline(cell)}</td>`);
										});
										addToHtmlArray("</tr>");
									}
									addToHtmlArray("</tbody>");

									// 4. If we captured a non-empty line that doesn't start with '|', treat it as a table footer
									if (footerLine) {
										addToHtmlArray("<tfoot><tr>");
										addToHtmlArray(
											`<td colspan="${headers.length}">${processInline(footerLine)}</td>`
										);
										addToHtmlArray("</tr></tfoot>");
									}

									addToHtmlArray("</table>");

								} else {
									// => Invalid or non-header table, treat each line as plain text
									tableLines.forEach((line) => {
										addToHtmlArray(`<p>${processInline(line)}</p>`);
									});

									// If we popped nextLine off earlier but haven't used it as a footer,
									// we may consider unshifting it back here—depending on your desired logic
									if (footerLine) {
										lines.unshift(footerLine);
									}
								}

								break;
							}


							// Raw HTML Blocks
							case /^<([a-zA-Z]+)([^>]*)>/.test(meta.thisLine): {
								const htmlTagMatch = meta.thisLine.match(/^<([a-zA-Z]+)([^>]*)>/);
								const openingTag = htmlTagMatch ? htmlTagMatch[1] : null;

								if (openingTag) {
									const singleLineClosingTagMatch = meta.thisLine.match(new RegExp(`^<${openingTag}[^>]*>.*</${openingTag}>$`));

									if (singleLineClosingTagMatch) {
										// Single line contains both opening and closing tags
										addToHtmlArray(meta.thisLine, true);
									} else {
										// Process multi-line raw HTML block
										const rawHtmlStack = [meta.thisLine]; // Add the opening line to the stack
										let nextLine = lines.shift();

										while (nextLine) {
											const closingTagMatch = nextLine.match(new RegExp(`^</${openingTag}>`));

											if (closingTagMatch) {
												rawHtmlStack.push(nextLine); // Add the closing tag
												break;
											}

											const nestedOpeningTagMatch = nextLine.match(/^<([a-zA-Z]+)([^>]*)>/);
											const nestedClosingTagMatch = nextLine.match(/^<\/([a-zA-Z]+)>/);

											// Add nested opening tags to the stack
											if (nestedOpeningTagMatch && nestedOpeningTagMatch[1]) {
												rawHtmlStack.push(nextLine);
											}
											// Remove matching closing tags from the stack
											else if (
												nestedClosingTagMatch &&
													nestedClosingTagMatch[1] &&
													rawHtmlStack[rawHtmlStack.length - 1] === `<${nestedClosingTagMatch[1]}>`
											) {
												rawHtmlStack.pop();
											} else {
												rawHtmlStack.push(nextLine); // Add content or unmatched tags
											}

											nextLine = lines.shift();
										}

										// Push the raw HTML block to the HTML array
										addToHtmlArray(rawHtmlStack.join("\n"), true);
									}

									// Skip further processing for this block
									doContinue = true;
								}
								break;
							}

							// Catch and skip things that do not need a paragraph tag.
							case (meta.isEmpty):
							{
								doContinue = true;
								closeAllTags();
								break;
							}

							// Headings
							case /\s*#{1,6}\s+/.test(meta.thisLine):
							{
								addToHtmlArray(`${processInline(meta.thisLine)}`);
								doContinue = true;
								break;
							}

							// Horizontal Rules
							case /^\s*(\*\s*){3,}$/.test(meta.thisLine) || /^\s*(-\s*){3,}$/.test(meta.thisLine) || /^\s*(?:_ ?){3,}$/.test(meta.thisLine):
							{
								addToHtmlArray(`${processInline(meta.thisLine)}`);
								doContinue = true;
								break;
							}

							// Paragraphs
							default:
							{
								addToHtmlArray(`<p>${processInline(meta.thisLine)}</p>`);
								break;
							}
							}

							if (doContinue) {
								continue;
							}
						}
					}

					// Create a copy of the content array to avoid mutating the original
					const markdownArray = [...(content.split("\n"))];

					// Start processing lines
					parseBlock(markdownArray);

					// Close all remaining open tags
					closeAllTags();

					return htmlArray.join("\n");
				};
			};
		},

		// ANCHOR Utilities: convertJsonToHtml
		/**
		 * @summary Converts an HTML JSON structure into a corresponding HTML string.
		 * Supports inline styles, class lists, IDs, and additional attributes.
		 * 
		 * @function convertJsonToHtml
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function for conversion.
		 * 
		 * @param {Object} params - Parameters for conversion.
		 * @param {string} params.htmlJson - A JSON string representing the HTML structure.
		 * 
		 * @returns {string} The generated HTML string.
		 * 
		 * @example
		 * // Example usage
		 * const htmlStr = convertJsonToHtml()(moduleSettings)({ 
		 *     htmlJson: JSON.stringify([
		 *         {
		 *             element: "div",
		 *             attributes: { id: "container", class: ["main"] },
		 *             children: [
		 *                 {
		 *                     element: "h1",
		 *                     attributes: { style: { color: "red" } },
		 *                     children: [
		 *                         { element: "text", children: [{ innerText: "Hello, World!" }] }
		 *                     ]
		 *                 }
		 *             ]
		 *         }
		 *     ])
		 * });
		 * log(htmlStr);
		 * // Output: '<div id="container" class="main"><h1 style="color: red;">Hello, World!</h1></div>'
		 */
		convertJsonToHtml: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({
					functionName: "logSyslogMessage",
					moduleSettings
				});

				// ──────────────────────────────────────────────────────────────────────────
				// 1) Subroutine: camelCaseToKebabDeclarations
				// ──────────────────────────────────────────────────────────────────────────
				/**
				 * @function camelCaseToKebabDeclarations
				 * @description Converts a JavaScript style object into a string of CSS declarations.
				 *              - Converts camelCase property names to kebab-case.
				 *              - Formats each key-value pair as a CSS declaration 
				 *                (e.g., "margin-top: 10px; background-color: red;").
				 * 
				 * @param {Object} styleObj - The style object to convert, where keys are CSS 
				 *                            property names in camelCase and values are strings.
				 * 
				 * @returns {string} A CSS string representing the style object, with 
				 *                   declarations separated by semicolons and spaces.
				 * 
				 * @example
				 * const styleObj = { marginTop: "10px", backgroundColor: "red" };
				 * const cssString = camelCaseToKebabDeclarations(styleObj);
				 * console.log(cssString); // "margin-top: 10px; background-color: red;"
				 */
				function camelCaseToKebabDeclarations(styleObj) {
					return Object.entries(styleObj)
						.map(([key, value]) => {
							// Convert camelCase to kebab-case
							const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
							// e.g., "marginTop" => "margin-top"

							// Return a single CSS declaration
							return `${kebabKey}: ${value};`;
						})
						.join(" ");
				}

				// ──────────────────────────────────────────────────────────────────────────
				// 2) Subroutine: processNode
				// ──────────────────────────────────────────────────────────────────────────
				/**
				 * @function processNode
				 * @description Recursively transforms a single JSON node into its 
				 *              corresponding HTML string.
				 * 
				 *              - Handles text nodes by returning their content directly.
				 *              - Combines `style` and `inlineStyle` into a single `style` 
				 *                attribute in the resulting HTML.
				 *              - Processes attributes (e.g., `id`, `class`, custom attributes) 
				 *                and builds valid HTML attributes.
				 *              - Recursively processes child nodes to generate nested HTML.
				 * 
				 * @param {Object} node - The JSON representation of an HTML node.
				 * @param {string} node.element - The tag name (e.g., "div", "span", or "text").
				 * @param {Object} [node.attributes] - An object containing attributes 
				 *                                     for this HTML node.
				 * @param {Object} [node.attributes.style] - Style object (in camelCase), 
				 *                                           merged into the final `style` attribute.
				 * @param {Object} [node.attributes.inlineStyle] - Additional inline styles 
				 *                                                (also in camelCase).
				 * @param {string[]} [node.attributes.classList] - An array of class names.
				 * @param {string} [node.attributes.id] - The ID of the element.
				 * @param {Object[]} [node.children] - An array of child nodes 
				 *                                     (each processed recursively).
				 * 
				 * @returns {string} The HTML string representation of the node and its children.
				 */
				function processNode(node) {
					// If there's no recognized element, return empty
					if (!node.element) {
						return "";
					}

					// If it’s a text node, return the text content directly
					if (node.element === "text") {
						return node.children && node.children[0]?.innerText
							? node.children[0].innerText
							: "";
					}

					// Combine style and inlineStyle to produce final style object
					const styleObj = {
						...node.attributes?.style,
						...node.attributes?.inlineStyle
					};

					// Convert the final style object to a kebab-case CSS string
					const styleString = Object.keys(styleObj).length
						? camelCaseToKebabDeclarations(styleObj)
						: "";

					// Build the HTML attributes
					const attributes = [];
					if (styleString) {
						attributes.push(`style="${styleString}"`);
					}

					// If we have classList => output as class="..."
					if (Array.isArray(node.attributes?.classList) && node.attributes.classList.length > 0) {
						attributes.push(`class="${node.attributes.classList.join(" ")}"`);
					}

					// If we have an id
					if (node.attributes?.id) {
						attributes.push(`id="${node.attributes.id}"`);
					}

					// Add any other attributes (e.g. data- attributes, custom attributes)
					Object.keys(node.attributes || {})
						.filter((key) => { return !["style", "inlineStyle", "classList", "id"].includes(key); })
						.forEach((key) => {
							attributes.push(`${key}="${node.attributes[key]}"`);
						});

					// Recursively process children
					const childrenHtml = (node.children || [])
						.map(processNode)
						.join("");

					// Return the final HTML string for this node
					// Note: If attributes is empty, you might get an extra space. 
					//       It's harmless, but if you want to remove it, just do a quick trim.
					const attrString = attributes.length ? ` ${attributes.join(" ")}` : "";

					return `<${node.element}${attrString}>${childrenHtml}</${node.element}>`;
				}

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ htmlJson }) => {
					try {
						// 1) Parse the incoming JSON
						const parsedJson = JSON.parse(htmlJson);

						// 2) Build the final HTML string (handle root array vs. single object)
						let output = "";
						if (Array.isArray(parsedJson)) {
							output = parsedJson.map(processNode).join("");
						} else {
							output = processNode(parsedJson);
						}

						// 3) Optional: debug logging
						if (moduleSettings?.debug?.convertJsonToHtml) {
							logSyslogMessage({
								severity: 7, // DEBUG
								tag: "convertJsonToHtml",
								transUnitId: "70000",
								message: output
							});
						}

						// 4) Return the final HTML string
						return output;

					} catch (err) {
						// If parsing or processing fails, log an error and return fallback HTML
						logSyslogMessage({
							severity: 3, // ERROR
							tag: "convertJsonToHtml",
							transUnitId: "50000",
							message: `${err}`
						});

						return "<div><h1>Error transforming HTML JSON representation</h1></div>";
					}
				};
			};
		},


		// ANCHOR Utilities: convertToSingleLine
		/**
		 * @summary Converts multiline text into a single line, preserving quoted text.
		 * 
		 * @function convertToSingleLine
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function to process multiline text.
		 * 
		 * @param {Object} params - Parameters for the conversion.
		 * @param {string} params.multiline - The multiline text to convert.
		 * 
		 * @returns {string} A single-line string with whitespace normalized and quoted text preserved.
		 * 
		 * @example
		 * // Example usage
		 * const singleLine = convertToSingleLine()({ multiline: "Hello\n  World \"Keep This Intact\"" });
		 * log(singleLine); 
		 * // Output: "Hello World \"Keep This Intact\""
		 */
		convertToSingleLine: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ multiline }) => {
					const regex = /("[^"]*"|'[^']*')|\s+/g;

					return multiline.replace(regex, (_, quoted) => { return quoted ? quoted : " "; });
				};
			};
		},

		// ANCHOR Function: createPhraseFactory
		/**
		 * @summary Creates a Phrase Factory for managing phrase dictionaries across different languages.
		 * 
		 * - Supports loading, retrieving, and managing phrases in an in-memory dictionary.
		 * - Provides translations based on `transUnitId` and language settings.
		 * - Allows CRUD operations for managing phrases.
		 * 
		 * @function createPhraseFactory
		 * @memberof EASY_UTILS
		 * @returns {Object} The Phrase Factory API with the following methods:
		 * 
		 * @example
		 * // Example usage
		 * const phraseFactory = createPhraseFactory()(moduleSettings);
		 * 
		 * // Retrieve a phrase by translation unit ID
		 * const successMessage = phraseFactory.get({ transUnitId: "0" });
		 * log(successMessage); 
		 * // Output: "Success"
		 * 
		 * // Add a new phrase
		 * phraseFactory.set({ newPhrases: { "1": "Hello, world!" }, language: "enUS" });
		 * 
		 * // Retrieve the new phrase
		 * const greeting = phraseFactory.get({ transUnitId: "1", language: "enUS" });
		 * log(greeting); 
		 * // Output: "Hello, world!"
		 * 
		 * // Remove a phrase
		 * phraseFactory.remove({ transUnitId: "1", language: "enUS" });
		 */
		createPhraseFactory: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				//const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });
				const replacePlaceholders = EASY_UTILS.getFunction({ functionName: "replacePlaceholders", moduleSettings });
				const getSharedForge = EASY_UTILS.getFunction({ functionName: "getSharedForge", moduleSettings });
				const getSharedVault = EASY_UTILS.getFunction({ functionName: "getSharedVault", moduleSettings });

				// 'PhraseFactory' is the key named used when storing the factory in the Forge
				const phraseFactoryKey = "PhraseFactory";
				const sharedForge = getSharedForge();
				const sharedVault = getSharedVault();

				// If the factory already exists, just return it. Otherwise, create it.
				if (!sharedForge.getFactory({ name: phraseFactoryKey })) {

					/***************************************************************************************************
					 * 1. Define Defaults & In-Memory State
					 **************************************************************************************************/
					const defaultLanguageCode = globalSettings.phraseLanguage || "enUS";

					// Holds all loaded language dictionaries (e.g., { enUS: {...}, frFR: {...} })
					const loadedLanguagePhrases = {};

					// Tracks how many players are currently using each language (e.g., { enUS: 2, frFR: 1 })
					const languageUsageCounts = {};

					// Stores additional phrases provided by modules but not necessarily loaded yet
					// (e.g., { enUS: { "0x003": "Some string" }, frFR: { "0x003": "...fr" } })
					const contributedLanguagePhrases = {};

					// The Vault for storing each player's chosen language (e.g., playerLanguages["player123"] = "frFR")
					// sync to ensure it’s stored in vault
					const playerLanguagesMap = sharedVault.playerLanguages || {};
					sharedVault.playerLanguages = playerLanguagesMap;

					// Tracks which languages are recognized. We might not load them json is supposed to have ?? to escape "?"until needed.
					const registeredLanguages = new Set(["enUS", "frFR"]);

					/***************************************************************************************************
					 * Subroutine Function: Base Dictionary for a given language
					 **************************************************************************************************/
					function loadLanguageDictionary(languageCode) {
						if (languageCode === "enUS") {
							return {
								"0": "Success",
								"1": "Failure",
								"10000": ".=> Initializing <=.",
								"20000": ".=> Ready <=.",
								"20100": "Complete: {{ remark }} has been created.",
								"40000": "Invalid Arguments: {{ remark }}",
								"40400": "Not Found: {{ remark }}",
								"50000": "Error: {{ remark }}",
								"30000": "Warning: {{ remark }}",
								"60000": "Information: {{ remark }}",
								"70000": "Debug: {{ remark }}",
								"0x0D9A441E": "Tokens need to be selected or passed by --ids.",
								"0x004A7742": "error",
								"0x0B672E77": "warning",
								"0x0004E2AF": "information",
								"0x000058E0": "tip",
								"0x02B2451A": "You entered the following command:",
								"0x0834C8EE": "If you continue to experience issues contact the module author ({{ author }})."
							};
						} else if (languageCode === "frFR") {
							return {
								"0": "Succès",
								"1": "Échec",
								"10000": ".=> Initialisation <=.",
								"20000": ".=> Prêt <=.",
								"20100": "Terminé : {{ remark }} a été créé.",
								"40000": "Arguments invalides : {{ remark }}",
								"40400": "Non trouvé : {{ remark }}",
								"50000": "Erreur : {{ remark }}",
								"30000": "Avertissement : {{ remark }}",
								"60000": "Information : {{ remark }}",
								"70000": "Débogage : {{ remark }}",
								"0x0D9A441E": "Des jetons doivent être sélectionnés ou passés avec --ids.",
								"0x004A7742": "erreur",
								"0x0B672E77": "avertissement",
								"0x0004E2AF": "information",
								"0x000058E0": "conseil",
								"0x02B2451A": "Vous avez entré la commande suivante :",
								"0x0834C8EE": "Si le problème persiste, contactez l'auteur du module ({{ author }})."
							};
						}

						// If no built-in dictionary exists, return null
						return null;
					}

					/***************************************************************************************************
					 * Subroutine Function: `loadedLanguagePhrases[languageCode]` is in memory
					 **************************************************************************************************/
					function loadOrCreateLanguage(languageCode) {
						// If already loaded, just return
						if (loadedLanguagePhrases[languageCode]) {
							return;
						}

						// Attempt to load built-in translations
						const builtInDictionary = loadLanguageDictionary(languageCode);

						// Start from built-in or empty object
						loadedLanguagePhrases[languageCode] = builtInDictionary || {};

						// Merge any contributed phrases for that language
						if (contributedLanguagePhrases[languageCode]) {
							Object.assign(loadedLanguagePhrases[languageCode], contributedLanguagePhrases[languageCode]);
						}

						// Now consider that language "registered"
						registeredLanguages.add(languageCode);
					}

					/***************************************************************************************************
					 * Subroutine Function: if usage is 0, remove from memory (unless it's default language)
					 **************************************************************************************************/
					function unloadLanguage(languageCode) {
						if (languageUsageCounts[languageCode] <= 0 && languageCode !== defaultLanguageCode) {
							delete loadedLanguagePhrases[languageCode];
						}
					}

					/***************************************************************************************************
					 * 4. Construct the Phrase Factory API
					 **************************************************************************************************/
					const phraseFactoryObject = {

						/**
						 * Retrieves a phrase by its translation unit ID, optionally replacing placeholder variables.
						 *
						 * @param {Object} config - An object containing required and optional parameters.
						 * @param {string} [config.playerId="default"] - The ID of the player whose language setting is used.
						 * @param {string|number} config.transUnitId - The key or identifier for the phrase (e.g., "0", "10000", "0x0D9A441E").
						 * @param {Object} [config.expressions={}] - Key-value pairs for placeholder replacements in the phrase template.
						 * @returns {string} The final string with placeholders replaced, or the `transUnitId` itself if no matching phrase is found.
						 */
						get({ playerId = "default", transUnitId, expressions = {} }) {
							// 1) Determine player’s language or default
							const lang = playerLanguagesMap[playerId] || defaultLanguageCode;

							// 2) Ensure that language is loaded
							if (!loadedLanguagePhrases[lang]) {
								loadOrCreateLanguage(lang);
							}
							const currentLanguageDict = loadedLanguagePhrases[lang];
							const fallbackDict = loadedLanguagePhrases[defaultLanguageCode] || {};

							// 3) Retrieve the string template
							const template = currentLanguageDict[transUnitId] || fallbackDict[transUnitId];

							// 4) If not found, just return the transUnitId itself
							if (!template) {
								return transUnitId;
							}

							// 5) Replace placeholders
							return replacePlaceholders({ text: template, expressions });
						},

						/**
						 * Merges new phrases into the in-memory dictionaries for one or multiple languages.
						 * The caller provides a single `newMap` object with language codes as keys,
						 * and each language’s value is a dictionary of transUnitId → phrase string.
						 *
						 * @param {Object} config - A configuration object.
						 * @param {Object} config.newMap - A map where each key is a language code (e.g. "enUS", "frFR") 
						 *                                 and each value is an object of phrase key-value pairs.
						 *
						 * @example
						 * // Example usage:
						 * add({
						 *   newMap: {
						 *     enUS: {
						 *       "0x03BDB2A5": "Custom Menu",
						 *       "0x08161075": "Set Preferred Language"
						 *     },
						 *     frFR: {
						 *       "0x03BDB2A5": "Menu personnalisé",
						 *       "0x08161075": "Définir la langue préférée"
						 *     }
						 *   }
						 * });
						 *
						 * @returns {void}
						 */
						add({ newMap }) {

							// Iterate over each language in the provided `newMap`
							for (const [langCode, phraseMap] of Object.entries(newMap)) {
								// Mark this language as registered
								registeredLanguages.add(langCode);

								// Ensure we have a contributed dictionary for that language
								contributedLanguagePhrases[langCode] = contributedLanguagePhrases[langCode] || {};
								// Merge the new phrases into contributedLanguagePhrases
								Object.assign(contributedLanguagePhrases[langCode], phraseMap);

								// If the language is already loaded in memory, merge them immediately
								if (loadedLanguagePhrases[langCode]) {
									Object.assign(loadedLanguagePhrases[langCode], phraseMap);
								}
							}
						},

						/**
						 * Sets (or changes) the language for a specific player.
						 * Decrements usage on the old language if present, increments usage on the new language.
						 *
						 * @param {Object} config - An object containing the parameters.
						 * @param {string|number} config.playerId - The unique identifier for the player.
						 * @param {string} config.language - The new language code to assign to the player (e.g. "enUS", "frFR").
						 * @returns {void}
						 */
						setLanguage({ playerId, language }) {
							// 1) Decrement usage count for old language if any
							const oldLang = playerLanguagesMap[playerId];
							if (oldLang && languageUsageCounts[oldLang]) {
								languageUsageCounts[oldLang]--;
								if (languageUsageCounts[oldLang] <= 0) {
									unloadLanguage(oldLang);
								}
							}

							// 2) Assign the new language
							playerLanguagesMap[playerId] = language;

							// 3) Ensure new language is loaded
							if (!loadedLanguagePhrases[language]) {
								loadOrCreateLanguage(language);
							}

							// 4) Increment usage count for the new language
							languageUsageCounts[language] = (languageUsageCounts[language] || 0) + 1;
						},

						/**
						 * Retrieves a list of all recognized or currently loaded languages.
						 *
						 * @returns {string[]} An array of language codes (e.g., ["enUS", "frFR"]).
						 */
						getLanguages() {
							// Some may be known from built-in or contributed, some loaded already
							const loadedLangs = Object.keys(loadedLanguagePhrases);
							const allLangs = new Set([...registeredLanguages, ...loadedLangs]);

							return Array.from(allLangs);
						},

						/**
						 * Removes a specific phrase entry from a language’s dictionary,
						 * including both contributed phrases and loaded phrases if present.
						 *
						 * @param {Object} config - An object containing the parameters.
						 * @param {string} config.language - The language code to remove the phrase from.
						 * @param {string|number} config.transUnitId - The key/ID of the phrase to remove.
						 * @returns {void}
						 */
						remove({ language, transUnitId }) {
							delete contributedLanguagePhrases[language]?.[transUnitId];
							if (loadedLanguagePhrases[language]) {
								delete loadedLanguagePhrases[language][transUnitId];
							}
						},

						/**
						 * Resets and clears all language data, usage counts, and player assignments.
						 * Re-registers only the default language with zero usage.
						 *
						 * @returns {void}
						 */
						init() {
							// 1) Clear out all language data in memory
							for (const langCode of Object.keys(loadedLanguagePhrases)) {
								delete loadedLanguagePhrases[langCode];
							}
							for (const langCode of Object.keys(contributedLanguagePhrases)) {
								delete contributedLanguagePhrases[langCode];
							}
							for (const langCode of Object.keys(languageUsageCounts)) {
								delete languageUsageCounts[langCode];
							}
							for (const pid of Object.keys(playerLanguagesMap)) {
								delete playerLanguagesMap[pid];
							}

							// 2) Reset registered languages to just the default
							registeredLanguages.clear();
							registeredLanguages.add(defaultLanguageCode);

							// 3) Reload the default language
							loadOrCreateLanguage(defaultLanguageCode);
							languageUsageCounts[defaultLanguageCode] = 0;
						}

					};

					/***************************************************************************************************
					 * 5. Initial Setup
					 **************************************************************************************************/

					// Ensure default language is loaded; set usage to 0 for "default" player
					phraseFactoryObject.setLanguage({
						playerId: "default",
						language: defaultLanguageCode
					});
					languageUsageCounts[defaultLanguageCode] = 0;

					// Store the newly created factory in the Forge
					sharedForge.setFactory({
						name: phraseFactoryKey,
						factory: phraseFactoryObject
					});
				}

				// Return the existing or newly created factory
				return sharedForge.getFactory({ name: phraseFactoryKey });
			};
		},

		// ANCHOR Function: createTemplateFactory
		/**
		 * @summary Creates a Template Factory for managing and retrieving HTML templates by name.
		 * 
		 * - Supports loading, retrieving, and managing templates in an in-memory map.
		 * - Allows for placeholder replacements in template strings with dynamic content.
		 * - Provides CRUD operations for templates.
		 * 
		 * @function createTemplateFactory
		 * @memberof EASY_UTILS
		 * @returns {Object} The Template Factory API with the following methods:
		 * 
		 * @example
		 * // Example usage
		 * const templateFactory = createTemplateFactory()(moduleSettings);
		 * 
		 * // Retrieve the default template with dynamic content
		 * const defaultTemplate = templateFactory.get({
		 *     template: "default",
		 *     content: { tableRows: "<tr><td>Key</td><td>Value</td></tr>" }
		 * });
		 * log(defaultTemplate);
		 * 
		 * // Add a new template
		 * templateFactory.add({ newTemplates: { myTemplate: "<div>{{content}}</div>" } });
		 * 
		 * // Get the newly added template with content
		 * const myTemplate = templateFactory.get({ template: "myTemplate", content: { content: "Hello, world!" } });
		 * log(myTemplate);
		 * 
		 * // Remove a template
		 * templateFactory.remove({ template: "myTemplate" });
		 */
		createTemplateFactory: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				//const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });
				const replacePlaceholders = EASY_UTILS.getFunction({ functionName: "replacePlaceholders", moduleSettings });
				const getSharedForge = EASY_UTILS.getFunction({ functionName: "getSharedForge", moduleSettings });
				const convertHtmlToJson = EASY_UTILS.getFunction({ functionName: "convertHtmlToJson", moduleSettings });

				const templateFactoryKey = "TemplateFactory";
				const forgeInstance = getSharedForge();

				// Default HTML template for generating tables dynamically
				const defaultTemplate = (expressions) => {
					const tableRows = Object.entries(expressions)
						.map(([key, value], index) => {
							const rowStyle = index % 2 === 0 ? "style=\"background-color: #d9f7d1;\"" : "";

							return `<tr ${rowStyle}>
                                <td style="padding: 8px;">${key}</td>
                                <td style="padding: 8px;">${value}</td>
                            </tr>`;
						})
						.join("");

					return `
						<table border="1" style="border-collapse: collapse; width: 100%;">
							<thead>
								<tr>
									<th style="padding: 8px; text-align: left; background-color: #34627B; color: white;">{{expression}}</th>
									<th style="padding: 8px; text-align: left; background-color: #34627B; color: white;">Value</th>
								</tr>
							</thead>
							<tbody>
								${tableRows}
							</tbody>
							<tfoot>
								<tr>
									<td style="padding: 8px; font-weight: bold; background-color: #34627B; color: white;" colspan="2">* Using default template.</td>
								</tr>
							</tfoot>
						</table>
					`;
				};

				// If the factory already exists, just return it. Otherwise, create it.
				if (!forgeInstance.getFactory({ name: templateFactoryKey })) {

					/*******************************************************************************************************
					 * 1. Define In-Memory Template Map and Default Template
					 ******************************************************************************************************/
					const templateMemoryMap = {
						"default": defaultTemplate
					};

					/***************************************************************************************************
					 * Subroutine Function: Loads additional templates on demand, if available.
					 **************************************************************************************************/
					function loadTemplateByName(templateName) {
						switch (templateName) {
						case "chatAlert":
							return `
								<div class="alert-box">
									<h3>{{ title }}</h3>
									<p>{{ description }}</p>
									<p class="alert-code">{{ code }}</p>
									<p>{{ remark }}</p>
									<p class="alert-footer">{{ footer }}</p>
								</div>`;

						case "chatMenu":
							return `
								<div class="menu-box">
									<h3>{{ title }}</h3>
									<ul>
										<!-- <li><a href="!api --menu">Option 1</a></li> -->
										{{ menuItems }}
									</ul>
									<p class="menu-footer">{{ footer }}</p>
								</div>`;

						default:
							return null;
						}
					}

					/*******************************************************************************************************
					 * 2. Construct the Template Factory API
					 ******************************************************************************************************/
					const templateFactoryObject = {

						/**
						 * Retrieves a template by name, optionally replacing placeholders.
						 *
						 * @param {Object} config - Configuration object.
						 * @param {string} [config.template="default"] - The template name (key).
						 * @param {Object} [config.expressions={}] - The placeholders (key-value pairs) to be replaced.
						 * @returns {string} The final template with placeholders replaced.
						 */
						get: ({ template = "default", expressions = {} } = {}) => {
							// Check if template exists in memory
							if (!templateMemoryMap[template]) {
								const loadedTemplate = loadTemplateByName(template);
								if (loadedTemplate) {
									templateMemoryMap[template] = loadedTemplate; // Load on demand
								} else {
									template = "default"; // Fallback to default
								}
							}

							// Handle dynamic default template
							if (template === "default" && typeof templateMemoryMap["default"] === "function") {
								return templateMemoryMap["default"](expressions); // Generate dynamic table
							}

							// Retrieve and replace placeholders for other templates
							const templateString = templateMemoryMap[template];

							return replacePlaceholders({ text: templateString, expressions });
						},

						/**
						 * Replaces the entire in-memory map of templates with a new map.
						 *
						 * @param {Object} config - Configuration object.
						 * @param {Object} config.newMap - A key-value map of templateName => templateString.
						 * @returns {void}
						 */
						set: ({ newMap }) => {
							// Clear existing templates
							Object.keys(templateMemoryMap).forEach((key) => {
								delete templateMemoryMap[key];
							});
							// Load new ones
							Object.assign(templateMemoryMap, newMap);
						},

						/**
						 * Adds new templates or overrides existing ones in the in-memory map.
						 *
						 * @param {Object} config - Configuration object.
						 * @param {Object} config.newTemplates - A key-value map of templateName => templateString.
						 * @returns {void}
						 */
						add: ({ newTemplates }) => {
							Object.entries(newTemplates).forEach(([name, htmlString]) => {
								templateMemoryMap[name] = htmlString.trim();
							});
						},

						/**
						 * Removes a template by name from the in-memory map.
						 *
						 * @param {Object} config - Configuration object.
						 * @param {string} config.template - The name of the template to remove.
						 * @returns {void}
						 */
						remove: ({ template }) => {
							delete templateMemoryMap[template];
						},

						/**
						 * Resets the template memory map to a default state.
						 *
						 * @returns {void}
						 */
						init: () => {

							// Clear everything
							Object.keys(templateMemoryMap).forEach((key) => {
								delete templateMemoryMap[key];
							});

							// Load a minimal default
							templateMemoryMap["default"] = convertHtmlToJson({ html: htmlDefault });
						}
					};

					// --------------------------------------------------------
					// Initial Setup
					// --------------------------------------------------------
					forgeInstance.setFactory({ name: templateFactoryKey, factory: templateFactoryObject });
				}

				// Return existing or newly created
				return forgeInstance.getFactory({ name: templateFactoryKey });
			};
		},


		// ANCHOR Function: createThemeFactory
		/**
		 * @summary Creates a Theme Factory for managing and retrieving theme JSON for styling HTML JSON output.
		 * 
		 * - Supports loading, retrieving, and managing themes in an in-memory map.
		 * - Allows for placeholder and CSS variable replacements in theme strings.
		 * - Provides CRUD operations for themes.
		 * 
		 * @function createThemeFactory
		 * @memberof EASY_UTILS
		 * @returns {Object} The Theme Factory API with the following methods:
		 * 
		 * @example
		 * // Example usage
		 * const themeFactory = createThemeFactory()(moduleSettings);
		 * 
		 * // Retrieve the default theme
		 * const defaultTheme = themeFactory.get({ theme: "default" });
		 * log(defaultTheme); 
		 * 
		 * // Add a new theme
		 * themeFactory.add({ newThemes: { myTheme: "body { background-color: #000; }" } });
		 * 
		 * // Get the newly added theme
		 * const myTheme = themeFactory.get({ theme: "myTheme" });
		 * log(myTheme);
		 * 
		 * // Remove a theme
		 * themeFactory.remove({ theme: "myTheme" });
		 */
		createThemeFactory: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				// const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });
				const replacePlaceholders = EASY_UTILS.getFunction({ functionName: "replacePlaceholders", moduleSettings });
				const getSharedForge = EASY_UTILS.getFunction({ functionName: "getSharedForge", moduleSettings });

				// Key used to store and retrieve the ThemeFactory in the Forge
				const themeFactoryKey = "ThemeFactory";
				const forgeInstance = getSharedForge();

				// If the factory already exists, just return it. Otherwise, create it.
				if (!forgeInstance.getFactory({ name: themeFactoryKey })) {

					/***************************************************************************************************
					 * 1. Define In-Memory Theme Map and Default Theme
					 **************************************************************************************************/
					const themeMemoryMap = {
						"default": ""
					};

					/***************************************************************************************************
					 * Subroutine Function: Dynamically loads additional themes if available.
					 **************************************************************************************************/
					function loadThemeByName(themeName) {
						switch (themeName) {
						case "chatAlert":
							return `
								/* Design Colors */
								:root {${globalSettings.defaultStyle}}

								.alert-box {
									padding: var(--ez-block-padding);
									border: 1px solid var(--ez-color-border-primary);
									border-radius: var(--ez-block-radius);
									color: var(--ez-color-text-primary);
									background-color: var(--ez-color-background-primary);
								}

								h3 {
									margin: var(--ez-block-margin);
									color: var(--ez-color-text-contrast);
									font-size: calc(2 * var(--ez-font-size));
									text-transform: uppercase;
								}

								.alert-code {
									display: block;
									margin: var(--ez-block-margin);
									padding: var(--ez-block-padding);
									border: var(--ez-color-border-shadow);
									border-radius: var(--ez-block-radius);
									font-family: var(--ez-font-family-monospace);
									background-color: var(--ez-color-background-contrast);
								}

								p:empty {
									display: none;
								}

								.alert-footer {
									margin: var(--ez-block-margin);
									color: var(--ez-color-text-secondary);
									font-size: calc(1.5 * var(--ez-font-size));
								}`;

						case "chatMenu":
							return `
								/* Design Colors */
								:root {${globalSettings.defaultStyle}}

								/* Chat Menu CSS Rules */
								h3, h4 {
								margin: 0;
								font-size: 1em;
								text-transform: uppercase;
								font-weight: bold;
								text-align: center;
								margin-bottom: 10px;
								color: var(--ez-color-text-contrast);
								background-color: var(--ez-color-primary);
								border: 2px solid var(--ez-color-background-secondary);
								border-radius: 5px;
								padding: 5px;
								}

								h4 {
									background-color: var(--ez-color-tertiary);
								}

								ul {
								list-style-type: none;
								padding: 0;
								margin: 0;
								}

								li {
								margin: 5px 0;
								width: 90%;
								background-color: var(--ez-color-secondary);
								border: 2px solid var(--ez-color-background-secondary);
								color: var(--ez-color-text-contrast);
								padding: 5px 10px;
								border-radius: 5px;
								cursor: pointer;
								box-sizing: border-box;
								}

								li[data-category="caution"] {
								background-color: var(--ez-rainbow-red);
								}

								li[data-category="alterative"] {
								background-color: var(--ez-rainbow-red);
								}

								/* Strip styles from Anchor tags (<a>) */
								li > a[role="button"] {
									text-decoration: none;
									color: var(--ez-color-text-contrast);
									font-weight: bold;
									font-size: inherit;
									font-family: inherit;
									cursor: pointer;
								}

								.menu-box {
								font-size: 1em;
								background-color: var(--ez-color-background-primary);
								border: 2px solid var(--ez-color-background-secondary);
								border-radius: 8px;
								padding: 10px;
								max-width: 100%;
								font-family: var(--ez-font-family);
								color: var(--ez-color-text-contrast);
								margin: 5px;
								}

								.menu-footer {
								color: var(--ez-color-text-complement);
								}

								.inline-rolls {
								color: black;
								}
							`;
						default:
							return null;
						}
					}

					/*******************************************************************************************************
					 * 2. Construct the Theme Factory API
					 ******************************************************************************************************/
					const themeFactoryObject = {

						/**
						 * Retrieves a theme by name, optionally replacing placeholders and CSS variables.
						 * Collapses multiple whitespace characters into a single space for cleaner output.
						 *
						 * @param {Object} config - Configuration object.
						 * @param {string} [config.theme="default"] - The name/key of the theme to retrieve.
						 * @param {Object} [config.expressions={}] - Key-value pairs for placeholder replacements.
						 * @param {Object} [config.cssVars={}] - Key-value pairs for CSS variable replacements.
						 * @returns {string} The final theme string with placeholders and CSS variables replaced.
						 */
						get: ({ theme = "default", expressions = {}, cssVars = {} } = {}) => {
							// 1) Load the requested theme if not already loaded
							if (!themeMemoryMap[theme]) {
								const loadedTheme = loadThemeByName(theme);
								if (loadedTheme) {
									themeMemoryMap[theme] = loadedTheme;
								} else {
									// Fallback to default theme if the requested one isn't found
									theme = "default";
								}
							}

							// 2) Retrieve the theme string
							const themeString = themeMemoryMap[theme];

							// 3) Replace placeholders and CSS variables, then normalize whitespace
							return replacePlaceholders({ text: themeString, expressions, cssVars });
						},

						/**
						 * Replaces the entire in-memory theme map with a new set of themes.
						 *
						 * @param {Object} config - Configuration object.
						 * @param {Object} config.newMap - A key-value map where keys are theme names and values are theme strings.
						 * @returns {void}
						 */
						set: ({ newMap }) => {
							// Clear existing themes
							Object.keys(themeMemoryMap).forEach((key) => {
								delete themeMemoryMap[key];
							});
							// Assign new themes
							Object.assign(themeMemoryMap, newMap);
						},

						/**
						 * Adds or updates themes in the in-memory theme map.
						 *
						 * @param {Object} config - Configuration object.
						 * @param {Object} config.newThemes - A key-value map where keys are theme names and values are theme strings.
						 * @returns {void}
						 */
						add: ({ newThemes }) => {
							Object.entries(newThemes).forEach(([name, themeString]) => {
								themeMemoryMap[name] = themeString.trim();
							});
						},

						/**
						 * Removes a specific theme from the in-memory theme map.
						 *
						 * @param {Object} config - Configuration object.
						 * @param {string} config.theme - The name of the theme to remove.
						 * @returns {void}
						 */
						remove: ({ theme }) => {
							delete themeMemoryMap[theme];
						},

						/**
						 * Initializes the theme map to a default state, clearing all existing themes.
						 *
						 * @returns {void}
						 */
						init: () => {
							// Clear all themes
							Object.keys(themeMemoryMap).forEach((key) => {
								delete themeMemoryMap[key];
							});
							// Reset to default theme
							themeMemoryMap["default"] = "{\"universal\": {},\"elements\": {},\"classes\": {},\"attributes\": {},\"functions\": {},\"ids\": {}}";
						}
					};

					// --------------------------------------------------------
					// Initial Setup
					// --------------------------------------------------------
					forgeInstance.setFactory({ name: themeFactoryKey, factory: themeFactoryObject });
				}

				// Return existing or newly created
				return forgeInstance.getFactory({ name: themeFactoryKey });
			};
		},

		// ANCHOR Utilities: decodeCodeBlock
		/**
		 * @summary Decodes HTML-encoded code block content into plain text.
		 * 
		 * @function decodeCodeBlock
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function to decode a string.
		 * 
		 * @param {Object} params - Parameters for decoding.
		 * @param {string} params.text - The HTML-encoded string to decode.
		 * 
		 * @returns {string} The decoded plain text string.
		 * 
		 * @example
		 * const decoded = decodeCodeBlock()({ text: "&lt;div&gt;Hello&lt;/div&gt;" });
		 * log(decoded); 
		 * // Output: "<div>Hello</div>"
		 */
		decodeCodeBlock: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ text }) => {
					if (typeof text !== "string") {
						if (moduleSettings.verbose) {

							logSyslogMessage({
								severity: 7,
								tag: "decodeCodeBlock",
								transUnitId: "70000",
								message: "Invalid Argument: 'text' is not a string, returning input."
							});
						}

						return text;
					}

					return text
						// Already existing replacements
						.replace(/%%%LESSTHAN%%%/g, "&lt;")
						.replace(/%%%GREATERTHAN%%%/g, "&gt;")
						.replace(/%%%QUOTE%%%/g, "&quot;")
						.replace(/%%%APOSTROPHE%%%/g, "&#39;")
						.replace(/%%%SPACE%%%/g, " ")
						.replace(/%%%NEWLINE%%%/g, "\n")
						.replace(/%%%TAB%%%/g, "\t")
						.replace(/%%%AMPERSAND%%%/g, "&")
						// Additional special characters
						.replace(/%%%EQUAL%%%/g, "&#61;")
						.replace(/%%%ASTERISK%%%/g, "&#42;")   // *
						.replace(/%%%UNDERSCORE%%%/g, "&#95;")   // _
						.replace(/%%%TILDE%%%/g, "&#126;") // ~
						.replace(/%%%BACKTICK%%%/g, "&#96;")  // `
						.replace(/%%%DASH%%%/g, "&#45;")  // -
						.replace(/%%%CARET%%%/g, "&#94;")  // ^
						.replace(/%%%DOLLAR%%%/g, "&#36;")  // $
						.replace(/%%%LBRACKET%%%/g, "&#91;")  // [
						.replace(/%%%RBRACKET%%%/g, "&#93;")  // ]
						.replace(/%%%LCURLY%%%/g, "&#123;") // {
						.replace(/%%%RCURLY%%%/g, "&#125;") // }
						.replace(/%%%LPAREN%%%/g, "&#40;")   // (
						.replace(/%%%RPAREN%%%/g, "&#41;"); // )
				};
			};
		},

		// ANCHOR Utilities: encodeCodeBlock
		/**
		 * @summary Encodes plain text into HTML-encoded code block content.
		 * 
		 * @function encodeCodeBlock
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function to encode a string.
		 * 
		 * @param {Object} params - Parameters for encoding.
		 * @param {string} params.text - The plain text string to encode.
		 * 
		 * @returns {string} The HTML-encoded string.
		 * 
		 * @example
		 * const encoded = encodeCodeBlock()({ text: "<div>Hello</div>" });
		 * log(encoded); 
		 * // Output: "&lt;div&gt;Hello&lt;/div&gt;"
		 */
		encodeCodeBlock: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ text }) => {
					if (typeof text !== "string") {
						if (moduleSettings.verbose) {

							logSyslogMessage({
								severity: 7,
								tag: "encodeCodeBlock",
								transUnitId: "70000",
								message: "Invalid Argument: 'text' is not a string, returning input."
							});
						}

						return text;
					}

					return text
						// Already existing replacements
						.replace(/&/g, "%%%AMPERSAND%%%")
						.replace(/</g, "%%%LESSTHAN%%%")
						.replace(/>/g, "%%%GREATERTHAN%%%")
						.replace(/"/g, "%%%QUOTE%%%")
						.replace(/'/g, "%%%APOSTROPHE%%%")
						.replace(/ /g, "%%%SPACE%%%")
						.replace(/\n/g, "%%%NEWLINE%%%")
						.replace(/\t/g, "%%%TAB%%%")
						// Additional special characters
						.replace(/=/g, "%%%EQUAL%%%")
						.replace(/\*/g, "%%%ASTERISK%%%")
						.replace(/_/g, "%%%UNDERSCORE%%%")
						.replace(/~/g, "%%%TILDE%%%")
						.replace(/`/g, "%%%BACKTICK%%%")
						.replace(/-/g, "%%%DASH%%%")
						.replace(/\^/g, "%%%CARET%%%")
						.replace(/\$/g, "%%%DOLLAR%%%")
						.replace(/\[/g, "%%%LBRACKET%%%")
						.replace(/\]/g, "%%%RBRACKET%%%")
						.replace(/\{/g, "%%%LCURLY%%%")
						.replace(/\}/g, "%%%RCURLY%%%")
						.replace(/\(/g, "%%%LPAREN%%%")
						.replace(/\)/g, "%%%RPAREN%%%");
				};
			};
		},

		// ANCHOR Utilities: decodeNoteContent
		/**
		 * @summary Decodes HTML-encoded note content into plain text. Needed when reading Roll20 content from handouts.
		 * 
		 * @function decodeNoteContent
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function to decode note content.
		 * 
		 * @param {Object} params - Parameters for decoding.
		 * @param {string} params.text - The HTML-encoded note content to decode.
		 * 
		 * @returns {string} The decoded plain text string.
		 * 
		 * @example
		 * const decoded = decodeNoteContent()({ text: "&lt;div&gt;Hello&lt;/div&gt;" });
		 * log(decoded); 
		 * // Output: "<div>Hello</div>"
		 */
		decodeNoteContent: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ text }) => {

					if (typeof text !== "string") {
						if (moduleSettings.verbose) {

							logSyslogMessage({
								severity: 7,
								tag: "decodeNoteContent",
								transUnitId: "70000",
								message: "Invalid Argument: 'text' is not a string, returning input."
							});
						}

						return text;
					}

					return text
						// Normalize spaces that come from pasting content
						.replace(" ", "&nbsp;")
						.replace(/<p>/g, "")
						.replace(/<\/p>/g, "")
						.replace(/<br>/g, "\n")
						.replace(/&lt;/g, "<")
						.replace(/&gt;/g, ">")
						.replace(/&quot;/g, "\"")
						.replace(/&#39;/g, "'")
						.replace(/&nbsp;/g, " ")
						.replace(/&amp;/g, "&");
				};
			};
		},

		// ANCHOR Utilities: encodeNoteContent
		/**
		 * @summary Encodes plain text into HTML-encoded note content. Content needs encoded when writing it to Roll20
		 * handout or character bios/notes sections.
		 * 
		 * @function encodeNoteContent
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function to encode note content.
		 * 
		 * @param {Object} params - Parameters for encoding.
		 * @param {string} params.text - The plain text note content to encode.
		 * 
		 * @returns {string} The HTML-encoded string.
		 * 
		 * @example
		 * const encoded = encodeNoteContent()({ text: "<div>Hello</div>" });
		 * log(encoded); 
		 * // Output: "&lt;div&gt;Hello&lt;/div&gt;"
		 */
		encodeNoteContent: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ text }) => {
					if (typeof text !== "string") {
						if (moduleSettings.verbose) {
							logSyslogMessage({
								severity: 7,
								tag: "encodeNoteContent",
								transUnitId: "70000",
								message: "Invalid Argument: 'text' is not a string, returning input."
							});
						}

						return text;
					}

					return text
						.replace(" ", "&nbsp;")
						.replace(/&amp;/g, "&")
						.replace(/&nbsp;/g, " ")
						.replace(/&#39;/g, "'")
						.replace(/&quot;/g, "\"")
						.replace(/&gt;/g, ">")
						.replace(/&lt;/g, "<")
						.replace(/<br>/g, "\n")
						.replace(/<\/p>/g, "")
						.replace(/<p>/g, "");
				};
			};
		},

		// ANCHOR Utilities: getGLobalSettings
		/**
		 * @summary Retrieves the global settings for the module.
		 * 
		 * @function getGlobalSettings
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function to access the global settings.
		 * 
		 * @returns {Object} The `globalSettings` object, containing shared configuration values.
		 * 
		 * @example
		 * // Example usage
		 * const getSettings = getGlobalSettings()(moduleSettings);
		 * const settings = getSettings();
		 * log(settings.sharedVaultName); 
		 * // Output: "EASY_VAULT"
		 */
		getGlobalSettings: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return () => {
					return globalSettings;
				};
			};
		},

		// ANCHOR Utilities: getSharedForge
		/**
		 * @summary Retrieves the global `EASY_FORGE` registry. Forges do not persist between sessions.
		 * 
		 * @function getSharedForge
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function to access the Forge.
		 * 
		 * @returns {Object} The `EASY_MODULE_FORGE` object, which includes methods for managing factories.
		 * 
		 * @example
		 * // Example usage
		 * const forge = getSharedForge()(moduleSettings)();
		 * forge.setFactory({ name: "TestFactory", factory: { test: 1 } });
		 * log(forge.getFactory({ name: "TestFactory" })); 
		 * // Output: { test: 1 }
		 */
		getSharedForge: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return () => {
					// FIXME Dynamically load forge based on global settings.
					// Because the sandbox does not have a global, we have to access the forge object by name.
					// One alternative is to maintain the same name for a Forge object and manage multiple forges.
					// Todo so means adding extra logic to factories and still the global multiple factory containing
					// forge would still need to be a consistent name. At this moment this is no added benefit in
					// managing multiple forges under a global object, therefore we access a singleton global Forge, and
					// use the same name.
					return EASY_FORGE;
				};
			};
		},

		// ANCHOR Utilities: getSharedVault
		/**
		 * @summary Retrieves or initializes the shared vault state in Roll20.
		 * 
		 * @function getSharedVault
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function to access the shared vault.
		 * 
		 * @param {Object} moduleSettings - Module-specific settings.
		 * @param {boolean} [moduleSettings.verbose=false] - If `true`, logs a debug message when initializing the shared vault.
		 * 
		 * @returns {Object} The shared vault object, allowing read/write access to persistent data.
		 * 
		 * @example
		 * // Example usage
		 * const vault = getSharedVault()(moduleSettings)();
		 * vault.myData = "Hello";
		 * log(state.EasyModuleVault); 
		 * // Output: { myData: "Hello" }
		 */
		getSharedVault: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return () => {
					const vaultName = globalSettings.sharedVaultName;
					if (!state[vaultName]) {
						state[vaultName] = {};
						if (moduleSettings.verbose) {
							logSyslogMessage({
								severity: 7,
								tag: "getSharedVault",
								transUnitId: "70000",
								message: `Not Found: Shared vault undefined, initializing 'state.${vaultName}'.`,
							});
						}
					}

					return state[vaultName];
				};
			};
		},

		// ANCHOR Utilities: logSyslogMessage
		/**
		 * @summary Logs a structured message with severity, module tagging, and a timestamp.
		 * 
		 * - Formats log messages according to a structured template inspired by Syslog.
		 * 
		 * @function logSyslogMessage
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a logger function.
		 * 
		 * @param {Object} params - Parameters for logging a message.
		 * @param {number} params.severity - The severity of the message. Supported values:
		 *   - `3`: ERROR
		 *   - `4`: WARN
		 *   - `6`: INFO (default)
		 *   - `7`: DEBUG
		 * @param {string} params.tag - A tag for identifying the log context (e.g., a specific feature or process).
		 * @param {string} params.transUnitId - A unique identifier for the transaction or log unit.
		 * @param {string} params.message - The message to log.
		 * 
		 * @returns {string} The formatted log message that was logged to the console.
		 * 
		 * @throws {Error} May throw an error if logging fails.
		 * 
		 * @example
		 * // Example usage
		 * const logger = logSyslogMessage()(moduleSettings);
		 * const result = logger({
		 *     severity: 6,
		 *     tag: "MyModule",
		 *     transUnitId: "1000",
		 *     message: "Informational message"
		 * });
		 * log(result); 
		 * // Output: "<INFO> 2025-01-01T12:34:56.789Z [MyModule](MyTag): {"transUnitId": "1000", "message": "Informational message"}"
		 */
		logSyslogMessage: function () {
			return (moduleSettings) => {

				const getSyslogTimestamp = () => { return new Date().toISOString(); };

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ severity, tag, transUnitId, message }) => {

					const severityMap = {
						3: "ERROR",
						4: "WARN",
						6: "INFO",
						7: "DEBUG",
					};
					const normalizedSeverity = severityMap[severity] ? severity : 6;
					const moduleName = moduleSettings?.readableName || "UNKNOWN_MODULE";
					const logMessage = `<${severityMap[normalizedSeverity]}> ${getSyslogTimestamp()} [${moduleName}](${tag}): {"transUnitId": ${transUnitId}, "message": "${message}"}`;

					try {
						log(logMessage);

						return logMessage;
					}
					catch (err) {
						log(err);
					}
				};
			};
		},

		// ANCHOR Utilities: parseChatCommands
		/**
		 * @summary Parses chat input into a map of main and subcommands with their arguments.
		 * 
		 * - Commands prefixed with `--` are treated as subcommands.
		 * - Arguments following each subcommand are grouped into an array.
		 * - The api call (e.g., `!api`) is ignored.
		 * 
		 * @function parseChatCommands
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function for parsing chat commands.
		 * 
		 * @param {Object} params - Parameters for parsing chat commands.
		 * @param {string} params.apiCallContent - The raw chat input to parse, starting with the main command and subcommands.
		 * 
		 * @returns {Map<string, string[]>} A map where keys are subcommands (e.g., `--alert`) and values are arrays of arguments.
		 * 
		 * @example
		 * // Example usage
		 * const commandMap = parseChatCommands()(moduleSettings)({
		 *     apiCallContent: "!api --alert --lang frFR"
		 * });
		 * log([...commandMap]); 
		 * // Output: [["--alert", []], ["--lang", ["frFR"]]]
		 */
		parseChatCommands: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ apiCallContent }) => {
					const commandMap = new Map();
					const normalizedContent = apiCallContent.trim();
					const segments = normalizedContent.split("--").filter(segment => { return segment.trim() !== ""; });
					segments.forEach((segment, index) => {
						if (index === 0 && segment.trim().startsWith("!")) {
							return;
						}
						const trimmedSegment = segment.trim();
						const [command, ...args] = trimmedSegment.split(/\s+/);
						const cleanCommand = command.toLowerCase().trim();
						commandMap.set(`--${cleanCommand}`, args);
					});

					return commandMap;
				};
			};
		},

		// ANCHOR Utilities: parseChatSubcommands
		/**
		 * @summary Parses subcommands into key-value pairs or flags.
		 * 
		 * - Subcommands in the format `key|value` or `key#value` are parsed into key-value pairs.
		 * - Subcommands without a delimiter are treated as flags and assigned a value of `true`.
		 * 
		 * @function parseChatSubcommands
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function for parsing subcommands.
		 * 
		 * @param {Object} params - Parameters for parsing subcommands.
		 * @param {string[]} params.subcommands - An array of subcommands to parse. Subcommands can be in the format `key|value`, `key#value`, or `flag`.
		 * 
		 * @returns {Object} A map where keys are subcommand names and values are either the parsed value or `true` for flags.
		 * 
		 * @example
		 * // Example usage
		 * const subMap = parseChatSubcommands()(moduleSettings)({
		 *     subcommands: ["key|value", "flag", "setting#enabled"]
		 * });
		 * log(subMap); 
		 * // Output: { key: "value", flag: true, setting: "enabled" }
		 */
		parseChatSubcommands: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ subcommands }) => {
					const subcommandMap = {};
					subcommands.forEach(arg => {
						const delimiterMatch = arg.includes("|") ? "|" : arg.includes("#") ? "#" : null;
						if (delimiterMatch) {
							const [key, value] = arg.split(delimiterMatch);
							subcommandMap[key] = value;
						} else {
							subcommandMap[arg] = true;
						}
					});

					return subcommandMap;
				};
			};
		},

		// ANCHOR Utilities: replacePlaceholders
		/**
		 * @summary Replaces placeholders in a string with token values and evaluates inline expressions.
		 * 
		 * - Handles placeholders in the format `{{key}}` by replacing them with corresponding values from `expressions`.
		 * - Evaluates inline Roll20 expressions in the format `[[expression]]` and wraps them in a styled `<span>`.
		 * - Resolves CSS variables in the format `var(--variable-name)` using provided `cssVars`.
		 * 
		 * @function replacePlaceholders
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns a function for placeholder replacement.
		 * 
		 * @param {Object} params - Parameters for replacing placeholders.
		 * @param {string} params.string - The string containing placeholders to replace.
		 * @param {Object} [params.expressions={}] - An object mapping placeholder keys (e.g., `name` in `{{name}}`) to their replacement values.
		 * @param {Object} [params.cssVars={}] - An object mapping CSS variable names (e.g., `--color`) to their resolved values.
		 * 
		 * @returns {string} The modified string with placeholders replaced, inline expressions wrapped, and CSS variables resolved.
		 * 
		 * @example
		 * // Example usage
		 * const replaced = replacePlaceholders()(moduleSettings)({
		 *     string: "Hello {{name}}! Your roll is [[1d20+5]].",
		 *     expressions: { name: "World" },
		 *     cssVars: { "--main-color": "#ff0000" }
		 * });
		 * log(replaced); 
		 * // Output: "Hello World! Your roll is <span class=\"inline-rolls\">[[1d20+5]]</span>."
		 */
		replacePlaceholders: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {

				/**
				 * @function resolveCssVar
				 * @description Recursively resolves CSS variables in a value string, replacing `var(--xyz)` references with their corresponding values from a `cssVars` map.
				 *              - Prevents infinite recursion by tracking visited variables.
				 *              - Leaves unresolved variables as `var(--xyz)` if their value is not found.
				 * 
				 * @param {string} value - The CSS property value containing potential `var(--xyz)` references.
				 * @param {Object} cssVars - An object mapping CSS variable names (e.g., `--xyz`) to their values.
				 * @param {Set<string>} [visited=new Set()] - A set of already visited variables to prevent circular references.
				 * 
				 * @returns {string} The resolved CSS value with variables replaced, or the original value if unchanged.
				 */
				function resolveCssVar(value, cssVars, visited = new Set()) {

					// Prevent infinite recursion by keeping track of visited variables
					if (!value || typeof value !== "string") return value;

					return value.replace(/var\((--[\w-]+)\)/g, (_, cssVar) => {
						if (visited.has(cssVar)) {

							// Stop recursion if the variable is already being processed
							return `var(${cssVar})`;
						}

						const resolvedValue = cssVars[cssVar];
						if (resolvedValue !== undefined) {
							visited.add(cssVar);
							const result = resolveCssVar(resolvedValue, cssVars, visited);
							visited.delete(cssVar);

							return result;
						} else {

							// If the variable is unknown, return as-is
							return `var(${cssVar})`;
						}
					});
				}

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ text, expressions = {}, cssVars = {} }) => {

					/* Resolve CSS variables in the `cssVars` themselves first. Vars assigned values based on other vars
					================================================================================================= */
					const resolvedCssVars = {};
					for (const [key, value] of Object.entries(cssVars)) {
						resolvedCssVars[key] = resolveCssVar(value, cssVars);
					}

					/* Replace placeholders in text
					================================================================================================= */
					return text
						.replace(/{{(.*?)}}/g, (_, key) => {
							return expressions[key.trim()] || "";
						})
						.replace(/\[\[(.*?)\]\]/g, (_, anExpression) => {

							// Wrap Roll20 roll expressions in a span for styling
							return `<span class="inline-rolls">[[${anExpression.trim()}]]</span>`;
						})
						.replace(/var\((--[\w-]+)\)/g, (_, cssVar) => {
							return resolvedCssVars[cssVar.trim()] || `var(${cssVar.trim()})`;
						});
				};
			};
		},

		/* !SECTION End of Utilities: Low Level ***********************************************************************/

		/* SECTION: Utilities: High Level *****************************************************************************/
		/**
		 * @summary This section contains essential, reusable functions that handle complex tasks and module-level operations.
		 *
		 * - High-level functions use lower-level utilities.
		 * - These functions may rely on `moduleSettings` for context and configuration specific to the calling module.
		 * - High-level functions should attempt to fall back to default values or configurations when issues arise.
		 * - If a fallback is not possible and the outcome remains erroneous, they should log the issue and throw an
		 *   error to the Roll20 API to ensure proper debugging and system stability.
		 */

		// ANCHOR Utilities: renderTemplateAsync
		/**
		 * @summary Asynchronously renders an alert message template and whispers it to a player in Roll20.
		 * @function whisperAlertMessageAsync
		 * @memberof EASY_UTILS
		 * @returns {Function} A higher-order function that takes `moduleSettings` and returns an asynchronous function for sending an alert.
		 * 
		 * @param {Object} params - Parameters for sending the alert.
		 * @param {string} params.from - The sender of the message (defaults to `moduleSettings.readableName`).
		 * @param {string} params.to - The recipient of the whisper (defaults to `"gm"`).
		 * @param {string} [params.toId] - The Roll20 player ID of the recipient, used for localization.
		 * @param {string|number} [params.severity=6] - The severity of the alert, either a string (`"error"`, `"warning"`, `"information"`, `"tip"`) or numeric code.
		 * @param {string} [params.apiCallContent] - Additional context or code related to the alert message.
		 * @param {string} [params.remark] - Additional remarks or comments to include in the alert.
		 * 
		 * @returns {Promise<number>} A promise that resolves to `0` if the alert is successfully sent, or throws an error if the process fails.
		 * 
		 * @example
		 * // Example usage
		 * await whisperAlertMessageAsync()(moduleSettings)({
		 *     from: "System",
		 *     to: "gm",
		 *     severity: "WARNING",
		 *     apiCallContent: "0x1234ABCD",
		 *     remark: "Check the logs for more details."
		 * });
		 */
		renderTemplateAsync: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				// const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });
				const templateFactory = EASY_UTILS.getFunction({ functionName: "createTemplateFactory", moduleSettings });
				const themeFactory = EASY_UTILS.getFunction({ functionName: "createThemeFactory", moduleSettings });
				const applyCssToHtmlJson = EASY_UTILS.getFunction({ functionName: "applyCssToHtmlJson", moduleSettings });
				const convertJsonToHtml = EASY_UTILS.getFunction({ functionName: "convertJsonToHtml", moduleSettings });
				const convertHtmlToJson = EASY_UTILS.getFunction({ functionName: "convertHtmlToJson", moduleSettings });
				const convertCssToJson = EASY_UTILS.getFunction({ functionName: "convertCssToJson", moduleSettings });
				const decodeCodeBlock = EASY_UTILS.getFunction({ functionName: "decodeCodeBlock", moduleSettings });

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return async ({ template, expressions = {}, theme, cssVars = {} }) => {

					try {
						const [fetchedTemplate, fetchedTheme] = await Promise.all([
							templateFactory.get({ template, expressions, cssVars }),
							themeFactory.get({ theme, expressions, cssVars })
						]);

						const styledJson = applyCssToHtmlJson({
							cssJson: convertCssToJson({ css: fetchedTheme }),
							htmlJson: convertHtmlToJson({ html: fetchedTemplate })
						});

						const output = convertJsonToHtml({ htmlJson: decodeCodeBlock({ text: styledJson }) });

						return output;
					} catch (err) {

						// "50000": "Error: {{ remark }}"
						const msgId = "50000";
						logSyslogMessage({
							severity: "ERROR",
							tag: "renderTemplateAsync",
							transUnitId: msgId,
							message: PhraseFactory.get({ transUnitId: msgId, remark: err })
						});

						return 1;
					}
				};
			};
		},

		// ANCHOR Utilities: whisperAlertMessageAsync
		/**
		 * @summary Creates a function to asynchronously send an alert message to a player in Roll20 chat.
		 * 
		 * @function whisperAlertMessageAsync
		 * @memberof EASY_UTILS
		 * @returns {Function} A function that takes `moduleSettings` and returns another function to send an alert message.
		 * 
		 * @param {Object} params - Parameters for sending the alert message.
		 * @param {string} params.from - The sender of the alert message (defaults to `moduleSettings.readableName`).
		 * @param {string} params.to - The recipient of the alert message (e.g., `"gm"`).
		 * @param {string} [params.toId] - The ID of the recipient, used for personalized content.
		 * @param {string|number} [params.severity=6] - Severity level or type of the alert (`"error"`, `"warning"`, `"information"`, `"tip"`).
		 * @param {string} [params.apiCallContent] - The Roll20 !api chat message content.
		 * @param {string} [params.remark] - Additional remark to include in the alert message.
		 * 
		 * @returns {Promise<number>} A promise resolving to:
		 * - `0` on successful message delivery.
		 * - `1` on failure.
		 * 
		 * @example
		 * // Usage:
		 * const whisperAlert = whisperAlertMessageAsync()(moduleSettings);
		 * const result = await whisperAlert({
		 *   from: "System",
		 *   to: "gm",
		 *   severity: "WARN",
		 *   apiCallContent: apiCall,
		 *   remark: "An unexpected event occurred."
		 * });
		 * console.log(result); // 0 on success, 1 on failure.
		 */
		whisperAlertMessageAsync: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });
				const renderTemplateAsync = EASY_UTILS.getFunction({ functionName: "renderTemplateAsync", moduleSettings });
				const whisperPlayerMessage = EASY_UTILS.getFunction({ functionName: "whisperPlayerMessage", moduleSettings });
				const PhraseFactory = EASY_UTILS.getFunction({ functionName: "createPhraseFactory", moduleSettings });

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return async ({ from, to, toId, severity = 6, apiCallContent, remark }) => {

					const typeEnum = {
						error: {
							type: 3, // "ERROR"
							bgColor: "#ffdddd",
							titleColor: "#FF0000",
							// Content
							// "0x004A7742": "error",
							title: PhraseFactory.get({ playerId: toId, transUnitId: "0x004A7742" }),

							// "0x02B2451A": "You entered the following command:",
							description: PhraseFactory.get({ playerId: toId, transUnitId: "0x02B2451A" }),
							code: apiCallContent,

							// "0x0834C8EE": "If you continue to experience issues contact the module author ({{ author }})."
							footer: PhraseFactory.get({ playerId: toId, transUnitId: "0x0834C8EE", expressions: { author: `${moduleSettings.author}` } })
						},
						warn: {
							type: 4, // "WARN"
							bgColor: "#FBE7A1",
							titleColor: "#CA762B",
							// Content
							// "0x0B672E77": "warning",
							title: PhraseFactory.get({ playerId: toId, transUnitId: "0x0B672E77" }),

							// "0x02B2451A": "You entered the following command:",
							description: PhraseFactory.get({ playerId: toId, transUnitId: "0x02B2451A" }),
							code: apiCallContent,

							// "0x0834C8EE": "If you continue to experience issues contact the module author ({{ author }})."
							footer: PhraseFactory.get({ playerId: toId, transUnitId: "0x0834C8EE", expressions: { author: `${moduleSettings.author}` } })

						},
						info: {
							type: 6, // "INFO"
							bgColor: "#b8defd",
							titleColor: "#2516f5",
							// Content
							// "0x0004E2AF": "information"
							title: PhraseFactory.get({ playerId: toId, transUnitId: "0x0004E2AF" }),
							description: "",
							code: "",
							footer: ""
						},
						debug: {
							type: 7, // "DEBUG"
							bgColor: "#C3FDB8",
							titleColor: "#16F529",
							// Content
							// "0x000058E0": "tip"
							title: PhraseFactory.get({ playerId: toId, transUnitId: "0x000058E0" }),

							// "0x02B2451A": "You entered the following command:",
							description: "",
							code: apiCallContent,
							footer: ""
						}
					};

					// Type lookup
					const resolvedSeverity = Object.keys(typeEnum).find((key) => {
						const isStringMatch = typeof severity === "string" && key === severity.toLowerCase();
						const isNumericMatch = typeof severity === "number" && typeEnum[key].type === severity;

						return isStringMatch || isNumericMatch;
					}) || "info";

					const alertConfig = typeEnum[resolvedSeverity] || typeEnum.info;

					const alertContent = {
						title: alertConfig.title,
						description: alertConfig.description,
						code: alertConfig.code,
						remark,
						footer: alertConfig.footer
					};

					const alertPalette = {
						"--ez-color-background-primary": alertConfig.bgColor,
						"--ez-color-text-contrast": alertConfig.titleColor,
					};

					try {
						const styledMessage = await renderTemplateAsync({
							template: "chatAlert",
							expressions: alertContent,
							theme: "chatAlert",
							cssVars: alertPalette,
						});


						whisperPlayerMessage({ from, to, message: styledMessage });

						return 0;
					} catch (err) {

						// "50000": "Error: {{ remark }}"
						const msgId = "50000";
						logSyslogMessage({
							severity: "ERROR",
							tag: "whisperAlertMessageAsync",
							transUnitId: msgId,
							message: PhraseFactory.get({ transUnitId: msgId, remark: err })
						});

						return 1;
					}
				};
			};
		},

		// ANCHOR Utilities: whisperPlayerMessage
		/**
		 * @summary Creates a function to send a whispered message to a player in Roll20 chat.
		 * 
		 * @function whisperPlayerMessage
		 * @memberof EASY_UTILS
		 * @returns {Function} A function that takes `moduleSettings` and returns another function to send a message.
		 * 
		 * @param {Object} params - Parameters for sending the whisper.
		 * @param {string} params.from - The sender of the message (defaults to `moduleSettings.readableName`).
		 * @param {string} params.to - The recipient of the message (defaults to `"gm"`).
		 * @param {string} params.message - The message to send.
		 * 
		 * @returns {number} A formatted string indicating the message status: 
		 * - 0 on success.
		 * - 1 on failure.
		 * 
		 * @example
		 * // Usage:
		 * const whisper = whisperPlayerMessage()(moduleSettings);
		 * const result = whisper({ from: "System", to: "gm", message: "Hello GM!" });
		 * console.log(result); // "System;;gm;;Hello GM!"
		 */
		whisperPlayerMessage: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

				// ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
				// │                                      Main Closure                                                 │
				// └───────────────────────────────────────────────────────────────────────────────────────────────────┘
				return ({ from, to, message }) => {
					const sender = from || moduleSettings.readableName;
					const recipient = to || "gm";

					try {
						sendChat(sender, `/w ${recipient} ${message}`);

						return 0;
					} catch (err) {

						// "50000": "Error: {{ remark }}"
						const msgId = "50000";
						logSyslogMessage({
							severity: "ERROR",
							tag: "checkInstall",
							transUnitId: msgId,
							message: PhraseFactory.get({ transUnitId: msgId, remark: err })
						});

						return 1;
					}
				};
			};
		},
	};

	/* !SECTION End of Utilities: High Level **************************************************************************/
	/* !SECTION End of functionLoaders ********************************************************************************/

	/* SECTION INITIALIZATION *****************************************************************************************/
	const checkInstall = () => {

		if (typeof EASY_UTILS !== "undefined") {

			const requiredFunctions = [
				"createPhraseFactory",
				"logSyslogMessage"
			];

			Utils = EASY_UTILS.fetchUtilities({
				requiredFunctions,
				moduleSettings
			});

			// Invoke factories to ensure registration in the forge
			PhraseFactory = Utils.createPhraseFactory;
			TemplateFactory = Utils.createTemplateFactory;
			ThemeFactory = Utils.createThemeFactory;

			if (moduleSettings.verbose) {

				// "10000": ".=> Initializing <=.",
				const msgId = "10000";
				Utils.logSyslogMessage({
					severity: "INFO",
					tag: moduleSettings.readableName,
					transUnitId: msgId,
					message: PhraseFactory.get({ transUnitId: msgId })
				});
			}

			return 0;
		}
		else {

			const _getSyslogTimestamp = () => { return new Date().toISOString(); };
			const logMessage = `<ERROR> ${_getSyslogTimestamp()} [${moduleSettings.readableName}](checkInstall): {"transUnitId": 50000, "message": "Unexpected Error occurred initializing ${moduleSettings.globalName}"}`;
			log(logMessage);

			return 1;
		}
	};

	on("ready", () => {

		const continueMod = checkInstall();
		if (continueMod === 0) {

			// registerEventHandlers();

			// "20000": ".=> Ready <=.",
			const msgId = "20000";
			Utils.logSyslogMessage({
				severity: "INFO",
				tag: moduleSettings.readableName,
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId })
			});

		}
	});

	/* !SECTION END of INITIALIZATION *********************************************************************************/

	/* SECTION: PUBLIC INTERFACE **************************************************************************************/
	/**
	 * @summary This section provides a streamlined interface to access utility functions and factories within the system.
	 *
	 * - Functions are dynamically loaded on demand to optimize performance and resource usage.
	 * - Factory functions (e.g., _createPhraseFactory, _createTemplateFactory, _createThemeFactory) are returned
	 *   directly without additional binding or configuration.
	 * - Standard functions are retrieved and bound with the caller's `moduleSettings` to ensure contextual execution.
	 * - If a requested function is not found, the interface throws a descriptive error to facilitate debugging.
	 * - This design ensures a clean, modular approach for accessing utilities while maintaining system stability.
	 */

	const loadedFunctions = {};

	return {

		// ANCHOR Method: getFunction
		/**
		 * @summary Retrieves a function from the function loader and initializes it if needed.
		 * 
		 * - Checks if the specified function exists in the function loader.
		 * - If the function is not already loaded, it initializes the function and caches it.
		 * - Supports special handling for factory functions to ensure they are registered in the forge.
		 * 
		 * @function getFunction
		 * @memberof EASY_UTILS
		 * @param {Object} params - Parameters for retrieving the function.
		 * @param {string} params.functionName - The name of the function to retrieve.
		 * @param {Object} params.moduleSettings - Module-specific settings used for customizing the function.
		 * 
		 * @returns {Function|Object|undefined} The requested function, a factory instance, or `undefined` if the function does not exist.
		 * 
		 * @throws {Error} Logs a warning if the function does not exist in the function loader.
		 * 
		 * @example
		 * // Retrieve a function and invoke it
		 * const myFunction = EASY_UTILS.getFunction({
		 *     functionName: "applyCssToHtmlJson",
		 *     moduleSettings: {
		 *         readableName: "MyModule",
		 *         verbose: true,
		 *     }
		 * });
		 * if (myFunction) {
		 *     myFunction({ cssJson, htmlJson });
		 * }
		 */
		getFunction: ({ functionName, moduleSettings }) => {

			// Check if the function Function Loader for this functionName exists
			if (!functionLoaders[functionName]) {

				// "40400": "Not Found: {{ remark }}",
				const msgId = "40400";
				Utils.logSyslogMessage({
					severity: "WARN",
					tag: `${moduleSettings.readableName}:checkInstall`,
					transUnitId: msgId,
					message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: functionName } })
				});

				return undefined;
			}

			if (!loadedFunctions[functionName]) {
				loadedFunctions[functionName] = functionLoaders[functionName]();
			}

			if (globalSettings.factoryFunctions.includes(functionName)) {
				// Calling the factory function with moduleSettings ensures it's registered in the forge
				return loadedFunctions[functionName](moduleSettings);
			}

			if (typeof loadedFunctions[functionName] === "function") {
				return loadedFunctions[functionName](moduleSettings);
			}

			return loadedFunctions[functionName];
		},

		// ANCHOR Method: fetchedUtilities
		/**
		 * @summary Fetches and initializes a collection of utilities from the function loader.
		 * 
		 * - Iterates through a list of required function names.
		 * - Retrieves each function from the function loader using `getFunction`.
		 * - Returns an object mapping function names to their initialized implementations.
		 * 
		 * @function fetchUtilities
		 * @memberof EASY_UTILS
		 * @param {Object} params - Parameters for fetching utilities.
		 * @param {string[]} params.requiredFunctions - An array of function names to fetch and initialize.
		 * @param {Object} params.moduleSettings - Module-specific settings used for customizing the fetched functions.
		 * 
		 * @returns {Object} An object where keys are function names and values are the corresponding initialized functions.
		 * 
		 * @example
		 * // Fetch multiple utilities and use them
		 * const utilities = EASY_UTILS.fetchUtilities({
		 *     requiredFunctions: ["applyCssToHtmlJson", "logSyslogMessage"],
		 *     moduleSettings: {
		 *         readableName: "MyModule",
		 *         verbose: true,
		 *     }
		 * });
		 * 
		 * utilities.applyCssToHtmlJson({ cssJson, htmlJson });
		 * utilities.logSyslogMessage({ severity: "INFO", message: "Utilities loaded successfully" });
		 */
		fetchUtilities: ({ requiredFunctions, moduleSettings }) => {
			return requiredFunctions.reduce((accumulator, functionName) => {
				accumulator[functionName] = EASY_UTILS.getFunction({ functionName, moduleSettings });

				return accumulator;
			}, {});
		}
	};

	/* !SECTION End of PUBLIC INTERFACE *******************************************************************************/

})();

/* !SECTION End of EASY_UTILS *****************************************************************************************/

/* For Local testing when mocking Roll20
export { EASY_MODULE_FORGE };
export { EASY_UTILS };
*/

