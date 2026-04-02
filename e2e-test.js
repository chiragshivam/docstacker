/**
 * DocStacker End-to-End Test Script
 * 
 * This script automates the complete signing workflow:
 * 1. Upload letterhead, cover, body, T&C PDFs
 * 2. Upload stamp image
 * 3. Configure 3 signers
 * 4. Stack documents
 * 5. Place signature fields randomly in lower half of pages
 * 6. Sign with typed signatures
 * 7. Show preview
 * 
 * Run with: node e2e-test.js
 */

const { chromium } = require('playwright');
const path = require('path');

// Test data paths
const TEST_FILES = {
  letterhead: path.join(__dirname, 'letterhead.pdf'),
  cover: path.join(__dirname, 'Cover.pdf'),
  body: path.join(__dirname, 'Body Content.pdf'),
  terms: path.join(__dirname, 'T&C.pdf'),
  stamp: path.join(__dirname, 'sampleStam.png'),
};

// Signer configuration
const SIGNERS = [
  { name: 'Chirag Chopra' },
  { name: 'Preeti V' },
  { name: 'Manu Jindal' },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Starting DocStacker E2E Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100, // Slow down for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to app
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // ============================================
    // STEP 1: Upload Documents
    // ============================================
    console.log('\n📄 Step 1: Uploading documents...');
    
    // Upload Letterhead
    console.log('  - Uploading letterhead.pdf...');
    const letterheadInput = await page.locator('input[type="file"]').first();
    await letterheadInput.setInputFiles(TEST_FILES.letterhead);
    await sleep(500);
    
    // Upload Cover Page
    console.log('  - Uploading Cover.pdf...');
    const coverInput = await page.locator('input[type="file"]').nth(1);
    await coverInput.setInputFiles(TEST_FILES.cover);
    await sleep(500);
    
    // Upload Body Content
    console.log('  - Uploading Body Content.pdf...');
    const bodyInput = await page.locator('input[type="file"]').nth(2);
    await bodyInput.setInputFiles(TEST_FILES.body);
    await sleep(500);
    
    // Upload T&C
    console.log('  - Uploading T&C.pdf...');
    const termsInput = await page.locator('input[type="file"]').nth(3);
    await termsInput.setInputFiles(TEST_FILES.terms);
    await sleep(500);
    
    // Upload Stamp
    console.log('  - Uploading sampleStam.png...');
    const stampInput = await page.locator('input[type="file"]').nth(4);
    await stampInput.setInputFiles(TEST_FILES.stamp);
    await sleep(1000);
    
    console.log('  ✅ All documents uploaded!');
    
    // ============================================
    // STEP 2: Configure Signers
    // ============================================
    console.log('\n👥 Step 2: Configuring signers...');
    
    // First signer - update existing
    console.log(`  - Setting Signer 1: ${SIGNERS[0].name}`);
    const signer1Input = await page.locator('input[placeholder="Enter signer\'s name"]').first();
    await signer1Input.fill(SIGNERS[0].name);
    await sleep(300);
    
    // Add Signer 2
    console.log(`  - Adding Signer 2: ${SIGNERS[1].name}`);
    await page.click('button:has-text("Add Signer")');
    await sleep(300);
    const signer2Input = await page.locator('input[placeholder="Enter signer\'s name"]').nth(1);
    await signer2Input.fill(SIGNERS[1].name);
    await sleep(300);
    
    // Add Signer 3
    console.log(`  - Adding Signer 3: ${SIGNERS[2].name}`);
    await page.click('button:has-text("Add Signer")');
    await sleep(300);
    const signer3Input = await page.locator('input[placeholder="Enter signer\'s name"]').nth(2);
    await signer3Input.fill(SIGNERS[2].name);
    await sleep(300);
    
    console.log('  ✅ All signers configured!');
    
    // ============================================
    // STEP 3: Stack Documents
    // ============================================
    console.log('\n📚 Step 3: Stacking documents...');
    await page.click('button:has-text("Stack Document")');
    
    // Wait for stacking to complete and navigate to field placement
    await page.waitForSelector('text=Place Signature Fields', { timeout: 30000 });
    console.log('  ✅ Documents stacked successfully!');
    await sleep(1000);
    
    // ============================================
    // STEP 4: Place Signature Fields
    // ============================================
    console.log('\n✍️ Step 4: Placing signature fields...');
    
    // Get total pages
    const pageInfo = await page.textContent('text=/Page \\d+ of \\d+/');
    const totalPagesMatch = pageInfo?.match(/of (\d+)/);
    const totalPages = totalPagesMatch ? parseInt(totalPagesMatch[1]) : 1;
    console.log(`  - Document has ${totalPages} pages`);
    
    // Place fields for each signer on different pages
    for (let signerIdx = 0; signerIdx < SIGNERS.length; signerIdx++) {
      const signer = SIGNERS[signerIdx];
      const targetPage = signerIdx % totalPages;
      
      console.log(`  - Placing field for ${signer.name} on page ${targetPage + 1}...`);
      
      // Select signer chip
      await page.click(`text="${signer.name}"`);
      await sleep(300);
      
      // Navigate to target page if needed
      if (targetPage > 0) {
        for (let i = 0; i < targetPage; i++) {
          await page.click('[data-testid="NavigateNextIcon"]').catch(() => {
            // Try alternative selector
            page.locator('button').filter({ has: page.locator('svg[data-testid="NavigateNextIcon"]') }).click();
          });
          await sleep(500);
        }
      }
      
      // Click "Add Signature" button
      await page.click(`button:has-text("Add Signature for ${signer.name}")`);
      await sleep(500);
      
      // The field is added at default position - drag it to lower half
      // Find the newly added field and drag it
      const fieldBox = await page.locator(`text="Sign Here"`).last();
      const imageContainer = await page.locator('img[alt^="Page"]').first();
      const imageBounds = await imageContainer.boundingBox();
      
      if (imageBounds) {
        // Calculate random position in lower half
        const randomX = imageBounds.x + (0.1 + Math.random() * 0.6) * imageBounds.width;
        const randomY = imageBounds.y + (0.55 + Math.random() * 0.35) * imageBounds.height; // Lower half
        
        // Drag field to random position
        const fieldBounds = await fieldBox.boundingBox();
        if (fieldBounds) {
          await page.mouse.move(fieldBounds.x + fieldBounds.width / 2, fieldBounds.y + fieldBounds.height / 2);
          await page.mouse.down();
          await page.mouse.move(randomX, randomY, { steps: 10 });
          await page.mouse.up();
        }
      }
      
      await sleep(500);
      
      // Go back to page 1 for next signer
      if (targetPage > 0) {
        for (let i = 0; i < targetPage; i++) {
          await page.click('[data-testid="NavigateBeforeIcon"]').catch(() => {
            page.locator('button').filter({ has: page.locator('svg[data-testid="NavigateBeforeIcon"]') }).click();
          });
          await sleep(300);
        }
      }
    }
    
    console.log('  ✅ All signature fields placed!');
    
    // ============================================
    // STEP 5: Continue to Sign
    // ============================================
    console.log('\n📝 Step 5: Proceeding to sign...');
    await page.click('button:has-text("Continue to Sign")');
    await page.waitForSelector('text=Sign the Document', { timeout: 10000 });
    await sleep(1000);
    
    // ============================================
    // STEP 6: Sign with Typed Signatures
    // ============================================
    console.log('\n🖊️ Step 6: Creating signatures...');
    
    for (let signerIdx = 0; signerIdx < SIGNERS.length; signerIdx++) {
      const signer = SIGNERS[signerIdx];
      console.log(`  - Creating typed signature for ${signer.name}...`);
      
      // Click "Type" tab
      await page.click('button[role="tab"]:has-text("Type")');
      await sleep(500);
      
      // The name should auto-populate, but let's make sure
      const nameInput = await page.locator('input[placeholder="John Doe"]').or(page.locator('label:has-text("Type your name") + div input'));
      if (await nameInput.count() > 0) {
        await nameInput.first().fill(signer.name);
      }
      await sleep(1000);
      
      // Move to next signer if not last
      if (signerIdx < SIGNERS.length - 1) {
        await page.click('button:has-text("Next Signer")');
        await sleep(500);
      }
    }
    
    console.log('  ✅ All signatures created!');
    
    // ============================================
    // STEP 7: Sign Document
    // ============================================
    console.log('\n✅ Step 7: Signing document...');
    await page.click('button:has-text("Sign Document")');
    
    // Wait for signing to complete
    await page.waitForSelector('text=Document Signed Successfully', { timeout: 30000 });
    console.log('  ✅ Document signed!');
    await sleep(1000);
    
    // ============================================
    // STEP 8: Preview
    // ============================================
    console.log('\n👀 Step 8: Showing preview...');
    await page.waitForSelector('text=Document Preview');
    console.log('  ✅ Preview displayed!');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 E2E TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\nThe browser will remain open for manual inspection.');
    console.log('Press Ctrl+C to close.\n');
    
    // Keep browser open for inspection
    await sleep(60000 * 5); // 5 minutes
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    
    // Take screenshot on failure
    await page.screenshot({ path: 'test-failure.png' });
    console.log('Screenshot saved to test-failure.png');
  } finally {
    await browser.close();
  }
}

// Run the test
runTest().catch(console.error);
