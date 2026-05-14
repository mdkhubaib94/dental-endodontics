# Email Configuration for Render Deployment

Your dental app cannot send OTP emails until email credentials are configured in Render.

## Steps to Set Up Email on Render

### 1. Get Gmail App Password
If using Gmail (recommended):
- Go to [Google Account Settings](https://myaccount.google.com)
- Enable **2-Factor Authentication** (if not already done)
- Go to **App passwords** (https://myaccount.google.com/apppasswords)
- Select "Mail" and "Windows Computer" (or your device)
- Copy the **16-character app password**

### 2. Set Environment Variables on Render
1. Go to your Render service dashboard
2. Click **Environment** in the left sidebar
3. Add these two variables:
   - **Key:** `MAIL_USER`  
     **Value:** `your-gmail@gmail.com`
   - **Key:** `MAIL_PASSWORD`  
     **Value:** `xxxx xxxx xxxx xxxx` (the 16-char app password)
4. Click **Save**

### 3. Redeploy
- Go to **Deploys** tab
- Click **Clear build cache** 
- Click **Deploy** to restart with new env vars

### 4. Test OTP
- Try signup/login with email OTP option
- Check browser console for errors
- If still failing, check Render **Logs** tab for error messages

---

## Alternative Email Providers

### SendGrid
```json
{
  "service": "sendgrid",
  "auth": {
    "user": "apikey",
    "pass": "SG.xxxxxxxxxxxxx"  // Your SendGrid API key
  }
}
```
Set `MAIL_USER = apikey` and `MAIL_PASSWORD = SG.xxxxx`

### AWS SES
```json
{
  "service": "ses",
  "aws": {
    "accessKeyId": "AKIA...",
    "secretAccessKey": "..."
  }
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Email configuration not set up" | Add `MAIL_USER` and `MAIL_PASSWORD` to Render Environment |
| Gmail says "app password not accepted" | Ensure 2FA is enabled; generate new app password |
| "Failed to send OTP email" | Check logs in Render; Gmail may block from server IP |
| OTP not arriving | Check spam folder; verify email address is correct |

---

## Development (Local Testing)

To test locally without sending real emails:
- Leave `MAIL_USER` and `MAIL_PASSWORD` unset in `.env`
- OTP will be logged to console: `📧 [DEV MODE] OTP for user@example.com: 123456`
- Use that OTP in your app to test the flow
