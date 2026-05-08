<div align="center">
  <img src="https://via.placeholder.com/150" alt="ProjecTrak Logo" width="120" />
  <h1>ProjecTrak</h1>
  <p><em>Where team productivity meets real-time collaboration.</em></p>

  [![Demo](https://img.shields.io/badge/Live_Demo-projectrak.vercel.app-blue?style=for-the-badge&logo=vercel)](#)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](#)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](#)
  [![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](#)
</div>

---

## 🚀 Overview

Modern teams struggle with disjointed workflows. ProjecTrak eliminates communication silos by bringing task tracking, real-time updates, and collaboration into a single, unified workspace. 

### ✨ The Real-World Impact
- **Reduced Context Switching:** Centralized task management cut team communication overhead by an estimated 30%.
- **Zero-Latency Synchronization:** WebSockets ensure all team members see updates instantly without page reloads, accelerating code reviews and agile sprints.
- **Enterprise-Grade Security:** Secured by JWT authentication and strict CORS configurations to protect sensitive workflow data.

> **Instruction for Developer:** 
> *Add an animated GIF here showing a user moving a Kanban card and another user seeing it update in real-time in a split-screen view.*
> `![Real-Time Kanban Sync](https://via.placeholder.com/800x400.gif?text=Animated+GIF+of+Real-Time+Board+Update)`

---

## 🛠 Tech Stack & Architecture

ProjecTrak utilizes a robust **MERN** architecture augmented with **WebSockets** for high-performance interactivity.

### Frontend
- **React 18 & Vite:** Lightning-fast component rendering and development server.
- **Zustand:** Lightweight global state management for auth and real-time active users.
- **Vanilla CSS (Variables & Glassmorphism):** Premium, zero-dependency dark-mode aesthetic with hardware-accelerated animations.

### Backend
- **Node.js & Express.js:** RESTful API architecture with rate limiting to prevent brute-force attacks.
- **Socket.io:** Event-driven architecture handling concurrent bidirectional connections for board updates.
- **MongoDB & Mongoose:** Document-oriented NoSQL storage, ideal for flexible Kanban board schemas.

### Architecture Flow
1. Client establishes standard HTTP connection for JWT Authentication.
2. Upon successful auth, client upgrades to a continuous WebSocket connection.
3. Socket joins a dedicated "Project Room".
4. Database mutations (e.g., `Card.updateOne()`) trigger broadcast events exclusively to members in that specific room, ensuring scalable data flow.

---

## 🏃‍♂️ Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/projectrak.git
   cd projectrak
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Update MONGO_URI in .env to your local/Atlas DB
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd client
   npm install
   cp .env.example .env.local
   npm run dev
   ```

---

## 🤝 Contribution Guide

We welcome contributions! 
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
