What “system prompt” is
A system prompt (called system instruction in Gemini docs) is an instruction you send alongside a request to steer the model’s behavior globally—before it processes the user content.
​
It’s typically used to define role/persona, rules (“do X / don’t do Y”), tone, formatting requirements, and other high-level constraints that should apply to the whole response.
​

What it’s useful for (TTS + text)
For text models, system instructions help keep outputs consistent (voice, structure, allowed/disallowed behaviors) across many calls, especially when user prompts vary.
​
For Gemini 2.5 TTS / speech generation, the same idea can be used to keep performance consistent—e.g., “radio DJ energy,” pacing, articulation, and “read verbatim” rules—while still sending the actual script as the user content.
​
When you need even stronger delivery control, Gemini’s speech prompting guidance supports “director-style” prompting (e.g., notes + transcript structure) to steer how the audio is spoken.
​

How to use it (where it goes)
In the Gemini API, you pass system instructions separately from contents (the user-provided parts) so the model can follow global rules without mixing them into the transcript.
​
In the JS/TS GenAI SDK pattern you’re using, this is typically done by adding a systemInstruction field under the request config.
​
If you’re using Google Cloud Text-to-Speech’s Gemini-TTS (a different surface), there’s also a concept of a separate prompt vs text, which is similar in spirit: keep “how to say it” separate from “what to say.”
​

Examples (copy/paste)
1) DJ voiceover (consistent vibe, still read the script)
ts
const response = await ai.models.generateContent({
  model: TTS_MODEL,
  contents: [{ role: "user", parts: [{ text: finalTextInput }] }],
  config: {
    systemInstruction: `
You are a high-energy radio DJ voiceover.

Performance:
- Bright “vocal smile”, confident, hype but not shouty.
- Punchy consonants, tight rhythm, short beats between phrases.

Rules:
- Read the transcript verbatim. Do not add/remove words.
- Treat bracket tags like [laughing] as performance directions; never speak them aloud.
`,
    responseModalities: ["AUDIO"],
    speechConfig,
  },
});
This matches the intended use of system instructions (global behavior steering) and speech prompting (delivery control) while keeping the transcript in contents.
​
​

2) “Verbatim only” (when you want maximum fidelity)
ts
systemInstruction: `
Read exactly what the user provides.
Do not paraphrase, expand, summarize, or add filler words.
If the transcript contains bracketed tags, treat them as directions (not spoken text).
`
This uses system instructions as “guardrails” to reduce accidental improvisation.
​

3) Director slate inside contents (when you need stronger delivery steering)
ts
const slatePlusTranscript = `
DIRECTOR'S NOTES:
Upbeat club DJ. Medium-fast pace. Smile in the voice.
Keep pauses short unless indicated.

TRANSCRIPT:
${finalTextInput}
`;

contents: [{ role: "user", parts: [{ text: slatePlusTranscript }] }]
Gemini’s speech generation guidance explicitly supports structured prompting (notes + transcript) as a way to steer delivery.
​

Practical guidance (what to choose)
If your current “text model persona → TTS reads it” pipeline already sounds right, a system instruction is optional.
If you want consistent “station identity” across hundreds of clips, use a short system instruction that defines the DJ performance and includes a strict “read verbatim” rule.
If the model still drifts on performance, prepend a brief director slate (in contents) and keep the transcript clearly delimited (e.g., TRANSCRIPT:), as shown above.
​

If you share 2–3 example lines of your DJ script (including your tags like [laughing]), a system instruction can be tuned to your exact vibe (hype level, sarcasm, ad-read style) while still preserving verbatim reading.