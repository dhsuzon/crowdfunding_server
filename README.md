# CrowdFundHub - Server

Backend API for the CrowdFundHub crowdfunding platform built with Express.js and MongoDB.

## Admin Credentials

- **Email:** admin@gmail.com
- **Password:** admin12345

## Live Site

[LIVE_SERVER_URL]

## Features

- RESTful API with Express.js and MongoDB (native driver)
- JWT-based authentication with access tokens
- Role-based authorization middleware (Supporter, Creator, Admin)
- User registration with auto-credit allocation (50 for Supporter, 20 for Creator)
- Campaign CRUD with admin approval workflow
- Contribution system with approve/reject and auto-refund
- Withdrawal system with business logic (20 credits = $1)
- Stripe payment integration for credit purchases
- Notification system for all user actions
- Google OAuth login support
- Secure environment variable configuration
- Pagination support for contributions
- Campaign reporting system for suspicious activity
- CORS enabled for cross-origin requests
