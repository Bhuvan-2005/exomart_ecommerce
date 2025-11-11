# CloudWatch Alarms Setup Guide for ExoMart

This guide helps you set up CloudWatch alarms to monitor your ExoMart backend services and get notified of issues.

---

## Table of Contents

1. [Lambda Function Alarms](#1-lambda-function-alarms)
2. [SES Email Alarms](#2-ses-email-alarms)
3. [SNS Notification Alarms](#3-sns-notification-alarms)
4. [DynamoDB Alarms](#4-dynamodb-alarms)
5. [API Gateway Alarms](#5-api-gateway-alarms)
6. [Setting Up SNS Topic for Alarms](#6-setting-up-sns-topic-for-alarms)

---

## Prerequisites

- AWS Console access
- CloudWatch access
- SNS topic for alarm notifications (we'll create one)

---

## 1. Lambda Function Alarms

### Alarm 1.1: Lambda Function Errors

Monitor when Lambda functions encounter errors.

**Steps:**
1. Go to **CloudWatch Console** → **Alarms** → **Create alarm**
2. Click **Select metric**
3. Choose **AWS/Lambda** namespace
4. Select metric: **Errors**
5. Select dimensions:
   - **FunctionName**: `exomart-backend-prod-sendOTP` (or other function names)
6. Click **Select metric**
7. Configure:
   - **Statistic**: Sum
   - **Period**: 5 minutes
   - **Threshold type**: Static
   - **Whenever Errors is**: Greater than threshold
   - **Threshold**: 1
8. Click **Next**
9. Configure notification:
   - Select SNS topic (create one if needed - see Section 6)
   - Alarm name: `exomart-sendOTP-errors`
10. Click **Next** → **Create alarm**

**Repeat for other critical functions:**
- `exomart-backend-prod-verifyOTP`
- `exomart-backend-prod-registerUser`
- `exomart-backend-prod-processPayment`
- `exomart-backend-prod-lexChat`

### Alarm 1.2: Lambda Function Duration (High Latency)

Monitor when Lambda functions take too long to execute.

**Steps:**
1. Create alarm for **Duration** metric
2. **Statistic**: Average
3. **Period**: 5 minutes
4. **Threshold**: 5000 (5 seconds) - adjust based on your needs
5. Alarm name: `exomart-sendOTP-high-latency`

### Alarm 1.3: Lambda Function Throttles

Monitor when Lambda functions are throttled.

**Steps:**
1. Create alarm for **Throttles** metric
2. **Statistic**: Sum
3. **Period**: 5 minutes
4. **Threshold**: 1
5. Alarm name: `exomart-sendOTP-throttles`

---

## 2. SES Email Alarms

### Alarm 2.1: SES Bounce Rate

Monitor when email bounce rate is too high.

**Steps:**
1. Go to **CloudWatch** → **Alarms** → **Create alarm**
2. Select metric: **AWS/SES** → **Reputation.BounceRate**
3. **Statistic**: Average
4. **Period**: 15 minutes
5. **Threshold**: 5% (0.05)
6. Alarm name: `exomart-ses-high-bounce-rate`

### Alarm 2.2: SES Complaint Rate

Monitor when email complaint rate is too high.

**Steps:**
1. Select metric: **AWS/SES** → **Reputation.ComplaintRate**
2. **Statistic**: Average
3. **Period**: 15 minutes
4. **Threshold**: 0.1% (0.001)
5. Alarm name: `exomart-ses-high-complaint-rate`

### Alarm 2.3: SES Send Failures

Monitor when emails fail to send.

**Steps:**
1. Select metric: **AWS/SES** → **Send**
2. **Statistic**: Sum
3. **Period**: 5 minutes
4. **Threshold type**: Anomaly detection (or static with threshold 0)
5. Alarm name: `exomart-ses-send-failures`

---

## 3. SNS Notification Alarms

### Alarm 3.1: SNS Publish Failures

Monitor when SNS notifications fail to publish.

**Steps:**
1. Go to **CloudWatch** → **Alarms** → **Create alarm**
2. Select metric: **AWS/SNS** → **NumberOfNotificationsFailed**
3. Select dimensions:
   - **TopicName**: `exomart-payment-notifications`
4. **Statistic**: Sum
5. **Period**: 5 minutes
6. **Threshold**: 1
7. Alarm name: `exomart-sns-publish-failures`

---

## 4. DynamoDB Alarms

### Alarm 4.1: DynamoDB Throttling

Monitor when DynamoDB tables are throttled.

**Steps:**
1. Go to **CloudWatch** → **Alarms** → **Create alarm**
2. Select metric: **AWS/DynamoDB** → **UserErrors**
3. Select dimensions:
   - **TableName**: `exomart-backend-otp-prod` (or other tables)
4. **Statistic**: Sum
5. **Period**: 5 minutes
6. **Threshold**: 1
7. Alarm name: `exomart-dynamodb-otp-throttling`

**Repeat for other tables:**
- `exomart-backend-users-prod`
- `exomart-backend-payments-prod`
- `exomart-backend-cart-prod`

### Alarm 4.2: DynamoDB Read/Write Capacity

Monitor DynamoDB capacity usage (if using provisioned capacity).

**Note:** You're using PAY_PER_REQUEST, so this may not be needed, but useful if you switch to provisioned capacity.

---

## 5. API Gateway Alarms

### Alarm 5.1: API Gateway 4xx Errors

Monitor client errors (bad requests).

**Steps:**
1. Go to **CloudWatch** → **Alarms** → **Create alarm**
2. Select metric: **AWS/ApiGateway** → **4XXError**
3. Select dimensions:
   - **ApiName**: `exomart-backend-prod` (or your API name)
4. **Statistic**: Sum
5. **Period**: 5 minutes
6. **Threshold**: 10 (adjust based on your traffic)
7. Alarm name: `exomart-api-4xx-errors`

### Alarm 5.2: API Gateway 5xx Errors

Monitor server errors.

**Steps:**
1. Select metric: **AWS/ApiGateway** → **5XXError**
2. **Statistic**: Sum
3. **Period**: 5 minutes
4. **Threshold**: 1
5. Alarm name: `exomart-api-5xx-errors`

### Alarm 5.3: API Gateway Latency

Monitor API response times.

**Steps:**
1. Select metric: **AWS/ApiGateway** → **Latency**
2. **Statistic**: Average
3. **Period**: 5 minutes
4. **Threshold**: 5000 (5 seconds)
5. Alarm name: `exomart-api-high-latency`

---

## 6. Setting Up SNS Topic for Alarms

Create an SNS topic to receive alarm notifications.

### Step 6.1: Create SNS Topic

1. Go to **SNS Console** → **Topics** → **Create topic**
2. **Type**: Standard
3. **Name**: `exomart-cloudwatch-alarms`
4. Click **Create topic**
5. **Copy the Topic ARN** (you'll need it)

### Step 6.2: Subscribe Your Email

1. Click on the topic name
2. Click **Create subscription**
3. **Protocol**: Email
4. **Endpoint**: Your email address (e.g., `gbindra21@gmail.com`)
5. Click **Create subscription**
6. **Check your email** and click the confirmation link

### Step 6.3: Subscribe SMS (Optional)

1. Click **Create subscription** again
2. **Protocol**: SMS
3. **Endpoint**: Your phone number (e.g., `+91XXXXXXXXXX`)
4. Click **Create subscription**

### Step 6.4: Use This Topic in Alarms

When creating alarms (Sections 1-5), select this SNS topic for notifications.

---

## 7. Quick Setup Checklist

### Essential Alarms (Start Here)

- [ ] Lambda Errors (all critical functions)
- [ ] Lambda Throttles
- [ ] SES Bounce Rate
- [ ] SES Complaint Rate
- [ ] API Gateway 5xx Errors
- [ ] DynamoDB Throttling (OTP table)

### Recommended Alarms

- [ ] Lambda Duration (high latency)
- [ ] SNS Publish Failures
- [ ] API Gateway 4xx Errors
- [ ] API Gateway Latency

### Optional Alarms

- [ ] SES Send Failures
- [ ] DynamoDB Capacity (if using provisioned)

---

## 8. Alarm Best Practices

1. **Start with Essential Alarms**: Set up critical alarms first (errors, throttles)
2. **Set Appropriate Thresholds**: Adjust based on your traffic patterns
3. **Use Multiple Notification Channels**: Email + SMS for critical alarms
4. **Review and Tune**: Monitor alarm frequency and adjust thresholds
5. **Set Up Alarm Actions**: Consider auto-remediation for common issues
6. **Use Alarm Dashboards**: Create CloudWatch dashboards to visualize alarms

---

## 9. Testing Alarms

### Test an Alarm

1. Manually trigger an error (e.g., send invalid request to API)
2. Wait for the alarm to trigger (within the period you set)
3. Check your email/SMS for notification
4. Verify the alarm state in CloudWatch console

### Test Notification

1. Go to your SNS topic
2. Click **Publish message**
3. Enter a test message
4. Click **Publish message**
5. Check your email/SMS

---

## 10. Cost Considerations

### CloudWatch Alarms Pricing (as of 2024)

- **First 10 alarms**: Free
- **Additional alarms**: $0.10 per alarm per month
- **Alarm evaluations**: Free (first 1 million evaluations per month)
- **Very affordable for monitoring**

### SNS Notifications

- **Email**: Free
- **SMS**: Varies by country (e.g., India: ~$0.006 per SMS)

---

## 11. CloudWatch Dashboard (Optional)

Create a dashboard to visualize all alarms:

1. Go to **CloudWatch** → **Dashboards** → **Create dashboard**
2. Add widgets for:
   - Lambda errors
   - API Gateway errors
   - SES metrics
   - DynamoDB metrics
3. Save dashboard: `ExoMart-Monitoring`

---

## 12. Troubleshooting

### Alarm Not Triggering

- Check alarm configuration (threshold, period)
- Verify metric data is available
- Check alarm state (OK, ALARM, INSUFFICIENT_DATA)

### Not Receiving Notifications

- Verify SNS subscription is confirmed
- Check email spam folder
- Verify SNS topic ARN in alarm configuration
- Check CloudWatch logs for alarm evaluation

### Too Many Alarms

- Adjust thresholds
- Increase evaluation period
- Use composite alarms to combine multiple conditions
- Review and disable unnecessary alarms

---

## Support

If you need help:
1. Check CloudWatch logs for alarm evaluation history
2. Review alarm configuration
3. Verify SNS topic subscriptions
4. Check AWS service health status

---

**Last Updated:** 2024
**Region:** us-east-1
**Services:** CloudWatch, SNS, Lambda, SES, DynamoDB, API Gateway


