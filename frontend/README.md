# Frontend

React 19 + Vite + Tailwind CSS dashboard for the Centralized Insurance
Pre-Authorization & Claim Management System. It talks only to the Express
backend (see the root `README.md` for setup and the demo walkthrough).

```bash
npm install
npm run dev      # http://localhost:5173  (backend must be running on :5000)
npm run build    # production build in dist/
```

## Structure

```
src/
├── config/        API URL, status enums, document taxonomy, role navigation
├── services/      ALL network calls (Axios + Socket.IO). Pages never call the API directly
├── context/       AuthContext (JWT session), NotificationContext (live badge)
├── hooks/         useAsync (loading/error/data), useLiveRefresh (socket events)
├── routes/        ProtectedRoute, RoleGuard, AppRoutes
├── layouts/       App shell (sidebar + header)
├── components/    common/, forms/, documents/ (ReadinessPanel, FileUpload...), queries/, ...
└── pages/         auth/, patient/, hospital/, insurer/, admin/, shared/
```

## Key screens

| Screen | File |
|---|---|
| Readiness panel (READY / NOT READY, missing items, per-item upload) | `components/documents/ReadinessPanel.jsx` |
| Request detail: timeline, readiness, queries, insurer actions | `pages/shared/PreAuthorizationDetail.jsx` |
| Patient Document Vault | `pages/shared/DocumentVaultPage.jsx` |
| Claim detail (bill required before verification) | `pages/shared/ClaimDetail.jsx` |
| Query thread with attachments | `components/queries/QueryConversation.jsx` |
| Admin reports (Recharts) | `pages/admin/AdminReports.jsx` |

## Configuration

`.env` (already present):
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Notes

- Client-side file validation (PDF/JPG/JPEG/PNG, max 5 MB) gives instant feedback; the backend validates again.
- Form labels are linked to their controls automatically (`FormField`), and status messages use `role="status"` / `role="alert"`.
- Styling uses one palette (see `tailwind.config.js`); status colours are used only for status indicators.
