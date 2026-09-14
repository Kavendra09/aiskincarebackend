import { IUserProfileContext } from './ai.types';

export const PROMPT_VERSION = '2.0';

/**
 * Finalized prompt for GlowMaxx Skin Analysis Engine using Groq (Qwen 3.8 27B / vision).
 */
export function buildSkinAnalysisPrompt(context?: IUserProfileContext): string {
  let contextSnippet = '';
  if (context) {
    const details: string[] = [];
    if (context.age) details.push(`Age: ${context.age}`);
    if (context.gender) details.push(`Gender: ${context.gender}`);
    if (context.userDeclaredSkinType) details.push(`User self-identified skin type: ${context.userDeclaredSkinType}`);
    if (context.userDeclaredConcerns?.length) {
      details.push(`User self-identified concerns: ${context.userDeclaredConcerns.join(', ')}`);
    }
    if (context.lifestyle) {
      if (context.lifestyle.sleepHours) details.push(`Reported sleep: ${context.lifestyle.sleepHours} hrs`);
      if (context.lifestyle.waterIntakeLiters) details.push(`Reported water: ${context.lifestyle.waterIntakeLiters} L`);
      if (context.lifestyle.sunscreenUsage) details.push(`Sunscreen frequency: ${context.lifestyle.sunscreenUsage}`);
    }
    if (details.length > 0) {
      contextSnippet = `\nUser Context:\n${details.map((d) => `- ${d}`).join('\n')}\n`;
    }
  }

  return `You are GlowMaxx Skin Analysis Engine. Analyze the facial image ONLY for visible cosmetic skin traits. Not medical diagnosis.

Rules: report only clearly visible traits; use "uncertain" if unclear; ignore shadows/beard shadow/makeup/filters as skin issues; no Glow Score; reject if image quality poor; output ONLY compact JSON, no markdown, no explanation, no extra whitespace.

skinType: oily|dry|combination|normal|sensitive|uncertain
concerns: acne|pimples|blackheads|whiteheads|dark_spots|pigmentation|redness|dryness|large_pores|dull_skin|uneven_skin_tone|uneven_texture|fine_lines|wrinkles|dark_circles|sun_tan
severity: none|mild|moderate|high|uncertain
confidence: 0.0-1.0

For each detected concern (max 2), suggest ONE product type + ONE key active ingredient. Use generic product categories only (e.g. "cleanser", "spot treatment", "moisturizer", "serum", "sunscreen") — never brand names.

analysisStatus: "rejected" if unusable else "completed".
${contextSnippet}
Output this exact compact JSON schema, one line, real values only, max 2 concerns, max 2 recommendations:
{"analysisStatus":"","imageQuality":{"isUsable":true,"reason":null},"skinType":{"value":"","confidence":0},"concerns":[{"type":"","severity":"","confidence":0}],"observations":{"oiliness":"","dryness":"","redness":"","visiblePores":"","texture":"","unevenTone":"","darkCircles":""},"recommendations":[{"concern":"","productType":"","keyIngredient":"","reason":""}],"summary":""}

JSON only. Nothing else.`.trim();
}
