# Commerce Core API
A complete e-commerce backend API built with **NestJS, TypeScript, Prisma, and PostgreSQL**.
The project includes authentication, authorization, product management, cart, wishlist, orders, payments, coupons, reviews, returns, file uploads, email notifications, and admin functionality.
## Tech Stack
* **NestJS** — Backend framework
* **TypeScript** — Programming language
* **Prisma ORM** — Database access and migrations
* **PostgreSQL** — Relational database
* **JWT** — Access token authentication
* **Passport** — Authentication strategies
* **Google OAuth** — Google login
* **AWS S3** — Image storage
* **Nodemailer** — Email delivery
* **Firebase Admin SDK** — Push notifications
* **Twilio** — SMS notifications
* **Safepay** — Online payment integration
* **JazzCash** — Online payment integration
## Main Features
### Authentication
* User registration
* User login
* Logout
* JWT access token authentication
* Refresh token authentication
* HTTP-only authentication cookies
* Email verification
* Resend verification email
* Forgot password
* Reset password
* Google OAuth login
* Blocked-user validation
* Role-based authorization
### Users
* Get authenticated user profile
* Update profile
* Profile image support
* User status management
* User role management
### Products
* Create products
* Update products
* Product image uploads
* Multiple image uploads
* Product stock management
* Featured products
* Product search
* Category filtering
* Price filtering
* Stock filtering
* Discount filtering
* Sorting
* Pagination
### Categories
* Create categories
* Update categories
* Fetch categories
* Filter products by category
### Cart
* Add products to cart
* Update product quantity
* Remove cart items
* Fetch user cart
* Stock and quantity validation
### Wishlist
* Add products to wishlist
* Remove products from wishlist
* Fetch wishlist items
### Addresses
* Create delivery addresses
* Update addresses
* Fetch saved addresses
* Use saved addresses during checkout
### Orders
* Create orders
* Cash on Delivery orders
* Online payment orders
* User order history
* Admin order management
* Order status management
* Order status validation
* Shipping information
* Order total calculation
* Product stock handling
### Payments
The backend supports multiple payment providers.
#### Safepay
* Payment session creation
* Hosted checkout
* Payment callbacks
* Webhook handling
* Webhook signature verification
* Payment status updates
* Order confirmation after successful payment
#### JazzCash
* Payment request generation
* Secure hash generation
* Payment callback handling
* Payment verification
* Order confirmation after successful payment
### Coupons
* Create coupons
* Update coupons
* Apply coupons to orders
* Coupon validation
* Discount calculation
* User coupon support
### Reviews and Ratings
* Create product reviews
* Update reviews
* Product ratings
* Review validation
### Returns
* User return requests
* Return items
* Return status management
* Admin return management
### Admin
Admin and Super Admin functionality includes:
* View users
* Manage user roles
* Manage user status
* Manage products
* Manage orders
* Manage returns
* Protected admin routes
* Role-based permissions
## File Storage
Product and profile images are stored using **AWS S3**.
The project includes reusable helpers for:
* Single file uploads
* Multiple file uploads
* File size validation
* File type validation
* File key generation
* Signed image URLs
## Email System
Email functionality is implemented using **Nodemailer**.
Emails are used for:
* Email verification
* Password reset
* Order confirmation
* Application notifications
Reusable email templates and utilities are included in the project.
## Push Notification System
Push notifications are implemented using **Firebase Admin SDK**.
Push notifications are used for:
* Order confirmation
* Order shipped
* Order delivered
* Return approved
* Return rejected
* Return received
* Refund completed
Firebase configuration is optional. If Firebase credentials are not configured, the API can continue running and push notifications are skipped.
## SMS System
SMS notifications are implemented using **Twilio**.
SMS can be used for transactional application notifications such as order and account-related updates.
Twilio configuration is optional. If Twilio credentials are not configured, the API can continue running and SMS notifications are skipped.

## Security
The API includes multiple security practices:
* JWT access tokens
* Refresh tokens
* HTTP-only cookies
* Password hashing
* Refresh token hashing
* Email verification token hashing
* Password reset token hashing
* Authentication guards
* Role-based guards
* DTO validation
* Input transformation
* File validation
* Payment signature validation
* Blocked-user checks
* Protected admin endpoints
## Database
The application uses **PostgreSQL** with **Prisma ORM**.
The database includes models and relationships for:
* Users
* Sessions
* Products
* Categories
* Cart
* Wishlist
* Addresses
* Orders
* Order items
* Payments
* Coupons
* Reviews
* Returns
* Authentication tokens
Database changes are managed through **Prisma migrations**.
## Project Structure
```text
src/
├── addresses/
├── admin/
├── auth/
├── cart/
├── categories/
├── common/
├── coupons/
├── email/
├── notifications/
├── orders/
├── payments/
│   ├── jazzcash/
│   └── safepay/
├── prisma/
├── products/
├── push/
├── returns/
├── reviews/
├── sms/
├── users/
└── wishlist/
```
## Third-Party Services
| Service / Package | Purpose                     |
| ----------------- | --------------------------- |
| NestJS            | Backend framework           |
| Prisma            | ORM and database migrations |
| PostgreSQL        | Main database               |
| Passport          | Authentication strategies   |
| JWT               | Authentication              |
| Google OAuth      | Social login                |
| AWS S3            | Image storage               |
| Nodemailer        | Email delivery              |
| Firebase Admin SDK| Push notifications          |
| Twilio            | SMS notifications           |
| Safepay           | Online payment processing   |
| JazzCash          | Online payment processing   |
The complete list of npm dependencies is available in `package.json`.
## Requirements
Before installing the project, make sure your environment meets the required versions.
```text
Node.js >= 22.14.0 and < 23
npm >= 10.9.2 and < 11
```
These versions are also defined in `package.json`.
Check your installed versions with:
```bash
node -v
npm -v
```
## Installation
Clone the repository:
```bash
git clone <repository-url>
```
Move into the project directory:
```bash
cd commerce-core-api-be
```
Install dependencies:
```bash
npm install
```
Create a `.env` file in the project root.
If `.env.example` is included in the repository, you can copy it:
```bash
cp .env.example .env
```
On Windows PowerShell:
```powershell
Copy-Item .env.example .env
```
Configure the required environment variables before running the application.
## Environment Configuration
### Application
```env
PORT=
APP_URL=
CLIENT_URL=
NODE_ENV=development
APP_NAME=Commerce Core
```
### Database
```env
DATABASE_URL=
```
The application uses PostgreSQL with Prisma ORM.
Example connection-string format:
```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```
### Authentication and Token Security
```env
JWT_ACCESS_SECRET=
EMAIL_VERIFICATION_TOKEN_HASH_SECRET=
REFRESH_TOKEN_HASH_SECRET=
PASSWORD_RESET_TOKEN_HASH_SECRET=
```
These secrets are used for authentication and hashing sensitive tokens.
Use strong random values and never commit real secrets to GitHub.
### SMTP / Email
```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```
Nodemailer is used for sending application emails.
For Gmail SMTP, typical settings are:
```text
Host: smtp.gmail.com
Port: 587
```
An App Password should be used when required instead of a normal Gmail account password.
### Google OAuth
```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```
Create OAuth credentials in Google Cloud Console.
The callback URL configured in the application must also be registered in Google OAuth settings.
Example local callback:
```text
http://localhost:8080/auth/google/callback
```
### AWS S3
```env
AWS_REGION=
AWS_S3_BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_SIGNED_URL_EXPIRES_IN_SECONDS=3600
```
AWS S3 is used for product and user profile images.
The configured IAM account should only have the permissions required by the application.
### Firebase Push Notifications
```env

FIREBASE_PROJECT_ID=

FIREBASE_CLIENT_EMAIL=

FIREBASE_PRIVATE_KEY=

```
Firebase Admin SDK is used for server-side push notifications.
These credentials normally come from a Firebase service account. Keep the real private key only in the local or deployment environment and never commit it to GitHub.
Firebase push notifications are treated as an optional integration. If these credentials are not configured, the API can continue running while push notifications are skipped.
### Twilio SMS
```env

TWILIO_ACCOUNT_SID=

TWILIO_AUTH_TOKEN=

TWILIO_PHONE_NUMBER=

```
Twilio is used for SMS notifications.
Twilio SMS is treated as an optional integration. If these credentials are not configured, the API can continue running while SMS notifications are skipped.

### JazzCash
```env
JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_INTEGRITY_SALT=
JAZZCASH_PAYMENT_URL=
JAZZCASH_RETURN_URL=
```
Use JazzCash sandbox credentials during development.
### Safepay
```env
SAFEPAY_ENVIRONMENT=sandbox
SAFEPAY_API_KEY=
SAFEPAY_SECRET_KEY=
SAFEPAY_WEBHOOK_SECRET=
SAFEPAY_INTENT=CYBERSOURCE
```
`SAFEPAY_WEBHOOK_SECRET` is used to verify incoming Safepay webhook signatures.
Safepay return and cancel URLs are generated by the backend from the configured client URL, so separate return and cancel environment variables are not required.
## Prisma Setup
Generate the Prisma client:
```bash
npx prisma generate
```
For local development, apply migrations with:
```bash
npx prisma migrate dev
```
For an existing production database, migrations can be applied with:
```bash
npx prisma migrate deploy
```
## Run the Application
Development mode:
```bash
npm run start:dev
```
Standard mode:
```bash
npm run start
```
Production mode:
```bash
npm run start:prod
```
## Build
Compile the application:
```bash
npm run build
```
Compiled files are generated inside:
```text
dist/
```
## Package Management
Project dependencies are defined in:
```text
package.json
```
Installed dependency versions are locked through:
```text
package-lock.json
```
The project requires:
```text
Node.js >= 22.14.0 and < 23
npm >= 10.9.2 and < 11
```
## Security Note
Real credentials must never be committed to the repository.
The real environment file:
```text
.env
```
is excluded through `.gitignore`.
A public repository should use:
```text
.env.example
```
with empty or example values only.
## Project Purpose
Commerce Core API was developed as a complete e-commerce backend project to demonstrate practical backend development using NestJS and real-world integrations.
The project demonstrates experience with:
* REST API development
* Modular NestJS architecture
* Authentication and authorization
* PostgreSQL database design
* Prisma ORM
* E-commerce business logic
* Payment gateway integration
* AWS cloud storage
* Email services
* Firebase push notifications
* Twilio SMS notifications
* Secure token handling
* Role-based permissions
* Admin functionality
* Third-party service integration
## Author
**Mir Younas**
Backend developed with NestJS, TypeScript, Prisma, PostgreSQL, AWS S3, Safepay, JazzCash, Google OAuth, Nodemailer, Firebase Admin SDK, Twilio, and related npm packages.