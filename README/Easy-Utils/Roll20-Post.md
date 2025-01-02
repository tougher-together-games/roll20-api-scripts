I created a script called `Easy-Utils`, a library of basic functions designed to help speed up the process of making Roll20 mods. There's also an example script, `easy-util-menu.js`, that demonstrates how to use the library in a practical way.

[easy-utils.js](https://github.com/Tougher-Together-Gaming/roll20-api-scripts/blob/main/src/easy-utils/easy-utils.js)  
[easy-utils-menu.js](https://github.com/Tougher-Together-Gaming/roll20-api-scripts/blob/main/src/easy-utils/easy-utils-menu.js)

# **Features**

### 1. **Dynamic Module Loading**
- Dynamically load and manage utility functions. Its uses closures to customize functions for the retrieving module and memory efficinecy.
- Avoid redundant code with a centralized, reusable library.
- A special global Object called a Forge contains Factories that present API for specialized use across all APi scripts making use of EASY_UTILS.
	- These factories are Phrase, Template, and Theme factories.

![function loader](https://raw.githubusercontent.com/Tougher-Together-Gaming/roll20-api-scripts/refs/heads/main/README/Easy-Utils/images/ez-function-loader-closures.png)

### 2. **Advanced Logging System**
- Log messages in a structured, syslog-like format to enhance debugging and traceability.
- Multilingual logging support through `PhraseFactory`.

![syslog messages](https://raw.githubusercontent.com/Tougher-Together-Gaming/roll20-api-scripts/refs/heads/main/README/Easy-Utils/images/ez-get-syslog-style-messages.png)

### 3. **Translation Support**
- Integrate with `PhraseFactory` to support multilingual scripts.
- Players can select from available languages that they want their whispers displayed in. Multilingual AT THE SAME TIME.
- Script makers can upload custom dictionaries for different languages.
- dictionaries that are not used by any players are unloaded form memory.

![player specific l10n](https://raw.githubusercontent.com/Tougher-Together-Gaming/roll20-api-scripts/refs/heads/main/README/Easy-Utils/images/ez-player-specific-language.png)

### 4. **Use CSS and HTML**
- There is a collection of functions that make working with raw HTML and CSS easy.
- The CSS works with universal (*), Element, Ids, Class, Attributes, :root and nth-child pseudo classes
- More rules can be added in the future
- You can use handle bar expressions `{{ ... }}` in HTMl templates for placeholders.
- You can use `var()` in CSS to apply universal color palettes.

![raw html css chat modals](https://raw.githubusercontent.com/Tougher-Together-Gaming/roll20-api-scripts/refs/heads/main/README/Easy-Utils/images/ez-work-with-raw-css-and-html.png)

![custom menu](https://raw.githubusercontent.com/Tougher-Together-Gaming/roll20-api-scripts/refs/heads/main/README/Easy-Utils/images/ez-rolebased-menu.png)

*Note the menu is different for GMs.

### 5. **Override Templates and Themes**
- Replace template expressions (`{{..}}`) and CSS variables to override colors and structure.
- Reuse the same HTML template and CSS theme to display different types of messages.
- With players picking their own language, or defaulting to every "EASY" module to a different language.

![various alerts](https://raw.githubusercontent.com/Tougher-Together-Gaming/roll20-api-scripts/refs/heads/main/README/Easy-Utils/images/ez-example-alerts.png)

### 6. **Developer Convenience**
- Functions like `logSyslogMessage` enable structured and consistent logging across scripts.
- Quickly build new APi scripts using a shared library of utility functions.
- `easy-utils-menu.js` is an example of how a mod might look.
