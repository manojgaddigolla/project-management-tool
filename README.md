# Full-Stack Project Management Tool (ProjecTrak)

A feature-rich, full-stack project management application built with the MERN stack (MongoDB, Express.js, React, Node.js) and augmented with real-time collaboration via Socket.io. This application allows teams to manage projects through Kanban boards, track task progress, assign work to members, and collaborate in real time — all within a single unified workspace.

---

## Features

-   **Kanban Board Management:** Organize work with fully customizable boards, columns, and cards with support for drag-and-drop reordering using `@dnd-kit`.
-   **Real-Time Collaboration:** Changes to boards, cards, and columns are broadcast instantly to all project members via Socket.io WebSocket rooms — no page reload required.
-   **User Authentication:** A complete JWT-based authentication system for user registration and login.
-   **Password Hashing:** User passwords are securely hashed using `bcryptjs` before being stored.
-   **Protected Routes:** A secure, private dashboard is only accessible to logged-in users.
-   **Project & Member Management:** Create projects, invite team members, and manage access — all scoped per project.
-   **Rich Card Details:** Each card supports a title, rich-text description (via `react-quill-new`), priority levels (`low`, `medium`, `high`, `urgent`), due dates, assigned members, checklist items, and threaded comments.
-   **Notifications & Activity Log:** In-app notifications and a full activity feed keep every team member informed of changes across their projects.
-   **Analytics Dashboard:** A dedicated analytics view surfaces project-level metrics and task progress at a glance.
-   **Rate Limiting:** Separate rate limiters protect general API routes (100 req/15 min) and authentication endpoints (20 req/15 min) against abuse and brute-force attacks.
-   **NoSQL Injection Protection:** A custom sanitization middleware strips `$`-prefixed keys and dot-notation from all incoming request bodies, queries, and params.
-   **Security Headers:** Custom middleware applies `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS (in production) to every response.
-   **Input Validation:** Server-side request validation is enforced using `express-validator`.
-   **Automated Testing:** The backend includes an integration test suite powered by Jest, Supertest, and an in-memory MongoDB server.
-   **Responsive UI:** The application is built with React 19 and Vite for a fast, modern user experience on all devices.

---

## Tech Stack

### Backend

-   **Node.js:** JavaScript runtime environment.
-   **Express.js (v5):** Web framework for building the RESTful API.
-   **MongoDB:** NoSQL database for storing users, projects, boards, columns, cards, and activity data.
-   **Mongoose:** Object Data Modeling (ODM) library for MongoDB.
-   **Socket.io:** Event-driven WebSocket library for real-time bidirectional communication between clients and the server.
-   **JSON Web Tokens (JWT):** For secure, stateless user authentication.
-   **bcryptjs:** For hashing user passwords before storage.
-   **express-rate-limit:** For rate limiting API and authentication routes.
-   **express-validator:** For server-side input validation and sanitization.

### Frontend

-   **React 19:** JavaScript library for building the user interface.
-   **Vite:** Next-generation frontend build tool and development server.
-   **React Router DOM (v7):** For client-side routing and navigation.
-   **Zustand:** Lightweight global state management for authentication and real-time presence.
-   **Socket.io-client:** WebSocket client library for connecting to the real-time backend.
-   **@dnd-kit/core & @dnd-kit/sortable:** Accessible drag-and-drop toolkit for reordering Kanban cards and columns.
-   **Axios:** For making HTTP requests to the backend API.
-   **react-quill-new:** Rich-text editor for card descriptions.
-   **DOMPurify:** Sanitizes rich-text HTML on the client side before rendering to prevent XSS.
-   **React Toastify:** For non-intrusive in-app toast notifications.

---

## Installation and Setup

Follow these steps to get the project running on your local machine.

### Prerequisites

-   Node.js (v20.19+ or v22.12+ recommended)
-   npm (Node Package Manager)
-   MongoDB (You can use a local installation or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)

### 1. Clone the Repository

```sh
git clone https://github.com/manojgaddigolla/project-management-tool.git
cd project-management-tool
```

### 2. Setup the Backend

Navigate to the backend directory:

```sh
cd backend
```

Install the necessary NPM packages:

```sh
npm install
```

Create a `.env` file in the `backend` directory and add the following environment variables. **Replace the placeholder values with your own secure values.**

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=generate_a_long_random_secret_here
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

Start the backend development server:

```sh
npm run dev
```

The server will be running on `http://localhost:5000`. You can verify it is healthy by visiting `http://localhost:5000/api/health`.

### 3. Setup the Frontend

Open a new terminal window and navigate to the client directory:

```sh
cd client
```

Install the necessary NPM packages:

```sh
npm install
```

Create a `.env.local` file in the `client` directory and add the following variable. This should point to your running backend server.

```env
VITE_BACKEND_API_URL=http://localhost:5000
```

Start the frontend development server:

```sh
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### 4. Running Tests (Optional)

The backend includes an automated integration test suite. To run it:

```sh
cd backend
npm test
```

Tests use an in-memory MongoDB instance via `mongodb-memory-server`, so no external database connection is required to run the test suite.

---

## Contact

Project Link: https://github.com/manojgaddigolla/project-management-tool.git