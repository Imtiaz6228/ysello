# Namecheap deployment

The project includes both a production-ready frontend and a Node.js marketplace
API. Choose the setup that matches the hosting account.

## Frontend on standard shared hosting

1. Run `npm ci` and `npm run build:web` on a local machine or build server.
2. Open cPanel File Manager and upload the **contents** of `dist/` into
   `public_html/`.
3. Keep the included `.htaccess` file in `public_html/`; it provides direct-link
   support for React routes.
4. If the API is hosted elsewhere, set `VITE_API_BASE_URL` before building so
   the frontend calls the correct HTTPS API address.

The generated frontend is static and works with Apache shared hosting. Login,
checkout, seller dashboards, database data, email, and other API-backed features
still require the Node.js API.

## Full marketplace with cPanel Node.js support

1. Upload the project source outside `public_html`.
2. In cPanel, create a Node.js application using the Node version from
   `package.json`.
3. Set the application root to the uploaded project and the startup file to
   `dist-api/server.js`.
4. Add the production variables documented in `.env.example`, including
   `DATABASE_URL`, `APP_URL`, `VITE_SITE_URL`, session/JWT secrets, and mail or
   payment settings that the store uses.
5. In the cPanel terminal, run:

   ```bash
   npm ci
   npm run prisma:generate
   npm run build
   npm run prisma:migrate
   ```

6. Restart the Node.js application from cPanel and point the domain to it.

Use HTTPS for both the site and API. Never upload a local `.env` file or database
credentials into a public web directory.
