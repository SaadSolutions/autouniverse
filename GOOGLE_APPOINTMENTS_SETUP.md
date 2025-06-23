# Google Appointments Setup Guide

This guide will walk you through setting up Google Calendar integration for appointment booking on your Auto Universe website.

## 📋 Overview

Your website now includes:

- **Appointment booking page** (`/appointments.html`)
- **Backend API** for handling appointments
- **Email notifications** for customers and dealership
- **Google Calendar integration** (optional)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install googleapis
```

### 2. Basic Setup (Email Only)

The simplest setup uses email notifications without Google Calendar:

1. Update your `.env` file:

```bash
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
DEALERSHIP_EMAIL=your-dealership@email.com
```

2. Start your server:

```bash
npm start
```

Your appointment booking will work with email notifications!

## 📅 Google Calendar Integration (Advanced)

For full Google Calendar integration, follow these steps:

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure OAuth consent screen if prompted
4. Select "Web application"
5. Add authorized redirect URIs:
   - `https://developers.google.com/oauthplayground`
   - Your domain (e.g., `https://yourdomain.com`)

### Step 3: Get Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Click the gear icon (Settings)
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In the left panel, find "Calendar API v3"
6. Select: `https://www.googleapis.com/auth/calendar.events`
7. Click "Authorize APIs"
8. Complete the authorization flow
9. Click "Exchange authorization code for tokens"
10. Copy the refresh token

### Step 4: Update Environment Variables

Add to your `.env` file:

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

## 🎯 Alternative: Google Calendar Appointment Slots

For a simpler approach, use Google Calendar's built-in appointment slots:

### Step 1: Create Business Calendar

1. Go to [Google Calendar](https://calendar.google.com)
2. Create a new calendar for appointments
3. Set business hours and availability

### Step 2: Enable Appointment Slots

1. In your business calendar, click "+ Create"
2. Select "Appointment schedule"
3. Configure:
   - Duration (e.g., 30 minutes)
   - Availability windows
   - Buffer time between appointments
   - Maximum bookings per slot

### Step 3: Get Embed Code

1. Go to calendar settings
2. Find "Integrate calendar" section
3. Copy the embed code
4. Replace the placeholder in `appointments.html`

Replace this section in `/public/appointments.html`:

```html
<!-- Replace this placeholder with your Google Calendar embed -->
<div class="calendar-embed mb-6">
  <iframe
    src="YOUR_GOOGLE_CALENDAR_EMBED_URL"
    style="border: 0"
    width="100%"
    height="500"
    frameborder="0"
    scrolling="no"
  >
  </iframe>
</div>
```

## 📧 Email Configuration

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an app password:
   - Go to Google Account settings
   - Security > App passwords
   - Generate password for "Mail"
   - Use this password in your `.env` file

### Other Email Providers

Update the transporter configuration in `routes/appointments.js`:

```javascript
const transporter = nodemailer.createTransporter({
  host: "your-smtp-host",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

## 🔧 API Endpoints

Your appointment system provides these endpoints:

- `POST /api/appointments` - Create new appointment
- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/:id` - Get specific appointment
- `PATCH /api/appointments/:id/status` - Update appointment status
- `DELETE /api/appointments/:id` - Delete appointment
- `POST /api/appointments/send-email` - Send notification email

## 📱 Frontend Features

The appointment booking page includes:

### Appointment Types

- Car Viewing
- Test Drive
- Financing Consultation
- General Inquiry

### Time Slots

- Pre-defined time slots (9 AM - 5 PM)
- Visual selection interface
- Availability checking

### Form Validation

- Required field validation
- Email format validation
- Phone number validation
- Date restrictions (future dates only)

## 🎨 Customization

### Styling

The appointment page uses Tailwind CSS. Customize in `appointments.html`:

- Colors: Change `bg-red-600` to your brand colors
- Layout: Modify grid layouts and spacing
- Components: Add/remove form fields

### Business Hours

Update time slots in `appointment-booking.js`:

```javascript
const timeSlots = [
  { time: "09:00", label: "9:00 AM" },
  { time: "10:00", label: "10:00 AM" },
  // Add more slots
];
```

### Email Templates

Customize email templates in `routes/appointments.js`:

- Customer confirmation emails
- Dealership notification emails
- Status update emails

## 🚦 Testing

### Test the Appointment System

1. Start your backend server
2. Open `/appointments.html` in your browser
3. Fill out the appointment form
4. Submit and check:
   - Database entry created
   - Email notifications sent
   - Google Calendar event created (if configured)

### Test Email Configuration

```bash
cd backend
node test-email.js
```

## 🔐 Security Considerations

1. **Rate Limiting**: Appointments are rate-limited to prevent spam
2. **Input Validation**: All form inputs are validated
3. **CORS Configuration**: Properly configured for your domain
4. **Environment Variables**: Keep API keys secure

## 📈 Analytics & Tracking

Consider adding:

- Google Analytics events for appointment bookings
- Appointment conversion tracking
- Popular time slot analysis
- Customer follow-up automation

## 🆘 Troubleshooting

### Common Issues

**Appointments not saving:**

- Check MongoDB connection
- Verify required fields in form
- Check browser console for errors

**Emails not sending:**

- Verify email credentials
- Check spam folders
- Test with `test-email.js`

**Google Calendar not working:**

- Verify API credentials
- Check OAuth 2.0 setup
- Ensure calendar permissions

**Frontend errors:**

- Check browser console
- Verify API endpoints are accessible
- Test network connectivity

### Error Messages

- 400: Missing required fields
- 409: Time slot already booked
- 500: Server error (check logs)

## 📞 Support

For additional help:

1. Check the browser console for JavaScript errors
2. Review server logs for API errors
3. Test individual components (database, email, calendar)
4. Verify environment variables are set correctly

## 🎉 Next Steps

Once set up, consider adding:

- SMS notifications (Twilio integration)
- Appointment reminders
- Online rescheduling
- Staff calendar management
- Appointment analytics dashboard

---

Your Google appointments system is now ready! Customers can book appointments online, and you'll receive notifications via email and Google Calendar.
