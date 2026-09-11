import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Server } from 'http';
import app from '../src/app';
import { seedProducts } from '../src/seeds/productSeed';
import { Notification } from '../src/models/Notification';

let mongod: MongoMemoryServer;
let server: Server;
let baseUrl: string;

// Helper to make typed HTTP requests
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

// Assert helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✅ ${message}`);
  }
}

async function runTests() {
  console.log('\n🚀 Starting Skincare Backend Test Suite...\n');

  // 1. Setup in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('📦 In-memory MongoDB connected successfully');

  // 2. Seed product catalog
  await seedProducts();

  // 3. Start Express on ephemeral port
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
    // ----------------------------------------------------
    // TEST 1: Health Check Endpoint
    // ----------------------------------------------------
    console.log('--- TEST 1: Health Check ---');
    const health = await request('/api/health');
    assert(health.status === 200, 'GET /api/health returns 200 OK');
    assert(health.data.success === true, 'Health check reports success: true');
    assert(health.data.data.status === 'healthy', 'Health check reports status: healthy');

    // ----------------------------------------------------
    // TEST 2: Authentication Flow (Register, Login, Tokens)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Authentication Flow ---');
    // 2a. Validation failure (missing password)
    const invalidReg = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Kaven', email: 'kaven@example.com' },
    });
    assert(invalidReg.status === 400, 'POST /api/v1/auth/register returns 400 on missing password');
    assert(invalidReg.data.success === false, 'Validation response has success: false');

    // 2b. Successful registration
    const regRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        name: 'Kaven Patel',
        email: 'kaven@example.com',
        password: 'Password123!',
        gender: 'male',
      },
    });
    assert(regRes.status === 201, 'POST /api/v1/auth/register returns 201 Created');
    assert(regRes.data.success === true, 'Register reports success: true');
    assert(Boolean(regRes.data.data.accessToken), 'Returns access token');
    assert(Boolean(regRes.data.data.refreshToken), 'Returns refresh token');
    assert(regRes.data.data.user.email === 'kaven@example.com', 'Returns user email');
    assert(regRes.data.data.user.password === undefined, 'Password hash is NOT exposed in response');

    const userAToken = regRes.data.data.accessToken;
    const userARefresh = regRes.data.data.refreshToken;
    const userAId = regRes.data.data.user._id;

    // 2c. Duplicate email registration rejected
    const dupRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        name: 'Another Name',
        email: 'kaven@example.com',
        password: 'Password123!',
      },
    });
    assert(dupRes.status === 409, 'Duplicate registration returns 409 Conflict');

    // 2d. Login with incorrect password
    const badLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'kaven@example.com', password: 'WrongPassword' },
    });
    assert(badLogin.status === 401, 'POST /api/v1/auth/login returns 401 for wrong password');

    // 2e. Login with correct credentials
    const loginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'kaven@example.com', password: 'Password123!' },
    });
    assert(loginRes.status === 200, 'POST /api/v1/auth/login returns 200 OK');
    assert(Boolean(loginRes.data.data.accessToken), 'Login returns new access token');

    // 2f. Refresh token
    const refreshRes = await request('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken: userARefresh },
    });
    assert(refreshRes.status === 200, 'POST /api/v1/auth/refresh returns 200 OK');
    assert(Boolean(refreshRes.data.data.accessToken), 'Refresh endpoint returns new access token');

    // 2g. Forgot password & Reset password
    const forgotRes = await request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email: 'kaven@example.com' },
    });
    assert(forgotRes.status === 200, 'POST /api/v1/auth/forgot-password returns 200 OK');
    const resetToken = forgotRes.data.data.resetToken;
    assert(Boolean(resetToken), 'Forgot password generates reset token');

    const resetRes = await request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: { token: resetToken, password: 'NewSecurePassword123!' },
    });
    assert(resetRes.status === 200, 'POST /api/v1/auth/reset-password returns 200 OK');

    // Re-login with new password to get active token
    const newLoginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'kaven@example.com', password: 'NewSecurePassword123!' },
    });
    assert(newLoginRes.status === 200, 'Login with new password succeeds');
    const activeToken = newLoginRes.data.data.accessToken;

    // ----------------------------------------------------
    // TEST 3: User Profile & Protected Routes
    // ----------------------------------------------------
    console.log('\n--- TEST 3: User Profile Management ---');
    // Unauthorized access check
    const unauthProfile = await request('/api/v1/users/profile');
    assert(unauthProfile.status === 401, 'GET /api/v1/users/profile returns 401 without token');

    // Authorized access
    const userProfile = await request('/api/v1/users/profile', { token: activeToken });
    assert(userProfile.status === 200, 'GET /api/v1/users/profile returns 200 with token');
    assert(userProfile.data.data.email === 'kaven@example.com', 'Profile matches logged-in user');

    // Update profile
    const updateProfile = await request('/api/v1/users/profile', {
      method: 'PUT',
      token: activeToken,
      body: { name: 'Kaven Updated', age: 24 },
    });
    assert(updateProfile.status === 200, 'PUT /api/v1/users/profile returns 200 OK');
    assert(updateProfile.data.data.name === 'Kaven Updated', 'Name is updated');
    assert(updateProfile.data.data.age === 24, 'Age is updated');

    // ----------------------------------------------------
    // TEST 4: Skin Profile APIs
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Skin Profile (Skin Types & Concerns) ---');
    // 4a. Create Skin Profile
    const createSkin = await request('/api/v1/skin-profile', {
      method: 'POST',
      token: activeToken,
      body: {
        skinType: 'oily',
        concerns: ['acne', 'large-pores', 'blackheads'],
        lifestyle: {
          waterIntakeLiters: 3,
          sleepHours: 8,
          sunscreenUsage: 'always',
          smokingStatus: 'non-smoker',
          stressLevel: 'low',
        },
      },
    });
    assert(createSkin.status === 201, 'POST /api/v1/skin-profile returns 201 Created');
    assert(createSkin.data.data.skinType === 'oily', 'Skin type set to oily');
    assert(createSkin.data.data.concerns.length === 3, 'Concerns recorded accurately');

    // 4b. Enforce single skin profile
    const dupSkin = await request('/api/v1/skin-profile', {
      method: 'POST',
      token: activeToken,
      body: { skinType: 'dry' },
    });
    assert(dupSkin.status === 409, 'Duplicate skin profile creation returns 409 Conflict');

    // 4c. Get Skin Profile
    const getSkin = await request('/api/v1/skin-profile', { token: activeToken });
    assert(getSkin.status === 200, 'GET /api/v1/skin-profile returns 200 OK');
    assert(getSkin.data.data.skinType === 'oily', 'Correct skin type returned');

    // 4d. Update Skin Profile
    const putSkin = await request('/api/v1/skin-profile', {
      method: 'PUT',
      token: activeToken,
      body: {
        skinType: 'combination',
        concerns: ['acne', 'pigmentation', 'dark-spots'],
      },
    });
    assert(putSkin.status === 200, 'PUT /api/v1/skin-profile returns 200 OK');
    assert(putSkin.data.data.skinType === 'combination', 'Skin type updated to combination');

    // ----------------------------------------------------
    // TEST 5: Skin Progress Photos & Pagination
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Skin Progress Photo Tracking ---');
    // Using multipart FormData with mock image buffers
    const formData = new FormData();
    const fakeFrontImage = new Blob([Buffer.from('fake-front-image-content')], {
      type: 'image/jpeg',
    });
    const fakeLeftImage = new Blob([Buffer.from('fake-left-image-content')], {
      type: 'image/jpeg',
    });

    formData.append('front', fakeFrontImage, 'front.jpg');
    formData.append('left', fakeLeftImage, 'left.jpg');
    formData.append('notes', 'Day 1 starting new niacinamide serum');

    const progressRes = await request('/api/v1/skin-progress', {
      method: 'POST',
      token: activeToken,
      isFormData: true,
      formData,
    });
    assert(progressRes.status === 201, 'POST /api/v1/skin-progress returns 201 Created');
    assert(Boolean(progressRes.data.data.images.front.url), 'Front image Cloudinary URL saved');
    assert(Boolean(progressRes.data.data.images.left.url), 'Left image Cloudinary URL saved');
    assert(progressRes.data.data.notes === 'Day 1 starting new niacinamide serum', 'Notes saved');

    const progressId = progressRes.data.data._id;

    // Get Progress History with Pagination
    const progressHistory = await request('/api/v1/skin-progress?page=1&limit=5', {
      token: activeToken,
    });
    assert(progressHistory.status === 200, 'GET /api/v1/skin-progress returns 200 OK');
    assert(progressHistory.data.data.length === 1, 'Returns 1 progress entry');
    assert(progressHistory.data.pagination.total === 1, 'Pagination total is 1');

    // Get Single Progress by ID
    const singleProgress = await request(`/api/v1/skin-progress/${progressId}`, {
      token: activeToken,
    });
    assert(singleProgress.status === 200, 'GET /api/v1/skin-progress/:id returns 200 OK');

    // ----------------------------------------------------
    // TEST 6: Skincare Routine, Steps & Completion Tracking
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Skincare Routine & Completion Tracking ---');
    // 6a. Create Morning Routine
    const morningRoutineRes = await request('/api/v1/routines', {
      method: 'POST',
      token: activeToken,
      body: {
        name: 'Morning Glow Routine',
        type: 'morning',
        description: 'Everyday AM brightening and protection routine',
        steps: [
          { title: 'Gentle Cleanser', category: 'cleanser', order: 1 },
          { title: 'Vitamin C Serum', category: 'serum', order: 2 },
          { title: 'Hydrating Moisturizer', category: 'moisturizer', order: 3 },
          { title: 'SPF 50+ Sunscreen', category: 'sunscreen', order: 4 },
        ],
      },
    });
    assert(morningRoutineRes.status === 201, 'POST /api/v1/routines returns 201 Created');
    assert(morningRoutineRes.data.data.steps.length === 4, 'Routine created with 4 steps');
    const routineId = morningRoutineRes.data.data._id;
    const step1Id = morningRoutineRes.data.data.steps[0]._id;
    const step2Id = morningRoutineRes.data.data.steps[1]._id;

    // 6b. Add step to routine
    const addStepRes = await request(`/api/v1/routines/${routineId}/steps`, {
      method: 'POST',
      token: activeToken,
      body: { title: 'Eye Cream', category: 'eye-cream' },
    });
    assert(addStepRes.status === 201, 'POST /api/v1/routines/:id/steps returns 201 Created');
    assert(addStepRes.data.data.steps.length === 5, 'Step added, total steps now 5');

    // 6c. Get routines
    const routinesList = await request('/api/v1/routines', { token: activeToken });
    assert(routinesList.status === 200, 'GET /api/v1/routines returns 200 OK');
    assert(routinesList.data.data.length === 1, 'Contains user routine');

    // 6d. Check Today Routines (initially 0% completed)
    const todayInitial = await request('/api/v1/routines/today', { token: activeToken });
    assert(todayInitial.status === 200, 'GET /api/v1/routines/today returns 200 OK');
    assert(todayInitial.data.data.routines[0].completionPercentage === 0, 'Today routine initially at 0%');

    // 6e. Complete step 1 and step 2
    const completeStep1 = await request(`/api/v1/routines/${routineId}/complete`, {
      method: 'POST',
      token: activeToken,
      body: { stepId: step1Id },
    });
    assert(completeStep1.status === 200, 'Complete step 1 returns 200 OK');
    assert(completeStep1.data.data.completed === true, 'Step 1 marked as completed');

    const completeStep2 = await request(`/api/v1/routines/${routineId}/complete`, {
      method: 'POST',
      token: activeToken,
      body: { stepId: step2Id },
    });
    assert(completeStep2.status === 200, 'Complete step 2 returns 200 OK');

    // 6f. Check Today Routines (now 40% completed: 2 out of 5 steps)
    const todayUpdated = await request('/api/v1/routines/today', { token: activeToken });
    assert(todayUpdated.data.data.routines[0].completedSteps === 2, '2 steps completed today');
    assert(todayUpdated.data.data.routines[0].completionPercentage === 40, 'Routine completion percentage is 40%');

    // 6g. Check Routine Stats and Streaks
    const statsRes = await request('/api/v1/routines/stats', { token: activeToken });
    assert(statsRes.status === 200, 'GET /api/v1/routines/stats returns 200 OK');
    assert(statsRes.data.data.today.completedSteps === 2, 'Stats reports 2 completed steps today');
    assert(statsRes.data.data.streakDays >= 1, 'Current streak is at least 1 day');
    assert(statsRes.data.data.weeklyProgress.length === 7, 'Weekly progress array contains 7 days');

    // ----------------------------------------------------
    // TEST 7: Product Catalog (Search, Category, Filters)
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Product Catalog Filtering & Searching ---');
    // 7a. Get All Products with Pagination
    const allProducts = await request('/api/v1/products?page=1&limit=5');
    assert(allProducts.status === 200, 'GET /api/v1/products returns 200 OK');
    assert(allProducts.data.data.length === 5, 'Limit 5 returns 5 products');
    assert(allProducts.data.pagination.total >= 10, 'Total seeded products is at least 10');

    // 7b. Filter by category
    const cleansers = await request('/api/v1/products?category=cleanser');
    assert(cleansers.status === 200, 'Filter category=cleanser returns 200 OK');
    assert(
      cleansers.data.data.every((p: any) => p.category === 'cleanser'),
      'All returned products are cleansers'
    );

    // 7c. Filter by skinType and concern
    const filtered = await request('/api/v1/products?skinType=oily&concern=acne');
    assert(filtered.status === 200, 'Filter skinType=oily&concern=acne returns 200 OK');
    assert(filtered.data.data.length > 0, 'Found products matching oily + acne');

    // 7d. Search products
    const searchRes = await request('/api/v1/products/search?q=CeraVe');
    assert(searchRes.status === 200, 'GET /api/v1/products/search?q=CeraVe returns 200 OK');
    assert(searchRes.data.data.some((p: any) => p.brand === 'CeraVe'), 'Found CeraVe products');

    // 7e. Category endpoint
    const categoryEndpoint = await request('/api/v1/products/category/sunscreen');
    assert(categoryEndpoint.status === 200, 'GET /api/v1/products/category/sunscreen returns 200 OK');
    assert(categoryEndpoint.data.data[0].category === 'sunscreen', 'Returns sunscreen product');

    // ----------------------------------------------------
    // TEST 8: Notifications
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Notifications ---');
    // Seed test notification for user
    await Notification.create({
      userId: userAId,
      title: 'Reminder: Evening Routine',
      body: "Don't forget to complete your night skincare routine!",
      type: 'routine',
    });

    const notifRes = await request('/api/v1/notifications', { token: activeToken });
    assert(notifRes.status === 200, 'GET /api/v1/notifications returns 200 OK');
    assert(notifRes.data.data.notifications.length === 1, 'Returns 1 notification');
    assert(notifRes.data.data.unreadCount === 1, 'Unread count is 1');

    const notifId = notifRes.data.data.notifications[0]._id;

    // Mark single notification as read
    const readRes = await request(`/api/v1/notifications/${notifId}/read`, {
      method: 'PATCH',
      token: activeToken,
    });
    assert(readRes.status === 200, 'PATCH /api/v1/notifications/:id/read returns 200 OK');
    assert(readRes.data.data.isRead === true, 'Notification marked as isRead: true');

    // Mark all as read
    const readAllRes = await request('/api/v1/notifications/read-all', {
      method: 'PATCH',
      token: activeToken,
    });
    assert(readAllRes.status === 200, 'PATCH /api/v1/notifications/read-all returns 200 OK');

    // ----------------------------------------------------
    // TEST 9: Consolidated Dashboard Endpoint
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Mobile Consolidated Dashboard ---');
    const dashboardRes = await request('/api/v1/dashboard', { token: activeToken });
    assert(dashboardRes.status === 200, 'GET /api/v1/dashboard returns 200 OK');
    assert(dashboardRes.data.data.user.email === 'kaven@example.com', 'Dashboard contains user info');
    assert(dashboardRes.data.data.skinProfile.skinType === 'combination', 'Dashboard contains skin profile');
    assert(dashboardRes.data.data.todayRoutine.length === 1, 'Dashboard contains today routine');
    assert(dashboardRes.data.data.routineCompletion.todayPercentage === 40, 'Dashboard contains completion stats');
    assert(Boolean(dashboardRes.data.data.latestProgress), 'Dashboard contains latest skin progress photo');
    assert(dashboardRes.data.data.unreadNotifications !== undefined, 'Dashboard contains notifications data');

    // ----------------------------------------------------
    // TEST 10: Multi-User Privacy Enforcement
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Data Isolation & Privacy Enforcement ---');
    // Register User B
    const userBReg = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        name: 'User B',
        email: 'userb@example.com',
        password: 'Password123!',
      },
    });
    const userBToken = userBReg.data.data.accessToken;

    // User B attempts to access User A's progress photo
    const accessProgressForbidden = await request(`/api/v1/skin-progress/${progressId}`, {
      token: userBToken,
    });
    assert(
      accessProgressForbidden.status === 403,
      "User B CANNOT access User A's skin progress record (returns 403 Forbidden)"
    );

    // User B attempts to access User A's routine
    const accessRoutineForbidden = await request(`/api/v1/routines/${routineId}`, {
      token: userBToken,
    });
    assert(
      accessRoutineForbidden.status === 403,
      "User B CANNOT access User A's private routine (returns 403 Forbidden)"
    );

    // User B attempts to delete User A's routine
    const deleteRoutineForbidden = await request(`/api/v1/routines/${routineId}`, {
      method: 'DELETE',
      token: userBToken,
    });
    assert(
      deleteRoutineForbidden.status === 403,
      "User B CANNOT delete User A's private routine (returns 403 Forbidden)"
    );

    // ----------------------------------------------------
    // TEST 11: Error Handling & 404
    // ----------------------------------------------------
    console.log('\n--- TEST 11: Error Handling & Unknown Routes ---');
    const notFoundRes = await request('/api/v1/non-existent-endpoint');
    assert(notFoundRes.status === 404, 'Unknown route returns 404 Not Found');
    assert(notFoundRes.data.success === false, 'Error response format has success: false');

    const invalidIdRes = await request('/api/v1/routines/invalid-mongo-id', {
      token: activeToken,
    });
    assert(invalidIdRes.status === 400, 'Invalid MongoDB ID in param returns 400 Bad Request');

    console.log('\n🎉 ALL 11 TEST SUITES PASSED SUCCESSFULLY! 100% VERIFIED! 🎉\n');
  } finally {
    // Cleanup
    if (server) server.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
