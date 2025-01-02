<style>
@import url("Handouts");

:root {
   --ez-handout-container-offset: -340px -30px -30px -30px;
}
</style>

<!-- The handout is designed for a width of 930px; This bar helps consistently resize the roll20 window. -->
<div id="sizing-guide">
<p>empty</p>
</div>

![monster tab](https://raw.githubusercontent.com/tougher-together-games/default-game-assets/refs/heads/main/handouts/themes/black-n-gold/handout-bookmark-monster.png "page-bookmark")

# h1 Heading

::: avatar-banner

![Handout Avatar.]({{ AvatarUrl }} "avatar-image")
![Stylized border of leather straps holding banner picture in place.](https://raw.githubusercontent.com/tougher-together-games/default-game-assets/refs/heads/main/handouts/themes/black-n-gold/handout-avatar-border.png "avatar-border")

:::

## h2 Heading
### h3 Heading
#### h4 Heading
##### h5 Heading
###### h6 Heading

Easy-Markdown simplifies the process of creating beautiful and organized handouts in Roll20. By learning a few simple commands and syntax, you can enhance your game with professional-looking documents. With a little Markdown and CSS you to can make stylish HTML based handouts. 

## Getting Started

To use Easy-Markdown in Roll20, you'll need a Pro account, as custom [API scripts](https://help.roll20.net/hc/en-us/articles/360037256714-Roll20-Mods-API#D&D5eOGLRollTemplates-StyleDifferences) require this level of access. Easy-Markdown relies on the Easy-Utils library for essential functions, so both scripts must be installed.

::: float-left half-wide

> #### Steps to Set Up Easy-Markdown
>
> 1. Open the API Mod Page in Roll20.  
> 2. Upload these two scripts:  
>   1. [Easy-Utils](https://raw.githubusercontent.com/tougher-together-games/roll20-api-scripts/refs/heads/main/src/easy-utils/easy-utils.js)  
>   2. [Easy-Markdown](https://raw.githubusercontent.com/tougher-together-games/roll20-api-scripts/refs/heads/main/src/easy-markdown/easy-markdown.js)  
> 3. Launch your Roll20 game.  
> 4. Create two types of handouts:  
>   1. **Markdown Handout:** Add your Markdown content to the **GM Notes** section.  
>   2. **Stylesheet Handout:** Add your CSS rules to the **GM Notes** section. Name this handout `StyleSheet: (Theme Name)` (e.g., `StyleSheet: DarkTheme`).  
> 5. Open the Roll20 chat and enter the command `!ezmarkdown --menu` to access the Easy-Markdown menu.  
> 6. Use the menu to load your stylesheets and render your Markdown handouts.

:::

### How Easy-Markdown Works

Easy-Markdown renders HTML-styled handouts by linking Markdown content to a named stylesheet. Each stylesheet is a handout named `StyleSheet: (Theme Name)` and contains CSS rules in the GM Notes section. When you create a Markdown handout, you assign a theme from these stylesheets to format its content. Roll20 only supports basic CSS, so focus on simple, inline-compatible styles for the best results.

To include a stylesheet in your Markdown handout, add a `<style>` block at the top of the document. Here's an example:

```markdown
<style>
@import url("Handouts");

:root {
   --ez-primary-color: #8655B6;
}
</style>
```

The `@import` rule doesn't work as standard CSS but is a convention used by Easy-Markdown to locate the corresponding stylesheet handout (e.g., `"Handouts"`). Use `:root` to override CSS variables defined in the stylesheet.

### Writing Markdown Content

The Roll20 handout editor can be inconsistent. Typed content is often wrapped in individual `<p>` tags, while pasted content might be wrapped differently. To avoid formatting issues, it's best to write your Markdown in an external text editor (like VSCode or Notepad++) and then paste it into Roll20. Remember that Roll20 supports only basic HTML tags, mostly those predating semantic HTML.

Your Markdown handout should follow a consistent structure, with realistic data filled in, and include a `<style>` tag referencing the stylesheet to be used. For example:

```markdown
<style>
@import url("DarkTheme");

:root {
   --ez-header-color: #333333;
}
</style>

# Welcome to My Campaign
Here is your Markdown content styled with the selected theme.
```

### Creating Stylesheets

Stylesheets in Easy-Markdown are handouts named `StyleSheet: (Theme Name)` and are shared across all "Easy" modules. The theme name comes from the text after `StyleSheet:` in the handout title, so ensure each stylesheet has a unique name to avoid errors. You can use tag selectors, IDs, classes, attributes, and basic pseudo-classes like `:first-child`, `:last-child`, and `:nth-child` (with `odd`, `even`, or specific numbers).

Once your stylesheets and Markdown content are ready, open the Easy-Markdown menu by entering the following chat command:

```console
!ezmarkdown --menu
```

From this menu, you can load stylesheets and render your Markdown handouts into styled HTML for your campaign.

***

## Added Classes

Easy-Markdown will sometimes adds classes to the HTML tags based on the syntax you use in your markdown for moe spcific styling with CSS.

::: accent-detail

| Markdown Syntax                                                  | HTML Output\*                                                                                         | Rendered Output                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `***This is bold and italics text***`                            | `<strong class="asterisk-strong"><em class="asterisk-em">` | ***This is bold and italics text***                            |
| `**This is bold text**`                                          | `<strong class="asterisk-strong">`                                          | **This is bold text**                                          |
| `__This is bold text__`                                          | `<strong class="underscore-strong">`                                        | __This is bold text__                                          |
| `*This is italic text*`                                          | `<em class="asterisk-em">`                                                    | *This is italic text*                                          |
| `_This is italic text_`                                          | `<em class="underscore-em">`                                                  | _This is italic text_                                          |
| `~~Strikethrough~~`                                              | `<del>Strikethrough</del>`                                                                            | ~~Strikethrough~~                                              |
| `==Marked text==`                                                | `<mark>Marked text</mark>`                                                                            | ==Marked text==                                                |
| `^^Superscript^^`                                                | `<sup>Superscript</sup>`                                                                              | Normal Text^^Superscript^^                                     |
| `^_Subscript_^`                                                  | `<sub>Subscript</sub>`                                                                                | Normal Text^_Subscript_^                                       |
| `` `const inlineCode` ``                                         | `<code class="inline-code">const inlineCode</code>`                                                   | `const inlineCode`                                             |
| `[link text](https://example.com)`                               | `<a href="https://example.com">link text</a>`                                                         | [link text](https://example.com)                               |
| `[link with title](https://example.com "Title")`                 | `<a href="https://example.com" title="Title">link with title</a>`                                     | [link with title](https://example.com "Title")                 |
| `![Image Alt Text](https://example.com/image.png "Image Title")` | `<img src="https://example.com/image.png" alt="Image Alt Text" title="Image Title">`                  | ![Image Alt Text]({{ AvatarUrl }} "Image Title") |
| `___`                                                            | `<hr class="underscore-hr">`                                                                          | ___                                                            |
| `---`                                                            | `<hr class="dash-hr">`                                                                                | ---                                                            |
| `***`                                                            | `<hr class="asterisk-hr">`                                                                            | ***                                                            |
\* Easy-Markdown generates HTML with custom classes that can be styled with CSS.
\*Titles in links and images appear as tooltips when hovering over them.

:::

### Lists

#### Unordered Lists

Every three spaces create another level in lists.

 - This Unordered list was made with dashes `-`
    - Items made with `-` result in `<li class="dash-bullet">`
       - Third level list item
 - New list item at root

 * This Unordered list was made with asterisks `*`
    * Items made with `*` result in `<li class="asterisk-bullet">`
       * Third sub bullet

 + Yet another way to make lists; using `+`
    + Items made with `*` result in `<li class="plus-bullet">`
       + Third sub bullet

#### Ordered Lists

Every three spaces create another level in lists.

1. Numbered List
2. Second Item
   1. Second level sublist
       1. Third level sublist
3. lorem at massa

<br />

1. You can use sequential numbers...
1. ...or keep all the numbers as `1.`

<br />

You can start numbering with offset, for example starting the item with `57.`

57. Offset Start
1. Next item preceded by `1.`
2. Number auto-increment from offset

## Block-Level Elements in Easy-Markdown

With Easy-Markdown, you can combine the simplicity of Markdown with enhanced functionality like HTML, custom layouts, and more. Below is a guide to help you get started with some of the most powerful features.

### Using Plain HTML in Markdown

You can insert standard HTML code directly within your Markdown to achieve specific styling or layout effects. This is particularly useful for situations where Markdown syntax is limited.

#### Example:

```html
<div style="float: right; background-color: yellow; color: red; width: 300px; height: 50px; border: 1px solid black; padding: 10px; box-sizing: border-box;">
    This is an HTML block rendered in Markdown.
</div>
```

This will produce:

<div style="float: right; background-color: yellow; color: red; width: 300px; height: 50px; border: 1px solid black; padding: 10px; box-sizing: border-box;">
    This is an HTML block rendered in Markdown.
</div>

### Adding Code Blocks

To display code snippets in your document, use triple backticks (`` `) to create a code block. You can specify the language after the opening backticks for syntax highlighting.

#### Example:

```js
// This is a JavaScript function
const myFunc = () => {
   return "cool";
};
```

### Creating Custom Divs

Custom divs allow you to group content with specific styles or behaviors. Use the `:::` fence syntax to define custom divs. Any word following `:::` becomes a class applied to the `<div>`.

#### Example:

```md
::: sample-div
This text is inside a custom div with the `sample-div` class.
:::
```

This results in:

::: sample-div
This text is inside a custom div with the `sample-div` class.
:::

---

#### Hiding Divs

You can hide content within a div by including the `hidden` keyword after `:::`. The div will automatically have `style="display:none"`, making it invisible.

#### Example:

```md
::: sample-div hidden
This content will not be visible.
:::
```

Produces an invisible div (nothing will render).

---

### Creating Multi-Column Layouts

Easy-Markdown supports basic column layouts by nesting custom divs. For instance, you can create two columns like this:

```md
::: two-columns
::: column-left
This is the left column. Add your content here.
:::
::: column-right
This is the right column. Add your content here.
:::
:::
```

#### Result:

::: two-columns
::: column-left
This is the left column. Add your content here. Fusce facilisis orci at ornare hendrerit. Integer non lorem et dolor elementum dignissim. Vivamus pharetra massa in enim semper, tristique volutpat nibh interdum. Nunc odio velit, suscipit at lacus eget, mollis auctor nunc. Suspendisse venenatis quam faucibus mattis ultrices. Proin at ipsum nec mauris suscipit pretium. Vestibulum ac augue non augue posuere bibendum id in sapien.
:::
::: column-right
This is the right column. Add your content here. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam dictum velit at nisl aliquet, eget tincidunt arcu semper. Ut iaculis mattis nulla eu placerat. Sed dignissim blandit elit vulputate auctor. Cras tincidunt nisi vulputate, euismod nisl et, tempor orci. Maecenas porta ex vitae elementum rutrum. Donec placerat in nisi eget rhoncus.
:::
:::

### Adding Blockquotes

Blockquotes are useful for emphasizing text or nesting content. Use the `>` symbol to create a blockquote. For nested blockquotes, add additional `>` symbols.

#### Example:

```md
> This is a blockquote.
>
> #### It can include headers, tables, or other elements:
>
> ---
> | Item          | Description                      |
> |---------------|----------------------------------|
> | Gold Coins    | Common currency.                 |
> | Magic Items   | Enchanted gear.                  |
> | Artifacts     | Rare treasures with great value. |
>
> And additional content below the table.
>
> > Nested blockquotes can be created...
>> > ...by adding more `>` symbols.
```

#### Result:

> This is a blockquote. It can include headers, tables, or other elements:
>
> #### Nested Table
>
> ---
> | Item          | Description                       |
> |---------------|-----------------------------------|
> | Gold Coins    | Common currency.                 |
> | Magic Items   | Enchanted gear.                  |
> | Artifacts     | Rare treasures with great value. |
>
> And additional content below the table.
>
>> Nested blockquotes can be created...
>> > ...by adding more `>` symbols.

