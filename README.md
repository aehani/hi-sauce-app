# Hi! Sauce — Booth App

React + Vite + Tailwind CSS + Framer Motion

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (local preview)
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build locally
npm run preview
```

---

## Adding Your Logo

Place your logo file in the `/public` folder, then open:

**`src/components/LoginPage.jsx`** → find the `Logo()` function

Replace the placeholder `<div>` with:
```jsx
<img src="/hi-logo.png" alt="Hi!" className="h-24 w-auto" />
```

---

## Adding a Background Image

In **`src/components/LoginPage.jsx`**, find the comment:
```
{/* OPTIONAL: Replace with your booth/brand background image */}
```

Uncomment the `<img>` tag and place your image in `/public/background.jpg`.

---

## Changing Staff Names or Passcodes

Edit **`src/config/staff.js`**:

```js
export const STAFF = [
  { id: 'zavi',  name: 'Zavi',  passcode: '1111' },
  { id: 'lynna', name: 'Lynna', passcode: '2222' },
  { id: 'alena', name: 'Alena', passcode: '3333' },
  { id: 'john',  name: 'John',  passcode: '4444' },
]
```

Passcodes are 4 digits. Each staff member has their own session.

---

## Deploying to Your Server

After `npm run build`, upload the contents of the `/dist` folder to your server root.

For **Nginx**:
```nginx
server {
  listen 80;
  root /var/www/hi-sauce-app/dist;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## Project Structure

```
src/
  config/
    staff.js          ← Staff names, passcodes, booth info
  components/
    LoginPage.jsx     ← Main login screen with floating bubbles
    StaffBubble.jsx   ← Individual liquid glass bubble + pop animation
    PasscodeEntry.jsx ← 4-digit passcode keypad
    Dashboard.jsx     ← Placeholder (main app goes here next)
  App.jsx             ← Root app, session state
  index.css           ← Global styles + bubble/glass animations
```
