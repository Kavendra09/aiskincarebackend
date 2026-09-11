import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Server } from 'http';
import app from '../src/app';
import { SkinScoreService } from '../src/modules/skinScore/skinScore.service';
import { AISkinAnalysisValidator } from '../src/modules/ai/skin-analysis/ai.validator';
import { AISkinAnalysisService } from '../src/modules/ai/skin-analysis/ai.service';
import { SkinAnalysis } from '../src/models/SkinAnalysis';
import { ApiError } from '../src/utils/apiError';

// Ensure test environment
process.env.NODE_ENV = 'test';
process.env.AI_CACHE_DUPLICATES = 'true';

let mongod: MongoMemoryServer;
let server: Server;
let baseUrl: string;

async function request(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
    headers?: Record<string, string>;
    isFormData?: boolean;
    formData?: FormData;
  } = {}
) {
  const { method = 'GET', body, token, headers = {}, isFormData = false, formData } = options;
  const reqHeaders: Record<string, string> = { ...headers };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  let reqBody: any = undefined;
  if (isFormData && formData) {
    reqBody = formData;
  } else if (body) {
    reqHeaders['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: reqBody,
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✅ ${message}`);
  }
}

async function runTests() {
  console.log('\n🚀 Starting GlowMaxx AI Skin Analysis Test Suite...\n');

  // 1. Setup in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('📦 In-memory MongoDB connected successfully');

  // 2. Start Express on ephemeral port
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 5000;
      baseUrl = `http://localhost:${port}`;
      console.log(`🌐 Test server listening at ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ====================================================
    // UNIT TEST SUITE 1: Deterministic SkinScoreService
    // ====================================================
    console.log('--- UNIT TEST 1: Deterministic Glow Score Engine ---');

    // 1a. Ideal skin observation
    const perfectScore = SkinScoreService.calculateScore({
      observations: {
        oiliness: 45,
        dryness: 10,
        redness: 5,
        visiblePores: 10,
        unevenTone: 8,
        texture: 10,
        darkCircles: 10,
      },
      concerns: [],
      skinType: { value: 'normal', confidence: 0.95 },
    });
    assert(perfectScore.glowScore >= 90 && perfectScore.glowScore <= 98, 'Ideal skin achieves 90-98 score');
    assert(perfectScore.potentialScore !== null, 'Potential score calculated');
    assert(perfectScore.potentialScore! >= perfectScore.glowScore, 'Potential score >= current glow score');

    // 1b. Mild concern scoring
    const mildScore = SkinScoreService.calculateScore({
      observations: {
        oiliness: 65,
        dryness: 30,
        redness: 35,
        visiblePores: 50,
        unevenTone: 40,
        texture: 40,
        darkCircles: 30,
      },
      concerns: [
        { type: 'acne', severity: 'mild', confidence: 0.8 },
        { type: 'redness', severity: 'mild', confidence: 0.85 },
      ],
      skinType: { value: 'combination', confidence: 0.82 },
    });
    assert(mildScore.glowScore < perfectScore.glowScore, 'Mild concerns score lower than ideal skin');
    assert(mildScore.glowScore >= 60 && mildScore.glowScore <= 85, 'Mild concerns score within expected range (60-85)');

    // 1c. Extreme concerns (verifies lower bounds clamping [20, 98])
    const extremeScore = SkinScoreService.calculateScore({
      observations: {
        oiliness: 100,
        dryness: 100,
        redness: 100,
        visiblePores: 100,
        unevenTone: 100,
        texture: 100,
        darkCircles: 100,
      },
      concerns: [
        { type: 'acne', severity: 'high', confidence: 0.99 },
        { type: 'pigmentation', severity: 'high', confidence: 0.99 },
        { type: 'redness', severity: 'high', confidence: 0.99 },
        { type: 'large_pores', severity: 'high', confidence: 0.99 },
      ],
      skinType: { value: 'oily', confidence: 0.99 },
    });
    assert(extremeScore.glowScore >= 20, 'Glow score never drops below lower bound (20)');
    assert(extremeScore.glowScore <= 50, 'Severe concerns yield expected low score');

    // 1d. Determinism verification (identical inputs must produce identical scores)
    const run1 = SkinScoreService.calculateScore({
      observations: { oiliness: 50, dryness: 20, redness: 20, visiblePores: 30, unevenTone: 25, texture: 25, darkCircles: 15 },
      concerns: [{ type: 'acne', severity: 'mild', confidence: 0.75 }],
    });
    const run2 = SkinScoreService.calculateScore({
      observations: { oiliness: 50, dryness: 20, redness: 20, visiblePores: 30, unevenTone: 25, texture: 25, darkCircles: 15 },
      concerns: [{ type: 'acne', severity: 'mild', confidence: 0.75 }],
    });
    assert(run1.glowScore === run2.glowScore, 'Scoring is 100% deterministic (run 1 === run 2)');
    assert(run1.potentialScore === run2.potentialScore, 'Potential score is 100% deterministic');

    // ====================================================
    // UNIT TEST SUITE 2: Server-Side AI Output Validator
    // ====================================================
    console.log('\n--- UNIT TEST 2: AI Response Schema & Business Validator ---');

    // 2a. Valid AI output
    const validRaw = {
      status: 'SUCCESS',
      skinType: { value: 'combination', confidence: 0.85 },
      concerns: [
        { type: 'acne', severity: 'mild', confidence: 0.8 },
        { type: 'pigmentation', severity: 'moderate', confidence: 0.75 },
      ],
      observations: {
        oiliness: 62,
        dryness: 28,
        redness: 20,
        visiblePores: 45,
        unevenTone: 51,
        texture: 38,
        darkCircles: 30,
      },
      summary: 'Visible combination skin with mild active breakouts on the T-zone.',
    };
    const validated = AISkinAnalysisValidator.validate(validRaw);
    assert(validated.status === 'SUCCESS', 'Validator accepts valid AI output');
    assert(validated.skinType?.value === 'combination', 'Skin type parsed accurately');
    assert(validated.concerns.length === 2, 'Concerns parsed accurately');
    assert(validated.observations?.oiliness === 62, 'Observation scores parsed accurately');

    // 2b. Valid REJECTED output
    const rejectedRaw = {
      status: 'REJECTED',
      rejectionReason: 'IMAGE_QUALITY_INSUFFICIENT',
      rejectionMessage: 'Please upload a clear, well-lit facial photo.',
    };
    const validatedRejection = AISkinAnalysisValidator.validate(rejectedRaw);
    assert(validatedRejection.status === 'REJECTED', 'Validator accepts REJECTED output');
    assert(validatedRejection.rejectionReason === 'IMAGE_QUALITY_INSUFFICIENT', 'Rejection reason preserved');

    // 2c. Invalid skin type enum
    let invalidTypeCaught = false;
    try {
      AISkinAnalysisValidator.validate({
        status: 'SUCCESS',
        skinType: { value: 'super-oily-invalid', confidence: 0.8 },
      });
    } catch (e: any) {
      invalidTypeCaught = true;
      assert(e.errorCode === 'AI_RESPONSE_INVALID', 'Invalid skin type throws AI_RESPONSE_INVALID');
    }
    assert(invalidTypeCaught, 'Validator rejects unsupported skin type');

    // 2d. Invalid confidence (> 1.0)
    let invalidConfCaught = false;
    try {
      AISkinAnalysisValidator.validate({
        status: 'SUCCESS',
        skinType: { value: 'oily', confidence: 1.5 },
      });
    } catch (e: any) {
      invalidConfCaught = true;
    }
    assert(invalidConfCaught, 'Validator rejects confidence > 1.0');

    // 2e. Invalid observation score (> 100)
    let invalidObsCaught = false;
    try {
      AISkinAnalysisValidator.validate({
        status: 'SUCCESS',
        observations: { oiliness: 150 },
      });
    } catch (e: any) {
      invalidObsCaught = true;
    }
    assert(invalidObsCaught, 'Validator rejects observation score > 100');

    // ====================================================
    // INTEGRATION TEST SUITE 3: HTTP API & Endpoints
    // ====================================================
    console.log('\n--- INTEGRATION TEST 3: User Setup & Authentication ---');

    // Register User A
    const userARes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        name: 'User A',
        email: 'usera@glowmaxx.com',
        password: 'Password123!',
        gender: 'female',
      },
    });
    assert(userARes.status === 201, 'User A registered successfully');
    const tokenA = userARes.data.data.accessToken;

    // Register User B
    const userBRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        name: 'User B',
        email: 'userb@glowmaxx.com',
        password: 'Password123!',
        gender: 'male',
      },
    });
    assert(userBRes.status === 201, 'User B registered successfully');
    const tokenB = userBRes.data.data.accessToken;

    // 3a. Unauthorized Access
    console.log('\n--- INTEGRATION TEST 4: Security & Validation ---');
    const unauthRes = await request('/api/v1/ai/skin-analysis', {
      method: 'POST',
    });
    assert(unauthRes.status === 401, 'POST /api/v1/ai/skin-analysis returns 401 without auth token');

    // 3b. Missing Image
    const noImageFormData = new FormData();
    const missingImgRes = await request('/api/v1/ai/skin-analysis', {
      method: 'POST',
      token: tokenA,
      isFormData: true,
      formData: noImageFormData,
    });
    assert(missingImgRes.status === 400, 'POST /api/v1/ai/skin-analysis returns 400 when photo is missing');
    assert(missingImgRes.data.code === 'IMAGE_INVALID', 'Returns error code IMAGE_INVALID');

    // 3c. Invalid File Type
    const invalidFileFormData = new FormData();
    const txtBlob = new Blob([Buffer.from('not an image')], { type: 'text/plain' });
    invalidFileFormData.append('front', txtBlob, 'notes.txt');
    const invalidTypeRes = await request('/api/v1/ai/skin-analysis', {
      method: 'POST',
      token: tokenA,
      isFormData: true,
      formData: invalidFileFormData,
    });
    assert(invalidTypeRes.status === 400, 'POST /api/v1/ai/skin-analysis returns 400 on non-image file');

    // ====================================================
    // INTEGRATION TEST SUITE 4: Successful Skin Analysis Flow
    // ====================================================
    console.log('\n--- INTEGRATION TEST 5: Successful AI Skin Analysis ---');

    // Mock AISkinAnalysisService.callGeminiSingleAttempt to avoid live API charges during tests
    const originalCall = (AISkinAnalysisService as any).callGeminiSingleAttempt;
    (AISkinAnalysisService as any).callGeminiSingleAttempt = async () => {
      return {
        status: 'SUCCESS',
        skinType: { value: 'combination', confidence: 0.84 },
        concerns: [
          { type: 'acne', severity: 'mild', confidence: 0.81 },
          { type: 'redness', severity: 'mild', confidence: 0.72 },
        ],
        observations: {
          oiliness: 58,
          dryness: 25,
          redness: 30,
          visiblePores: 40,
          unevenTone: 35,
          texture: 30,
          darkCircles: 25,
        },
        summary: 'Visible combination skin with slight redness around the cheeks.',
      };
    };

    // Prepare 1x1 fake JPEG binary buffer
    const mockJpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
      0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0xff, 0xd9,
    ]);

    const validFormData = new FormData();
    validFormData.append(
      'front',
      new Blob([mockJpegBuffer], { type: 'image/jpeg' }),
      'face_front.jpg'
    );

    const analysisRes = await request('/api/v1/ai/skin-analysis', {
      method: 'POST',
      token: tokenA,
      isFormData: true,
      formData: validFormData,
    });

    assert(analysisRes.status === 201, 'POST /api/v1/ai/skin-analysis returns 201 Created');
    assert(analysisRes.data.success === true, 'Response reports success: true');
    assert(Boolean(analysisRes.data.data._id), 'Returns analysis record ID');
    assert(analysisRes.data.data.status === 'completed', 'Analysis status is "completed"');
    assert(analysisRes.data.data.model === 'gemini-2.5-flash', 'Model is recorded');
    assert(analysisRes.data.data.analysisVersion === '1.0', 'Analysis version is 1.0');
    assert(analysisRes.data.data.promptVersion === '1.0', 'Prompt version is 1.0');
    assert(analysisRes.data.data.skinType.value === 'combination', 'Skin type recorded accurately');
    assert(typeof analysisRes.data.data.glowScore === 'number', 'Deterministic Glow Score computed');
    assert(analysisRes.data.data.glowScore >= 60 && analysisRes.data.data.glowScore <= 90, 'Glow score in expected range');
    assert(Boolean(analysisRes.data.data.images[0].url), 'Cloudinary URL returned');

    const analysisIdA = analysisRes.data.data._id;

    // ====================================================
    // INTEGRATION TEST SUITE 5: Cost Control / Cache Hit
    // ====================================================
    console.log('\n--- INTEGRATION TEST 6: Cost Control & Duplicate Image Caching ---');

    let geminiCalledOnDuplicate = false;
    (AISkinAnalysisService as any).callGeminiSingleAttempt = async () => {
      geminiCalledOnDuplicate = true;
      throw new Error('Gemini should NOT be called for duplicate image submission!');
    };

    const duplicateFormData = new FormData();
    duplicateFormData.append(
      'front',
      new Blob([mockJpegBuffer], { type: 'image/jpeg' }),
      'face_front_duplicate.jpg'
    );

    const duplicateRes = await request('/api/v1/ai/skin-analysis', {
      method: 'POST',
      token: tokenA,
      isFormData: true,
      formData: duplicateFormData,
    });

    assert(duplicateRes.status === 201 || duplicateRes.status === 200, 'Duplicate request handled successfully');
    assert(duplicateRes.data.data._id === analysisIdA, 'Duplicate image returns cached analysis ID');
    assert(!geminiCalledOnDuplicate, 'Gemini API was NOT called for duplicate image submission');

    // ====================================================
    // INTEGRATION TEST SUITE 6: Authorization & Ownership
    // ====================================================
    console.log('\n--- INTEGRATION TEST 7: Authorization & Analysis Ownership ---');

    // User A can access their own analysis
    const getOwnRes = await request(`/api/v1/ai/skin-analysis/${analysisIdA}`, {
      token: tokenA,
    });
    assert(getOwnRes.status === 200, 'User A can view their own skin analysis');
    assert(getOwnRes.data.data._id === analysisIdA, 'Retrieved analysis matches ID');

    // User B CANNOT access User A's analysis
    const crossAccessRes = await request(`/api/v1/ai/skin-analysis/${analysisIdA}`, {
      token: tokenB,
    });
    assert(crossAccessRes.status === 403, 'User B receives 403 Forbidden when attempting to view User A analysis');
    assert(crossAccessRes.data.code === 'UNAUTHORIZED_ANALYSIS_ACCESS', 'Error code is UNAUTHORIZED_ANALYSIS_ACCESS');

    // Non-existent ID returns 404
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await request(`/api/v1/ai/skin-analysis/${nonExistentId}`, {
      token: tokenA,
    });
    assert(notFoundRes.status === 404, 'Non-existent analysis ID returns 404 Not Found');
    assert(notFoundRes.data.code === 'ANALYSIS_NOT_FOUND', 'Error code is ANALYSIS_NOT_FOUND');

    // ====================================================
    // INTEGRATION TEST SUITE 7: Image Quality Rejection
    // ====================================================
    console.log('\n--- INTEGRATION TEST 8: Image Quality Insufficient / Rejection ---');

    // Mock Gemini returning REJECTED status
    (AISkinAnalysisService as any).callGeminiSingleAttempt = async () => {
      return {
        status: 'REJECTED',
        rejectionReason: 'IMAGE_QUALITY_INSUFFICIENT',
        rejectionMessage: 'Please upload a clear, well-lit facial photo.',
      };
    };

    const blurryBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
      0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x99, 0x99, 0x99, 0xff, 0xd9,
    ]);

    const blurryFormData = new FormData();
    blurryFormData.append(
      'front',
      new Blob([blurryBuffer], { type: 'image/jpeg' }),
      'blurry.jpg'
    );

    const rejectedRes = await request('/api/v1/ai/skin-analysis', {
      method: 'POST',
      token: tokenB,
      isFormData: true,
      formData: blurryFormData,
    });

    assert(rejectedRes.status === 422, 'Unusable photo returns 422 Unprocessable Entity');
    assert(rejectedRes.data.code === 'IMAGE_QUALITY_INSUFFICIENT', 'Returns error code IMAGE_QUALITY_INSUFFICIENT');
    assert(rejectedRes.data.data.status === 'rejected', 'DB record stored with status "rejected"');

    // ====================================================
    // INTEGRATION TEST SUITE 8: Analysis History & Pagination
    // ====================================================
    console.log('\n--- INTEGRATION TEST 9: Paginated History Retrieval ---');

    const historyRes = await request('/api/v1/ai/skin-analysis?page=1&limit=10', {
      token: tokenA,
    });
    assert(historyRes.status === 200, 'GET /api/v1/ai/skin-analysis returns 200 OK');
    assert(Array.isArray(historyRes.data.data), 'History data is an array');
    assert(historyRes.data.data.length >= 1, 'Contains user A analysis record');
    assert(Boolean(historyRes.data.pagination), 'Returns pagination metadata');
    assert(historyRes.data.pagination.page === 1, 'Pagination page is 1');

    // ====================================================
    // INTEGRATION TEST SUITE 9: Retry & Timeout Handling
    // ====================================================
    console.log('\n--- INTEGRATION TEST 10: Retry Behavior on Transient Error ---');

    let attemptCount = 0;
    (AISkinAnalysisService as any).callGeminiSingleAttempt = async () => {
      attemptCount++;
      if (attemptCount === 1) {
        // Simulate temporary 503 error on first try
        const err: any = new Error('Service Unavailable');
        err.status = 503;
        throw err;
      }
      return {
        status: 'SUCCESS',
        skinType: { value: 'oily', confidence: 0.9 },
        concerns: [{ type: 'acne', severity: 'mild', confidence: 0.8 }],
        observations: { oiliness: 75, dryness: 10, redness: 20, visiblePores: 60, unevenTone: 20, texture: 30, darkCircles: 10 },
        summary: 'Oily skin with high sebum production on forehead.',
      };
    };

    const retryBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
      0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x12, 0x34, 0x56, 0xff, 0xd9,
    ]);

    const retryFormData = new FormData();
    retryFormData.append(
      'front',
      new Blob([retryBuffer], { type: 'image/jpeg' }),
      'retry_photo.jpg'
    );

    const retryRes = await request('/api/v1/ai/skin-analysis', {
      method: 'POST',
      token: tokenB,
      isFormData: true,
      formData: retryFormData,
    });

    assert(retryRes.status === 201, 'Request succeeds after transient retry');
    assert(attemptCount === 2, 'Attempted exactly 2 times (1 retry occurred)');

    // Restore original method
    (AISkinAnalysisService as any).callGeminiSingleAttempt = originalCall;

    console.log('\n🎉 ALL AI SKIN ANALYSIS TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    // Teardown
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
