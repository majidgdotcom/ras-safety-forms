# Data model (ERD)

![ERD](./erd.png)

Source: [`erd.mmd`](./erd.mmd) (Mermaid). Rendered image: [`erd.png`](./erd.png).

## Entities and relationships

| Entity | Key | Relationship |
|---|---|---|
| **User** | `userId` (= Cognito `sub`) | One user submits **0..many** submissions. Role (`ADMIN` / `FRAMER`) comes from the Cognito group. |
| **Site** | `siteId` | One site has **0..many** submissions. |
| **Submission** | `submissionId` (uuid) | Belongs to **1** user and **1** site. Has **1..6** photos. |
| **Photo** | `photoId` | Belongs to **1** submission. File bytes are in S3; the row stores the S3 key. |
| **Day lock** | `userId + siteId + date` | Exactly **1** per submission. Makes "one form per worker, per site, per day" a database rule. |

Design choices:

- `workerName` and `siteName` are **copied** into the submission. If a site is renamed later, old forms still show what the worker saw that day (a historical record).
- `status` is **derived** from the checklist when the form is saved (`ATTENTION` if any answer is `NO`). It is stored so the list can filter by it without re-computing.
- `date` (work day) is separate from `createdAt` (exact time). Filters and "today" use the work day in BC time (`America/Vancouver`).

## How it is stored: DynamoDB single-table design

All entities live in **one table** (`ras-safety-<stage>`). The partition key (`PK`) and sort key (`SK`) plus three global secondary indexes (GSI) decide which questions the app can ask quickly.

| Entity | PK | SK | GSI1 (PK / SK) | GSI2 (PK / SK) | GSI3 (PK / SK) |
|---|---|---|---|---|---|
| User | `USER#<userId>` | `PROFILE` | `ROLE#<role>` / `NAME#<name>` | | |
| Site | `SITE#<siteId>` | `PROFILE` | `SITES` / `NAME#<name>` | | |
| Submission | `SUBMISSION#<id>` | `DETAILS` | `USER#<userId>` / `DATE#<date>#<createdAt>` | `SITE#<siteId>` / `DATE#...` | `SUBMISSIONS` / `DATE#...` |
| Photo | `SUBMISSION#<id>` | `PHOTO#<photoId>` | | | |
| Day lock | `DAYLOCK#<userId>#<siteId>#<date>` | `LOCK` | | | |

### Access patterns (every screen is one query)

| Question | How |
|---|---|
| Open one submission **with its photos** | `Query PK = SUBMISSION#<id>` → returns the `DETAILS` row and all `PHOTO#` rows together |
| My submissions (framer), or filter by worker (admin) | `GSI1: USER#<userId>`, `SK BETWEEN DATE#from AND DATE#to` |
| Filter by site | `GSI2: SITE#<siteId>`, same date range |
| All submissions in a date range / dashboard | `GSI3: SUBMISSIONS`, same date range |
| All framers (for "not submitted today") | `GSI1: ROLE#FRAMER` |
| All sites | `GSI1: SITES` |
| Already submitted today? | `GetItem DAYLOCK#<userId>#<siteId>#<date>` |

Remaining filters (e.g. site **and** worker, status) are applied in the Lambda after the most selective query.

### Writing a submission

One `TransactWriteItems` call writes the submission row, the day-lock row (`attribute_not_exists` condition) and the photo rows. If the worker already sent a form for that site and day, the condition fails, **nothing** is saved, and the API returns `409 Conflict`.

### Trade-offs (honest notes)

- `GSI3` uses one partition key (`SUBMISSIONS`). Fine for one company's volume (hundreds of forms per day). At very large scale I would shard it by month (`SUBMISSIONS#2026-10`).
- A relational database (PostgreSQL) would map 1:1 to this ERD and allow ad-hoc SQL reports. I chose DynamoDB to stay fully serverless (no server to run, pay per request) and because the access patterns are known and few.
