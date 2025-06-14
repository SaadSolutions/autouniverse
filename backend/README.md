# Auto Universe Inc. Backend

A comprehensive backend API for the Auto Universe Inc. dealership management system.

## Features

- 🔐 **Dealer Authentication** - JWT-based login system for dealers and admins
- 🚗 **Inventory Management** - Full CRUD operations for vehicle inventory
- 📝 **Form Processing** - Handle loan applications and email notifications
- 📁 **File Upload** - Image upload support for vehicle photos
- 🔒 **Security** - Rate limiting, validation, and secure endpoints
- 📧 **Email Integration** - Automatic email notifications for form submissions

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Gmail account (for email notifications)

### Installation

1. **Install dependencies:**

   ```bash
   cd backend
   npm install
   ```

2. **Environment setup:**

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration:

   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/auto-universe
   JWT_SECRET=your-super-secret-jwt-key
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_TO=dealer@autouniverse.com
   ADMIN_EMAIL=admin@autouniverse.com
   ADMIN_PASSWORD=admin123
   ```

3. **Start MongoDB** (if running locally):

   ```bash
   mongod
   ```

4. **Seed the database:**

   ```bash
   npm run seed
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint           | Description           | Auth Required |
| ------ | ------------------ | --------------------- | ------------- |
| POST   | `/register`        | Register new dealer   | No            |
| POST   | `/login`           | Dealer login          | No            |
| GET    | `/profile`         | Get dealer profile    | Yes           |
| PUT    | `/profile`         | Update dealer profile | Yes           |
| PUT    | `/change-password` | Change password       | Yes           |
| GET    | `/verify`          | Verify JWT token      | Yes           |
| POST   | `/logout`          | Logout                | Yes           |

### Cars (`/api/cars`)

| Method | Endpoint                     | Description           | Auth Required |
| ------ | ---------------------------- | --------------------- | ------------- |
| GET    | `/`                          | Get all cars (public) | No            |
| GET    | `/:id`                       | Get single car        | No            |
| POST   | `/`                          | Add new car           | Yes           |
| PUT    | `/:id`                       | Update car            | Yes           |
| DELETE | `/:id`                       | Delete car            | Yes           |
| DELETE | `/:id/images/:index`         | Delete car image      | Yes           |
| PUT    | `/:id/images/:index/primary` | Set primary image     | Yes           |
| GET    | `/dealer/:dealerId?`         | Get dealer's cars     | Yes           |

### Forms (`/api/forms`)

| Method | Endpoint                        | Description               | Auth Required |
| ------ | ------------------------------- | ------------------------- | ------------- |
| POST   | `/loan-application`             | Submit loan application   | No            |
| GET    | `/loan-applications`            | Get all applications      | Yes           |
| GET    | `/loan-applications/:id`        | Get single application    | Yes           |
| PUT    | `/loan-applications/:id/status` | Update application status | Yes           |
| DELETE | `/loan-applications/:id`        | Delete application        | Yes (Admin)   |

## Database Models

### Dealer

- Email, password (hashed)
- Name, role (admin/dealer)
- Last login, active status

### Car

- Make, model, year, mileage, price
- Body style, fuel type, transmission
- Images, features, description
- Status (available/sold/pending/draft)
- Added by dealer reference

### Loan Application

- Personal information (name, SSN, address)
- Contact information (email, phone)
- Employment details
- Co-applicant and trade-in info (optional)
- Application status and notes

## File Upload

Car images are uploaded to `/uploads/cars/` directory. The system:

- Validates file types (jpeg, jpg, png, gif, webp)
- Limits file size (5MB max)
- Generates unique filenames
- Supports multiple images per car
- Manages primary image selection

## Email Configuration

For Gmail, you need to:

1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password in `EMAIL_PASS`

## Security Features

- JWT authentication with expiration
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- CORS configuration
- Helmet for security headers

## Default Credentials

After seeding the database:

- **Admin:** admin@autouniverse.com / admin123
- **Dealer:** dealer@autouniverse.com / dealer123

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure production MongoDB URI
4. Set up proper CORS origins
5. Use HTTPS
6. Consider using cloud storage for images (Cloudinary integration ready)

## Development Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run seed       # Seed database with sample data
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "messages": ["Array of validation errors"]
}
```

## API Response Format

Success responses follow this structure:

```json
{
  "message": "Success message",
  "data": "Response data",
  "pagination": "Pagination info (when applicable)"
}
```
