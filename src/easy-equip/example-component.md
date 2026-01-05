<style>
@import url("Handouts");

:root {
   --ez-handout-container-offset: 0px -5px 0px -5px;
}
</style>

<!-- The handout is designed for a width of 930px; This bar helps consistently resize the roll20 window. -->
<div id="sizing-guide">
<p> </p>
</div>

![player tab](https://raw.githubusercontent.com/tougher-together-games/default-game-assets/refs/heads/main/handouts/themes/black-n-gold/handout-bookmark-player.png "page-bookmark")

::: portrait-frame

![Character Portrait]({{ AvatarUrl }} "portrait-image")
![Portrait Border](https://raw.githubusercontent.com/tougher-together-games/default-game-assets/refs/heads/main/handouts/themes/black-n-gold/handout-portrait-border.png "portrait-border")

:::

# {{ CharacterName }}

<a title="button" href="&#96;!ezmarkdown --character {{ CharacterId }}">Refresh Bio</a>

<a title="button" href="&#96;!ezspeak --menu">Speak Languages</a>

<a title="button" href="&#96;!ezcomp --menu">Modify Components</a>

## Appearance

{{ BioCharacterAppearance }}

***

## Personality

::: accent-detail

| | |
| --- | --- |
| **Personality Traits** | {{ BioPersonalityTraits }} |
| **Ideals** | {{ BioIdeals }} |
| **Bonds** | {{ BioBonds }} |
| **Flaws** | {{ BioFlaws }} |

:::

***

### Backstory

::: two-columns
{{ BioCharacterBackstory }}
:::

