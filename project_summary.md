# SkillSync — Project Summary & Architecture

SkillSync is an **AI-Powered Assessment and Hackathon Teambuilding Platform**. It allows developers to prove their technical skills through adaptive testing, ensures testing integrity via client-side AI proctoring, and matches them with perfect hackathon teams based on their verified capabilities.

---

## 🛠️ Technology Stack

The application is built using a modern, highly scalable, and performant web stack:

### Frontend (Core Application)
*   **Next.js 14 (App Router)**: The core React framework used for routing, server-side rendering, and API routes.
*   **React 18**: For building interactive UI components with modern hooks (`useState`, `useEffect`, `useCallback`, `useRef`).
*   **TypeScript**: Ensures type safety across the entire application, reducing runtime errors and improving developer experience.

### Styling & Design
*   **Tailwind CSS**: A utility-first CSS framework for rapid UI development and responsive design.
*   **Vanilla CSS Variables**: Used in conjunction with Tailwind to build a seamless **Dynamic Theme System** (Dark/Light mode).
*   **Google Fonts**: `Playfair Display` for premium headings, `Manrope` for readable body text, and `IBM Plex Mono` for technical elements.
*   **Lucide React**: For lightweight, scalable SVG icons.

### State Management
*   **Zustand**: A small, fast, and scalable bearbones state-management solution used for managing the user session, profile data, and UI states without the boilerplate of Redux.

### Backend & Database
*   **Supabase**: An open-source Firebase alternative serving as the Backend-as-a-Service (BaaS).
    *   **PostgreSQL Database**: Stores user profiles, skill progress, test sessions, hackathon details, and team invites.
    *   **Supabase SSR**: Handles secure server-side rendering authentication.

### AI & Proctoring (Browser-Native)
*   **MediaPipe by Google (`@mediapipe/face_detection`)**: A machine learning framework that runs entirely in the user's browser via WebAssembly. It tracks facial presence and coordinates to ensure the user isn't looking away or receiving off-screen help.
*   **Native Web APIs**: `MediaDevices API` for webcam access and `Page Visibility API` for detecting tab-switching.

---

## ✨ Key Features

### 1. Dynamic User Profiles & Onboarding
*   Users can select their specific tech stack (Frontend, Backend, Database, Cloud) and interests.
*   Persistent state across sessions, allowing users to pick up right where they left off.
*   Seamless Dark/Light theme switching that syncs with user preferences.

### 2. Adaptive Skill Assessments
*   **Sequential Unlocking**: Tests are structured in tiers (Easy → Medium → Hard). You must score ≥60% on Easy to unlock Medium, preventing users from attempting tests above their verified skill grade.
*   **AI Question Generation**: The application connects to an AI backend (`/api/generate-questions`) to fetch randomized, dynamic questions so no two tests are exactly the same.
*   **Weak Concept Tracking**: When a user fails specific questions, the system logs the underlying concepts (e.g., "SQL Joins", "React Hooks") as "weak concepts" to help the user study and improve.

### 3. Strict AI-Powered Proctoring
*   **Real-time Face Tracking**: Analyzes webcam frames at 30 FPS. If `0 faces` or `>1 faces` are detected, it registers a violation.
*   **3-Strikes UI (Hearts System)**: Users are given 3 "lives" (❤️ ❤️ ❤️). Violations visually break a heart and display a floating warning message.
*   **Tab Switching Detection**: If a user leaves the test tab to search for an answer, the test is immediately compromised.
*   **Auto-Submit**: If all 3 hearts break, or if tab-switching is detected, the test forcefully auto-submits, preventing cheating.

### 4. Hackathon Team Matching
*   Once skills are verified through assessments, the platform uses that data to accurately match users into balanced hackathon teams.
*   Real-time team visibility and invite management backed by custom Supabase PostgreSQL policies.

---

## 🚀 Architecture Highlights
*   **Edge-Ready**: By utilizing Next.js App Router and Supabase SSR, the app is highly optimized for deployment on Vercel or similar Edge networks.
*   **Privacy-First AI**: The proctoring system uses client-side inference. Video frames are analyzed locally in the browser and **never** sent to a server, ensuring maximum privacy and minimal server latency.
