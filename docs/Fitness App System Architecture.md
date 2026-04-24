# **Technical Architecture Document**

## **Fitness App (Mobile-First System)**

---

## **1\. Overview**

This document defines the technical architecture for a mobile-first fitness application designed to eliminate decision-making during workouts by automatically generating, progressing, and tracking training sessions.

The system prioritizes:

* Simplicity  
* Speed  
* Reliability  
* Low cognitive load

Based on the PRD, the product must support a **fast, frictionless workout loop** with minimal user input and high system trust.

---

## **2\. High-Level Architecture**

Mobile App (Expo / React Native)

       ↓

API Layer (Backend Service)

       ↓

Database (Postgres or MongoDB)

       ↓

Storage / Auth / Analytics / Logging Services

### **Design Principles**

* Thin client, smart backend  
* Stateless API layer  
* Strong data consistency for progression logic  
* Low latency interactions (critical for workout flow)

---

## **3\. Frontend (Mobile App)**

### **Stack**

* **Expo (React Native)**  
* TypeScript  
* React Query (server state management)  
* Zustand or Redux (light client state)  
* React Navigation

### **Responsibilities**

* Render workout UI (core experience)  
* Handle user input (set logging, feedback)  
* Cache minimal session state  
* Optimistic UI updates for speed

### **Key Decisions**

* **Expo over bare React Native**  
  * Faster iteration  
  * Easier deployment  
  * Built-in APIs (notifications, storage)  
* **Optimistic Updates**  
  * Logging must feel instant (\<2 seconds per set)  
  * Sync handled in background

---

## **4\. Backend / API Layer**

### **Stack Options**

* **Node.js (TypeScript)**  
* Framework:  
  * Express (simple)  
  * OR NestJS (structured, scalable)

### **Hosting Options**

* Vercel (serverless functions)  
* Railway  
* Render

### **Recommendation**

* **Start with Vercel serverless**  
  * Scales automatically  
  * Minimal infra overhead

### **Responsibilities**

* Workout generation  
* Progression logic  
* Set logging validation  
* User data management  
* Auth validation  
* Business rules enforcement

### **Architecture Style**

* REST API (simple, predictable)  
* Future: GraphQL optional if needed

---

## **5\. Database**

### **Options**

* PostgreSQL (recommended)  
* MongoDB (alternative)

### **Recommendation: PostgreSQL**

Reasons:

* Strong relational model (User → Program → Workout → Exercise → Set)  
* Better for progression logic consistency  
* Easier querying for history/progress

### **Hosting Options**

* Supabase  
* Neon

### **Schema (High-Level)**

User

Program

Workout

Exercise

Set

WorkoutLog

ProgressionState

### **Key Design Decision**

* Store **progression state explicitly**  
  * Avoid recalculating from history  
  * Ensures predictable progression (critical trust factor)

---

## **6\. Authentication**

### **Options**

* Clerk (recommended)  
* Supabase Auth  
* Custom auth

### **Recommendation: Clerk**

Reasons:

* Fastest to implement  
* Excellent mobile support  
* Handles sessions, JWTs, social login

### **Flow**

Client → Clerk → JWT → Backend verifies → Access granted

---

## **7\. Storage**

### **Use Cases**

* Minimal for V1  
* Potential:  
  * User profile data  
  * Future: media (exercise demos)

### **Options**

* Supabase Storage  
* AWS S3

### **Recommendation**

* **Supabase Storage (simple integration)**

---

## **8\. Hosting & Infrastructure**

### **Frontend**

* Expo (EAS build \+ OTA updates)

### **Backend**

* Vercel (initial)  
* Can migrate to:  
  * Railway / Render for long-running jobs

### **Database**

* Supabase or Neon (Postgres)

### **Architecture Strategy**

* Start serverless  
* Migrate only if needed

---

## **9\. Analytics**

### **Tools**

* PostHog (recommended)  
* Amplitude (alternative)

### **Tracked Events**

* Workout started  
* Set logged  
* Workout completed  
* Effort feedback selected  
* Retention metrics

### **Reasoning**

Aligns directly with success metrics:

* Workouts per week  
* Completion rate  
* Retention

---

## **10\. Error Logging & Monitoring**

### **Tools**

* Sentry (recommended)

### **Coverage**

* Frontend (React Native)  
* Backend (API)

### **Use Cases**

* Crash tracking  
* API failures  
* Performance monitoring

---

## **11\. Core System Logic (Critical Component)**

### **Workout Generation**

* Pre-generated programs (V1)  
* Stored in DB  
* Assigned to user

### **Progression Engine**

Handles:

* Weight increases  
* Failure detection  
* Effort feedback interpretation

### **Key Rules**

* Deterministic logic (predictable behavior)  
* Stored state (not inferred)

This is the **highest-risk system component** per PRD:

If progression feels wrong, users lose trust quickly

---

## **12\. Performance Considerations**

### **Critical Requirements**

* Load workout instantly  
* Log set \< 2 seconds  
* Minimal API round trips

### **Strategies**

* Client-side caching (React Query)  
* Optimistic UI updates  
* Batch API calls where possible

---

## **13\. Security Considerations**

* JWT validation on all API routes  
* Row-level security (if using Supabase)  
* Rate limiting (basic)  
* Secure storage for tokens

---

## **14\. Future Scalability**

### **Planned Evolutions**

* Move to dedicated backend (if serverless limits hit)  
* Introduce background workers (progression, scheduling)  
* Add personalization engine

### **Potential Additions**

* Redis (caching)  
* Queue system (BullMQ / RabbitMQ)

---

## **15\. Final Recommended Stack (Opinionated)**

**Frontend**

* Expo (React Native)  
* TypeScript  
* React Query

**Backend**

* Node.js (TypeScript)  
* Vercel Serverless Functions

**Database**

* PostgreSQL (Neon or Supabase)

**Auth**

* Clerk

**Storage**

* Supabase Storage

**Analytics**

* PostHog

**Error Logging**

* Sentry

---

## **16\. Why This Architecture Works**

This stack is optimized for:

* **Speed of development (MVP-first)**  
* **Low operational overhead**  
* **High iteration velocity**  
* **Strong data consistency (critical for progression trust)**

It directly supports the product philosophy:

Reduce friction, increase trust, and make workouts effortless.

