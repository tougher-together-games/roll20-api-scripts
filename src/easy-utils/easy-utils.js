/*!
 * @language: en-US
 * @title: easy-utils.js
 * @description: Utility library for Easy Modules in Roll20. Provides reusable, memory-efficient functions to simplify module development and reduce boilerplate.
 * @comment: Developed using VSCode with extensions: Comment Anchors, ESLint, Inline Hasher (for ELF hash of dictionary transUnitIds), Spell Checker, and Live Server, along with Grunt for task automation.
 * @author: Mhykiel
 * @version: 0.1.0
 * @license: MIT License
 * @repository: {@link https://github.com/Tougher-Together-Gaming/roll20-api-scripts/blob/main/src/easy-utils/easy-utils.js|GitHub Repository}
 */

// ANCHOR Object: EASY_MODULE_FORGE
/**
 * @summary A global registry for managing factories shared across all Easy Modules.
 * 
 * - **Purpose**:
 *   - Acts as a shared registry for storing and retrieving factories across Easy Modules.
 *   - Simplifies access to modular resources like HTML templates, CSS themes, and localization strings.
 * 
 * - **Execution**:
 *   - Uses a Immediately Invoked Function Expression (IIFE) to create a singleton instance.
 *   - The following EASY_UTILS will initialize the "Forge" with factories.
 * 
 * - **Design**:
 *   - Maintains a central registry of factories keyed by name.
 *   - Factories follow a standardized interface, including methods like `add`, `remove`, `set`, `get`, and `init`.
 *   - Designed for sharing complex, reusable objects between modules without duplication.
 */
const EASY_MODULE_FORGE = (() => {

	const factories = {};

	return {

		// ANCHOR Method: getFactory
		getFactory: ({ name }) => {
			if (!factories.hasOwnProperty(name)) {
				return null;
			}

			return factories[name];
		},

		// ANCHOR Method: setFactory
		setFactory: ({ name, factory }) => {
			factories[name] = factory;
		},

		// ANCHOR Method: getFactoryNames
		getFactoryNames: () => {
			return Object.keys(factories);
		}
	};
})();

// ANCHOR Object: EASY_UTILS
/**
 * @summary A utility library for Easy Modules in Roll20, providing reusable functions to simplify module development.
 * 
 * - **Purpose**:
 *   - Reduces repetitive coding by centralizing common tasks like CSS/HTML manipulation, logging, and messaging.
 *   - Provides tools to streamline creating, rendering, and managing templates and themes.
 * 
 * - **Execution**:
 *   - Must be uploaded as the first script (farthest left tab) in the Roll20 API sandbox to ensure availability for dependent modules.
 *   - Designed to work seamlessly with the `EASY_MODULE_FORGE` for managing shared factories.
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

	/*******************************************************************************************************************
	 * SECTION: Configuration and Settings
	 * 
	 * Centralized storage for shared settings and reusable data specific to this module.
	 * 
	 * - Serves as a single source of truth for values used across multiple functions.
	 * - Simplifies maintenance by allowing updates in one location to propagate throughout the module.
	 ******************************************************************************************************************/

	// ANCHOR Property: globalSettings
	// These values do not change when functions are loaded by other modules
	const globalSettings = {
		sharedVaultName: "EasyModuleVault",
		// FIXME If you change sharedForgeName you have to change the hardcoded name in getSharedForge()
		sharedForgeName: "EASY_MODULE_FORGE",
		defaultLanguage: "enUS",
	};

	// ANCHOR Property: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Utils",
		chatApiName: "ezutils",
		globalName: "EASY_UTILS",
		version: "1.0.0",
		author: "Mhykiel",
		verbose: false,
	};

	// ANCHOR Property: factoryFunctions
	// Identify Factories for special handling by function Function Loader
	const factoryFunctions = [
		"createPhraseFactory",
		"createTemplateFactory",
		"createThemeFactory",
	];

	// These are reassigned during checkInstall to initialize Factories and provide basic syslog messages to EASY_UTILS.
	let Utils = {};
	let PhraseFactory = {};
	//let TemplateFactory = {};
	//let ThemeFactory = {};

	// !SECTION END of Configuration and Settings

	/**
	 * @namespace functionLoaders
	 * 
	 * Utility functions for Roll20 modules, built with double closures for efficiency and flexibility.
	 * 
	 * - **Purpose**:
	 *   - Reduce memory usage by only instantiating functions when requested.
	 *   - Provide customized behavior for each module by wrapping functions with `moduleSettings`.
	 *   - Ensure consistency across modules with standardized implementations of routine functions.
	 * 
	 * - **Execution**:
	 * 
	 * @example
	 * // Retrieve a customized function instance:
	 * const customizedFunction = EASY_UTILS.GetFunction({ functionName: "functionName", moduleSettings });
	 * 
	 * - **Design**:
	 *   - The first closure caches dependencies and module-specific settings, while the second returns the customized function.
	 */
	const functionLoaders = {

		/***************************************************************************************************************
		 * SECTION: Available Functions: Low Level
		 * 
		 * Basic, reusable, and stateless functions for small, specific tasks. 
		 * 
		 * - Support higher-level functions but can be used independently.
		 * - Do not require `moduleSettings` but include it for consistency and optional logging.
		 * - Handle errors gracefully (e.g., return default values or log warnings) without throwing exceptions.
		 **************************************************************************************************************/

		// ANCHOR Function Loader: applyCssToHtmlJson
		/**
		 * @summary Applies CSS (provided as JSON) to an HTML-like structure (also provided as JSON).
		 * This function parses the CSS rules and HTML structure, merges styles (with respect to !important),
		 * handles pseudo-classes, attribute selectors, classes, IDs, and more, then returns a new HTML JSON
		 * structure that includes computed styles as if the HTML had in-line styles.
		 * 
		 * @see convertCssToJson
		 * @see convertHtmlToJson
		 */
		applyCssToHtmlJson: function () {
			return (moduleSettings) => {
				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({
					functionName: "logSyslogMessage",
					moduleSettings,
				});
				// ---------------------------------------------------------------------------
				// A. PREPROCESS :root
				// ---------------------------------------------------------------------------
				//  - Finds any rule whose selector === ":root".
				//  - Splits out CSS variables (`--foo`) from normal props (color, font-size, etc.).
				//  - Puts those normal props into a #rootContainer rule at index=0.
				//  - Removes the :root rule from the array.
				function preprocessRootRules(cssRules, htmlTree) {
					// Find :root rule
					const rootIndex = cssRules.findIndex((r) => { return r.selector === ":root"; });
					if (rootIndex < 0) {
						// No :root => do nothing
						return { rootVariables: {}, updatedRules: cssRules };
					}

					const rootRule = cssRules[rootIndex];
					const { style: rootStyle = {} } = rootRule;

					// Separate variables from normal props
					const rootVariables = {};
					const rootNonVars = {};
					for (const [propKey, propValue] of Object.entries(rootStyle)) {
						if (propKey.startsWith("--")) {
							// Variable
							rootVariables[propKey] = propValue;
						} else {
							// Normal prop => goes to #rootContainer
							rootNonVars[propKey] = propValue;
						}
					}

					// Check if #rootContainer exists in htmlTree
					let rootContainerNode = null;
					const allNodes = gatherAllNodes(htmlTree);
					for (const node of allNodes) {
						if (node.props?.id === "rootContainer") {
							rootContainerNode = node;
							break;
						}
					}

					if (rootContainerNode) {
						// Merge non-variable properties into the existing #rootContainer
						rootContainerNode.props = rootContainerNode.props || {};
						rootContainerNode.props.style = rootContainerNode.props.style || {};
						Object.assign(rootContainerNode.props.style, rootNonVars);
					}/* else {
						// Create a new #rootContainer rule if it does not exist
						const rootContainerRule = {
							selector: "#rootContainer",
							specificity: { a: 1, b: 0, c: 0 },
							index: 0,
							style: rootNonVars,
						};
						// Insert #rootContainer rule at the front (lowest index)
						cssRules.unshift(rootContainerRule);
					}*/

					// Remove the :root rule from the array
					const filtered = cssRules.filter((r) => { return r.selector !== ":root"; });

					return { rootVariables, updatedRules: filtered };
				}


				// ---------------------------------------------------------------------------
				// B. Resolve var(--xyz)
				// ---------------------------------------------------------------------------
				//  - For any style property value that contains `var(--something)`,
				//    replace it with the actual value from `rootVariables` if present.
				function resolveRootVariables(value, rootVariables) {
					if (typeof value !== "string") return value;

					return value.replace(/var\((--[\w-]+)\)/g, (_, varName) => {
						return rootVariables[varName] || `var(${varName})`;
					});
				}

				// ---------------------------------------------------------------------------
				// C. Gather All Nodes
				// ---------------------------------------------------------------------------
				//  - Depth-first traversal of the HTML JSON to get a flat list of all nodes.
				//  - Attach `.parentNode` so each node can see its immediate parent.
				function gatherAllNodes(nodeOrArray, results = [], parent = null) {
					if (Array.isArray(nodeOrArray)) {
						for (const child of nodeOrArray) {
							gatherAllNodes(child, results, parent);
						}
					} else if (nodeOrArray && typeof nodeOrArray === "object") {
						nodeOrArray.parentNode = parent;
						results.push(nodeOrArray);
						if (Array.isArray(nodeOrArray.children)) {
							for (const c of nodeOrArray.children) {
								gatherAllNodes(c, results, nodeOrArray);
							}
						}
					}

					return results;
				}

				// ---------------------------------------------------------------------------
				// D. Tokenize a Selector
				// ---------------------------------------------------------------------------
				//  - Split by commas (`,`) => multiple selector groups.
				//  - Split each group by `>` => direct-child chains.
				//
				// Examples:
				//   "h1,h2,h3" => [ ["h1"], ["h2"], ["h3"] ]
				//   "stat-block>table>tr:nth-child(even)" => [ ["stat-block","table","tr:nth-child(even)"] ]
				//
				// We'll call each array a "chain."
				function tokenizeSelector(selector) {
					const groups = selector.split(",").map((s) => { return s.trim(); });
					const allChains = [];
					for (const group of groups) {
						const chain = group.split(">").map((s) => { return s.trim(); });
						allChains.push(chain);
					}

					return allChains;
				}

				// ---------------------------------------------------------------------------
				// E. parseChunk
				// ---------------------------------------------------------------------------
				//  - Given something like "div#main.container[role="button"]:nth-child(even)",
				//    extract: tag, #id, .class, [attr="val"], and pseudo-classes:
				//    - :first-child
				//    - :last-child
				//    - :nth-child(even|odd|number)
				function parseChunk(chunk) {
					const data = {
						tag: null,
						id: null,
						classes: [],
						attributes: {},
						pseudo: {
							nthChild: null,
							firstChild: false,
							lastChild: false,
						},
					};

					let working = chunk.trim();

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

					// leftover => tag
					const leftover = working.trim();
					if (leftover) {
						data.tag = leftover;
					}

					return data;
				}

				// ---------------------------------------------------------------------------
				// F. doesNodeMatchChunk
				// ---------------------------------------------------------------------------
				//  - Check if a single node meets the criteria in chunkData (tag, #id, .class, [attr], pseudo).
				function doesNodeMatchChunk(node, chunkData) {
					// 1) tag
					if (chunkData.tag && chunkData.tag !== node.element) {
						return false;
					}
					// 2) id
					if (chunkData.id && node.props?.id !== chunkData.id) {
						return false;
					}
					// 3) classes
					if (chunkData.classes.length > 0) {
						const nodeClasses = node.props?.class || [];
						for (const neededClass of chunkData.classes) {
							if (!nodeClasses.includes(neededClass)) {
								return false;
							}
						}
					}
					// 4) attributes
					for (const [k, v] of Object.entries(chunkData.attributes)) {
						if (node.props?.[k] !== v) {
							return false;
						}
					}
					// 5) pseudo
					const { firstChild, lastChild, nthChild } = chunkData.pseudo;
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
								if (idx % 2 !== 0) return false; // 0-based => odd => idx=0,2,4 => 1-based odd
							} else if (nthChild === "even") {
								if (idx % 2 !== 1) return false; // 1-based even => 2,4 => idx=1,3 => ...
							} else {
								// numeric => e.g. 3 => idx=2
								if (idx !== nthChild - 1) return false;
							}
						}
					}

					return true;
				}

				// ---------------------------------------------------------------------------
				// G. filterNodesByChunk
				// ---------------------------------------------------------------------------
				//  - Given an array of nodes and one chunkData, return only those that match.
				function filterNodesByChunk(nodes, chunkData) {
					const results = [];
					for (const n of nodes) {
						if (doesNodeMatchChunk(n, chunkData)) {
							results.push(n);
						}
					}

					return results;
				}

				// ---------------------------------------------------------------------------
				// H. filterByChain (Left-to-Right)
				// ---------------------------------------------------------------------------
				//  - For a chain like ["stat-block","table","tr:nth-child(even)"], we:
				//    1) parse first chunk => filter all nodes
				//    2) parse second chunk => for each matched node, gather its children, filter
				//    3) parse third chunk => gather children, filter
				//    => union the final results
				function filterByChain(htmlRoot, chain) {
					// Gather all nodes once
					const allNodes = gatherAllNodes(htmlRoot, []);
					// Parse chunk0
					const chunk0data = parseChunk(chain[0]);
					// Filter among all nodes
					let currentSet = filterNodesByChunk(allNodes, chunk0data);

					// For subsequent chunks => direct child
					for (let i = 1; i < chain.length; i++) {
						const chunkData = parseChunk(chain[i]);
						const nextSet = [];
						for (const matchedNode of currentSet) {
							// gather children
							if (Array.isArray(matchedNode.children)) {
								for (const childNode of matchedNode.children) {
									if (doesNodeMatchChunk(childNode, chunkData)) {
										nextSet.push(childNode);
									}
								}
							}
						}
						currentSet = nextSet;
					}

					return currentSet;
				}

				// ---------------------------------------------------------------------------
				// I. filterBySelector
				// ---------------------------------------------------------------------------
				//  - If the selector has commas => multiple chains. We union the results.
				function filterBySelector(htmlRoot, selector) {
					const chains = tokenizeSelector(selector);
					const resultSet = new Set();

					for (const chain of chains) {
						const matched = filterByChain(htmlRoot, chain);
						for (const node of matched) {
							resultSet.add(node);
						}
					}

					return [...resultSet];
				}

				// ---------------------------------------------------------------------------
				// J. mergeStyles
				// ---------------------------------------------------------------------------
				//  - Merge each new style prop into node.props.style, resolving var().
				function mergeStyles(nodeStyle, newStyles, rootVars) {
					for (const [prop, val] of Object.entries(newStyles)) {
						nodeStyle[prop] = resolveRootVariables(val, rootVars);
					}
				}

				// ---------------------------------------------------------------------------
				// K. removeParentRefs
				// ---------------------------------------------------------------------------
				//  - Clean up extra `.parentNode` references
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

				// ---------------------------------------------------------------------------
				// L. MAIN FUNCTION
				// ---------------------------------------------------------------------------
				return ({ cssJson, htmlJson }) => {
					try {
						// 1) Convert inputs if needed
						let cssRules = typeof cssJson === "string" ? JSON.parse(cssJson) : cssJson;
						let htmlTree = typeof htmlJson === "string" ? JSON.parse(htmlJson) : htmlJson;

						if (!Array.isArray(cssRules)) {
							cssRules = [];
						}
						if (!Array.isArray(htmlTree)) {
							htmlTree = [htmlTree]; // unify
						}

						// 2) Preprocess :root => rootVariables + #rootContainer rule
						const { rootVariables, updatedRules } = preprocessRootRules(cssRules, htmlTree);
						cssRules = updatedRules;

						// 3) For each rule => find matched => merge style
						for (const rule of cssRules) {
							const { selector, style } = rule;
							// filter nodes
							const matchedNodes = filterBySelector(htmlTree, selector);
							// merge style
							for (const node of matchedNodes) {
								node.props = node.props || {};
								node.props.style = node.props.style || {};
								mergeStyles(node.props.style, style, rootVariables);
							}
						}

						// 4) remove .parentNode
						removeParentRefs(htmlTree);

						// 5) Return final JSON
						if (moduleSettings.verbose) {
							logSyslogMessage({
								severity: 7, // DEBUG
								tag: "applyCssToHtmlJson",
								transUnitId: "70000",
								message: "Success",
							});
						}

						return JSON.stringify(htmlTree, null, 2);
					} catch (err) {
						// fallback
						logSyslogMessage({
							severity: 3,
							tag: "applyCssToHtmlJson",
							transUnitId: "30000",
							message: `${err}`,
						});

						return htmlJson;
					}
				};
			};
		},

		// ANCHOR Function Loader: convertCssToJson
		/**
		 * @summary Convert CSS string into JSON rules.
		 * @example
		 * const cssJsonStr = convertCssToJson()({ css: "div { color: red; }" });
		 * log(cssJsonStr); // JSON representation of CSS rules
		 */
		convertCssToJson: function () {
			return (moduleSettings) => {
				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({
					functionName: "logSyslogMessage",
					moduleSettings,
				});

				/**
				 * -----------------------------------------------------------------------------
				 * Helper function: getSpecificity
				 * -----------------------------------------------------------------------------
				 * Calculates specificity as a single number based on:
				 * a = # of ID selectors (each adds 100)
				 * b = # of class selectors, pseudo-classes, attribute selectors (each adds 10)
				 * c = # of type selectors, pseudo-elements (each adds 1)
				 * -----------------------------------------------------------------------------
				 */
				const getSpecificity = (selector) => {
					// Remove spacing around combinators like '>', '+', '~' to simplify splitting
					const cleaned = selector
						.replace(/\s*>\s*/g, ">")
						.replace(/\s*\+\s*/g, "+")
						.replace(/\s*~\s*/g, "~")
						.replace(/,\n/g, ",")
						.trim();

					// Split on combinators (space, >, +, ~) to evaluate each chunk separately
					const chunks = cleaned.split(/\s|>|\+|~(?![^\[]*\])/g).filter(Boolean);

					let a = 0; // ID count
					let b = 0; // Class, pseudo-class, attribute
					let c = 0; // Type, pseudo-element

					chunks.forEach((chunk) => {
						// Split chunk by sub-selectors that might appear together
						// e.g., "div.myClass:hover" => ["div", ".myClass", ":hover"]
						const subSelectors = chunk.split(/(?=[#.:\[])/).filter(Boolean);

						subSelectors.forEach((sub) => {
							if (sub.startsWith("#")) {
								// ID => a
								a += 1;
							} else if (sub.startsWith(".")) {
								// Class => b
								b += 1;
							} else if (sub.startsWith("[")) {
								// Attribute => b
								b += 1;
							} else if (sub.startsWith(":")) {
								// Pseudo-class or pseudo-element
								// Single-colon => pseudo-class => b
								// Double-colon => pseudo-element => c
								if (sub.startsWith("::")) {
									c += 1; // pseudo-element
								} else {
									b += 1; // pseudo-class
								}
							} else {
								// Type selector => c
								if (sub.trim() !== "") {
									c += 1;
								}
							}
						});
					});

					// Calculate single specificity number
					const specificity = a * 100 + b * 10 + c * 1;

					return specificity;
				};

				/**
				 * -----------------------------------------------------------------------------
				 * Helper function: compareSpecificity
				 * -----------------------------------------------------------------------------
				 * Used for sorting. Compares two objects with shape:
				 *   {
				 *     selector: String,
				 *     style: Object,
				 *     weight: Number,
				 *     index: Number
				 *   }
				 */
				const compareSpecificity = (ruleA, ruleB) => {
					// Compare specificity numbers
					if (ruleA.weight !== ruleB.weight) {
						return ruleA.weight - ruleB.weight;
					}

					// Tie-breaker => rule index
					return ruleA.index - ruleB.index;
				};

				return ({ css }) => {
					try {
						/*****************************************************************************************
						 * 1. Clean up the raw CSS
						 *****************************************************************************************/
						const cleanedCss = css
							.replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
							.replace(/\n/g, " ") // Replace newlines with spaces
							.replace(/\s+/g, " ") // Collapse multiple spaces
							.trim();

						/*****************************************************************************************
						 * 2. Prepare the array that will hold all rule objects
						 *****************************************************************************************/
						const ruleList = [];

						/*****************************************************************************************
						 * 3. Define regex patterns to capture selectors and their style blocks
						 *****************************************************************************************/
						const ruleRegex = /([^\{]+)\{([^\}]+)\}/g;
						const propertiesRegex = /([\w-]+)\s*:\s*([^;]+);/g;

						/*****************************************************************************************
						 * 4. Iterate over each CSS rule block
						 *****************************************************************************************/
						let ruleMatch;
						let ruleIndex = 0;
						while ((ruleMatch = ruleRegex.exec(cleanedCss))) {
							const selectorsRaw = ruleMatch[1].trim(); // e.g., "div, p:hover, .myClass"
							const propertiesRaw = ruleMatch[2].trim(); // e.g., "color: red; background: blue;"

							// Parse the style properties into an object
							const styleObj = {};
							let propMatch;
							while ((propMatch = propertiesRegex.exec(propertiesRaw))) {
								const propKey = propMatch[1].trim();
								const propValue = propMatch[2].trim();
								styleObj[propKey] = propValue;
							}

							// Split comma-separated selectors => e.g., "div, p" => ["div", "p"]
							const individualSelectors = selectorsRaw
								.split(",")
								.map((sel) => {
									return sel.replace(/\s*>\s*/g, ">")
										.replace(/\s*\+\s*/g, "+")
										.replace(/\s*~\s*/g, "~")
										.trim();
								});

							// For each selector in the group
							individualSelectors.forEach((aSelector) => {
								const specificity = getSpecificity(aSelector);
								ruleList.push({
									selector: aSelector,
									style: { ...styleObj },
									weight: specificity,
									index: ruleIndex,
								});

								// Increment for next rule (as a tie-breaker)
								ruleIndex++;
							});
						}

						/*****************************************************************************************
						 * 5. Sort the array by weight (specificity) and index
						 *****************************************************************************************/
						ruleList.sort(compareSpecificity);

						/*****************************************************************************************
						 * 6. Return the final array in JSON form
						 *****************************************************************************************/
						// If verbose, log at DEBUG level
						if (moduleSettings.verbose) {
							logSyslogMessage({
								severity: 7, // DEBUG
								tag: "convertCssToJson",
								transUnitId: "70000",
								message: "Success",
							});
						}

						//log(`convertCssToJson: ${JSON.stringify(ruleList, null, 2)}`);

						// Return the final JSON (stringify if you need a string)
						return JSON.stringify(ruleList, null, 2);

					} catch (err) {
						// In case of error, log at WARNING level
						logSyslogMessage({
							severity: 4, // WARNING
							tag: "convertCssToJson",
							transUnitId: "30000",
							message: `${err}`,
						});

						// Return an empty array fallback
						return JSON.stringify([]);
					}
				};
			};
		},


		// ANCHOR Function Loader: convertHtmlToJson
		/**
		 * @summary Convert HTML string into an HTML JSON structure.
		 * @example
		 * const htmlJsonStr = convertHtmlToJson()({ html: "<div>Hello</div>" });
		 * log(htmlJsonStr); // JSON representation of the HTML structure
		 */
		convertHtmlToJson: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

				return ({ html }) => {
					try {
						/*******************************************************************************************************
						 * 1. Clean up the raw HTML
						 ******************************************************************************************************/
						const cleanedHtml = html
							.replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
							.replace(/\n/g, " ")            // Replace newlines with spaces
							.replace(/\s+/g, " ")           // Collapse multiple spaces
							.trim();                        // Remove leading/trailing spaces

						/*******************************************************************************************************
						 * 2. Use a regex to split out tags vs. text nodes
						 ******************************************************************************************************/
						const tokenRegex = /<\/?\w+[^>]*>|[^<>]+/g;
						const rawTokens = cleanedHtml.match(tokenRegex) || [];
						const tokenArray = rawTokens
							.map(token => { return token.trim(); })
							.filter(Boolean);

						/*******************************************************************************************************
						 * Subroutine: Gets the 'fullAncestorChain' by walking up the stack (excluding the root stack item).
						 * Example: If stack = [rootContainer, <div>, <ul>], and we’re creating an <li>,
						 * then the chain might be "rootContainer>div>ul>li".
						 ******************************************************************************************************/
						function getFullAncestorChain(stack, newElementName) {
							// Exclude the 0th item if it’s the rootContainer
							const names = stack.map(node => { return node.element; });
							// names[0] === "div" (id = rootContainer)
							// e.g. ["div", "ul"]
							const existingChain = names.join(">");
							// e.g. "div>ul"
							if (existingChain) {
								return existingChain + ">" + newElementName;
							}

							// Fallback if something unexpected
							return newElementName;
						}

						/*******************************************************************************************************
						 * Main Function: Builds a hierarchical JSON representation of the tokens, under <div id="rootContainer">
						 ******************************************************************************************************/
						function parseHtmlToJson(tokens) {
							// 1) Create an actual "rootContainer" node that everything goes inside
							const rootContainer = {
								element: "div",
								props: {
									id: "rootContainer",
									style: {},
									class: [],
									inlineStyle: {}
								},
								children: [],
								childIndex: 1,
								// We'll also store the fullAncestorChain for the rootContainer itself
								fullAncestorChain: "rootContainer"
							};

							// 2) Initialize the stack with rootContainer
							const stack = [];
							stack.push(rootContainer);

							// 3) Iterate all tokens
							tokens.forEach((token) => {
								// Opening tag <div>, <p>, <span>, etc. capturing attributes
								const openingTagMatch = token.match(/^<(\w+)([^>]*)>$/);
								// Closing tag </div>, </p>, etc.
								const closingTagMatch = token.match(/^<\/(\w+)>$/);
								// e.g., <br/>
								const selfClosingTagMatch = token.match(/^<(\w+)([^>]*)\/>$/);

								if (selfClosingTagMatch) {
									//----------------------------------------------------------------
									// Handle self-closing tag
									//----------------------------------------------------------------
									const [, tagName, rawAttributes] = selfClosingTagMatch;

									const focusHtmlProps = {
										style: {},
										class: [],
										id: null,
										inlineStyle: {}
									};

									if (rawAttributes) {
										const attributeRegex = /([\w-]+)\s*=\s*["']([^"']+)["']/g;
										let attrMatch;
										while ((attrMatch = attributeRegex.exec(rawAttributes))) {
											const [, attrName, attrValue] = attrMatch;

											if (attrName === "style") {
												const inlineStyleObj = {};
												attrValue.split(";").forEach((styleDecl) => {
													const [key, val] = styleDecl.split(":").map(s => { return s.trim(); });
													if (key && val) inlineStyleObj[key] = val;
												});
												focusHtmlProps.inlineStyle = inlineStyleObj;
											} else if (attrName === "class") {
												focusHtmlProps.class = attrValue.split(" ").filter(Boolean);
											} else if (attrName === "id") {
												focusHtmlProps.id = attrValue;
											} else {
												focusHtmlProps[attrName] = attrValue;
											}
										}
									}

									// Build the new node
									const selfClosingNode = {
										element: tagName,
										props: focusHtmlProps,
										children: [],
										childIndex: 0
									};

									// Build its ancestor chain
									selfClosingNode.fullAncestorChain = getFullAncestorChain(stack, tagName);

									// Push into current parent
									const parent = stack[stack.length - 1];
									if (parent) {
										selfClosingNode.childIndex = parent.children.length + 1;
										parent.children.push(selfClosingNode);
									}

								} else if (openingTagMatch) {
									//----------------------------------------------------------------
									// Handle opening tag
									//----------------------------------------------------------------
									const [, tagName, rawAttributes] = openingTagMatch;

									const focusHtmlProps = {
										style: {},
										class: [],
										id: null,
										inlineStyle: {}
									};

									// If we have attributes, parse them
									if (rawAttributes) {
										const attributeRegex = /([\w-]+)\s*=\s*["']([^"']+)["']/g;
										let attrMatch;
										while ((attrMatch = attributeRegex.exec(rawAttributes))) {
											const [, attrName, attrValue] = attrMatch;

											if (attrName === "style") {
												const inlineStyleObj = {};
												attrValue.split(";").forEach((styleDecl) => {
													const [key, val] = styleDecl.split(":").map(s => { return s.trim(); });
													if (key && val) inlineStyleObj[key] = val;
												});
												focusHtmlProps.inlineStyle = inlineStyleObj;

											} else if (attrName === "class") {
												focusHtmlProps.class = attrValue.split(" ").filter(Boolean);

											} else if (attrName === "id") {
												focusHtmlProps.id = attrValue;

											} else {
												focusHtmlProps[attrName] = attrValue;
											}
										}
									}

									// Create a new node for this element
									const newNode = {
										element: tagName,
										props: focusHtmlProps,
										children: [],
										childIndex: 0
									};

									// Build its fullAncestorChain
									newNode.fullAncestorChain = getFullAncestorChain(stack, tagName);

									// Add as a child to the current top of stack
									const parent = stack[stack.length - 1];
									if (parent) {
										newNode.childIndex = parent.children.length + 1;
										parent.children.push(newNode);
									}

									// Push onto stack so subsequent tokens become its children
									stack.push(newNode);

								} else if (closingTagMatch) {
									//----------------------------------------------------------------
									// We found a closing tag, so pop the stack
									//----------------------------------------------------------------
									stack.pop();

								} else {
									//----------------------------------------------------------------
									// It's text content
									//----------------------------------------------------------------
									const trimmedText = token.trim();
									if (trimmedText) {
										const textNode = {
											element: "text",
											children: [{ innerText: trimmedText }],
											childIndex: 0,
											// The textNode is part of whichever the current parent is
											// For chain, we just do parentChain>text (if you want)
											fullAncestorChain: ""
										};

										const parent = stack[stack.length - 1];
										if (parent) {
											textNode.childIndex = parent.children.length + 1;
											// We could store textNode.fullAncestorChain = parent.fullAncestorChain + ">text"
											textNode.fullAncestorChain = parent.fullAncestorChain + ">text";
											parent.children.push(textNode);
										}
									}
								}
							});

							// 4) By the end, the stack should be back to [rootContainer]
							if (stack.length !== 1) {
								// If not, HTML was malformed
								logSyslogMessage({
									severity: 3, // ERROR
									tag: "convertHtmlToJson",
									transUnitId: "50000",
									message: "Invalid Argument: Unclosed HTML tags detected. Ensure HTML is well-formed."
								});
							}

							// 5) Return an array with just the rootContainer
							return [rootContainer];
						}

						/*******************************************************************************************************
						 * 3. Parse the token array into a JSON structure
						 ******************************************************************************************************/
						const jsonStructure = parseHtmlToJson(tokenArray);

						/*******************************************************************************************************
						 * 4. Produce JSON output
						 ******************************************************************************************************/
						const output = JSON.stringify(jsonStructure, null, 2);

						// If verbose, log at DEBUG level
						if (moduleSettings.verbose) {
							logSyslogMessage({
								severity: 7, // DEBUG
								tag: "convertHtmlToJson",
								transUnitId: "70000",
								message: "Success"
							});
						}


						//log(`convertHtmlToJson: ${output}`);

						// Return final JSON
						return output;

					} catch (err) {
						// In case of error, log at ERROR level
						logSyslogMessage({
							severity: 4, // WARNING
							tag: "convertHtmlToJson",
							transUnitId: "30000",
							message: `${err}`
						});

						// Return a fallback JSON
						return JSON.stringify([
							{
								element: "div",
								props: {
									style: {},
									class: [],
									id: "rootContainer",
									inlineStyle: {}
								},
								children: [
									{
										element: "h1",
										props: { style: {}, class: [], id: null, inlineStyle: {} },
										children: [
											{
												element: "text",
												children: [{ innerText: "Malformed HTML" }],
												childIndex: 1,
												fullAncestorChain: "rootContainer>h1>text"
											}
										],
										childIndex: 1,
										fullAncestorChain: "rootContainer>h1"
									}
								],
								childIndex: 1,
								fullAncestorChain: "rootContainer"
							}
						]);
					}
				};
			};
		},


		// ANCHOR Function Loader: convertMarkdownToHtml
		/**
		 * Converts a Markdown document to HTML.
		 * 
		 * @param {string[]} content - An array of lines from the Markdown document.
		 * @returns {string} The resulting HTML string.
		 */
		convertMarkdownToHtml: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {

				// Cache Dependencies
				// const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });
				const encodeCodeBlock = EASY_UTILS.getFunction({ functionName: "encodeCodeBlock", moduleSettings });

				return ({ content }) => {

					// Create a copy of the content array to avoid mutating the original
					const markdownArray = [...(content.split("\n"))];
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
							// Images
							.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, "<img src=\"$2\" alt=\"$1\" title=\"$3\" />")
							// Links
							.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, "<a href=\"$2\" title=\"$3\">$1</a>")
							// Inline Code
							.replace(/`([^`]+)`(?!`)/g, (match, code) => {

								//const escapedCode = encodeNoteContent({ text: code });
								const escapedCode = encodeCodeBlock({ text: code });

								return `<code class="inline-code">${escapedCode}</code>`;
							})
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


							/*case /^:::\s*(.*)/.test(meta.thisLine): {
										// 1) Determine if this is an open or close fence
										const openFenceMatch = meta.thisLine.match(/^:::\s+(\S.*)$/); // "::: some-class" => open
										const closeFenceMatch = meta.thisLine.match(/^:::\s*$/);       // ":::        " => close (no text)
		
										// If it's a close fence, we do not open a new div. Instead, we break out.
										if (closeFenceMatch) {
											// This scenario can happen if there's a stray ":::" or if a nested close is found.
											// Usually you'd decrement a nesting counter if you track that at a higher level.
											// But let's assume parseBlock is handling this scenario. We'll just skip or handle.
											// For demonstration, let's just skip further processing so it doesn't become a paragraph.
											doContinue = true;
											break;
										}
		
										// 2) It's an open fence if there's text after ":::"
										if (openFenceMatch) {
											const customFenceClasses = openFenceMatch[1].trim();  // e.g. "two-columns", "left hidden", etc.
											const hasHidden = customFenceClasses.includes("hidden");
											const hiddenStyle = hasHidden ? " style=\"display:none\"" : "";
		
											// Use a local nesting counter to track how many open fences belong to this block
											let nestedDivCount = 1;
											const customDivPocketDimension = [];
		
											// Open the custom block
											addToHtmlArray(`<div class="${customFenceClasses}"${hiddenStyle}>`, true);
		
											// Consume lines inside this block
											let nextLine = lines.shift();
		
											while (nextLine !== undefined) {
		
												// Check for an open fence
												const nextOpenFenceMatch = nextLine.match(/^:::\s+(\S.*)$/);
												// Check for a close fence
												const nextCloseFenceMatch = nextLine.match(/^:::\s*$/);
		
												if (nextOpenFenceMatch) {
													// Another "open" fence => nested block
													nestedDivCount++;
													customDivPocketDimension.push(nextLine);
												}
												else if (nextCloseFenceMatch) {
													// Potentially a closing fence => reduce nesting
													nestedDivCount--;
													if (nestedDivCount === 0) {
														// We just closed the current block
														break;
													} else {
														// It's closing a nested block, so keep it in the pocket dimension
														customDivPocketDimension.push(nextLine);
													}
												}
												else {
													// Regular content line
													customDivPocketDimension.push(nextLine);
												}
		
												nextLine = lines.shift();
											}
		
											// Recursively parse the collected lines for nested blocks, lists, etc.
											parseBlock(customDivPocketDimension);
		
											// Close the custom block
											addToHtmlArray("</div>", true);
		
											// Prevent further processing of this line
											doContinue = true;
											break;
										}
		
										// If the line started with ":::", but didn't match open or close, 
										// it might be malformed or empty. Let's just skip it.
										doContinue = true;
										break;
									}*/


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

					// Start with the root div
					//htmlArray.push("<div id=\"rootContainer\">");

					// Start processing lines
					parseBlock(markdownArray);

					// Close all remaining open tags
					closeAllTags();

					// Close the root div
					//htmlArray.push("</div>");

					// Join the array into a single string separated by newline characters
					return htmlArray.join("\n");
				};
			};
		},

		// ANCHOR Function Loader: convertJsonToHtml
		/**
		 * @summary Convert an HTML JSON structure back into an HTML string.
		 * @example
		 * const htmlStr = convertJsonToHtml()({ htmlJson });
		 * log(htmlStr); // "<div>Hello</div>"
		 */
		convertJsonToHtml: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

				return ({ htmlJson }) => {
					try {

						/*******************************************************************************************************
						 * 1. Parse the incoming JSON
						 ******************************************************************************************************/
						const parsedJson = JSON.parse(htmlJson);

						/*******************************************************************************************************
						 * Subroutine Function: Converts a style object (e.g. { marginTop: "10px" }) into a valid CSS string ("margin-top: 10px;")
						 ******************************************************************************************************/
						function styleToString(styleObj) {
							return Object.entries(styleObj)
								.map(([key, value]) => {
									// Convert camelCase to kebab-case
									const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();

									return `${kebabKey}: ${value};`;
								})
								.join(" ");
						}

						/*******************************************************************************************************
						 * Main Function: Recursively transforms a single node (in JSON) into its corresponding HTML string.
						 ******************************************************************************************************/
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

							// Combine style and inlineStyle to produce final style string
							const combinedStyle = {
								...node.props?.style,
								...node.props?.inlineStyle
							};
							const styleString = styleToString(combinedStyle);

							// Build the HTML attributes
							const attributes = [];
							if (styleString) {
								attributes.push(`style="${styleString}"`);
							}
							if (node.props?.class?.length) {
								attributes.push(`class="${node.props.class.join(" ")}"`);
							}
							if (node.props?.id) {
								attributes.push(`id="${node.props.id}"`);
							}

							// Add any other props (e.g. data- attributes, custom attributes)
							Object.keys(node.props || {})
								.filter((key) => { return !["style", "inlineStyle", "class", "id"].includes(key); })
								.forEach((key) => {
									attributes.push(`${key}="${node.props[key]}"`);
								});

							// Recursively process children
							const childrenHtml = (node.children || [])
								.map(processNode)
								.join("");

							// Return the final HTML string for this node
							return `<${node.element} ${attributes.join(" ")}>${childrenHtml}</${node.element}>`;
						}

						/*******************************************************************************************************
						 * 2. Map through the root-level JSON (array or single node) and build the final HTML string
						 ******************************************************************************************************/
						let output = "";

						if (Array.isArray(parsedJson)) {
							// If it’s an array of nodes, process each
							output = parsedJson.map(processNode).join("");
						} else {
							// If it’s a single node/object, process once
							output = processNode(parsedJson);
						}

						// If verbose, log at DEBUG level
						if (moduleSettings.verbose) {
							logSyslogMessage({
								severity: 7, // DEBUG
								tag: "convertJsonToHtml",
								transUnitId: "70000",
								message: "Success"
							});
						}

						// Return the final HTML string
						return output;

					} catch (err) {

						// In case of error, log at ERROR level
						logSyslogMessage({
							severity: 3, // ERROR
							tag: "convertJsonToHtml",
							transUnitId: "30000",
							message: `${err}`
						});

						// Provide a fallback HTML string
						return "<div><h1>Error transforming HTML JSON representation</h1></div>";
					}
				};
			};
		},


		// ANCHOR Function Loader: convertToSingleLine
		/**
		 * @summary Convert multiline text into a single line, preserving quoted text.
		 * @example
		 * const singleLine = convertToSingleLine()({ multiline: "Hello\n  World" });
		 * log(singleLine); // "Hello World"
		 */
		convertToSingleLine: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {
				return ({ multiline }) => {
					const regex = /("[^"]*"|'[^']*')|\s+/g;

					return multiline.replace(regex, (_, quoted) => { return quoted ? quoted : " "; });
				};
			};
		},

		// ANCHOR Function: createPhraseFactory
		/**
		 * @summary Create and manage phrase dictionaries for different languages.
		 * @example
		 * const phraseFactory = createPhraseFactory()(moduleSettings);
		 * log(phraseFactory.get({ transUnitId: "0" })); // "Success"
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

					// Tracks which languages are recognized. We might not load them until needed.
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
							return replacePlaceholders({ string: template, expressions });
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
		 * @summary Manage and retrieve HTML templates by name.
		 * @example
		 * const templateFactory = createTemplateFactory()(moduleSettings);
		 * log(templateFactory.get({ template: "default", content: { tableRows: "<tr><td>Key</td><td>Value</td></tr>" } }));
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
                            <th style="padding: 8px; text-align: left; background-color: #34627B; color: white;">Key</th>
                            <th style="padding: 8px; text-align: left; background-color: #34627B; color: white;">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style="padding: 8px; font-weight: bold; background-color: #34627B; color: white;" colspan="2">End of Data</td>
                        </tr>
                    </tfoot>
                </table>`;
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
						if (templateName === "chatAlert") {
							return `
							<div class="alert-box">
								<h3>{{ title }}</h3>
								<p>{{ description }}</p>
								<div class="alert-code">
									<p>{{ code }}</p>
								</div>
								<p>{{ remark }}</p>
								<p class="alert-footer">{{ footer }}</p>
							</div>`;
						}

						// If no known additional template is found, return null
						return null;
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

							return replacePlaceholders({ string: templateString, expressions });
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
		 * @summary Manage and retrieve theme JSON for styling HTML JSON output.
		 * @example
		 * const themeFactory = createThemeFactory()(moduleSettings);
		 * log(themeFactory.get({ theme: "default" })); // Default theme JSON
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
					 * Subroutine Function: Dynamically loads additonal themes if available.
					 **************************************************************************************************/
					function loadThemeByName(themeName) {
						if (themeName === "chatAlert") {
							return `
							/* Design Colors */
							:root {
								--ez-primary-background-color: #252B2C; 
								--ez-subdued-background-color: #f2f2f2; 
								--ez-text-color: #000000;
								--ez-overlay-text-color: #ffffff; 
								--ez-border-color: #000000; 
								--ez-shadow-color: #4d4d4d; 
							}
							
							.alert-box {
								border: 1px solid var(--ez-border-color);
								background-color: var(--ez-primary-background-color);
								padding: 10px;
								border-radius: 10px;
								color: var(--ez-text-color);
							}
							
							h3 {
								color: var(--ez-overlay-text-color);
								margin: 0;
								font-size: 1.2em;
								text-transform: uppercase;
							}
							
							p {
								margin: 5px 0;
							}
							
							.alert-code {
								margin: 8px 0;
								padding: 5px;
								background-color: var(--ez-subdued-background-color);
								border: var(--ez-shadow-color);
								border-radius: 5px;
								font-family: monospace;
							}
							
							.alert-footer {
								margin: 5px 0;
								font-size: 0.9em;
								color: var(--ez-shadow-color);
							}`;
						}

						// If no matching additional theme is found, return null
						return null;
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
							return replacePlaceholders({ string: themeString, expressions, cssVars });
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

		// ANCHOR Function Loader: decodeCodeBlock
		/**
		 * @summary Decode HTML-encoded code block content into plain text.
		 * @example
		 * const decoded = decodeCodeBlock()({ text: "&lt;div&gt;Hello&lt;/div&gt;" });
		 * log(decoded); // "<div>Hello</div>"
		 */
		decodeCodeBlock: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

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

		// ANCHOR Function Loader: encodeCodeBlock
		/**
		 * @summary Encode plain text into HTML-encoded code block content.
		 * @example
		 * const encoded = encodeCodeBlock()({ text: "<div>Hello</div>" });
		 * log(encoded); // "&lt;div&gt;Hello&lt;/div&gt;"
		 */
		encodeCodeBlock: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

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

		// ANCHOR Function Loader: decodeNoteContent
		/**
		 * @summary Decode HTML-encoded note content into plain text.
		 * @example
		 * const decoded = decodeNoteContent()({ text: "&lt;div&gt;Hello&lt;/div&gt;" });
		 * log(decoded); // "<div>Hello</div>"
		 */
		decodeNoteContent: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

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

		// ANCHOR Function Loader: encodeNoteContent
		/**
		 * @summary Encode plain text into HTML-encoded note content.
		 * @example
		 * const encoded = encodeNoteContent()({ text: "<div>Hello</div>" });
		 * log(encoded); // "&lt;div&gt;Hello&lt;/div&gt;"
		 */
		encodeNoteContent: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

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

		// ANCHOR Function Loader: getGLobalSettings
		getGlobalSettings: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {
				return () => {
					return globalSettings;
				};
			};
		},

		// ANCHOR Function Loader: getSharedForge
		/**
		 * @summary Retrieve the global EASY_MODULE_FORGE registry.
		 * @example
		 * const forge = getSharedForge()(moduleSettings)();
		 * forge.setFactory({name: "TestFactory", factory: {test:1}});
		 * log(forge.getFactory({name: "TestFactory"})); // {test:1}
		 */
		getSharedForge: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {
				return () => {

					// FIXME Dynamically load forge based on global settings.
					// Because the sandbox does not have a global, we have to access the forge object by name.
					// One alternative is to maintain the same name for a Forge object and manage multiple forges.
					// Todo so means adding extra logic to factories and still the global multiple factory containing
					// forge would still need to be a consistent name. At this moment this is no added benefit in
					// managing multiple forges under a global object, therefore we access a singleton global Forge, and
					// use the same name.
					return EASY_MODULE_FORGE;
				};
			};
		},

		// ANCHOR Function Loader: getSharedVault
		/**
		 * @summary Retrieve or initialize the shared vault state.
		 * @example
		 * const vault = getSharedVault()(moduleSettings)();
		 * vault.myData = "Hello";
		 * log(state.EasyModuleVault); // { myData: "Hello" }
		 */
		getSharedVault: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

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

		// ANCHOR Function Loader: logSyslogMessage
		/**
		 * @summary Log a structured message with severity and module tagging.
		 * @example
		 * const logger = logSyslogMessage()(moduleSettings);
		 * logger({ severity: 6, tag: "MyModule", transUnitId: "1000", message: "Informational message" });
		 */
		logSyslogMessage: function () {
			return (moduleSettings) => {
				return ({ severity, tag, transUnitId, message }) => {
					const getSyslogTimestamp = () => { return new Date().toISOString(); };
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
						// REVIEW I do not see what error that could occur is recoverable from.
					}
				};
			};
		},

		// ANCHOR Function Loader: parseChatCommands
		/**
		 * @summary Parse chat input into main and subcommands.
		 * @example
		 * const commandMap = parseChatCommands()(moduleSettings)({ apiCallContent: "!mycmd --alert --lang frFR" });
		 * log([...commandMap]); // [["--alert", []], ["--lang", ["frFR"]]]
		 */
		parseChatCommands: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {
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

		// ANCHOR Function Loader: parseChatSubcommands
		/**
		 * @summary Parse subcommands into key-value pairs or flags.
		 * @example
		 * const subMap = parseChatSubcommands()(moduleSettings)({ subcommands: ["key|value", "flag"] });
		 * log(subMap); // { key: "value", flag: true }
		 */
		parseChatSubcommands: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {
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

		// ANCHOR Function Loader: replacePlaceholders
		/**
		 * @summary Replace placeholders in a string with token values and evaluate inline expressions.
		 * @example
		 * const replaced = replacePlaceholders()(moduleSettings)({ string: "Hello {{name}}!", expressions: { name: "World" } });
		 * log(replaced); // "Hello World!"
		 */
		replacePlaceholders: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {
				return ({ string, expressions = {}, cssVars = {} }) => {
					return string
						.replace(/{{(.*?)}}/g, (_, key) => {
							return expressions[key.trim()] || "";
						})
						.replace(/\[\[(.*?)\]\]/g, (_, anExpression) => {

							// REVIEW I may add a separate prefix like [[ expr() ]] for custom expressions, but for now
							// I am content having the Roll20 replace [[]] as inline rolls.
							// styling can be cumbersome so I am going to wrap the text in a span for CSS.
							return `<span class="inline-rolls">[[${anExpression.trim()}]]</span>`;
						})
						.replace(/var\((--[\w-]+)\)/g, (_, cssVar) => {
							return cssVars[cssVar.trim()] || `var(${cssVar.trim()})`;
						});
				};
			};
		},

		// !SECTION End of Utility Functions: Low Level

		/***************************************************************************************************************
		 * SECTION: UTILITY FUNCTIONS - High Level
		 *
		 * This section contains essential, reusable functions that handle complex tasks and module-level operations.
		 *
		 * - High-level functions use lower-level utilities.
		 * - These functions may rely on `moduleSettings` for context and configuration specific to the calling module.
		 * - High-level functions should attempt to fall back to default values or configurations when issues arise.
		 * - If a fallback is not possible and the outcome remains erroneous, they should log the issue and throw an
		 *   error to the Roll20 API to ensure proper debugging and system stability.
		 **************************************************************************************************************/

		// ANCHOR Function Loader: renderTemplateAsync
		/**
		 * @summary Render an HTML template with placeholders and apply a theme asynchronously.
		 * @example
		 * const rendered = await renderTemplateAsync()(moduleSettings)({ template: "chatAlert", content: { title: "Warning" }, theme: "chatAlert" });
		 * log(rendered); // "<div ...>...</div>"
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
						throw new Error(`${err}`);
					}
				};
			};
		},

		// ANCHOR Function Loader: whisperAlertMessageAsync
		/**
		 * @summary Asynchronously render an alert message template and whisper it to a player.
		 * @example
		 * await whisperAlertMessageAsync()(moduleSettings)({ from: "System", to: "gm", severity: "WARNING", title: "Alert", description: "Something happened." });
		 */
		whisperAlertMessageAsync: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				// const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });
				const renderTemplateAsync = EASY_UTILS.getFunction({ functionName: "renderTemplateAsync", moduleSettings });
				const whisperPlayerMessage = EASY_UTILS.getFunction({ functionName: "whisperPlayerMessage", moduleSettings });
				const PhraseFactory = EASY_UTILS.getFunction({ functionName: "createPhraseFactory", moduleSettings });

				return async ({ from, to, toId, severity = 6, apiCallContent, remark }) => {

					const severityEnum = {
						error: {
							code: 3,
							titleTransUnitId: "0x004A7742",
							bgColor: "#ffdddd",
							titleColor: "#FF0000"
						},
						warning: {
							code: 4,
							titleTransUnitId: "0x0B672E77",
							bgColor: "#FBE7A1",
							titleColor: "#CA762B"
						},
						information: {
							code: 6,
							titleTransUnitId: "0x0004E2AF",
							bgColor: "#b8defd",
							titleColor: "#2516f5"
						},
						tip: {
							code: 7,
							titleTransUnitId: "0x000058E0",
							bgColor: "#C3FDB8",
							titleColor: "#16F529"
						}
					};

					// Reverse mapping for code lookup
					const severityCodeMap = Object.fromEntries(
						Object.entries(severityEnum).map(([key, value]) => { return [value.code, key]; })
					);

					const normalizedSeverity =
						typeof severity === "string"
							? severity.toLowerCase()
							: severityCodeMap[severity] || "info";

					const alertConfig = severityEnum[normalizedSeverity] || severityEnum.info;

					/*
					<div class="alert-box">
						<h3>{{ title }}</h3>
						<p>{{ description }}</p>
						<div class="alert-code">
							<p>{{ code }}</p>
						</div>
						<p>{{ remark }}</p>
						<p class="alert-footer">{{ footer }}</p>
					</div>
					*/

					const alertContent = {
						title: PhraseFactory.get({ playerId: toId, transUnitId: alertConfig.titleTransUnitId }),
						description: PhraseFactory.get({ playerId: toId, transUnitId: "0x02B2451A" }),
						code: apiCallContent,
						remark,
						footer: PhraseFactory.get({ playerId: toId, transUnitId: "0x0834C8EE", expressions: { author: `${moduleSettings.author}` } })
					};

					/* Design Colors
						:root {
							--ez-primary-background-color: #252B2C;
							--ez-subdued-background-color: #f2f2f2;
							--ez-overlay-text-color: #ffffff;
							--ez-shadow-color: #4d4d4d;
						}...
						*/

					const alertPalette = {
						"--ez-primary-background-color": alertConfig.bgColor,
						"--ez-overlay-text-color": alertConfig.titleColor,
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
						throw new Error(`${err}`);
					}
				};
			};
		},

		// ANCHOR Function Loader: whisperPlayerMessage
		/**
		 * @summary Whisper a message to a player in chat.
		 * @example
		 * whisperPlayerMessage()(moduleSettings)({ from: "System", to: "gm", message: "Hello GM!" });
		 */
		whisperPlayerMessage: function () {
			return (moduleSettings) => {

				// Cache Dependencies
				const logSyslogMessage = EASY_UTILS.getFunction({ functionName: "logSyslogMessage", moduleSettings });

				return ({ from, to, message }) => {
					const sender = from || moduleSettings.readableName;
					const recipient = to || "gm";

					try {
						sendChat(sender, `/w ${recipient} ${message}`);

						return `${sender};;${recipient};;${message}`;
					} catch (err) {

						logSyslogMessage({
							severity: 3,
							tag: "whisperPlayerMessage",
							transUnitId: "30000",
							message: `${err}`,
						});

						return `!${sender};;${recipient};;${message}`;
					}
				};
			};
		},
		// !SECTION End of Utility Functions: High Level
	};

	/*******************************************************************************************************************
	* SECTION INITIALIZATION
	*******************************************************************************************************************/
	const checkInstall = () => {

		if (typeof EASY_UTILS !== "undefined") {

			const requiredFunctions = [
				"getSharedForge",
				"createPhraseFactory",
				"createTemplateFactory",
				"createThemeFactory",
				"whisperAlertMessageAsync",
				"logSyslogMessage",
				"parseChatCommands"
			];

			Utils = EASY_UTILS.fetchUtilities({
				requiredFunctions,
				moduleSettings
			});

			// Invoke factories to ensure registration in the forge
			PhraseFactory = Utils.createPhraseFactory;
			TemplateFactory = Utils.createTemplateFactory;
			ThemeFactory = Utils.createThemeFactory;

			const msgId = "10000";
			Utils.logSyslogMessage({
				severity: 6,
				tag: "checkInstall",
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId })
			});

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

		//state.EasyModuleVault = {};

		const continueMod = checkInstall();
		if (continueMod === 0) {

			// registerEventHandlers();

			const msgId = "20000";
			Utils.logSyslogMessage({
				severity: 6,
				tag: "registerEventHandlers",
				transUnitId: msgId,
				message: PhraseFactory.get({ transUnitId: msgId })
			});
		}
	});

	// !SECTION END of INITIALIZATION

	/*******************************************************************************************************************
	 * SECTION: PUBLIC INTERFACE
	 *
	 * This section provides a streamlined interface to access utility functions and factories within the system.
	 *
	 * - Functions are dynamically loaded on demand to optimize performance and resource usage.
	 * - Factory functions (e.g., _createPhraseFactory, _createTemplateFactory, _createThemeFactory) are returned
	 *   directly without additional binding or configuration.
	 * - Standard functions are retrieved and bound with the caller's `moduleSettings` to ensure contextual execution.
	 * - If a requested function is not found, the interface throws a descriptive error to facilitate debugging.
	 * - This design ensures a clean, modular approach for accessing utilities while maintaining system stability.
	 ******************************************************************************************************************/

	const loadedFunctions = {};

	return {

		// ANCHOR Method: getFunction
		getFunction: ({ functionName, moduleSettings }) => {
			// Check if the function Function Loader for this functionName exists
			if (!functionLoaders[functionName]) {
				// Function not found: return undefined to fail quietly

				const msgId = "40400";
				Utils.logSyslogMessage({
					severity: 4,
					tag: `${moduleSettings.readableName}:checkInstall`,
					transUnitId: msgId,
					message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: functionName } })
				});

				return undefined;
			}

			if (!loadedFunctions[functionName]) {
				loadedFunctions[functionName] = functionLoaders[functionName]();
			}

			if (factoryFunctions.includes(functionName)) {
				// Calling the factory function with moduleSettings ensures it's registered in the forge
				return loadedFunctions[functionName](moduleSettings);
			}

			if (typeof loadedFunctions[functionName] === "function") {
				return loadedFunctions[functionName](moduleSettings);
			}

			return loadedFunctions[functionName];
		},

		// ANCHOR Method: fetchedUtilities
		fetchUtilities: ({ requiredFunctions, moduleSettings }) => {
			return requiredFunctions.reduce((accumulator, functionName) => {
				accumulator[functionName] = EASY_UTILS.getFunction({ functionName, moduleSettings });

				return accumulator;
			}, {});
		}
	};
	// !SECTION END of PUBLIC INTERFACE
})();

/* For Local testing when mocking Roll20
export { EASY_MODULE_FORGE };
export { EASY_UTILS };
*/

