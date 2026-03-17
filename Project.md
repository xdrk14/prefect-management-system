# Project Overview: Prefect Management System

## Architecture
The Prefect Management System is a high-performance web application designed for managing school prefects, their details, offenses, and event participation.

- **Backend**: Node.js with Express framework.
- **Database**: SQLite3 with WAL (Write-Ahead Logging) mode for enhanced concurrency.
- **Authentication**: Firebase Authentication (Client-side) and Firebase Admin SDK (Server-side).
- **Frontend**: Vanilla JavaScript with Tailwind CSS for styling. Dynamic UI updates are handled through custom event emitters and real-time state management.
- **Clustering**: Supports Node.js clustering for multi-core performance in production.

## System Components

### 1. Authentication & Security
- **Auth Manager (`public/auth/auth-manager.js`)**: The central authority for user state. It listens to Firebase auth changes, fetches user roles from Firestore (`userRoles` collection), and manages granular permissions.
- **Permission System**: 
    - Permissions are page-based (e.g., `main`, `dashboard`, `accounts`, `events`, etc.).
    - Levels: `none`, `view`, `edit`.
    - Roles: `FULL_ACCESS_EDIT`, `FULL_ACCESS_VIEW`, `LIMITED_ACCESS_EDIT`, `LIMITED_ACCESS_VIEW`.
    - **Master Admin Override**: Hardcoded emails (e.g., `hasthij29@gmail.com`) bypass normal restrictions.
- **Server Side**: `server.js` uses `helmet`, `xss-clean`, and `hpp` for protection. API routes are protected by an `authenticate` middleware that verifies Firebase ID tokens.

### 2. Database Schema
The system uses multiple tables divided by "Houses":
- **Houses**: Aquila, Cetus, Cygnus, Ursa, Central.
- **Per-House Tables**:
    - `[House]PrefectData`: Personal details (W0Number, FullName, Position, etc.).
    - `[House]Offenses`: Record of infractions and points deducted.
    - `[House]Events`: Prefect participation in events.
- **Global Tables**: `GeneralEvents`, `HouseEvents`.

### 3. API Layer
- **RESTful Endpoints**: Standard CRUD for prefects, offenses, and events.
- **Batch Processing**: `/api/batch` endpoint allows fetching multiple datasets in a single request for faster dashboard loading.
- **Caching**: Server-side in-memory cache for GET requests to reduce database load.

### 4. User Roles and Default Permissions
| Role | Default Access |
| :--- | :--- |
| `FULL_ACCESS_EDIT` | Edit access to all pages. |
| `FULL_ACCESS_VIEW` | View access to all pages. |
| `LIMITED_ACCESS_EDIT` | Edit access to House pages and Events, but **no** access to Accounts/Central by default. |
| `LIMITED_ACCESS_VIEW` | View access to House pages and Events, but **no** access to Accounts/Central by default. |

*Note: Individual permission overrides can be applied in the Firestore `userRoles` document.*

## Key Files
- `server.js`: Main entry point, API routes, security, and database initialization.
- `public/auth/auth-manager.js`: Client-side authentication and permission logic.
- `public/scripts/accounts-auth.js`: Permission gatekeeper for the Accounts page.
- `public/scripts/accounts-manager.js`: Logic for managing user accounts and permissions.
