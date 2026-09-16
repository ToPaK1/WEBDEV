# WEBDEV

Professional Angular portfolio for a Full-Stack Web Developer, with an Express API for authentication, contact messages and admin management.

## Frontend

```bash
npm install
ng serve
```

Open `http://localhost:4200` in your browser.

## Backend API

Run the API in a second terminal:

```bash
npm run api
```

The API runs on `http://localhost:3001` by default.

### Environment variables

For production, set:

```env
PORT=3001
JWT_SECRET=your-long-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-strong-admin-password
```

The API stores local development data in `data/webdev.json` and exposes a health check at `/api/health`.

## Main features

- Responsive premium portfolio UI
- Services, projects, testimonials and toolkit sections
- Contact form backed by the Express API
- Customer signup/login with hashed passwords
- JWT authentication
- Protected admin dashboard endpoints
- Project and contact-message management
- Basic request rate limiting and security headers
