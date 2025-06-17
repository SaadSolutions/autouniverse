# Render.com Deployment Guide

## Overview

This guide explains how to deploy Auto Universe to Render.com using the monorepo structure.

## Deployment Strategy

### 1. Backend API Service

- **Service Type**: Web Service
- **Repository**: Connect your GitHub repository
- **Branch**: main
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: Starter (or higher based on needs)

### 2. Frontend Static Site

- **Service Type**: Static Site
- **Repository**: Same GitHub repository
- **Branch**: main
- **Root Directory**: `.` (root)
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `public`

### 3. Database

- **Option A**: Use MongoDB Atlas (recommended)
- **Option B**: Use Render's managed PostgreSQL (requires code changes)

## Environment Variables

### Backend Service Environment Variables:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=<your-mongodb-atlas-connection-string>
JWT_SECRET=<your-secure-jwt-secret>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
EMAIL_USER=<your-email-for-notifications>
EMAIL_PASS=<your-email-password-or-app-password>
```

### Frontend Service Environment Variables:

```
API_URL=https://your-backend-service-name.onrender.com
```

## Step-by-Step Deployment

### 1. Prepare Your Repository

- Ensure all code is committed and pushed to GitHub
- Update the API URLs in frontend JavaScript files (already done via config.js)

### 2. Create Backend Service

1. Go to Render.com dashboard
2. Click "New" > "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `auto-universe-api`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter
5. Add environment variables listed above
6. Deploy

### 3. Create Frontend Service

1. Click "New" > "Static Site"
2. Connect the same GitHub repository
3. Configure:
   - **Name**: `auto-universe-frontend`
   - **Root Directory**: `.` (leave empty)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `public`
4. Deploy

### 4. Update Frontend Configuration

After backend deployment, update the API URL in `/public/js/config.js`:

```javascript
const API_CONFIG = {
  BASE_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:5000/api"
      : "https://your-actual-backend-url.onrender.com/api", // Update this
};
```

### 5. Set Up Database

1. Create MongoDB Atlas cluster
2. Get connection string
3. Add to backend environment variables
4. Whitelist Render's IP addresses in MongoDB Atlas

## Important Notes

- **Cold Starts**: Free tier services sleep after 15 minutes of inactivity
- **Build Times**: Static sites build faster than web services
- **Environment Variables**: Keep sensitive data in Render's environment variables, not in code
- **HTTPS**: All Render services automatically get HTTPS
- **Custom Domains**: Available on paid plans

## Post-Deployment Checklist

- [ ] Backend health check endpoint responds: `https://your-api.onrender.com/api/health`
- [ ] Frontend loads correctly
- [ ] API calls work from frontend to backend
- [ ] Database connections are successful
- [ ] File uploads work (if using Cloudinary)
- [ ] Email notifications work (if configured)

## Troubleshooting

### Common Issues:

1. **CORS errors**: Ensure backend allows frontend domain
2. **Database connection**: Check connection string and IP whitelist
3. **Environment variables**: Verify all required vars are set
4. **Build failures**: Check build logs for missing dependencies

### Logs:

- Access logs from Render dashboard
- Use `console.log` for debugging (visible in logs)
- Check browser console for frontend errors

## Monitoring

- Set up Render's monitoring alerts
- Monitor response times and error rates
- Consider upgrading to paid plans for better performance
