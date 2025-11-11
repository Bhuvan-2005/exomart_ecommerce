# AWS SES and SNS Setup Guide for ExoMart

This guide provides step-by-step instructions for setting up Amazon SES (Simple Email Service) for email OTP verification and Amazon SNS (Simple Notification Service) for payment notifications.

---

## Table of Contents

1. [Amazon SES Setup](#1-amazon-ses-setup)
2. [Amazon SNS Setup](#2-amazon-sns-setup)
3. [Update Backend Configuration](#3-update-backend-configuration)
4. [Deploy Backend](#4-deploy-backend)
5. [Testing](#5-testing)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Amazon SES Setup

### Step 1.1: Access Amazon SES Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Search for "SES" or navigate to **Simple Email Service**
3. Make sure you're in the **us-east-1** region (same as your backend)

### Step 1.2: SES Onboarding Wizard

When you first access SES, you'll see a "Get started" button. Click it to begin the setup wizard.

#### Step 1.2.1: Add Your Email Address

1. You'll see a form asking for your email address
2. **Enter your personal email address** (e.g., `yourname@gmail.com`) - you'll need access to this inbox
   - **Note:** You can use `noreply@exomart.com` later if you verify your domain, but for now use a personal email you can access
3. Click **Next**

#### Step 1.2.2: Add Your Sending Domain (Required)

**Important:** This step cannot be skipped, but you can use a placeholder domain.

1. You'll be asked to add a sending domain
2. **Option A - If you own a domain:**
   - Enter your domain (e.g., `exomart.com`)
   - You'll need to add DNS records later to verify it
3. **Option B - If you don't own a domain (Recommended for testing):**
   - Enter a placeholder domain (e.g., `test-exomart.com`)
   - You can verify your actual domain later if needed
   - Leave **MAIL FROM domain** empty or use default
4. Click **Next**

#### Step 1.2.3: Deliverability Enhancements (Optional)

1. **Virtual Deliverability Manager:** Leave **Disabled** (optional, can enable later)
2. **Engagement tracking:** Leave **Disabled** (optional, can enable later)
3. **Optimized shared delivery:** Leave **Disabled** (optional, can enable later)
4. Click **Next**

#### Step 1.2.4: Create Dedicated IP Pool (Optional)

1. Select **No** or leave unchecked
2. **Reason:** Dedicated IPs cost extra and aren't needed for basic email sending
3. Click **Next**

#### Step 1.2.5: Add Tenant Management (Optional)

1. Click **Cancel** or leave empty
2. **Reason:** Not needed for a single e-commerce site
3. Click **Next**

#### Step 1.2.6: Review and Get Started

1. Review your settings:
   - Email address: Your personal email ✅
   - Sending domain: Your domain or placeholder ✅
   - All optional features: Disabled ✅
2. Click **Get started**
3. You'll be taken to the SES console dashboard

#### Step 1.2.7: Verify Your Email Address

1. **Check your email inbox** (the one you entered in Step 1.2.1)
2. Look for a verification email from AWS SES
3. **Click the verification link** in the email
4. Your email is now verified ✅

**Important:** Use this verified email as your `FROM_EMAIL` in `serverless.yml`

**Note:** In sandbox mode, you can only send emails to verified email addresses. For production, you'll need to request production access (see Step 1.3).

### Step 1.3: Request Production Access (Optional but Recommended)

To send emails to any email address (not just verified ones):

1. In SES console, go to **Account dashboard**
2. Click **Request production access**
3. Fill out the form:
   - **Mail Type:** Transactional
   - **Website URL:** Your website URL
   - **Use case description:** "Sending OTP verification emails and payment notifications for e-commerce platform"
   - **Expected sending volume:** Enter your estimate
4. Submit the request
5. AWS typically approves within 24 hours

### Step 1.4: Verify Domain (Alternative - For Production)

If you entered your actual domain in Step 1.2.2 and want to verify it:

1. In SES console, go to **Verified identities** in the left sidebar
2. Find your domain in the list
3. Click on it to see verification details
4. You'll see DNS records that need to be added:
   - **CNAME records** for domain verification
   - **TXT records** for SPF/DKIM (optional but recommended)
5. Add these records to your domain's DNS settings (via your domain registrar)
6. Wait for DNS propagation (usually 5-30 minutes)
7. Click **Verify** in SES console
8. Once verified, you can send from any email address on that domain (e.g., `noreply@exomart.com`)

**Note:** If you used a placeholder domain, you can skip this step and use your verified email address directly.

---

## 2. Amazon SNS Setup

### Step 2.1: Create SNS Topic for Payment Notifications

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Search for "SNS" or navigate to **Simple Notification Service**
3. Make sure you're in **us-east-1** region
4. Click **Topics** in the left sidebar
5. Click **Create topic**
6. Configure:
   - **Type:** Standard
   - **Name:** `exomart-payment-notifications`
   - **Display name:** `ExoMart Payments` (optional)
7. Click **Create topic**
8. **Copy the Topic ARN** - you'll need this for `serverless.yml`
   - Format: `arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:exomart-payment-notifications`

### Step 2.2: Subscribe Email to SNS Topic

1. Click on your topic name (`exomart-payment-notifications`)
2. Click **Create subscription**
3. Configure:
   - **Protocol:** Email
   - **Endpoint:** Enter your email address (where you want to receive payment notifications)
4. Click **Create subscription**
5. Check your email and click the confirmation link
6. Your email is now subscribed ✅

### Step 2.3: Subscribe SMS to SNS Topic (Optional)

1. Click **Create subscription** again
2. Configure:
   - **Protocol:** SMS
   - **Endpoint:** Enter your phone number with country code (e.g., `+91XXXXXXXXXX` for India)
3. Click **Create subscription**
4. You'll receive a confirmation SMS

**Note:** SMS subscriptions don't require confirmation, but you may need to verify your phone number in AWS SNS first.

### Step 2.4: Get Your AWS Account ID

You need your AWS Account ID to construct the Topic ARN:

1. Click on your username in the top-right corner of AWS Console
2. Your **Account ID** is displayed there
3. Copy it (it's a 12-digit number)

---

## 3. Update Backend Configuration

### Step 3.1: Update serverless.yml

Open `backend/serverless.yml` and update these environment variables:

```yaml
environment:
  # ... existing variables ...
  # SES Configuration
  FROM_EMAIL: your-verified-email@example.com  # Replace with your verified SES email
  # SNS Configuration
  PAYMENT_TOPIC_ARN: arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:exomart-payment-notifications
  # Replace YOUR_ACCOUNT_ID with your actual 12-digit AWS Account ID
```

**Example:**
```yaml
FROM_EMAIL: gbindra21@gmail.com  # Use your verified email address
PAYMENT_TOPIC_ARN: arn:aws:sns:us-east-1:123456789012:exomart-payment-notifications
```

**Important Notes:**
- Replace `gbindra21@gmail.com` with the email address you verified in SES
- Replace `123456789012` with your actual 12-digit AWS Account ID
- You can find your Account ID by clicking your username in the top-right corner of AWS Console

### Step 3.2: Verify IAM Permissions

Make sure your `serverless.yml` has these permissions (already added):

```yaml
iam:
  role:
    statements:
      - Effect: Allow
        Action:
          - ses:SendEmail
          - ses:SendRawEmail
          - sns:Publish
          - sns:Subscribe
          # ... other permissions
```

---

## 4. Deploy Backend

### Step 4.1: Deploy to AWS

```bash
cd backend
serverless deploy
```

This will:
- Create the OTP DynamoDB table
- Deploy the OTP send/verify Lambda functions
- Update payment handler with SNS integration
- Update auth handler with email verification requirement

### Step 4.2: Verify Deployment

After deployment, check:
1. **DynamoDB Console:** Verify `exomart-backend-otp-prod` table exists
2. **Lambda Console:** Verify `sendOTP` and `verifyOTP` functions exist
3. **API Gateway:** Verify `/otp/send` and `/otp/verify` endpoints exist

---

## 5. Testing

### Test 5.1: Email OTP Verification

1. Go to your website's signup page
2. Enter name, email, and password
3. Click "Continue"
4. Check your email for the OTP
5. Enter the 6-digit OTP
6. Click "Verify OTP"
7. Account should be created successfully ✅

**Note:** If you're in SES sandbox mode, use a verified email address for testing.

### Test 5.2: Payment Notification

1. Add items to cart
2. Proceed to checkout
3. Complete a payment
4. Check your email (and SMS if subscribed) for payment notification ✅

### Test 5.3: Resend OTP

1. On the OTP verification page
2. Click "Resend OTP"
3. Check email for new OTP
4. Verify it works ✅

---

## 6. Troubleshooting

### Issue: "Email service is not configured" Error

**Solution:**
- Verify your email in SES console (check "Verified identities" section)
- Check `FROM_EMAIL` in `serverless.yml` matches the exact verified email address
- Ensure SES is in the same region (us-east-1)
- Check CloudWatch logs for detailed error messages
- If using a placeholder domain, make sure you're using your verified email address, not the placeholder domain

### Issue: OTP Not Received

**Possible Causes:**
1. **SES Sandbox Mode:** You can only send to verified emails
   - **Solution:** Verify the recipient email in SES or request production access
2. **Email in Spam Folder:** Check spam/junk folder
3. **Wrong Email Address:** Verify the email address entered
4. **SES Not Configured:** Check CloudWatch logs for Lambda errors

### Issue: Payment Notification Not Received

**Possible Causes:**
1. **SNS Topic ARN Incorrect:** Verify `PAYMENT_TOPIC_ARN` in `serverless.yml`
2. **Email Not Subscribed:** Check SNS topic subscriptions
3. **Email Not Confirmed:** Click confirmation link in email
4. **Wrong Region:** Ensure SNS topic is in us-east-1

### Issue: "OTP has expired" Error

**Solution:**
- OTP expires after 10 minutes
- Request a new OTP by clicking "Resend OTP"

### Issue: "Maximum verification attempts exceeded"

**Solution:**
- You have 5 attempts to verify OTP
- After 5 failed attempts, request a new OTP

### Issue: SES Production Access Denied

**Solution:**
- Review AWS SES sending limits
- Provide more details in your request
- Wait for AWS review (usually 24 hours)
- Contact AWS Support if needed

---

## 7. Additional Configuration

### 7.1: Custom Email Templates

You can customize email templates in `backend/src/handlers/otp.js`:
- Modify `htmlBody` for OTP emails
- Modify SNS message format in `backend/src/handlers/payments.js`

### 7.2: OTP Expiry Time

Default: 10 minutes
- Change `OTP_EXPIRY_MINUTES` in `backend/src/handlers/otp.js`

### 7.3: Maximum Verification Attempts

Default: 5 attempts
- Change `maxAttempts` in `backend/src/handlers/otp.js`

### 7.4: SNS Message Format

Customize payment notification messages in `backend/src/handlers/payments.js`:
- Email format
- SMS format
- Default JSON format

---

## 8. Cost Considerations

### SES Costs (as of 2024)
- **First 62,000 emails/month:** Free (if sent from EC2)
- **After that:** $0.10 per 1,000 emails
- **Very affordable for most applications**

### SNS Costs (as of 2024)
- **Email:** $0.00 per 1,000 notifications
- **SMS:** Varies by country (e.g., India: ~$0.006 per SMS)
- **Very affordable for notifications**

---

## 9. Security Best Practices

1. **Never commit sensitive data:**
   - Don't commit `serverless.yml` with real ARNs/emails to public repos
   - Use environment variables or AWS Secrets Manager for production

2. **Rate Limiting:**
   - Consider adding rate limiting for OTP requests
   - Prevent abuse of email sending

3. **OTP Security:**
   - OTPs expire after 10 minutes
   - Maximum 5 verification attempts
   - OTPs are stored with TTL (Time To Live) in DynamoDB

4. **Email Verification:**
   - Always verify email addresses before sending
   - Use verified sender addresses

---

## 10. Next Steps

After setup:
1. ✅ Test email OTP verification
2. ✅ Test payment notifications
3. ✅ Monitor CloudWatch logs for errors
4. ✅ Request SES production access for production use
5. ✅ Set up email templates for better branding
6. ✅ Consider adding SMS OTP as an alternative

---

## Support

If you encounter issues:
1. Check CloudWatch logs for Lambda functions
2. Verify all AWS services are in the same region (us-east-1)
3. Ensure IAM permissions are correct
4. Review this guide's troubleshooting section

---

**Last Updated:** 2024
**Region:** us-east-1
**Services:** SES, SNS, DynamoDB, Lambda, API Gateway

