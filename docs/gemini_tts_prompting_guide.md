This document outlines vocalization / other forms of control of the spoken voice, as well as some general prompting guidelines / tips.

# Additional controls

## Additional controls and capabilities include the following:

* **Natural conversation**: Voice interactions of remarkable quality, more appropriate expressivity, and patterns of rhythm are delivered with very low latency so you can converse fluidly.
* **Style control**: Using natural language prompts, you can adapt the delivery within the conversation by steering it to adopt specific accents and produce a range of tones and expressions including a whisper.
* **Dynamic performance**: These models can bring text to life for expressive readings of poetry, newscasts, and engaging storytelling. They can also perform with specific emotions and produce accents when requested.
* **Enhanced pace and pronunciation control**: Controlling delivery speed helps to ensure more accuracy in pronunciation including specific words.

## Prompting tips
Creating engaging and natural-sounding audio from text requires understanding the nuances of spoken language and translating them into script form. The following tips will help you craft scripts that sound authentic and capture the chosen tone.

### The three levers of speech control

For the most predictable and nuanced results, ensure all three of the following components are consistent with your desired output.

*   **Style Prompt**: The primary driver of the overall emotional tone and delivery. The prompt sets the context for the entire speech segment.
    *   *Example*: You are an AI assistant speaking in a friendly and helpful tone.
    *   *Example*: Narrate this in the calm, authoritative tone of a nature documentary narrator.
*   **Text Content**: The semantic meaning of the words you are synthesizing. An evocative phrase that is emotionally consistent with the style prompt will produce much more reliable results than neutral text.
    *   *Good*: A prompt for a scared tone works best with text like "I think someone is in the house."
    *   *Less Effective*: A prompt for a scared tone with text like "The meeting is at 4 PM." will produce ambiguous results.
*   **Markup Tags (Preview)**: Bracketed tags like `[sigh]` are best used for injecting a specific, localized action or style modification, not for setting the overall tone. They work in concert with the style prompt and text content.

## Markup tag guide

Our research shows that bracketed markup tags operate in one of three distinct modes. Understanding a tag's mode is key to using it effectively.

### Mode 1: Non-speech sounds

The markup is replaced by an audible, non-speech vocalization (e.g., a sigh, a laugh). The tag itself is not spoken. These are excellent for adding realistic, human-like hesitations and reactions.

| Tag | Behavior | Reliability | Guidance |
| :--- | :--- | :--- | :--- |
| `[sigh]` | Inserts a sigh sound. | High | The emotional quality of the sigh is influenced by the prompt. |
| `[laughing]` | Inserts a laugh. | High | For best results, use a specific prompt. e.g., a generic prompt may yield a laugh of shock, while "react with an amused laugh" creates a laugh of amusement. |
| `[uhm]` | Inserts a hesitation sound. | High | Useful for creating a more natural, conversational feel. |

### Mode 2: Style modifiers

The markup is not spoken, but it modifies the delivery of the subsequent speech. The scope and duration of the modification can vary.

| Tag | Behavior | Reliability | Guidance |
| :--- | :--- | :--- | :--- |
| `[sarcasm]` | Imparts a sarcastic tone on the subsequent phrase. | High | This tag is a powerful modifier. It demonstrates that abstract concepts can successfully steer the model's delivery. |
| `[robotic]` | Makes the subsequent speech sound robotic. | High | The effect can extend across an entire phrase. A supportive style prompt (e.g., "Say this in a robotic way") is still recommended for best results. |
| `[shouting]` | Increases the volume of the subsequent speech. | High | Most effective when paired with a matching style prompt (e.g., "Shout this next part") and text that implies yelling. |
| `[whispering]` | Decreases the volume of the subsequent speech. | High | Best results are achieved when the style prompt is also explicit (e.g., "now whisper this part as quietly as you can"). |
| `[extremely fast]` | Increases the speed of the subsequent speech. | High | Ideal for disclaimers or fast-paced dialogue. Minimal prompt support needed. |

### Mode 3: Vocalized markup (adjectives)

The markup tag itself is spoken as a word, while also influencing the tone of the entire sentence. This behavior typically applies to emotional adjectives.

> [!WARNING]
> Because the tag itself is spoken, this mode is likely an undesired side effect for most use cases. Prefer using the Style Prompt to set these emotional tones instead.

| Tag | Behavior | Reliability | Guidance |
| :--- | :--- | :--- | :--- |
| `[scared]` | The word "scared" is spoken, and the sentence adopts a scared tone. | High | Performance is highly dependent on text content. The phrase "I just heard a window break" produces a genuinely scared result. A neutral phrase produces a "spooky" but less authentic result. |
| `[curious]` | The word "curious" is spoken, and the sentence adopts a curious tone. | High | Use an inquisitive phrase to support the tag's intent. |
| `[bored]` | The word "bored" is spoken, and the sentence adopts a bored, monotone delivery. | High | Use with text that is mundane or repetitive for best effect. |

### Mode 4: Pacing and pauses

These tags insert silence into the generated audio, giving you granular control over rhythm, timing, and pacing. Standard punctuation (commas, periods, semicolons) will also create natural pauses, but these tags offer more explicit control.

| Tag | Behavior | Reliability | Guidance |
| :--- | :--- | :--- | :--- |
| `[short pause]` | Inserts a brief pause, similar to a comma (~250ms). | High | Use to separate clauses or list items for better clarity. |
| `[medium pause]` | Inserts a standard pause, similar to a sentence break (~500ms). | High | Effective for separating distinct sentences or thoughts. |
| `[long pause]` | Inserts a significant pause for dramatic effect (~1000ms+). | High | Use for dramatic timing. For example: "The answer is... `[long pause]` ...no." Avoid overuse, as it can sound unnatural. |

## Key strategies for reliable results

*   **Align all three levers**: For maximum predictability, ensure your Style Prompt, Text Content, and any Markup Tags are all semantically consistent and working toward the same goal.
*   **Use emotionally rich text**: Don't rely on prompts and tags alone. Give the model rich, descriptive text to work with. This is especially critical for nuanced emotions like sarcasm, fear, or excitement.
*   **Write specific, detailed prompts**: The more specific your style prompt, the more reliable the result. "React with an amused laugh" is better than just `[laughing]`. "Speak like a 1940s radio news announcer" is better than "Speak in an old-fashioned way."
*   **Test and verify new tags**: The behavior of a new or untested tag is not always predictable. A tag you assume is a style modifier might be vocalized. Always test a new tag or prompt combination to confirm its behavior before deploying to production.