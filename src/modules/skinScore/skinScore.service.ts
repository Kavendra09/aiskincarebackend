import {
  IAIObservations,
  IAISkinConcernResult,
  IAISkinTypeResult,
  AISeverityLevel,
  AISkinConcernType,
} from '../../models/SkinAnalysis';

/**
 * Weights assigned to different visual skin concerns.
 * Higher weights represent higher visual impact on perceived skin glow/smoothness.
 */
const CONCERN_WEIGHTS: Record<AISkinConcernType, number> = {
  acne: 1.3,
  pimples: 1.2,
  pigmentation: 1.2,
  dark_spots: 1.1,
  redness: 1.0,
  large_pores: 0.9,
  blackheads: 0.8,
  whiteheads: 0.8,
  uneven_skin_tone: 0.9,
  dull_skin: 0.8,
  wrinkles: 0.8,
  fine_lines: 0.7,
  dark_circles: 0.7,
  dryness: 0.8,
  sun_tan: 0.6,
};

/**
 * Penalty factors based on the visual severity level of a concern.
 */
const SEVERITY_FACTORS: Record<AISeverityLevel, number> = {
  none: 0,
  mild: 2.0,
  moderate: 4.5,
  high: 8.0,
  uncertain: 1.0,
};

export interface IScoreCalculationInput {
  observations?: IAIObservations | null;
  concerns?: IAISkinConcernResult[] | null;
  skinType?: IAISkinTypeResult | null;
}

export interface IScoreCalculationResult {
  glowScore: number;
  potentialScore: number | null;
  breakdown: {
    baseScore: number;
    observationDeduction: number;
    concernDeduction: number;
    addressableImprovement: number;
  };
}

/**
 * SkinScoreService
 *
 * Deterministic business logic service for calculating the GlowMaxx Glow Score
 * and future Potential Score based on validated visual observations and concerns.
 *
 * NOTE: The AI model provides raw visual observations and confidence estimates.
 * The final user-facing Glow Score is computed exclusively by this backend engine.
 */
export class SkinScoreService {
  /**
   * Calculates the deterministic Glow Score and Potential Score.
   *
   * FORMULA OVERVIEW:
   * 1. Base Score = 100.
   * 2. Observation Deductions:
   *    - Redness: (redness / 100) * 8.0 max points
   *    - Dryness: (dryness / 100) * 6.0 max points
   *    - Visible Pores: (visiblePores / 100) * 6.0 max points
   *    - Texture: (texture / 100) * 6.0 max points
   *    - Uneven Tone: (unevenTone / 100) * 6.0 max points
   *    - Dark Circles: (darkCircles / 100) * 4.0 max points
   *    - Oiliness: Excess above 55 or deficit below 20 incurs up to 5.0 max points
   * 3. Concern Deductions:
   *    - Sum of (SeverityFactor * ConcernWeight * Confidence)
   *    - Transformed via diminishing returns curve to avoid extreme penalties
   * 4. Score is clamped between 20 (minimum lower floor) and 98 (top ceiling)
   * 5. Potential Score: Estimates realistic achievable score through consistent routine
   */
  static calculateScore(input: IScoreCalculationInput): IScoreCalculationResult {
    const baseScore = 100;
    const { observations, concerns } = input;

    let observationDeduction = 0;
    let addressableDeduction = 0;

    if (observations) {
      // Redness deduction (max 8.0)
      if (typeof observations.redness === 'number') {
        const rednessPenalty = (Math.max(0, Math.min(100, observations.redness)) / 100) * 8.0;
        observationDeduction += rednessPenalty;
        addressableDeduction += rednessPenalty * 0.7; // Redness is highly addressable with soothing routines
      }

      // Dryness deduction (max 6.0)
      if (typeof observations.dryness === 'number') {
        const drynessPenalty = (Math.max(0, Math.min(100, observations.dryness)) / 100) * 6.0;
        observationDeduction += drynessPenalty;
        addressableDeduction += drynessPenalty * 0.85; // Dehydration is very addressable with hydrators
      }

      // Visible Pores deduction (max 6.0)
      if (typeof observations.visiblePores === 'number') {
        const poresPenalty = (Math.max(0, Math.min(100, observations.visiblePores)) / 100) * 6.0;
        observationDeduction += poresPenalty;
        addressableDeduction += poresPenalty * 0.5; // Pores can appear minimized with BHA/cleansing
      }

      // Texture deduction (max 6.0)
      if (typeof observations.texture === 'number') {
        const texturePenalty = (Math.max(0, Math.min(100, observations.texture)) / 100) * 6.0;
        observationDeduction += texturePenalty;
        addressableDeduction += texturePenalty * 0.6; // Texture improves with exfoliation
      }

      // Uneven Tone deduction (max 6.0)
      if (typeof observations.unevenTone === 'number') {
        const tonePenalty = (Math.max(0, Math.min(100, observations.unevenTone)) / 100) * 6.0;
        observationDeduction += tonePenalty;
        addressableDeduction += tonePenalty * 0.65; // Tone improves with Vitamin C / Niacinamide
      }

      // Dark Circles deduction (max 4.0)
      if (typeof observations.darkCircles === 'number') {
        const darkCirclesPenalty =
          (Math.max(0, Math.min(100, observations.darkCircles)) / 100) * 4.0;
        observationDeduction += darkCirclesPenalty;
        addressableDeduction += darkCirclesPenalty * 0.4; // Partially lifestyle/hydration dependent
      }

      // Oiliness balance (max 5.0)
      if (typeof observations.oiliness === 'number') {
        const oiliness = Math.max(0, Math.min(100, observations.oiliness));
        let oilPenalty = 0;
        if (oiliness > 55) {
          // Excess oiliness above 55
          oilPenalty = ((oiliness - 55) / 45) * 5.0;
          addressableDeduction += oilPenalty * 0.8;
        } else if (oiliness < 20) {
          // Severe lack of moisture/natural oils
          oilPenalty = ((20 - oiliness) / 20) * 3.0;
          addressableDeduction += oilPenalty * 0.8;
        }
        observationDeduction += oilPenalty;
      }
    }

    // Concern deductions
    let rawConcernDeduction = 0;
    if (Array.isArray(concerns) && concerns.length > 0) {
      for (const item of concerns) {
        const severityFactor = SEVERITY_FACTORS[item.severity] ?? 0;
        const weight = CONCERN_WEIGHTS[item.type] ?? 1.0;
        const confidence = typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.8;

        const penalty = severityFactor * weight * confidence;
        rawConcernDeduction += penalty;

        // Addressable concerns (acne, dullness, mild pigmentation)
        if (['acne', 'pimples', 'dull_skin', 'dryness', 'redness'].includes(item.type)) {
          addressableDeduction += penalty * 0.6;
        } else {
          addressableDeduction += penalty * 0.35;
        }
      }
    }

    // Diminishing returns curve for concern deductions (max asymptotic ceiling of ~38 points)
    const effectiveConcernDeduction = 40 * (1 - Math.exp(-rawConcernDeduction / 25));

    // Combine deductions
    const totalDeductions = observationDeduction + effectiveConcernDeduction;

    // Calculate final Glow Score, strictly bounded [20, 98]
    const rawGlowScore = baseScore - totalDeductions;
    const clampedGlowScore = Math.max(20, Math.min(98, rawGlowScore));
    const glowScore = Math.round(clampedGlowScore);

    // Potential Score calculation:
    // Represents realistic score attainable through consistent skincare routine
    let potentialScore: number | null = null;
    if (observations || (concerns && concerns.length > 0)) {
      const estimatedImprovement = Math.min(22, Math.max(3, addressableDeduction * 0.65));
      const achievable = Math.min(98, Math.round(glowScore + estimatedImprovement));
      potentialScore = achievable > glowScore ? achievable : Math.min(98, glowScore + 3);
    }

    return {
      glowScore,
      potentialScore,
      breakdown: {
        baseScore,
        observationDeduction: Math.round(observationDeduction * 10) / 10,
        concernDeduction: Math.round(effectiveConcernDeduction * 10) / 10,
        addressableImprovement: Math.round(addressableDeduction * 10) / 10,
      },
    };
  }
}
