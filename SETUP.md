# Auto Universe Inc. - Complete Setup Guide

## 🚀 Full-Stack Dealership Management System

This is a complete solution for Auto Universe Inc. featuring:

- **Frontend**: Modern HTML/CSS/JavaScript with Tailwind CSS
- **Backend**: Node.js/Express REST API
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based dealer login system
- **File Upload**: Image management for vehicle photos
- **Email Integration**: Automatic loan application notifications

## 📋 Prerequisites

1. **Node.js** (v16+): [Download here](https://nodejs.org/)
2. **MongoDB**:
   - Local: [Download here](https://www.mongodb.com/try/download/community)
   - Cloud: [MongoDB Atlas](https://cloud.mongodb.com/) (free tier available)
3. **Gmail Account** (for email notifications)

## 🛠️ Quick Setup

### 1. Start MongoDB (if using local installation)

```bash
# Start MongoDB service
sudo systemctl start mongod

# Or if installed via brew (macOS)
brew services start mongodb-community

# Or run directly
mongod
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` file with your settings:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/auto-universe
JWT_SECRET=your-super-secret-jwt-key-change-this
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_TO=dealer@autouniverse.com
```

**📧 Gmail Setup:**

1. Enable 2-factor authentication on your Gmail account
2. Generate an app password: [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Use the app password in `EMAIL_PASS`

### 3. Install Dependencies & Seed Database

```bash
cd backend
npm install
npm run seed
```

### 4. Start the Backend Server

```bash
npm run dev
```

Server will run on http://localhost:5000

### 5. Serve the Frontend

You can use any static file server. Here are a few options:

**Option A: Live Server (VS Code Extension)**

- Install "Live Server" extension in VS Code
- Right-click on `public/index.html` → "Open with Live Server"

**Option B: Python HTTP Server**

```bash
cd public
python3 -m http.server 3000
```

**Option C: Node.js http-server**

```bash
npm install -g http-server
cd public
http-server -p 3000
```

Frontend will be available at http://localhost:3000 (or your chosen port)

## 🔑 Default Login Credentials

After running `npm run seed`, you can login with:

- **Admin**: `admin@autouniverse.com` / `admin123`
- **Dealer**: `dealer@autouniverse.com` / `dealer123`

## 📱 Features Overview

### 🌐 Public Website

- **Homepage** (`index.html`): Company overview and featured vehicles
- **Inventory** (`inventory.html`): Browse available cars with filtering
- **Financing** (`form.html`): Loan application form with email notifications
- **About Us** (`contact.html`): Company information and contact details

### 🔐 Dealer Dashboard (`dashboard.html`)

- **Overview**: Statistics and quick metrics
- **My Cars**: View, edit, and delete inventory
- **Add Car**: Upload new vehicles with photos
- **Applications**: View and manage loan applications

### 🚗 Car Management

- Full CRUD operations for vehicles
- Image upload (up to 10 photos per car)
- Status management (Available, Sold, Pending, Draft)
- Search and filtering capabilities

### 📝 Loan Application System

- Comprehensive application form
- Automatic email notifications to dealer
- Application status tracking
- Secure data storage

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/login` - Dealer login
- `POST /api/auth/register` - Register new dealer
- `GET /api/auth/profile` - Get dealer profile

### Cars

- `GET /api/cars` - Get all cars (public)
- `POST /api/cars` - Add new car (auth required)
- `PUT /api/cars/:id` - Update car (auth required)
- `DELETE /api/cars/:id` - Delete car (auth required)

### Forms

- `POST /api/forms/loan-application` - Submit loan application
- `GET /api/forms/loan-applications` - Get all applications (auth required)

## 🐛 Testing the System

### 1. Test Public Website

1. Open http://localhost:3000
2. Navigate through all pages
3. Check inventory filtering
4. Submit a loan application

### 2. Test Dealer Dashboard

1. Go to http://localhost:3000/dashboard.html
2. Login with demo credentials
3. Add a new car with images
4. View loan applications

### 3. Test Email Notifications

1. Configure real email settings in `.env`
2. Submit a loan application
3. Check if email is received

## 📁 File Structure

```
autouni/
├── backend/                 # Node.js API server
│   ├── models/             # Database schemas
│   ├── routes/             # API endpoints
│   ├── middleware/         # Auth & upload middleware
│   ├── scripts/            # Database utilities
│   └── uploads/            # Uploaded images
├── public/                 # Frontend files
│   ├── *.html             # Web pages
│   ├── js/                # JavaScript files
│   ├── css/               # Stylesheets
│   └── images/            # Static images
```

## 🔒 Security Features

- JWT authentication with expiration
- Password hashing with bcrypt
- Rate limiting (100 requests/15 minutes)
- Input validation and sanitization
- CORS protection
- File upload restrictions

## 🚀 Production Deployment

### Backend (Node.js)

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure production MongoDB URI
4. Set up HTTPS
5. Use PM2 for process management

### Frontend

1. Build and minify assets
2. Deploy to CDN or static hosting
3. Update API URLs to production endpoints

### Recommended Services

- **Backend**: Heroku, DigitalOcean, AWS
- **Database**: MongoDB Atlas
- **Frontend**: Netlify, Vercel, GitHub Pages
- **Images**: Cloudinary (integration ready)

## 🆘 Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check MongoDB logs
sudo journalctl -u mongod
```

### Port Already in Use

```bash
# Kill process on port 5000
sudo lsof -ti:5000 | xargs kill -9
```

### Email Not Working

1. Verify Gmail app password is correct
2. Check 2FA is enabled on Gmail
3. Review console logs for error messages

### CORS Issues

- Ensure frontend and backend URLs match CORS settings
- Check browser console for CORS errors

## 📞 Support

If you encounter issues:

1. Check the console logs (both browser and server)
2. Verify all environment variables are set
3. Ensure MongoDB is running
4. Check that all ports are available

## 🎯 Next Steps

Potential enhancements:

- Customer user accounts
- Online payments integration
- Advanced search filters
- Vehicle comparison tool
- Service scheduling
- Customer reviews system
- Mobile app development
