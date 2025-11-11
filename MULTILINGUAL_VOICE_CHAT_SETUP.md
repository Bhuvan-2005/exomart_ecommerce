# Hindi Voice Chat Setup Guide - Complete Step-by-Step Instructions

## 📋 Overview

This guide will help you set up Hindi language support for your Amazon Lex chatbot with voice input and output capabilities. Follow each step carefully.

---

## Part 1: Setting Up Hindi Language in Amazon Lex Console

### Step 1: Open Amazon Lex Console

1. Go to: https://console.aws.amazon.com/lex/
2. Make sure you're logged into your AWS account
3. You should see your bot listed (Bot ID: `EVGL0ZY90T`)

### Step 2: Add Hindi Language to Your Bot

1. **Click on your bot name** (or Bot ID: `EVGL0ZY90T`)
2. In the left sidebar, click on **"Languages"**
3. Click the **"Add language"** button (usually at the top right)
4. You'll see options:
   - **Select: "Copy from an existing language"**
   - Choose **"English (US)"** as the source language
   - Select **"Hindi (IN)"** as the target language
   - Check the box **"Copy training data"** (optional but recommended)
   - Click **"Add"**
5. Wait for the language to be added (this may take a few seconds)

### Step 3: Configure Intents for Hindi

Now you need to configure each intent with Hindi utterances. **IMPORTANT:** For ALL intents, you MUST set Fulfillment to "Return parameters to client" (NOT "Use a Lambda function"). This is critical for the chatbot to work correctly.

Follow these steps for EACH intent:

#### Intent 1: AddToCart

1. **Select Hindi language:**
   - At the top of the page, you'll see a language dropdown
   - Click it and select **"Hindi (IN)"**

2. **Go to Intents:**
   - Click **"Intents"** in the left sidebar
   - Find and click on **"AddToCart"** intent

3. **Add Sample Utterances:**
   - Scroll down to **"Sample utterances"** section
   - Click **"Add utterance"** or the **"+"** button
   - Add these utterances ONE BY ONE (click Add after each):
     - `कार्ट में जोड़ें`
     - `मैं कुछ जोड़ना चाहता हूं`
     - `कार्ट में डालें`
     - `जोड़ें`
     - `मेरी कार्ट में जोड़ें`
     - `मैं कुछ जोड़ना चाहूंगा`

4. **Configure Slots:**
   - Scroll to **"Slots"** section
   - If `ProductName` slot doesn't exist, click **"Add slot"**
   - Slot name: `ProductName`
   - Slot type: Select **"AMAZON.FreeFormInput"**
   - Click **"Save"** on the slot
   - Make sure **"Required"** is checked (toggle it ON)
   - Click on the slot to edit it
   - In **"Prompt"** field, enter: `आप कौन सा उत्पाद जोड़ना चाहेंगे?`
   - Click **"Save"**

5. **Set Fulfillment (IMPORTANT!):**
   - Scroll to **"Fulfillment"** section at the bottom
   - You'll see two options:
     - ❌ "Use a Lambda function" - DO NOT SELECT THIS
     - ✅ "Return parameters to client" - SELECT THIS ONE
   - Click the radio button or toggle for **"Return parameters to client"**
   - **VERY IMPORTANT:** Make sure "Use a Lambda function" is NOT selected
   - Click **"Save intent"** or **"Save"** button at the top of the page
   - Wait for confirmation that intent is saved

#### Intent 2: SearchProducts

1. **Make sure Hindi is selected** (check the language dropdown at top)
2. Click on **"SearchProducts"** intent
3. **Add Sample Utterances:**
   - `उत्पाद खोजें`
   - `उत्पाद ढूंढें`
   - `मुझे उत्पाद दिखाएं`
   - `मैं कुछ ढूंढ रहा हूं`
   - `क्या आपके पास उत्पाद हैं?`
   - `उत्पाद दिखाएं`

4. **Configure Slots:**
   - Slot name: `ProductName`
   - Slot type: **"AMAZON.FreeFormInput"**
   - Required: **Yes** (toggle ON)
   - Prompt: `आप कौन सा उत्पाद खोज रहे हैं?`
   - Click **"Save"**

5. **Set Fulfillment (IMPORTANT!):**
   - Scroll to **"Fulfillment"** section
   - Select **"Return parameters to client"** (NOT "Use a Lambda function")
   - Click **"Save"** at the top of the page

#### Intent 3: ViewCart

1. **Make sure Hindi is selected**
2. Click on **"ViewCart"** intent
3. **Add Sample Utterances:**
   - `मेरी कार्ट दिखाएं`
   - `मेरी कार्ट देखें`
   - `मेरी कार्ट खोलें`
   - `मेरी कार्ट में क्या है?`
   - `कार्ट दिखाएं`
   - `कार्ट देखें`

4. **No Slots needed** (this intent doesn't require any slots)
5. **Set Fulfillment (IMPORTANT!):**
   - Scroll to **"Fulfillment"** section
   - Select **"Return parameters to client"** (NOT "Use a Lambda function")
   - Click **"Save"** at the top of the page

#### Intent 4: ViewWishlist

1. **Make sure Hindi is selected**
2. Click on **"ViewWishlist"** intent
3. **Add Sample Utterances:**
   - `मेरी विशलिस्ट दिखाएं`
   - `मेरी विशलिस्ट देखें`
   - `मेरी विशलिस्ट खोलें`
   - `मेरी विशलिस्ट में क्या है?`
   - `विशलिस्ट दिखाएं`
   - `मेरे पसंदीदा देखें`

4. **No Slots needed**
5. **Set Fulfillment (IMPORTANT!):**
   - Scroll to **"Fulfillment"** section
   - Select **"Return parameters to client"** (NOT "Use a Lambda function")
   - Click **"Save"** at the top of the page

#### Intent 5: ViewDeals

1. **Make sure Hindi is selected**
2. Click on **"ViewDeals"** intent
3. **Add Sample Utterances:**
   - `मुझे डील दिखाएं`
   - `आपके पास कौन सी डील हैं?`
   - `छूट दिखाएं`
   - `क्या सेल पर है?`
   - `मुझे ऑफर दिखाएं`
   - `कोई डील उपलब्ध है?`

4. **No Slots needed**
5. **Set Fulfillment (IMPORTANT!):**
   - Scroll to **"Fulfillment"** section
   - Select **"Return parameters to client"** (NOT "Use a Lambda function")
   - Click **"Save"** at the top of the page

#### Intent 6: RemoveFromCart

1. **Make sure Hindi is selected**
2. Click on **"RemoveFromCart"** intent
3. **Add Sample Utterances:**
   - `कार्ट से हटाएं`
   - `कार्ट से डिलीट करें`
   - `कार्ट से निकालें`
   - `हटाएं`

4. **Configure Slots:**
   - Slot name: `ProductName`
   - Slot type: **"AMAZON.FreeFormInput"**
   - Required: **Yes**
   - Prompt: `आप कौन सा उत्पाद हटाना चाहेंगे?`
   - Click **"Save"**

5. **Set Fulfillment (IMPORTANT!):**
   - Scroll to **"Fulfillment"** section
   - Select **"Return parameters to client"** (NOT "Use a Lambda function")
   - Click **"Save"** at the top of the page

#### Intent 7: AddToWishlist

1. **Make sure Hindi is selected**
2. Click on **"AddToWishlist"** intent
3. **Add Sample Utterances:**
   - `विशलिस्ट में जोड़ें`
   - `विशलिस्ट में सेव करें`
   - `मेरी विशलिस्ट में जोड़ें`
   - `सेव करें`

4. **Configure Slots:**
   - Slot name: `ProductName`
   - Slot type: **"AMAZON.FreeFormInput"**
   - Required: **Yes**
   - Prompt: `आप कौन सा उत्पाद अपनी विशलिस्ट में जोड़ना चाहेंगे?`
   - Click **"Save"**

5. **Set Fulfillment (IMPORTANT!):**
   - Scroll to **"Fulfillment"** section
   - Select **"Return parameters to client"** (NOT "Use a Lambda function")
   - Click **"Save"** at the top of the page

#### Intent 8: ThankYou

1. **Make sure Hindi is selected**
2. Click on **"ThankYou"** intent (or create it if it doesn't exist)
3. **Add Sample Utterances:**
   - `धन्यवाद`
   - `शुक्रिया`
   - `थैंक यू`
   - `बहुत धन्यवाद`
   - `आभार`
   - `धन्यवाद बहुत बहुत`

4. **No Slots needed** (this intent doesn't require any slots)
5. **Set Fulfillment (IMPORTANT!):**
   - Scroll to **"Fulfillment"** section
   - Select **"Return parameters to client"** (NOT "Use a Lambda function")
   - Click **"Save"** at the top of the page

#### Intent 9: Yes

1. **Make sure Hindi is selected**
2. Click on **"Yes"** intent (or create it if it doesn't exist)
3. **Add Sample Utterances:**
   - `हाँ`
   - `जी हाँ`
   - `हां`
   - `बिल्कुल`
   - `ठीक है`
   - `सही है`

4. **No Slots needed**
5. **Set Fulfillment (IMPORTANT!):**
   - Scroll to **"Fulfillment"** section
   - Select **"Return parameters to client"** (NOT "Use a Lambda function")
   - Click **"Save"** at the top of the page

#### Intent 10: No

1. **Make sure Hindi is selected**
2. Click on **"No"** intent (or create it if it doesn't exist)
3. **Add Sample Utterances:**
   - `नहीं`
   - `जी नहीं`
   - `नही`
   - `बिल्कुल नहीं`
   - `नहीं चाहिए`
   - `नहीं धन्यवाद`

4. **No Slots needed**
5. **Set Fulfillment (IMPORTANT!):**
   - Scroll to **"Fulfillment"** section
   - Select **"Return parameters to client"** (NOT "Use a Lambda function")
   - Click **"Save"** at the top of the page

### Step 4: Verify All Intents Have Correct Fulfillment

**BEFORE BUILDING**, double-check that ALL intents have:
- ✅ Fulfillment set to **"Return parameters to client"**
- ❌ NOT set to "Use a Lambda function"

To verify:
1. Go through each intent (AddToCart, SearchProducts, ViewCart, ViewWishlist, ViewDeals, RemoveFromCart, AddToWishlist, ThankYou, Yes, No)
2. Check the Fulfillment section
3. Make sure "Return parameters to client" is selected for ALL of them

### Step 5: Build the Bot for Hindi

1. **Make sure Hindi is selected** in the language dropdown
2. Click the **"Build"** button at the top right of the page
3. Wait for the build to complete (this may take 1-2 minutes)
4. You'll see a success message when build is complete
5. If build fails, check that all intents have correct Fulfillment settings

### Step 6: Add Hindi to Your Bot Alias

1. Click **"Aliases"** in the left sidebar
2. Click on your alias name: **"TSTALIASID"** (or whatever your alias is called)
3. You'll see a page with alias details
4. Look for **"Locales"** or **"Languages"** section
5. Click **"Add locale"** or **"Add language"** button
6. Select **"Hindi (IN)"** from the dropdown
7. Select the **bot version** (usually the latest version, like "DRAFT" or version number)
8. Click **"Save"** or **"Add"**

### Step 7: Test Hindi Language

1. Click **"Test"** in the left sidebar (or use the test button at top)
2. **Important:** Make sure the language dropdown in the test window shows **"Hindi (IN)"**
3. Try these test phrases:
   - `मेरी कार्ट दिखाएं` (should show cart)
   - `कार्ट में जोड़ें` (should ask which product)
   - `उत्पाद खोजें` (should ask what product to search)
   - `धन्यवाद` (should respond with welcome message)
   - `हाँ` (should ask how to help)
   - `नहीं` (should say goodbye)
4. Verify that the bot responds correctly
5. If you get errors about Lambda function, go back and check Fulfillment settings for all intents

---

## Part 2: Deploying Backend Changes

### Step 1: Navigate to Backend Directory

1. Open your terminal/command prompt
2. Navigate to your project directory:
   ```bash
   cd /home/bhuvan/Documents/exomart_ecommerce-Br-1/backend
   ```

### Step 2: Verify Changes

The following files have been updated:
- `backend/src/handlers/lex.js` - Default locale set to `hi_IN`
- `backend/serverless.yml` - `LEX_LOCALE_ID` set to `hi_IN`

### Step 3: Deploy Backend

1. Make sure you have AWS credentials configured
2. Run the deployment command:
   ```bash
   serverless deploy
   ```
3. Wait for deployment to complete (this may take 2-5 minutes)
4. You'll see output showing:
   - Functions deployed
   - API Gateway endpoints
   - Any errors (if there are any)

### Step 4: Verify Deployment

1. Check the output for your API endpoint URL
2. It should look like: `https://xxxxx.execute-api.us-east-1.amazonaws.com/prod`
3. Note this URL - you may need it for frontend configuration

---

## Part 3: Deploying Frontend to AWS Amplify

### Step 1: Prepare Frontend Files

1. Navigate to frontend directory:
   ```bash
   cd /home/bhuvan/Documents/exomart_ecommerce-Br-1/frontend
   ```

2. Verify these files are updated:
   - `frontend/index.html` - Language selector removed
   - `frontend/app.js` - Default locale set to `hi_IN`

### Step 2: Commit Changes to Git (if using Git)

If your project is connected to Git:

1. Check status:
   ```bash
   git status
   ```

2. Add changes:
   ```bash
   git add .
   ```

3. Commit:
   ```bash
   git commit -m "Add Hindi language support for Lex chatbot"
   ```

4. Push to repository:
   ```bash
   git push
   ```

### Step 3: Deploy to AWS Amplify

#### Option A: If Using Amplify Console (Web Interface)

1. Go to: https://console.aws.amazon.com/amplify/
2. Select your app
3. Click **"Redeploy this version"** or wait for automatic deployment (if connected to Git)
4. If manual deployment:
   - Click **"Deploy"** or **"Redeploy"**
   - Wait for deployment to complete

#### Option B: If Using Amplify CLI

1. Make sure Amplify CLI is installed:
   ```bash
   npm install -g @aws-amplify/cli
   ```

2. Navigate to your project root:
   ```bash
   cd /home/bhuvan/Documents/exomart_ecommerce-Br-1
   ```

3. If you have an Amplify app:
   ```bash
   amplify publish
   ```

4. If you need to initialize:
   ```bash
   amplify init
   amplify add hosting
   amplify publish
   ```

### Step 4: Verify Frontend Deployment

1. After deployment completes, you'll get a URL
2. Open the URL in your browser
3. Test the chatbot:
   - Click the chat icon (bottom right)
   - Try typing in Hindi: `मेरी कार्ट दिखाएं`
   - Try voice input (microphone button)
   - Try voice output (speaker button)

---

## Part 4: Testing Everything

### Test Checklist

1. **Text Chat in Hindi:**
   - [ ] Open chat widget
   - [ ] Type: `मेरी कार्ट दिखाएं` - Should show cart
   - [ ] Type: `कार्ट में जोड़ें` - Should ask for product name
   - [ ] Type: `उत्पाद खोजें` - Should ask what to search

2. **Voice Input:**
   - [ ] Click microphone button
   - [ ] Allow microphone permission if prompted
   - [ ] Speak in Hindi: "मेरी कार्ट दिखाएं"
   - [ ] Verify it converts to text correctly

3. **Voice Output:**
   - [ ] Make sure voice output is enabled (speaker icon should be active)
   - [ ] Send a message to the bot
   - [ ] Verify bot response is spoken in Hindi

4. **Backend Integration:**
   - [ ] Check browser console (F12) for any errors
   - [ ] Verify API calls are successful
   - [ ] Check that locale `hi_IN` is being sent in requests

---

## Troubleshooting

### Problem: Bot doesn't respond in Hindi

**Solution:**
1. Check that Hindi language is selected in Lex console
2. Verify all intents have Hindi utterances
3. Make sure Hindi is added to your bot alias
4. Check that bot is built for Hindi

### Problem: Voice input doesn't work

**Solution:**
1. Make sure you're using Chrome or Edge browser
2. Check that microphone permission is granted
3. Verify site is served over HTTPS (required for microphone)
4. Check browser console for errors

### Problem: Voice output doesn't work

**Solution:**
1. Check that voice output toggle is enabled (speaker icon)
2. Verify backend Polly endpoint is working
3. Check browser console for API errors
4. Make sure backend is deployed correctly

### Problem: Deployment fails

**Solution:**
1. Check AWS credentials are configured
2. Verify you have proper IAM permissions
3. Check serverless.yml for syntax errors
4. Review deployment logs for specific errors

---

## Summary

After completing all steps:

✅ Hindi language added to Lex bot  
✅ All intents configured with Hindi utterances  
✅ Bot built and added to alias  
✅ Backend deployed with Hindi locale  
✅ Frontend deployed to Amplify  
✅ Voice input/output working in Hindi  

Your chatbot is now ready to use in Hindi with voice capabilities!

---

## Quick Reference

- **Bot ID:** `EVGL0ZY90T`
- **Bot Alias:** `TSTALIASID`
- **Locale:** `hi_IN` (Hindi - India)
- **Voice ID:** `Aditi` (for Polly text-to-speech)
- **Speech Recognition:** `hi-IN`

---

**Need Help?** Check AWS Lex documentation or AWS Amplify documentation for more details.
