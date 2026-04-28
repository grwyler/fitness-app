# **Fitness App – Product Requirements Document (PRD)**

## **1\. Vision**

Build a fitness app that removes the need for users to plan or think about their workouts. The system generates workouts, adjusts them over time, and tracks progress automatically so users can focus on showing up and putting in effort.

The goal is to make working out feel simple, repeatable, and effective without requiring users to understand programming or progression strategies.

---

## **2\. Target Users**

### **Primary Users**

People who:

* Feel overwhelmed by workout planning  
* Want to exercise but struggle with consistency  
* Prefer being told exactly what to do  
* Care about results but don’t want to manage details

### **Secondary Users**

* Intermediate lifters who feel stuck or plateaued  
* Busy professionals with limited time/energy  
* People who have tried other apps but didn’t stick with them

---

## **3\. Problem Statement**

Most fitness apps require too many decisions:

* Choosing exercises  
* Deciding weights  
* Tracking progress manually

This leads to:

* Cognitive overload  
* Skipped workouts  
* Poor or inconsistent progression

Many users don’t actually want control — they want a system they can trust to guide them.

---

## **4\. Value Proposition**

The product should feel like:

“I just open the app, do the workout, and it works.”

Users:

* Show up  
* Follow instructions  
* Log what happened

The system handles everything else.

---

## **5\. Key Differentiators**

* No planning required from the user  
* Automatic progression based on performance  
* Simple effort-based feedback instead of complex inputs  
* Fast, minimal interface designed for use during workouts

---

## **6\. MVP Scope (V1)**

### **Included**

* User authentication  
* Pre-generated workouts  
* Simple set logging  
* Effort feedback (Too Easy / Just Right / Too Hard)  
* Basic progression tracking  
* Mobile-first UI optimized for speed

### **Not Included (for V1)**

* Custom workouts  
* Social features  
* Nutrition tracking  
* Wearables integration  
* Advanced analytics

---

## **7\. Core User Flow**

**Primary loop:**  
 Open app → Start workout → Perform exercises → Log sets → Complete workout → View progress

This loop should be extremely fast and frictionless.

---

## **8\. Data Model (High-Level)**

* User  
* Program  
* Workout  
* Exercise  
* Set

---

## **9\. Core Screens**

* Dashboard  
* Active Workout (most important screen)  
* Workout Summary  
* History  
* Progress  
* Settings

---

## **10\. UX Principles**

* Minimize thinking during workouts  
* Prefer tapping over typing  
* Optimize for one-handed use  
* Keep interactions fast and simple  
* Design for users who are tired or distracted

---

## **11\. Technical Approach**

* Web app (mobile-first)  
* Next.js frontend/backend  
* PostgreSQL database  
* Hosted on Vercel / Supabase

---

## **12\. Business Model**

* Phase 1: Free (to validate product)  
* Phase 2: Freemium ($5–10/month for advanced features)

---

## **13\. Success Metrics**

* Workouts per user per week  
* Retention (7-day and 30-day)  
* Time to log a workout  
* Workout completion rate

---

## **14\. Risks & Tradeoffs**

### **Progression Accuracy (High Risk)**

If the progression feels wrong, users will lose trust quickly.

The user's logged performance should be treated as a signal about their real strength level. The prescribed workout is a recommendation, not absolute truth. When a user dramatically outperforms the prescribed weight, the system should adapt instead of punishing the user for not matching the prescribed rep target exactly.

### **Simplicity vs Effectiveness**

* Too simple → ineffective workouts  
* Too complex → reintroduces friction

### **User Control**

Users may want flexibility, but too much control undermines the system.

### **Market Competition**

Fitness apps are crowded — success depends on execution and experience, not feature count.

---

## **15\. Open Questions**

* How aggressive should progression be?  
* How much control should users have (if any)?  
* How should missed workouts be handled?  
* How should programs evolve over time?

---

## **16\. Training System (V1)**

### **Structure**

* 3 workouts per week  
* Full-body workouts  
* 45–60 minutes  
* 5 exercises per session:  
  * 2 compound lifts  
  * 3 accessory lifts

---

### **Exercise Selection**

**Compound Lifts (consistent):**

* Squat  
* Bench Press  
* Deadlift  
* Overhead Press  
* Row / Pull variations

**Accessory Lifts (rotating):**

* Isolation or machine movements  
* Rotate every 4–6 sessions to reduce boredom

---

### **Example Workout**

Workout A:

* Squat  
* Bench Press  
* Row  
* Bicep Curl  
* Tricep Pushdown

---

### **Set/Rep Scheme**

* 3 sets × 8 reps (fixed for V1)

---

### **Progression Rules**

**Compound lifts:**

* Standard: \+5 lbs  
* If “Too Easy”: \+10 lbs

**Accessory lifts:**

* Standard: \+2.5 lbs  
* If “Too Easy”: \+5 lbs

---

### **Outcome Logic**

* Completed normally → increase weight  
* Marked “Too Hard” → repeat weight  
* Missed reps:  
  * First failure → repeat weight  
  * Second failure → reduce weight by \~5–10%

Failure is detected automatically based on logged reps in the normal V1 case where actual weight is at or near the prescribed weight.

---

### **Adaptive Performance Recalibration (Post-MVP / Immediate Next Priority)**

The progression system must detect when logged performance proves the prescribed working weight is far too low.

Example:

* Prescribed: Bench Press, 135 lb x 5 reps
* Logged: 225 lb x 4 reps across working sets

This should not be classified as a missed-rep failure simply because 4 reps is below the prescribed target. The heavier actual load is a stronger signal than the missed target reps.

Expected behavior:

* Detect out-of-model performance when actual logged weight is materially above prescribed weight.
* Classify the exercise result as overperformance / recalibration-needed, not missed reps.
* Use actual logged performance to update the future working weight more aggressively than the normal fixed increment.
* Preserve progressive overload while avoiding a dangerous overreaction to one anomalous set.
* Avoid negative feedback such as "failed set" when the user clearly demonstrated higher strength.
* Keep the backend as the source of truth for the recalibration decision.
* Keep mobile responsible for displaying clear feedback, not owning progression logic.

MVP-safe rule candidates:

* Detect overperformance when actual weight is approximately 25-30% or more above prescribed weight.
* Estimate strength with a simple formula such as Epley: `e1rm = weight * (1 + reps / 30)`.
* Re-anchor future working weight from estimated strength instead of only adding a fixed increment.
* Use best set, median set, multiple-set average, or conservative averaging to avoid overreacting.
* Consider a recalibration window for the next 1-2 workouts so the system converges toward an appropriate working weight.

Acceptance criteria:

* Given a materially heavier actual weight and slightly lower reps, progression does not label the result as a failed exercise.
* The next working weight is adjusted toward the user's demonstrated strength, not repeated or reduced due only to missed target reps.
* User-facing feedback is positive and explanatory, for example: "Adjusted your working weight based on your performance."
* The response remains conservative if only one set is dramatically heavier or the logged values are implausible.
* The client displays the backend-provided progression result and does not calculate recalibration locally.

Edge cases:

* One heavy set with the remaining sets near prescription should trigger caution or a smaller adjustment.
* Multiple consistent heavy sets should justify stronger recalibration.
* Actual weight far above prescription with very low reps should be treated as a strength signal, but not blindly converted into an unsafe working weight.
* Bodyweight or machine exercises may need exercise-specific thresholds.
* Missing actual weight should fall back to normal V1 progression rules.
* Edited or corrected set logs should cause recalibration to be recomputed only by the backend.

---

### **Missed Workouts**

* Resume where the user left off  
* No penalties

---

### **Philosophy**

Progression should feel:

* Predictable  
* Stable  
* Easy to understand

---

## **17\. Active Workout Screen (Core Experience)**

### **Example Display**

Bench Press  
 3 × 8 @ 135 lbs

### **Interaction**

Set 1 \[8 reps\] \[Confirm\]  
 Set 2 \[8 reps\] \[Confirm\]  
 Set 3 \[8 reps\] \[Confirm\]

After last set:  
 “How did this feel?”

* Too Easy  
* Just Right  
* Too Hard

---

### **Design Goals**

* One tap per set  
* Pre-filled inputs  
* Large buttons  
* Minimal typing

---

### **Navigation**

* Auto-scroll between sets  
* Auto-advance exercises  
* Persistent “Finish Workout” button

---

### **Performance Target**

* Log a set in under 2 seconds

---

## **18\. Progress Feedback (Trust Layer)**

After workouts, show simple feedback:

* “+5 lbs from last session”  
* “New personal best”  
* “3 workouts completed this week”

Purpose:

* Reinforce progress  
* Build trust in the system  
* Encourage consistency

---

## **19\. Minimum Lovable Product (MLP)**

The product is ready when:

* Workouts load instantly  
* Logging feels fast and effortless  
* Progression feels correct within a few sessions

Users should feel:

* “This is easy to use”  
* “This actually works”

---

## **20\. Scope Constraints (V1)**

Explicitly excluded:

* Customization features  
* Social features  
* Nutrition tracking  
* Advanced analytics

**Rule:**  
 If a feature adds friction or decision-making, it should not be included.

---

## **21\. Build Plan (Suggested Order)**

1. Authentication  
2. Data model  
3. Training/progression logic  
4. Active workout screen  
5. Logging system  
6. Progress tracking  
7. UI polish  
8. Deployment  
9. User testing

---

## **22\. Product Philosophy**

This product is less about tracking and more about creating trust.

If users trust the system:

* They will keep showing up  
* They will follow the plan  
* They will get results

Everything should be evaluated based on:

* Does this reduce friction?  
* Does this increase trust?

If not, it shouldn’t be included.

---
