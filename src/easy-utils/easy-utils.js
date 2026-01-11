/*!
 * @language: en-US
 * @title: easy-utils.js
 * @description: Utility library for Easy Modules in Roll20. Provides reusable, memory-efficient functions to simplify module development and reduce boilerplate.
 * @author: Mhykiel
 * @version: 0.2.0
 * @license: MIT License
 */

// eslint-disable-next-line no-unused-vars
const EASY_FORGE = (() => {
	// SECTION Object: EASY_FORGE

	/**
	 * @namespace EASY_FORGE
	 * @summary A global registry for managing factories shared across all Easy Modules.
	 */

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
		},
	};
})();

// !SECTION End of Object: EASY_FORGE
// SECTION Object: EASY_UTILS

// eslint-disable-next-line no-unused-vars
const EASY_UTILS = (() => {

	// ANCHOR Member: globalSettings
	const globalSettings = {
		purgeState: false,
		sharedVault: sharedVault = (state["EASY_VAULT"] = state["EASY_VAULT"] || {}),
		sharedForge: EASY_FORGE,
		defaultLanguage: "enUS",
		factoryFunctions: [
			"createPhraseFactory",
			"createTemplateFactory",
			"createThemeFactory",
		],
	};

	// ANCHOR Member: moduleSettings
	const moduleSettings = {
		readableName: "Easy-Utils",
		chatApiName: "ezutils",
		globalName: "EASY_UTILS",
		version: "0.2.0",
		author: "Mhykiel",
		verbose: true,
		debug: {}
	};

	// ANCHOR Member: Factory References
	let Utils = {};
	let PhraseFactory = {};
	// eslint-disable-next-line no-unused-vars
	let TemplateFactory = {};
	// eslint-disable-next-line no-unused-vars
	let ThemeFactory = {};

	// SECTION Outer Method: functionLoaders
	const functionLoaders = {

		// SECTION Inner Methods: Low Level Utilities

		// ANCHOR Util: convertCssToJson
		convertCssToJson: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "convertCssToJson";

				const calculateSelectorSpecificity = (selector) => {
					const cleanedSelector = selector
						.replace(/\s*([>+~])\s*/g, "$1")
						.trim();

					const selectorParts = cleanedSelector.split(/\s|(?=[>+~])/g).filter(Boolean);

					let idCount = 0;
					let classAndAttributeCount = 0;
					let typeAndPseudoElementCount = 0;

					selectorParts.forEach((part) => {
						if (part.startsWith("#")) {
							idCount += 1;
						} else if (part.startsWith(".") || part.startsWith("[") || part.startsWith(":") && !part.startsWith("::")) {
							classAndAttributeCount += 1;
						} else {
							typeAndPseudoElementCount += 1;
						}
					});

					return idCount * 100 + classAndAttributeCount * 10 + typeAndPseudoElementCount;
				};

				const sortRulesBySpecificity = (ruleA, ruleB) => {
					if (ruleA.specificity !== ruleB.specificity) {
						return ruleB.specificity - ruleA.specificity;
					}
					return ruleA.index - ruleB.index;
				};

				return ({ css }) => {
					try {
						const cleanedCss = css
							.replace(/\/\*[\s\S]*?\*\//g, "")
							.replace(/\n/g, " ")
							.replace(/\s+/g, " ")
							.trim();

						const cssRules = [];
						const ruleRegex = /([^\{]+)\{([^\}]+)\}/g;
						const declarationRegex = /([\w-]+)\s*:\s*([^;]+);/g;

						let match;
						let ruleIndex = 0;

						while ((match = ruleRegex.exec(cleanedCss))) {
							const selectors = match[1].split(",").map((s) => { return s.trim(); });
							const declarations = match[2].trim();

							const style = {};
							let declarationMatch;
							while ((declarationMatch = declarationRegex.exec(declarations))) {
								const property = declarationMatch[1].trim();
								const value = declarationMatch[2].trim();
								style[property] = value;
							}

							selectors.forEach((selector) => {
								const specificity = calculateSelectorSpecificity(selector);
								cssRules.push({
									selector,
									style,
									specificity,
									index: ruleIndex
								});
								ruleIndex++;
							});
						}

						cssRules.sort(sortRulesBySpecificity);

						const output = JSON.stringify(cssRules, null, 2);

						if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
							Utils.logSyslogMessage({
								severity: "DEBUG",
								tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
								transUnitId: "70000",
								message: output,
							});
						}

						return output;

					} catch (err) {
						const msgId = "50000";
						Utils.logSyslogMessage({
							severity: "ERROR",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: msgId,
							message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
						});

						return "[]";
					}
				};
			};
		},

		// ANCHOR Util: convertHtmlToJson
		convertHtmlToJson: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "convertHtmlToJson";
				const convertToSingleLine = EASY_UTILS.getFunction({ functionName: "convertToSingleLine", moduleSettings });

				const SELF_CLOSING_ELEMENTS = new Set([
					"br", "hr", "img", "input", "link", "meta", "base", "area", "source", "track", "col", "embed"
				]);

				function parseAttributes(rawAttributes) {
					const attributes = {
						style: {},
						inlineStyle: {},
						classList: [],
						id: null
					};

					if (!rawAttributes) return attributes;

					const attributeRegex = /([\w-]+)\s*=\s*["']([^"']+)["']/g;
					let match;
					while ((match = attributeRegex.exec(rawAttributes))) {
						// eslint-disable-next-line no-unused-vars
						const [_, name, value] = match;
						switch (name) {
						case "style":
							value.split(";").forEach((styleDeclaration) => {
								const [property, styleValue] = styleDeclaration.split(":").map(s => { return s.trim(); });
								if (property && styleValue) attributes.inlineStyle[property] = styleValue;
							});
							break;
						case "class":
							attributes.classList = value.split(" ").filter(Boolean);
							break;
						case "id":
							attributes.id = value;
							break;
						default:
							attributes[name] = value;
						}
					}

					return attributes;
				}

				function appendChildNode(parent, child) {
					child.childIndex = parent.children.length + 1;
					parent.children.push(child);
				}

				function parseHtmlToTree(tokens) {
					const stack = [];
					const rootNode = {
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

					stack.push(rootNode);

					const openTagRegex = /^<([\w-]+)([^>]*)\/?\s*>$/;
					const closeTagRegex = /^<\/([\w-]+)>$/;

					for (const token of tokens) {
						const trimmedToken = token.trim();
						if (!trimmedToken) continue;

						const closingTagMatch = closeTagRegex.exec(trimmedToken);
						if (closingTagMatch) {
							stack.pop();
							continue;
						}

						const openingTagMatch = openTagRegex.exec(trimmedToken);
						if (openingTagMatch) {
							const [, tagName, rawAttributes] = openingTagMatch;
							const isSelfClosing = SELF_CLOSING_ELEMENTS.has(tagName.toLowerCase()) || /\/>$/.test(trimmedToken);

							const newElement = {
								element: tagName,
								attributes: parseAttributes(rawAttributes),
								children: [],
								childIndex: 0
							};

							const parent = stack[stack.length - 1];
							appendChildNode(parent, newElement);

							if (!isSelfClosing) {
								stack.push(newElement);
							}
							continue;
						}

						const textNode = {
							element: "text",
							children: [{ innerText: trimmedToken }],
							childIndex: 0
						};

						const parent = stack[stack.length - 1];
						appendChildNode(parent, textNode);
					}

					if (stack.length > 1) {
						throw new Error("Unclosed tags detected. Ensure your HTML is well-formed.");
					}

					return [rootNode];
				}

				return ({ html }) => {
					try {
						const cleanedHtml = html
							.replace(/<!--[\s\S]*?-->/g, "")
							.replace(/\n/g, " ")
							.replace(/\s+/g, " ")
							.trim();

						const tokenRegex = /<\/?.*?>|[^<>]+/g;
						const tokens = cleanedHtml.match(tokenRegex)?.map(token => { return token.trim(); }).filter(Boolean) || [];

						const htmlTree = parseHtmlToTree(tokens);
						const output = JSON.stringify(htmlTree, null, 2);

						if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
							Utils.logSyslogMessage({
								severity: "DEBUG",
								tag: thisFuncDebugName,
								transUnitId: "70000",
								message: output,
							});
						}

						return output;

					} catch (err) {
						const msgId = "50000";
						Utils.logSyslogMessage({
							severity: "ERROR",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: msgId,
							message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
						});

						return convertToSingleLine({
							multiline: `
						[
							{
								"element": "div",
								"attributes": {
									"id": "rootContainer",
									"classList": [],
									"inlineStyle": {}
								},
								"children": [
									{
										"element": "h1",
										"attributes": {
											"classList": [],
											"id": null,
											"inlineStyle": {}
										},
										"children": [
											{
												"element": "text",
												"children": [
													{ "innerText": "Malformed HTML" }
												],
												"childIndex": 1
											}
										],
										"childIndex": 1
									}
								],
								"childIndex": 1
							}
						]` });
					}
				};
			};
		},

		// ANCHOR Util: convertMarkdownToHtml
		convertMarkdownToHtml: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "convertMarkdownToHtml";
				const encodeCodeBlock = EASY_UTILS.getFunction({ functionName: "encodeCodeBlock", moduleSettings });

				return ({ content }) => {

					const htmlArray = [];
					const tagStack = [];

					function addToHtmlArray(html, raw = false) {
						if (raw) {
							htmlArray.push(html);
						} else {
							htmlArray.push(processInline(html));
						}
					}

					function handleTagClosing() {
						if (tagStack.length === 0) return;
						const tag = tagStack.pop();
						addToHtmlArray(`</${tag}>`, true);
					}

					function closeAllTags() {
						while (tagStack.length > 0) {
							handleTagClosing();
						}
					}

					function slugify(text) {
						return text.toLowerCase()
							.replace(/[^a-z0-9\s-]/g, "")
							.trim()
							.replace(/\s+/g, "-");
					}

					function processInline(text) {
						if (typeof text !== "string") {
							console.error("Invalid input to processInline. Expected a string, got:", text);
							return "";
						}

						return text
							.replace(/\\\*/g, "&#42;")
							.replace(/`([^`]+)`(?!`)/g, (match, code) => {
								const escapedCode = encodeCodeBlock({ text: code });
								return `<code class="inline-code">${escapedCode}</code>`;
							})
							.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, "<img src=\"$2\" alt=\"$1\" title=\"$3\" />")
							.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, "<a href=\"$2\" title=\"$3\">$1</a>")
							.replace(/\^\^([^=]+)\^\^/g, "<sup>$1</sup>")
							.replace(/\^\_([^=]+)\_\^/g, "<sub>$1</sub>")
							.replace(/^-{3,}$/gm, "<hr class=\"dash-hr\" />")
							.replace(/^\*{3,}$/gm, "<hr class=\"asterisk-hr\" />")
							.replace(/^_{3,}$/gm, "<hr class=\"underscore-hr\" />")
							.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong class=\"asterisk-strong\"><em class=\"asterisk-em\">$1</em></strong>")
							.replace(/___([^_]+)___/g, "<strong class=\"underscore-strong\"><em class=\"underscore-em\">$1</em></strong>")
							.replace(/\*\*([^*]+)\*\*/g, "<strong class=\"asterisk-strong\">$1</strong>")
							.replace(/__([^_]+)__/g, "<strong class=\"underscore-strong\">$1</strong>")
							.replace(/\*([^*]+)\*/g, "<em class=\"asterisk-em\">$1</em>")
							.replace(/_((?!<[^>]*>).+?)_/g, "<em class=\"underscore-em\">$1</em>")
							.replace(/~~([^~]+)~~/g, "<del>$1</del>")
							.replace(/==([^=]+)==/g, "<mark>$1</mark>")
							.replace(/^#{6} (.+)$/gm, (match, text) => { return `<h6 id="${slugify(text)}">${text}</h6>`; })
							.replace(/^#{5} (.+)$/gm, (match, text) => { return `<h5 id="${slugify(text)}">${text}</h5>`; })
							.replace(/^#{4} (.+)$/gm, (match, text) => { return `<h4 id="${slugify(text)}">${text}</h4>`; })
							.replace(/^#{3} (.+)$/gm, (match, text) => { return `<h3 id="${slugify(text)}">${text}</h3>`; })
							.replace(/^#{2} (.+)$/gm, (match, text) => { return `<h2 id="${slugify(text)}">${text}</h2>`; })
							.replace(/^#{1} (.+)$/gm, (match, text) => { return `<h1 id="${slugify(text)}">${text}</h1>`; });
					}

					function parseBlock(lines) {

						while (lines.length > 0) {
							const originalLine = lines.shift();

							const normalizedLine = originalLine
								.replace(/\t/g, "   ")
								.replace(/<style([^>]*)>/g, "<div$1 style=\"display:none\">")
								.replace(/<template([^>]*)>/g, "<div$1 style=\"display:none\">")
								.replace(/<\/style>/g, "</div>")
								.replace(/<\/template>/g, "</div>")
								.replace(/^ \*(.*)/, "*$1")
								.replace(/^ -/, "-")
								.replace(/^\+/, "+")
								.replace(/^(\s*)/, (match) => {
									const spaces = Math.ceil(match.length / 3) * 3;
									return " ".repeat(spaces);
								});

							const meta = {
								isEmpty: /^\s*$/.test(originalLine),
								thisLine: normalizedLine.trim(),
								indentLevel: normalizedLine.match(/^\s*/)[0].length,
							};

							let doContinue = false;

							switch (true) {

							case /^:::/.test(meta.thisLine): {
								const openFenceMatch = meta.thisLine.match(/^:::\s*(.+)$/);
								const closeFenceMatch = meta.thisLine.trim() === ":::";

								if (openFenceMatch && openFenceMatch[1]) {
									const className = openFenceMatch[1].trim();
									addToHtmlArray(`<div class="${className}">`, true);
								} else if (closeFenceMatch) {
									addToHtmlArray("</div>", true);
								}

								doContinue = true;
								break;
							}

							case /^```/.test(meta.thisLine): {
								const openCodeMatch = meta.thisLine.match(/^```(\S.*)$/);
								const closeCodeMatch = meta.thisLine.match(/^```$/);

								if (closeCodeMatch) {
									doContinue = true;
									break;
								}

								if (openCodeMatch) {
									const codeBlockType = openCodeMatch[1].trim() || "text";

									addToHtmlArray(`<pre data-role="code-block" data-info="${codeBlockType}" class="${codeBlockType}"><code>`, true);

									let nextLine = lines.shift();
									while (nextLine !== undefined) {
										const nextCloseCodeMatch = nextLine.match(/^```$/);

										if (!nextCloseCodeMatch) {
											const escapedLine = encodeCodeBlock({ text: nextLine });
											addToHtmlArray(`${escapedLine}<br />`, true);
											nextLine = lines.shift();
										} else {
											break;
										}
									}

									addToHtmlArray("</code></pre>", true);

									doContinue = true;
									break;
								}

								doContinue = true;
								break;
							}

							case /^>/.test(meta.thisLine): {
								addToHtmlArray("<blockquote>", true);
								const blockquotePocketDimension = [];

								blockquotePocketDimension.push(meta.thisLine.replace(/^>\s*/, ""));

								let nextLine = lines.shift();

								while (nextLine) {
									if (/^>/.test(nextLine)) {
										const updatedLine = nextLine.replace(/^>\s?/, "");
										blockquotePocketDimension.push(updatedLine);

									} else {
										lines.unshift(nextLine);
										break;
									}
									nextLine = lines.shift();
								}

								parseBlock(blockquotePocketDimension);

								addToHtmlArray("</blockquote>", true);

								doContinue = true;
								break;
							}

							case /^[-+*]\s+/.test(meta.thisLine): {
								const listMatch = meta.thisLine.match(/^([-+*])\s+(.*)/);
								const bulletType = listMatch ? listMatch[1] : "-";
								const listItemContent = listMatch ? listMatch[2].trim() : "";

								const indentLevel = (Math.floor(meta.indentLevel / 3)) + 1;

								const currentListLevel = tagStack.filter(tag => { return tag === "ul"; }).length;

								const bulletClassMap = {
									"-": "dash-bullet",
									"+": "plus-bullet",
									"*": "asterisk-bullet"
								};
								const bulletClass = bulletClassMap[bulletType] || "dash-bullet";

								if (indentLevel > currentListLevel) {
									addToHtmlArray("<ul>");
									tagStack.push("ul");
								} else if (indentLevel < currentListLevel) {

									for (let i = currentListLevel; i > indentLevel; i--) {
										addToHtmlArray("</ul>", true);
										tagStack.pop();
									}
								}

								const processedContent = processInline(listItemContent);
								addToHtmlArray(`<li class="${bulletClass}">${processedContent}</li>`);

								break;
							}

							case /^\d+\.\s+/.test(meta.thisLine): {
								const listMatch = meta.thisLine.match(/^(\d+)\.\s+(.*)/);
								const listNumber = listMatch ? parseInt(listMatch[1], 10) : 1;
								const listItemContent = listMatch ? listMatch[2].trim() : "";
								const indentLevel = (Math.floor(meta.indentLevel / 3)) + 1;

								const currentListLevel = tagStack.filter(tag => { return tag === "ol"; }).length;

								if (indentLevel > currentListLevel) {
									for (let i = currentListLevel; i < indentLevel; i++) {
										if (listNumber > 1) {
											addToHtmlArray(`<ol start="${listNumber}">`);
										} else {
											addToHtmlArray("<ol>");
										}
										tagStack.push("ol");
									}
								} else if (indentLevel < currentListLevel) {
									for (let i = currentListLevel; i > indentLevel; i--) {
										addToHtmlArray("</ol>", true);
										tagStack.pop();
									}
								}

								const processedContent = processInline(listItemContent);
								addToHtmlArray(`<li>${processedContent}</li>`);

								break;
							}

							case /^\|/.test(meta.thisLine): {
								const tableLines = [meta.thisLine];
								let nextLine = lines.shift();
								while (nextLine && /^\|/.test(nextLine)) {
									tableLines.push(nextLine);
									nextLine = lines.shift();
								}

								let footerLine = null;
								if (nextLine && nextLine.trim() !== "" && !/^\|/.test(nextLine)) {
									footerLine = nextLine;
								} else if (nextLine) {
									lines.unshift(nextLine);
								}

								const separator = tableLines[1];
								if (
									separator &&
										/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(separator)
								) {
									const headers = tableLines[0]
										.slice(1, -1)
										.split("|")
										.map((h) => { return h.trim(); });
									const alignments = separator
										.slice(1, -1)
										.split("|")
										.map((s) => { return s.trim(); });

									addToHtmlArray("<table>");
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

									if (footerLine) {
										addToHtmlArray("<tfoot><tr>");
										addToHtmlArray(
											`<td colspan="${headers.length}">${processInline(footerLine)}</td>`
										);
										addToHtmlArray("</tr></tfoot>");
									}

									addToHtmlArray("</table>");

								} else {
									tableLines.forEach((line) => {
										addToHtmlArray(`<p>${processInline(line)}</p>`);
									});

									if (footerLine) {
										lines.unshift(footerLine);
									}
								}

								break;
							}

							case /^<([a-zA-Z]+)([^>]*)>/.test(meta.thisLine): {
								const htmlTagMatch = meta.thisLine.match(/^<([a-zA-Z]+)([^>]*)>/);
								const openingTag = htmlTagMatch ? htmlTagMatch[1] : null;

								if (openingTag) {
									const singleLineClosingTagMatch = meta.thisLine.match(new RegExp(`^<${openingTag}[^>]*>.*</${openingTag}>$`));

									if (singleLineClosingTagMatch) {
										addToHtmlArray(meta.thisLine, true);
									} else {
										const rawHtmlStack = [meta.thisLine];
										let nextLine = lines.shift();

										while (nextLine) {
											const closingTagMatch = nextLine.match(new RegExp(`^</${openingTag}>`));

											if (closingTagMatch) {
												rawHtmlStack.push(nextLine);
												break;
											}

											const nestedOpeningTagMatch = nextLine.match(/^<([a-zA-Z]+)([^>]*)>/);
											const nestedClosingTagMatch = nextLine.match(/^<\/([a-zA-Z]+)>/);

											if (nestedOpeningTagMatch && nestedOpeningTagMatch[1]) {
												rawHtmlStack.push(nextLine);
											}
											else if (
												nestedClosingTagMatch &&
													nestedClosingTagMatch[1] &&
													rawHtmlStack[rawHtmlStack.length - 1] === `<${nestedClosingTagMatch[1]}>`
											) {
												rawHtmlStack.pop();
											} else {
												rawHtmlStack.push(nextLine);
											}

											nextLine = lines.shift();
										}

										addToHtmlArray(rawHtmlStack.join("\n"), true);
									}

									doContinue = true;
								}
								break;
							}

							case (meta.isEmpty):
							{
								doContinue = true;
								closeAllTags();
								break;
							}

							case /\s*#{1,6}\s+/.test(meta.thisLine):
							{
								addToHtmlArray(`${processInline(meta.thisLine)}`);
								doContinue = true;
								break;
							}

							case /^\s*(\*\s*){3,}$/.test(meta.thisLine) || /^\s*(-\s*){3,}$/.test(meta.thisLine) || /^\s*(?:_ ?){3,}$/.test(meta.thisLine):
							{
								addToHtmlArray(`${processInline(meta.thisLine)}`);
								doContinue = true;
								break;
							}

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

					const markdownArray = [...(content.split("\n"))];

					parseBlock(markdownArray);

					closeAllTags();

					const output = htmlArray.join("\n");

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: output,
						});
					}

					return output;
				};
			};
		},

		// ANCHOR Util: convertJsonToHtml
		convertJsonToHtml: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "convertJsonToHtml";

				function convertCamelCaseToKebabCase(styleObj) {
					return Object.entries(styleObj)
						.map(([property, value]) => {
							const kebabProperty = property.replace(/([A-Z])/g, "-$1").toLowerCase();
							return `${kebabProperty}: ${value};`;
						})
						.join(" ");
				}

				function generateHtmlFromNode(node) {
					if (!node.element) return "";
				
					if (node.element === "text") {
						return node.children?.[0]?.innerText || "";
					}
				
					const mergedStyle = {
						...(node.attributes?.style || {}),
						...(node.attributes?.inlineStyle || {}),
					};
				
					const styleString = Object.keys(mergedStyle).length
						? convertCamelCaseToKebabCase(mergedStyle)
						: "";
				
					if (node.attributes?.inlineStyle) {
						delete node.attributes.inlineStyle;
					}
				
					const attributes = [];
				
					if (styleString) {
						attributes.push(`style="${styleString}"`);
					}
				
					if (Array.isArray(node.attributes?.classList) && node.attributes.classList.length > 0) {
						attributes.push(`class="${node.attributes.classList.join(" ")}"`);
					}
				
					if (node.attributes?.id) {
						attributes.push(`id="${node.attributes.id}"`);
					}
				
					Object.entries(node.attributes || {})
						.filter(([key]) => {return !["style", "inlineStyle", "classList", "id"].includes(key);})
						.forEach(([key, value]) => {
							attributes.push(`${key}="${value}"`);
						});
				
					const childrenHtml = (node.children || [])
						.map(generateHtmlFromNode)
						.join("");
				
					const attributesString = attributes.length ? ` ${attributes.join(" ")}` : "";

					return `<${node.element}${attributesString}>${childrenHtml}</${node.element}>`;
				}

				return ({ htmlJson }) => {
					try {
						const parsedJson = JSON.parse(htmlJson);

						const output = Array.isArray(parsedJson)
							? parsedJson.map(generateHtmlFromNode).join("")
							: generateHtmlFromNode(parsedJson);

						if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
							Utils.logSyslogMessage({
								severity: "DEBUG",
								tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
								transUnitId: "70000",
								message: output,
							});
						}

						return output;

					} catch (err) {
						const msgId = "50000";
						Utils.logSyslogMessage({
							severity: "ERROR",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: msgId,
							message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
						});

						return "<div><h1>Error transforming HTML JSON representation</h1></div>";
					}
				};
			};
		},

		// ANCHOR Util: convertToSingleLine
		convertToSingleLine: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "convertToSingleLine";

				return ({ multiline }) => {
					const regex = /("[^"]*"|'[^']*')|\s+/g;

					const output = multiline.replace(regex, (_, quoted) => { return quoted ? quoted : " "; });

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: output,
						});
					}

					return output;
				};
			};
		},

		// ANCHOR Function: createPhraseFactory
		createPhraseFactory: function () {
			return (moduleSettings) => {

				const replacePlaceholders = EASY_UTILS.getFunction({ functionName: "replacePlaceholders", moduleSettings });
				const getSharedForge = EASY_UTILS.getFunction({ functionName: "getSharedForge", moduleSettings });
				const getSharedVault = EASY_UTILS.getFunction({ functionName: "getSharedVault", moduleSettings });

				const phraseFactoryKey = "PhraseFactory";
				const sharedForge = getSharedForge();
				const sharedVault = getSharedVault();

				if (!sharedForge.getFactory({ name: phraseFactoryKey })) {

					const defaultLanguageCode = globalSettings.phraseLanguage || "enUS";

					const loadedLanguagePhrases = {};
					const languageUsageCounts = {};
					const contributedLanguagePhrases = {};

					const playerLanguagesMap = sharedVault.playerLanguages || {};
					sharedVault.playerLanguages = playerLanguagesMap;

					const registeredLanguages = new Set(["enUS", "frFR"]);

					function loadLanguageDictionary(languageCode) {
						// Returns empty dictionary - modules populate their own phrases
						return {};
					}

					function loadOrCreateLanguage(languageCode) {
						if (loadedLanguagePhrases[languageCode]) {
							return;
						}

						const builtInDictionary = loadLanguageDictionary(languageCode);

						loadedLanguagePhrases[languageCode] = builtInDictionary || {};

						if (contributedLanguagePhrases[languageCode]) {
							Object.assign(loadedLanguagePhrases[languageCode], contributedLanguagePhrases[languageCode]);
						}

						registeredLanguages.add(languageCode);
					}

					function unloadLanguage(languageCode) {
						if (languageUsageCounts[languageCode] <= 0 && languageCode !== defaultLanguageCode) {
							delete loadedLanguagePhrases[languageCode];
						}
					}

					const phraseFactoryObject = {

						get({ playerId = "default", transUnitId, expressions = {} }) {
							const lang = playerLanguagesMap[playerId] || defaultLanguageCode;

							if (!loadedLanguagePhrases[lang]) {
								loadOrCreateLanguage(lang);
							}
							const currentLanguageDict = loadedLanguagePhrases[lang];
							const fallbackDict = loadedLanguagePhrases[defaultLanguageCode] || {};

							const template = currentLanguageDict[transUnitId] || fallbackDict[transUnitId];

							if (!template) {
								return transUnitId;
							}

							return replacePlaceholders({ text: template, expressions });
						},

						add({ newMap }) {
							for (const [langCode, phraseMap] of Object.entries(newMap)) {
								registeredLanguages.add(langCode);

								contributedLanguagePhrases[langCode] = contributedLanguagePhrases[langCode] || {};
								Object.assign(contributedLanguagePhrases[langCode], phraseMap);

								if (loadedLanguagePhrases[langCode]) {
									Object.assign(loadedLanguagePhrases[langCode], phraseMap);
								}
							}
						},

						setLanguage({ playerId, language }) {
							const oldLang = playerLanguagesMap[playerId];
							if (oldLang && languageUsageCounts[oldLang]) {
								languageUsageCounts[oldLang]--;
								if (languageUsageCounts[oldLang] <= 0) {
									unloadLanguage(oldLang);
								}
							}

							playerLanguagesMap[playerId] = language;

							if (!loadedLanguagePhrases[language]) {
								loadOrCreateLanguage(language);
							}

							languageUsageCounts[language] = (languageUsageCounts[language] || 0) + 1;
						},

						getLanguages() {
							const loadedLangs = Object.keys(loadedLanguagePhrases);
							const allLangs = new Set([...registeredLanguages, ...loadedLangs]);

							return Array.from(allLangs);
						},

						remove({ language, transUnitId }) {
							delete contributedLanguagePhrases[language]?.[transUnitId];
							if (loadedLanguagePhrases[language]) {
								delete loadedLanguagePhrases[language][transUnitId];
							}
						},

						init() {
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

							registeredLanguages.clear();
							registeredLanguages.add(defaultLanguageCode);

							loadOrCreateLanguage(defaultLanguageCode);
							languageUsageCounts[defaultLanguageCode] = 0;
						}

					};

					phraseFactoryObject.setLanguage({
						playerId: "default",
						language: defaultLanguageCode
					});
					languageUsageCounts[defaultLanguageCode] = 0;

					sharedForge.setFactory({
						name: phraseFactoryKey,
						factory: phraseFactoryObject
					});
				}

				return sharedForge.getFactory({ name: phraseFactoryKey });
			};
		},

		// ANCHOR Function: createTemplateFactory
		createTemplateFactory: function () {
			return (moduleSettings) => {

				const convertToSingleLine = EASY_UTILS.getFunction({ functionName: "convertToSingleLine", moduleSettings });
				const replacePlaceholders = EASY_UTILS.getFunction({ functionName: "replacePlaceholders", moduleSettings });
				const getSharedForge = EASY_UTILS.getFunction({ functionName: "getSharedForge", moduleSettings });

				const templateFactoryKey = "TemplateFactory";
				const forgeInstance = getSharedForge();

				if (!forgeInstance.getFactory({ name: templateFactoryKey })) {

					const templateMemoryMap = {};

					const templateFactoryObject = {

						get: ({ template, expressions = {} } = {}) => {
							if (!templateMemoryMap[template]) {
								// No template found - return expressions as JSON for debugging
								return JSON.stringify(expressions);
							}

							const templateString = templateMemoryMap[template];

							return convertToSingleLine({ multiline: (replacePlaceholders({ text: templateString, expressions })) });
						},

						set: ({ newMap }) => {
							Object.keys(templateMemoryMap).forEach((key) => {
								delete templateMemoryMap[key];
							});
							Object.assign(templateMemoryMap, newMap);
						},

						add: ({ newTemplates }) => {
							Object.entries(newTemplates).forEach(([name, htmlString]) => {
								templateMemoryMap[name] = htmlString.trim();
							});
						},

						remove: ({ template }) => {
							delete templateMemoryMap[template];
						},

						init: () => {
							Object.keys(templateMemoryMap).forEach((key) => {
								delete templateMemoryMap[key];
							});
						},

						getRaw: ({ template }) => {
							return templateMemoryMap[template] || null;
						},

						getAll: () => {
							const result = {};
							Object.entries(templateMemoryMap).forEach(([key, value]) => {
								result[key] = value;
							});
							return result;
						},

						has: ({ template }) => {
							return templateMemoryMap.hasOwnProperty(template);
						}
					};

					forgeInstance.setFactory({ name: templateFactoryKey, factory: templateFactoryObject });
				}

				return forgeInstance.getFactory({ name: templateFactoryKey });
			};
		},

		// ANCHOR Function: createThemeFactory
		createThemeFactory: function () {
			return (moduleSettings) => {

				const convertToSingleLine = EASY_UTILS.getFunction({ functionName: "convertToSingleLine", moduleSettings });
				const replacePlaceholders = EASY_UTILS.getFunction({ functionName: "replacePlaceholders", moduleSettings });
				const getSharedForge = EASY_UTILS.getFunction({ functionName: "getSharedForge", moduleSettings });
				const getSharedVault = EASY_UTILS.getFunction({ functionName: "getSharedVault", moduleSettings });

				const themeFactoryKey = "ThemeFactory";
				const forgeInstance = getSharedForge();

				if (!forgeInstance.getFactory({ name: themeFactoryKey })) {

					const themeMemoryMap = {};

					const themeFactoryObject = {

						get: ({ theme, expressions = {}, cssVars = {} } = {}) => {
							if (!themeMemoryMap[theme]) {
								// No theme found - return empty string (no styling)
								return "";
							}

							const themeString = themeMemoryMap[theme];

							return convertToSingleLine({ multiline: (replacePlaceholders({ text: themeString, expressions, cssVars })) });
						},

						set: ({ newMap }) => {
							Object.keys(themeMemoryMap).forEach((key) => {
								delete themeMemoryMap[key];
							});
							Object.assign(themeMemoryMap, newMap);
						},

						add: ({ newThemes }) => {
							Object.entries(newThemes).forEach(([name, themeString]) => {
								themeMemoryMap[name] = themeString.trim();
							});
						},

						remove: ({ theme }) => {
							delete themeMemoryMap[theme];
						},

						init: () => {
							Object.keys(themeMemoryMap).forEach((key) => {
								delete themeMemoryMap[key];
							});

							const vault = getSharedVault();
							if (vault.customStyle) {
								delete vault.customStyle;
							}
						},

						getRaw: ({ theme }) => {
							return themeMemoryMap[theme] || null;
						},

						getAll: () => {
							const result = {};
							Object.entries(themeMemoryMap).forEach(([key, value]) => {
								result[key] = value;
							});
							return result;
						},

						has: ({ theme }) => {
							return themeMemoryMap.hasOwnProperty(theme);
						},

						setRootVariables: ({ variables }) => {
							const vault = getSharedVault();
							vault.customStyle = { ...variables };
						},

						getRootVariables: () => {
							const vault = getSharedVault();
							return vault.customStyle || {};
						}
					};

					forgeInstance.setFactory({ name: themeFactoryKey, factory: themeFactoryObject });
				}

				return forgeInstance.getFactory({ name: themeFactoryKey });
			};
		},

		// ANCHOR Util: decodeBase64
		decodeBase64: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {

				return ({ text }) => {
					if (typeof text !== "string") {
						return text;
					}

					const base64Characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

					function decodeUtf8(utf8Text) {
						let decodedString = "";
						let i = 0;

						while (i < utf8Text.length) {
							const byte1 = utf8Text.charCodeAt(i);

							if (byte1 < 128) {
								decodedString += String.fromCharCode(byte1);
								i++;
							} else if (byte1 > 191 && byte1 < 224) {
								const byte2 = utf8Text.charCodeAt(i + 1);
								decodedString += String.fromCharCode(((byte1 & 31) << 6) | (byte2 & 63));
								i += 2;
							} else {
								const byte2 = utf8Text.charCodeAt(i + 1);
								const byte3 = utf8Text.charCodeAt(i + 2);
								decodedString += String.fromCharCode(
									((byte1 & 15) << 12) |
									((byte2 & 63) << 6) |
									(byte3 & 63)
								);
								i += 3;
							}
						}

						return decodedString;
					}

					try {
						let decodedOutput = "";
						let i = 0;

						const sanitizedInput = text.replace(/[^A-Za-z0-9+/=]/g, "");

						while (i < sanitizedInput.length) {
							const enc1 = base64Characters.indexOf(sanitizedInput.charAt(i++));
							const enc2 = base64Characters.indexOf(sanitizedInput.charAt(i++));
							const enc3 = base64Characters.indexOf(sanitizedInput.charAt(i++));
							const enc4 = base64Characters.indexOf(sanitizedInput.charAt(i++));

							const dec1 = (enc1 << 2) | (enc2 >> 4);
							const dec2 = ((enc2 & 15) << 4) | (enc3 >> 2);
							const dec3 = ((enc3 & 3) << 6) | enc4;

							decodedOutput += String.fromCharCode(dec1);

							if (enc3 !== 64) {
								decodedOutput += String.fromCharCode(dec2);
							}
							if (enc4 !== 64) {
								decodedOutput += String.fromCharCode(dec3);
							}
						}

						return decodeUtf8(decodedOutput);

					} catch (err) {
						return "";
					}
				};
			};
		},

		// ANCHOR Util: encodeBase64
		encodeBase64: function () {
			// eslint-disable-next-line no-unused-vars
			return (moduleSettings) => {

				return ({ text }) => {
					if (typeof text !== "string") {
						return text;
					}
				
					const base64Characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
				
					function encodeUtf8(str) {
						let utf8Text = "";
						for (let i = 0; i < str.length; i++) {
							const charCode = str.charCodeAt(i);
							if (charCode < 128) {
								utf8Text += String.fromCharCode(charCode);
							} else if (charCode < 2048) {
								utf8Text += String.fromCharCode((charCode >> 6) | 192);
								utf8Text += String.fromCharCode((charCode & 63) | 128);
							} else {
								utf8Text += String.fromCharCode((charCode >> 12) | 224);
								utf8Text += String.fromCharCode(((charCode >> 6) & 63) | 128);
								utf8Text += String.fromCharCode((charCode & 63) | 128);
							}
						}

						return utf8Text;
					}
				
					try {
						let output = "";
						let i = 0;
						const utf8Text = encodeUtf8(text);
				
						while (i < utf8Text.length) {
							const byte1 = utf8Text.charCodeAt(i++);
							const byte2 = utf8Text.charCodeAt(i++);
							const byte3 = utf8Text.charCodeAt(i++);
				
							const enc1 = byte1 >> 2;
							let enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
							let enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
							let enc4 = byte3 & 63;
				
							if (isNaN(byte2)) {
								enc2 = ((byte1 & 3) << 4);
								enc3 = 64;
								enc4 = 64;
							} else if (isNaN(byte3)) {
								enc3 = ((byte2 & 15) << 2);
								enc4 = 64;
							}
				
							output +=
								base64Characters.charAt(enc1) +
								base64Characters.charAt(enc2) +
								base64Characters.charAt(enc3) +
								base64Characters.charAt(enc4);
						}
				
						return output;
					} catch (err) {
						return "";
					}
				};
				
			};
		},

		// ANCHOR Util: decodeCodeBlock
		decodeCodeBlock: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "decodeCodeBlock";

				return ({ text }) => {

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: `Before: ${text}`,
						});
					}

					if (typeof text !== "string") {
						return text;
					}

					const output = text
						.replace(/%%%LESSTHAN%%%/g, "&lt;")
						.replace(/%%%GREATERTHAN%%%/g, "&gt;")
						.replace(/%%%QUOTE%%%/g, "&quot;")
						.replace(/%%%APOSTROPHE%%%/g, "&#39;")
						.replace(/%%%SPACE%%%/g, " ")
						.replace(/%%%NEWLINE%%%/g, "\n")
						.replace(/%%%TAB%%%/g, "\t")
						.replace(/%%%AMPERSAND%%%/g, "&")
						.replace(/%%%EQUAL%%%/g, "&#61;")
						.replace(/%%%ASTERISK%%%/g, "&#42;")
						.replace(/%%%UNDERSCORE%%%/g, "&#95;")
						.replace(/%%%TILDE%%%/g, "&#126;")
						.replace(/%%%BACKTICK%%%/g, "&#96;")
						.replace(/%%%DASH%%%/g, "&#45;")
						.replace(/%%%CARET%%%/g, "&#94;")
						.replace(/%%%DOLLAR%%%/g, "&#36;")
						.replace(/%%%LBRACKET%%%/g, "&#91;")
						.replace(/%%%RBRACKET%%%/g, "&#93;")
						.replace(/%%%LCURLY%%%/g, "&#123;")
						.replace(/%%%RCURLY%%%/g, "&#125;")
						.replace(/%%%LPAREN%%%/g, "&#40;")
						.replace(/%%%RPAREN%%%/g, "&#41;");

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: `After: ${output}`,
						});
					}

					return output;
				};
			};
		},

		// ANCHOR Util: encodeCodeBlock
		encodeCodeBlock: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "encodeCodeBlock";

				return ({ text }) => {

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: `Before: ${text}`,
						});
					}

					if (typeof text !== "string") {
						return text;
					}

					const output = text
						.replace(/&/g, "%%%AMPERSAND%%%")
						.replace(/</g, "%%%LESSTHAN%%%")
						.replace(/>/g, "%%%GREATERTHAN%%%")
						.replace(/"/g, "%%%QUOTE%%%")
						.replace(/'/g, "%%%APOSTROPHE%%%")
						.replace(/ /g, "%%%SPACE%%%")
						.replace(/\n/g, "%%%NEWLINE%%%")
						.replace(/\t/g, "%%%TAB%%%")
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

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: `After: ${output}`,
						});
					}

					return output;
				};
			};
		},

		// ANCHOR Util: decodeNoteContent
		decodeNoteContent: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "decodeNoteContent";

				return ({ text }) => {

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: `Before: ${text}`,
						});
					}

					if (typeof text !== "string") {
						return text;
					}

					const output = text
						.replace(/&nbsp;/g, " ")
						.replace(/<p>/g, "")
						.replace(/<\/p>/g, "")
						.replace(/<br>/g, "\n")
						.replace(/&lt;/g, "<")
						.replace(/&gt;/g, ">")
						.replace(/&quot;/g, "\"")
						.replace(/&#39;/g, "'")
						.replace(/&amp;/g, "&");

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: `After: ${output}`,
						});
					}

					return output;
				};
			};
		},

		// ANCHOR Util: encodeNoteContent
		encodeNoteContent: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "encodeNoteContent";

				return ({ text }) => {

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: `Before: ${text}`,
						});
					}

					if (typeof text !== "string") {
						return text;
					}

					const output = text
						.replace(/&/g, "&amp;")
						.replace(/'/g, "&#39;")
						.replace(/"/g, "&quot;")
						.replace(/>/g, "&gt;")
						.replace(/</g, "&lt;")
						.replace(/\n/g, "<br>")
						.replace(/ /g, "&nbsp;");

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: `After: ${output}`,
						});
					}

					return output;
				};
			};
		},

		// ANCHOR Util: getGlobalSettings
		getGlobalSettings: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "getGlobalSettings";

				return () => {

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: JSON.stringify(globalSettings),
						});
					}

					return globalSettings;
				};
			};
		},

		// ANCHOR Util: getSharedForge
		getSharedForge: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "getSharedForge";

				return () => {

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: JSON.stringify(globalSettings.sharedForge),
						});
					}

					return globalSettings.sharedForge;
				};
			};
		},

		// ANCHOR Util: getSharedVault
		getSharedVault: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "getSharedVault";

				return () => {

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: JSON.stringify(globalSettings.sharedVault),
						});
					}

					return globalSettings.sharedVault;
				};
			};
		},

		// ANCHOR Util: logSyslogMessage
		logSyslogMessage: function () {
			return (moduleSettings) => {
				const getSyslogTimestamp = () => { return new Date().toISOString(); };

				return ({ severity, tag, transUnitId, message }) => {
					const severityMap = {
						3: "ERROR",
						4: "WARN",
						6: "INFO",
						7: "DEBUG",
					};

					const reverseSeverityMap = Object.fromEntries(
						Object.entries(severityMap).map(([key, value]) => { return [value, parseInt(key)]; })
					);

					let normalizedSeverity;
					if (typeof severity === "number" && severityMap[severity]) {
						normalizedSeverity = severity;
					} else if (typeof severity === "string" && reverseSeverityMap[severity.toUpperCase()]) {
						normalizedSeverity = reverseSeverityMap[severity.toUpperCase()];
					} else {
						normalizedSeverity = 6;
					}

					const moduleName = moduleSettings?.readableName || "UNKNOWN_MODULE";
					const logMessage = `<${severityMap[normalizedSeverity]}> ${getSyslogTimestamp()} [${moduleName}](${tag}): {"transUnitId": ${transUnitId}, "message": "${message}"}`;

					try {
						log(logMessage);
						return 0;
					} catch (err) {
						return 1;
					}
				};
			};
		},

		// ANCHOR Util: parseChatCommands
		parseChatCommands: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "parseChatCommands";

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

					const output = commandMap;

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: JSON.stringify(output),
						});
					}

					return output;
				};
			};
		},

		// ANCHOR Util: parseChatSubcommands
		parseChatSubcommands: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "parseChatSubcommands";

				return ({ subcommands }) => {
					const subcommandMap = {};

					const greedyKeys = ["prompt", "message", "msg"];

					for (let i = 0; i < subcommands.length; i++) {
						const arg = subcommands[i];
						const delimiterMatch = arg.includes("|") ? "|" : arg.includes("#") ? "#" : null;

						if (delimiterMatch) {
							const delimiterIndex = arg.indexOf(delimiterMatch);
							const key = arg.substring(0, delimiterIndex);
							const value = arg.substring(delimiterIndex + 1);

							if (greedyKeys.includes(key)) {
								const remainingArgs = subcommands.slice(i + 1);
								subcommandMap[key] = [value, ...remainingArgs].join(" ");
								break;
							} else {
								subcommandMap[key] = value;
							}
						} else {
							subcommandMap[arg] = true;
						}
					}

					const output = subcommandMap;

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: JSON.stringify(output),
						});
					}

					return output;
				};
			};
		},

		// ANCHOR Util: replacePlaceholders
		replacePlaceholders: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "replacePlaceholders";

				function resolveVar(text, cssVars) {
					const varRegex = /var\((--[\w-]+)(?:\s*,\s*((?:[^()]+|\([^()]*\))*))?\)/g;
					
					let result = text;
					let safety = 0;
					
					while (result.includes("var(") && safety < 10) {
						result = result.replace(varRegex, (match, varName, fallback) => {
							const value = cssVars[varName];
							if (value !== undefined) {
								return value;
							}
							return fallback !== undefined ? fallback.trim() : match;
						});
						safety++;
					}
					
					return result;
				}

				return ({ text, expressions = {}, cssVars = {} }) => {

					const output = text
						.replace(/{{(.*?)}}/g, (_, key) => {
							return expressions[key.trim()] !== undefined ? expressions[key.trim()] : "";
						})
						.replace(/\[\[(.*?)\]\]/g, (_, anExpression) => {
							return `<span class="inline-rolls">[[${anExpression.trim()}]]</span>`;
						});

					const finalOutput = resolveVar(output, cssVars);

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: finalOutput,
						});
					}

					return finalOutput;
				};
			};
		},

		// !SECTION End of Inner Methods: Low Level Utilities
		// SECTION: Inner Methods: High Level Utilities

		// ANCHOR Util: applyCssToHtmlJson
		applyCssToHtmlJson: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "applyCssToHtmlJson";

				const replacePlaceholders = EASY_UTILS.getFunction({ functionName: "replacePlaceholders", moduleSettings, });

				function preprocessRootRules(cssRules, htmlTree) {
					const rootIndex = cssRules.findIndex((r) => { return r.selector === ":root"; });
					if (rootIndex < 0) {
						return { rootVariables: {}, updatedRules: cssRules };
					}

					const rootRule = cssRules[rootIndex];
					const rootStyle = rootRule.style ?? {};

					const rootVariables = {};
					const rootNonVars = {};
					for (const [propKey, propValue] of Object.entries(rootStyle)) {
						if (propKey.startsWith("--")) {
							rootVariables[propKey] = propValue;
						} else {
							rootNonVars[propKey] = propValue;
						}
					}

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

					const updatedRules = cssRules.filter((r) => { return r.selector !== ":root"; });

					return { rootVariables, updatedRules };
				}

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

				function tokenizeSelector(selector) {
					const groups = selector.split(",").map((s) => { return s.trim(); });

					const chainsArray = [];

					for (const group of groups) {
						const tokens = splitSelectorGroup(group);
						chainsArray.push(tokens);
					}

					return chainsArray;
				}

				function splitSelectorGroup(group) {
					const spaced = group.replace(/>/g, " > ");
					const rawTokens = spaced.split(/\s+/).filter(Boolean);

					const results = [];
					let combinator = null;
					for (const token of rawTokens) {
						if (token === ">") {
							combinator = ">";
						} else {
							results.push({ combinator, segment: token });
							combinator = " ";
						}
					}

					return results;
				}

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

					const attrRegex = /\[([\w-]+)\s*=\s*"([^"]+)"\]/g;
					let attrMatch;
					while ((attrMatch = attrRegex.exec(working)) !== null) {
						const attrKey = attrMatch[1];
						const attrVal = attrMatch[2];
						data.attributes[attrKey] = attrVal;
					}
					working = working.replace(attrRegex, "");

					const idRegex = /#([\w-]+)/;
					const idMatch = idRegex.exec(working);
					if (idMatch) {
						data.id = idMatch[1];
						working = working.replace(idRegex, "");
					}

					const classRegex = /\.([\w-]+)/g;
					let cMatch;
					while ((cMatch = classRegex.exec(working)) !== null) {
						data.classes.push(cMatch[1]);
					}
					working = working.replace(classRegex, "");

					if (/:first-child/.test(working)) {
						data.pseudo.firstChild = true;
						working = working.replace(":first-child", "");
					}
					if (/:last-child/.test(working)) {
						data.pseudo.lastChild = true;
						working = working.replace(":last-child", "");
					}

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

					if (/:empty/.test(working)) {
						data.pseudo.empty = true;
						working = working.replace(":empty", "");
					}

					const leftover = working.trim();
					if (leftover) {
						data.tag = leftover;
					}

					return data;
				}

				function doesNodeMatchSegment(node, segmentData) {
					if (segmentData.tag && segmentData.tag !== node.element) {
						return false;
					}
					if (segmentData.id && node.attributes?.id !== segmentData.id) {
						return false;
					}
					if (segmentData.classes.length > 0) {
						const nodeClasses = node.attributes?.classList || [];
						for (const neededClass of segmentData.classes) {
							if (!nodeClasses.includes(neededClass)) {
								return false;
							}
						}
					}
					for (const [k, v] of Object.entries(segmentData.attributes)) {
						if (node.attributes?.[k] !== v) {
							return false;
						}
					}
					const { firstChild, lastChild, nthChild, empty } = segmentData.pseudo;

					if (empty) {
						const hasChildren = Array.isArray(node.children) && node.children.length > 0;
						if (hasChildren) {
							return false;
						}
					}

					if (firstChild || lastChild || nthChild !== null) {
						const parent = node.parentNode;
						if (!parent || !Array.isArray(parent.children)) {
							return false;
						}
						const idx = parent.children.indexOf(node);
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
								if (idx !== nthChild - 1) return false;
							}
						}
					}

					return true;
				}

				function filterNodesBySegment(nodes, segmentData) {
					const results = [];
					for (const n of nodes) {
						if (doesNodeMatchSegment(n, segmentData)) {
							results.push(n);
						}
					}

					return results;
				}

				function gatherDescendants(node) {
					const result = [];
					if (!node.children) return result;
					for (const child of node.children) {
						result.push(child);
						result.push(...gatherDescendants(child));
					}

					return result;
				}

				function filterByChain(htmlRoot, chain) {
					const allNodes = flattenHtmlTree(htmlRoot, []);
					// eslint-disable-next-line no-unused-vars
					const { segment: firstSeg, combinator: firstComb } = chain[0];
					const firstData = parseSegment(firstSeg);

					let currentSet = filterNodesBySegment(allNodes, firstData);

					for (let i = 1; i < chain.length; i++) {
						const { combinator, segment } = chain[i];
						const segData = parseSegment(segment);
						const nextSet = [];

						for (const matchedNode of currentSet) {
							if (combinator === ">") {
								if (Array.isArray(matchedNode.children)) {
									for (const childNode of matchedNode.children) {
										if (doesNodeMatchSegment(childNode, segData)) {
											nextSet.push(childNode);
										}
									}
								}
							}
							else {
								const descendants = gatherDescendants(matchedNode);
								const matched = filterNodesBySegment(descendants, segData);
								nextSet.push(...matched);
							}
						}
						currentSet = nextSet;
					}

					return currentSet;
				}

				function filterBySelector(htmlRoot, selector) {
					const chainsArray = tokenizeSelector(selector);
					const resultSet = new Set();

					for (const chain of chainsArray) {
						const matched = filterByChain(htmlRoot, chain);
						for (const node of matched) {
							resultSet.add(node);
						}
					}

					return [...resultSet];
				}

				function mergeStyles(nodeStyle, newStyles, rootVars) {
					for (const [prop, val] of Object.entries(newStyles)) {
						nodeStyle[prop] = replacePlaceholders({ text: val, cssVars: rootVars });
					}
				}

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

				return ({ cssJson, htmlJson, cssVars = {} }) => {
					try {
						let cssRules = typeof cssJson === "string" ? JSON.parse(cssJson) : cssJson;
						let htmlTree = typeof htmlJson === "string" ? JSON.parse(htmlJson) : htmlJson;

						if (!Array.isArray(cssRules)) {
							cssRules = [];
						}
						if (!Array.isArray(htmlTree)) {
							htmlTree = [htmlTree];
						}

						const { rootVariables, updatedRules } = preprocessRootRules(cssRules, htmlTree);
						cssRules = updatedRules;

						Object.assign(rootVariables, cssVars);

						for (const [key, value] of Object.entries(rootVariables)) {
							rootVariables[key] = value.replace(/var\((--[\w-]+)\)/g, (_, varName) => {
								return rootVariables[varName] || `var(${varName})`;
							});
						}

						for (const rule of cssRules) {
							const { selector, style } = rule;
							const matchedNodes = filterBySelector(htmlTree, selector);
							for (const node of matchedNodes) {
								node.attributes = node.attributes || {};
								node.attributes.style = node.attributes.style || {};
								mergeStyles(node.attributes.style, style, rootVariables);
							}
						}

						removeParentRefs(htmlTree);
						const output = JSON.stringify(htmlTree, null, 2);

						if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
							Utils.logSyslogMessage({
								severity: "DEBUG",
								tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
								transUnitId: "70000",
								message: output,
							});
						}

						return output;

					} catch (err) {
						const msgId = "50000";
						Utils.logSyslogMessage({
							severity: "ERROR",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: msgId,
							message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
						});

						return htmlJson;
					}
				};
			};
		},

		// ANCHOR Util: handleApiCall
		handleApiCall: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "handleApiCall";

				const parseChatCommands = EASY_UTILS.getFunction({ functionName: "parseChatCommands", moduleSettings });
				const parseChatSubcommands = EASY_UTILS.getFunction({ functionName: "parseChatSubcommands", moduleSettings });

				return ({ actionMap, apiCall, onInvalidCommand }) => {

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: "apiCall: " + JSON.stringify(apiCall),
						});
					}

					const playerObject = apiCall.playerid ? getObj("player", apiCall.playerid) : null;
					const playerName = playerObject ? playerObject.get("_displayname").replace(/\(GM\)/g, "").trim() : "Unknown Player";
					const isPlayerGM = playerObject && playerIsGM(apiCall.playerid);

					const msgDetails = {
						schema: "0.0.1",
						raw: apiCall,
						commandMap: parseChatCommands({
							apiCallContent: apiCall.content,
						}),
						isGm: isPlayerGM,
						callerId: playerObject ? playerObject.get("_id") : null,
						callerName: playerName,
						selectedIds: [],
					};

					if (msgDetails.commandMap.has("--ids")) {
						msgDetails.selectedIds = msgDetails.commandMap.get("--ids");
						msgDetails.commandMap.delete("--ids");
					} else if (apiCall.selected && apiCall.selected.length > 0) {
						msgDetails.selectedIds = apiCall.selected.map((selection) => { return selection._id; });
					}

					const validCommands = [];
					const invalidCommands = [];

					msgDetails.commandMap.forEach((args, commandName) => {
						if (actionMap.hasOwnProperty(commandName)) {
							validCommands.push({ commandName, args });
						} else {
							invalidCommands.push(commandName);
						}
					});

					if (validCommands.length === 0 && invalidCommands.length === 0) {
						actionMap["--default"](msgDetails, {});
					} else {
						validCommands.forEach(({ commandName, args }) => {
							const parsedArgs = parseChatSubcommands({ subcommands: args });
							actionMap[commandName](msgDetails, parsedArgs);
						});

						if (invalidCommands.length > 0 && typeof onInvalidCommand === "function") {
							onInvalidCommand(msgDetails, invalidCommands);
						}
					}

					if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
						Utils.logSyslogMessage({
							severity: "DEBUG",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: "70000",
							message: "msgDetails: " + JSON.stringify(msgDetails),
						});
					}

					return msgDetails;
				};
			};
		},

		// ANCHOR Util: renderTemplateAsync
		renderTemplateAsync: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "renderTemplateAsync";

				const templateFactory = EASY_UTILS.getFunction({ functionName: "createTemplateFactory", moduleSettings });
				const themeFactory = EASY_UTILS.getFunction({ functionName: "createThemeFactory", moduleSettings });
				const applyCssToHtmlJson = EASY_UTILS.getFunction({ functionName: "applyCssToHtmlJson", moduleSettings });
				const convertJsonToHtml = EASY_UTILS.getFunction({ functionName: "convertJsonToHtml", moduleSettings });
				const convertHtmlToJson = EASY_UTILS.getFunction({ functionName: "convertHtmlToJson", moduleSettings });
				const convertCssToJson = EASY_UTILS.getFunction({ functionName: "convertCssToJson", moduleSettings });
				const decodeCodeBlock = EASY_UTILS.getFunction({ functionName: "decodeCodeBlock", moduleSettings });
				const getSharedVault = EASY_UTILS.getFunction({ functionName: "getSharedVault", moduleSettings });

				return async ({ template, expressions = {}, theme, cssVars = {} }) => {

					try {
						const vault = getSharedVault();
						const customStyle = vault.customStyle || {};
						const mergedCssVars = { ...customStyle, ...cssVars };

						const [fetchedTemplate, fetchedTheme] = await Promise.all([
							templateFactory.get({ template, expressions, cssVars: mergedCssVars }),
							themeFactory.get({ theme, expressions, cssVars: mergedCssVars })
						]);

						// If no template found, just return the expressions as JSON
						if (!templateFactory.has({ template })) {
							return fetchedTemplate;
						}

						// If no theme, return template HTML without styling
						if (!fetchedTheme) {
							const htmlJson = convertHtmlToJson({ html: fetchedTemplate });
							return convertJsonToHtml({ htmlJson });
						}

						const styledJson = applyCssToHtmlJson({
							cssJson: convertCssToJson({ css: fetchedTheme }),
							htmlJson: convertHtmlToJson({ html: fetchedTemplate }),
							cssVars: mergedCssVars
						});

						const output = convertJsonToHtml({ htmlJson: decodeCodeBlock({ text: styledJson }) });

						if (moduleSettings?.debug?.[thisFuncDebugName] ?? false) {
							Utils.logSyslogMessage({
								severity: "DEBUG",
								tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
								transUnitId: "70000",
								message: output,
							});
						}

						return output;

					} catch (err) {
						const msgId = "50000";
						Utils.logSyslogMessage({
							severity: "ERROR",
							tag: `${moduleSettings.readableName}.${thisFuncDebugName}`,
							transUnitId: msgId,
							message: PhraseFactory.get({ transUnitId: msgId, expressions: { remark: err } })
						});

						return JSON.stringify(expressions);
					}
				};
			};
		},

		// ANCHOR Util: whisperPlayerMessage
		whisperPlayerMessage: function () {
			return (moduleSettings) => {

				const thisFuncDebugName = "whisperPlayerMessage";

				return ({ from, to, message }) => {
					const sender = from || moduleSettings.readableName;
					const recipient = to || "gm";

					try {
						sendChat(sender, `/w "${recipient}" ${message}`);
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
			};
		},

		// ANCHOR Util: parseConfigHandout
		parseConfigHandout: function () {
			return (moduleSettings) => {

				return ({ content }) => {
					const result = {
						rootVariables: {},
						themes: {},
						templates: {}
					};

					if (!content) return result;

					const varsMatch = content.match(/<style\s+id="ez-config-variables"[^>]*>([\s\S]*?)<\/style>/i);
					if (varsMatch) {
						const styleContent = varsMatch[1];
						const rootMatch = styleContent.match(/:root\s*{([\s\S]*?)}/i);
						if (rootMatch) {
							const rootContent = rootMatch[1];
							const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
							let match;
							while ((match = varRegex.exec(rootContent)) !== null) {
								result.rootVariables[match[1].trim()] = match[2].trim();
							}
						}
					}

					const themeRegex = /<style\s+id="ez-config-theme-([^"]+)"[^>]*>([\s\S]*?)<\/style>/gi;
					let themeMatch;
					while ((themeMatch = themeRegex.exec(content)) !== null) {
						result.themes[themeMatch[1]] = themeMatch[2].trim();
					}

					const templateRegex = /<template\s+id="ez-config-template-([^"]+)"[^>]*>([\s\S]*?)<\/template>/gi;
					let templateMatch;
					while ((templateMatch = templateRegex.exec(content)) !== null) {
						result.templates[templateMatch[1]] = templateMatch[2].trim();
					}

					return result;
				};
			};
		},

		// ANCHOR Util: generateConfigHandout
		generateConfigHandout: function () {
			return (moduleSettings) => {

				return ({ rootVariables, themes, templates }) => {
					let output = [];

					if (rootVariables && Object.keys(rootVariables).length > 0) {
						output.push("<style id=\"ez-config-variables\">");
						output.push(":root {");

						for (const [key, value] of Object.entries(rootVariables)) {
							output.push(`${key}: ${value};`);
						}
						output.push("}");
						output.push("</style>");
					}

					if (themes && Object.keys(themes).length > 0) {
						for (const [name, css] of Object.entries(themes)) {
							output.push(`<style id="ez-config-theme-${name}">`);
							output.push(css);
							output.push("</style>");
						}
					}

					if (templates && Object.keys(templates).length > 0) {
						for (const [name, html] of Object.entries(templates)) {
							output.push(`<template id="ez-config-template-${name}">`);
							output.push(html);
							output.push("</template>");
						}
					}

					return output.join("\n");
				};
			};
		},
	};

	// !SECTION End of Inner Methods: High Level Utilities
	// !SECTION End of Outer Method: functionLoaders

	// SECTION Event Hooks: Roll20 API

	// ANCHOR Outer Method: checkInstall
	const checkInstall = () => {

		if (typeof EASY_UTILS !== "undefined") {

			const requiredFunctions = [
				"createPhraseFactory",
				"createTemplateFactory",
				"createThemeFactory",
				"logSyslogMessage",
			];

			Utils = EASY_UTILS.fetchUtilities({
				requiredFunctions,
				moduleSettings
			});

			PhraseFactory = Utils.createPhraseFactory;
			TemplateFactory = Utils.createTemplateFactory;
			ThemeFactory = Utils.createThemeFactory;

			if (moduleSettings.verbose) {
				Utils.logSyslogMessage({
					severity: "INFO",
					tag: moduleSettings.readableName,
					transUnitId: "10000",
					message: ".=> Initializing <=."
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

	// ANCHOR Event: on(ready)
	on("ready", () => {

		if (globalSettings.purgeState) {
			state = {};
		}

		const continueMod = checkInstall();
		if (continueMod === 0) {

			Utils.logSyslogMessage({
				severity: "INFO",
				tag: moduleSettings.readableName,
				transUnitId: "20000",
				message: ".=> Ready <=."
			});
		}
	});

	// !SECTION End of Event Hooks: Roll20 API

	// SECTION: Public Methods: Exposed Interface

	const loadedFunctions = {};

	return {

		// ANCHOR Method: getFunction
		getFunction: ({ functionName, moduleSettings }) => {

			if (!functionLoaders[functionName]) {
				log(`[${moduleSettings.readableName}] Warning: Function not found: ${functionName}`);
				return undefined;
			}

			if (!loadedFunctions[functionName]) {
				loadedFunctions[functionName] = functionLoaders[functionName]();
			}

			if (globalSettings.factoryFunctions.includes(functionName)) {
				return loadedFunctions[functionName](moduleSettings);
			}

			if (typeof loadedFunctions[functionName] === "function") {
				return loadedFunctions[functionName](moduleSettings);
			}

			return loadedFunctions[functionName];
		},

		// ANCHOR Method: fetchUtilities
		fetchUtilities: ({ requiredFunctions, moduleSettings }) => {
			return requiredFunctions.reduce((accumulator, functionName) => {
				accumulator[functionName] = EASY_UTILS.getFunction({ functionName, moduleSettings });

				return accumulator;
			}, {});
		}
	};

	// !SECTION End of Public Methods: Exposed Interface
	// !SECTION End of Object: EASY_UTILS

})();
