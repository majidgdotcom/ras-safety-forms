/**
 * DynamoDB single-table design. Every entity lives in ONE table; the keys below
 * decide which "query" can find it. See docs/ERD.md for the full explanation.
 *
 *  Entity      | PK                         | SK              | GSI1PK / GSI1SK                 | GSI2PK / GSI2SK           | GSI3PK / GSI3SK
 *  ------------|----------------------------|-----------------|---------------------------------|---------------------------|-----------------------------
 *  User        | USER#<userId>              | PROFILE         | ROLE#<role> / NAME#<name>       |                           |
 *  Site        | SITE#<siteId>              | PROFILE         | SITES / NAME#<name>             |                           |
 *  Submission  | SUBMISSION#<submissionId>  | DETAILS         | USER#<userId> / DATE#<d>#<ts>   | SITE#<siteId> / DATE#...  | SUBMISSIONS / DATE#<d>#<ts>
 *  Photo       | SUBMISSION#<submissionId>  | PHOTO#<photoId> |                                 |                           |
 *  Day lock    | DAYLOCK#<userId>#<siteId>#<date> | LOCK      |   (enforces 1 form per worker/site/day)
 */
export const Keys = {
  user: {
    pk: (userId: string) => `USER#${userId}`,
    sk: 'PROFILE',
    gsi1pk: (role: string) => `ROLE#${role}`,
    gsi1sk: (name: string) => `NAME#${name.toLowerCase()}`,
  },
  site: {
    pk: (siteId: string) => `SITE#${siteId}`,
    sk: 'PROFILE',
    gsi1pk: 'SITES',
    gsi1sk: (name: string) => `NAME#${name.toLowerCase()}`,
  },
  submission: {
    pk: (submissionId: string) => `SUBMISSION#${submissionId}`,
    sk: 'DETAILS',
    byUser: (userId: string) => `USER#${userId}`,
    bySite: (siteId: string) => `SITE#${siteId}`,
    all: 'SUBMISSIONS',
    /** Sort key that sorts by work date, then by time submitted. */
    dateSk: (date: string, createdAt: string) => `DATE#${date}#${createdAt}`,
  },
  photo: {
    pk: (submissionId: string) => `SUBMISSION#${submissionId}`,
    sk: (photoId: string) => `PHOTO#${photoId}`,
    skPrefix: 'PHOTO#',
  },
  dayLock: {
    pk: (userId: string, siteId: string, date: string) => `DAYLOCK#${userId}#${siteId}#${date}`,
    sk: 'LOCK',
  },
} as const;

/** Range for a BETWEEN query on a DATE#... sort key (the "~" sorts after every timestamp). */
export const dateBetween = (from: string, to: string) => ({
  start: `DATE#${from}`,
  end: `DATE#${to}#~`,
});
