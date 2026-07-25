# v1.1 flexible study update

- Daily Scripture remains visually unchanged after completion; no strike-through is applied.
- Removed `+5 XP` wording from the UI. XP is still recorded internally.
- Replaced the duplicate Meeting Range home card with Personal Study.
- Added `/personal-study`, stored privately under `users/{uid}/personalStudies`.
- Personal Study is deliberately isolated from shared Study, Notes, and Ministry collections so all four areas can be redesigned independently later.
- Deploy the updated Firestore rules after updating the app:
  `firebase deploy --only firestore`
