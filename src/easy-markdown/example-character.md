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

<a title="button" href="&#96;!ezequip --menu">Equip Components</a>

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

## Backstory

::: two-columns
{{ BioCharacterBackstory }}
:::

## Attribute Test

**Character Info**
- Class: {{ class_display }}
- Subclass: {{ subclass }}
- Race: {{ race_display }}
- Background: {{ background }}
- Level: {{ level }}
- Size: {{ size }}
- Alignment: {{ alignment }}
- Speed: {{ speed }}

**Ability Scores**
- STR: {{ strength }} ({{ strength_mod }}) Base: {{ strength_base }}
- DEX: {{ dexterity }} ({{ dexterity_mod }}) Base: {{ dexterity_base }}
- CON: {{ constitution }} ({{ constitution_mod }}) Base: {{ constitution_base }}
- INT: {{ intelligence }} ({{ intelligence_mod }}) Base: {{ intelligence_base }}
- WIS: {{ wisdom }} ({{ wisdom_mod }}) Base: {{ wisdom_base }}
- CHA: {{ charisma }} ({{ charisma_mod }}) Base: {{ charisma_base }}

**Combat**
- AC: {{ ac }}
- HP: {{ hp }}
- Initiative: {{ initiative_bonus }}
- Proficiency: {{ pb }}

**Saves**
- STR Save: {{ strength_save_bonus }}
- DEX Save: {{ dexterity_save_bonus }}
- CON Save: {{ constitution_save_bonus }}
- INT Save: {{ intelligence_save_bonus }}
- WIS Save: {{ wisdom_save_bonus }}
- CHA Save: {{ charisma_save_bonus }}

**Skills**
- Athletics: {{ athletics_bonus }}
- Acrobatics: {{ acrobatics_bonus }}
- Stealth: {{ stealth_bonus }}
- Arcana: {{ arcana_bonus }}
- History: {{ history_bonus }}
- Investigation: {{ investigation_bonus }}
- Nature: {{ nature_bonus }}
- Religion: {{ religion_bonus }}
- Animal Handling: {{ animal_handling_bonus }}
- Insight: {{ insight_bonus }}
- Medicine: {{ medicine_bonus }}
- Perception: {{ perception_bonus }}
- Survival: {{ survival_bonus }}
- Deception: {{ deception_bonus }}
- Intimidation: {{ intimidation_bonus }}
- Performance: {{ performance_bonus }}
- Persuasion: {{ persuasion_bonus }}

**Spellcasting**
- Ability: {{ spellcasting_ability }}
- Attack: {{ spell_attack_bonus }}
- Save DC: {{ spell_save_dc }}
- Caster Level: {{ caster_level }}

**Spell Slots**
- 1st: {{ lvl1_slots_total }}
- 2nd: {{ lvl2_slots_total }}
- 3rd: {{ lvl3_slots_total }}
- 4th: {{ lvl4_slots_total }}
- 5th: {{ lvl5_slots_total }}
- 6th: {{ lvl6_slots_total }}
- 7th: {{ lvl7_slots_total }}
- 8th: {{ lvl8_slots_total }}
- 9th: {{ lvl9_slots_total }}

**Resources**
- Hit Dice: {{ hit_dice }} ({{ hitdietype }})
- Gold: {{ gp }}
- Class Resource: {{ class_resource_name }} {{ class_resource }}

**Proficiencies**
- Languages: {{ other_languages }}
- Tools: {{ other_tool }}
- Armor: {{ other_armor }}
- Weapons: {{ other_weapon }}

**Passive**
- Passive Perception: {{ passive_wisdom }}

**Roleplay**
- Traits: {{ personality_traits }}
- Ideals: {{ ideals }}
- Bonds: {{ bonds }}
- Flaws: {{ flaws }}