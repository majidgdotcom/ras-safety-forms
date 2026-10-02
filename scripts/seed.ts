/**
 * Seeds the deployed stack with demo data:
 *   - Cognito users (1 admin + 6 framers) with permanent passwords, added to their groups
 *   - DynamoDB: user profiles, 5 job sites, ~10 days of submissions with photos
 *   - S3: sample photos for those submissions
 *
 * Usage (after the infrastructure stack is deployed):
 *   AWS_REGION=ca-central-1 STACK_NAME=ras-safety-infra-dev yarn seed
 * Safe to run again: IDs are deterministic, so rows are overwritten, not duplicated.
 */
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  addDays,
  CHECKLIST_KEYS,
  ChecklistAnswer,
  COGNITO_GROUP,
  localDate,
  Role,
  SiteEntity,
  SubmissionEntity,
} from '@ras/shared';

import { SubmissionDomain } from '../services/safety-api/src/domain/submission.domain';
import { Keys } from '../services/safety-api/src/infrastructure/dynamo-keys';

const REGION = process.env.AWS_REGION ?? 'ca-central-1';
const STACK_NAME = process.env.STACK_NAME ?? 'ras-safety-infra-dev';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'RasAdmin2026';
const FRAMER_PASSWORD = process.env.SEED_FRAMER_PASSWORD ?? 'RasFramer2026';
const DAYS = 10;

// ── Demo data (all fictional) ───────────────────────────────────────────────
const USERS = [
  { email: 'admin@example.com', name: 'Sarah Mitchell', role: Role.ADMIN },
  { email: 'framer@example.com', name: 'Liam Carter', role: Role.FRAMER },
  { email: 'noah.singh@example.com', name: 'Noah Singh', role: Role.FRAMER },
  { email: 'emma.wilson@example.com', name: 'Emma Wilson', role: Role.FRAMER },
  { email: 'mateo.garcia@example.com', name: 'Mateo Garcia', role: Role.FRAMER },
  { email: 'ava.thompson@example.com', name: 'Ava Thompson', role: Role.FRAMER },
  { email: 'ethan.nguyen@example.com', name: 'Ethan Nguyen', role: Role.FRAMER },
];

const SITES: Omit<SiteEntity, 'createdAt'>[] = [
  { siteId: 'site-goldstream', name: 'Goldstream Heights', address: 'Langford, BC', active: true },
  { siteId: 'site-millstream', name: 'Millstream Townhomes', address: 'Langford, BC', active: true },
  { siteId: 'site-colwood', name: 'Colwood Crossing Duplexes', address: 'Colwood, BC', active: true },
  { siteId: 'site-harbour', name: 'Harbour Point Rentals', address: 'Victoria, BC', active: true },
  { siteId: 'site-sooke', name: 'Sooke Basin Cottages', address: 'Sooke, BC', active: true },
];

const ISSUE_NOTES: Record<string, string> = {
  ppeEyeProtection: 'Forgot safety glasses in the truck - borrowed a pair from the site box at 8:15.',
  fallProtection: 'Guardrail missing on the east side of level 2. Taped off the area and told the lead hand.',
  laddersScaffolding: 'One ladder has a cracked rung - tagged it out of service.',
  toolsCords: 'Extension cord has a cut in the jacket. Removed it from use.',
  hazardsIdentified: 'Open stairwell opening not covered yet. Added a temporary cover.',
};

const PHOTO_FILES = ['site-1.jpg', 'site-2.jpg', 'site-3.jpg', 'site-4.jpg', 'site-5.jpg', 'site-6.jpg'];

// Small deterministic random generator so every run creates the same data
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// ── AWS clients ──────────────────────────────────────────────────────────────
const cfn = new CloudFormationClient({ region: REGION });
const cognito = new CognitoIdentityProviderClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const s3 = new S3Client({ region: REGION });

async function stackOutputs() {
  const res = await cfn.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
  const out = Object.fromEntries(
    (res.Stacks?.[0]?.Outputs ?? []).map((o) => [o.OutputKey, o.OutputValue]),
  );
  for (const k of ['CognitoUserPoolId', 'DynamoTableName', 'PhotoBucketName']) {
    if (!out[k]) throw new Error(`Stack ${STACK_NAME} has no output ${k}. Did the infrastructure deploy finish?`);
  }
  return out as Record<'CognitoUserPoolId' | 'DynamoTableName' | 'PhotoBucketName', string>;
}

/** Creates the Cognito user (or finds it) and returns its "sub" (= our userId). */
async function ensureCognitoUser(poolId: string, u: (typeof USERS)[number]): Promise<string> {
  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: poolId,
        Username: u.email,
        MessageAction: 'SUPPRESS', // don't send invitation emails
        UserAttributes: [
          { Name: 'email', Value: u.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: u.name },
        ],
      }),
    );
  } catch (err) {
    if (!(err instanceof UsernameExistsException)) throw err;
  }
  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: poolId,
      Username: u.email,
      Password: u.role === Role.ADMIN ? ADMIN_PASSWORD : FRAMER_PASSWORD,
      Permanent: true,
    }),
  );
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: poolId,
      Username: u.email,
      GroupName: COGNITO_GROUP[u.role],
    }),
  );
  const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: poolId, Username: u.email }));
  const sub = user.UserAttributes?.find((a) => a.Name === 'sub')?.Value;
  if (!sub) throw new Error(`No sub for ${u.email}`);
  return sub;
}

async function batchPut(table: string, items: Record<string, unknown>[]) {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    let request: Record<string, { PutRequest: { Item: Record<string, unknown> } }[]> | undefined = {
      [table]: chunk.map((Item) => ({ PutRequest: { Item } })),
    };
    while (request && Object.keys(request).length) {
      const res = await ddb.send(new BatchWriteCommand({ RequestItems: request }));
      request = res.UnprocessedItems as typeof request;
    }
  }
}

function randomChecklist(): { checklist: Record<string, ChecklistAnswer>; notes: string } {
  const checklist: Record<string, ChecklistAnswer> = Object.fromEntries(
    CHECKLIST_KEYS.map((k) => [k, 'YES' as ChecklistAnswer]),
  );
  if (rand() < 0.3) checklist.laddersScaffolding = 'NA';
  let notes = rand() < 0.3 ? 'All good. Crew briefed at start of shift.' : '';
  if (rand() < 0.15) {
    const keys = Object.keys(ISSUE_NOTES);
    const bad = keys[Math.floor(rand() * keys.length)];
    checklist[bad] = 'NO';
    notes = ISSUE_NOTES[bad];
  }
  return { checklist, notes };
}

async function main() {
  console.log(`Seeding stack "${STACK_NAME}" in ${REGION}...`);
  const out = await stackOutputs();
  const now = new Date().toISOString();

  // 1. Users
  const users: { userId: string; email: string; name: string; role: Role }[] = [];
  for (const u of USERS) {
    const userId = await ensureCognitoUser(out.CognitoUserPoolId, u);
    users.push({ userId, email: u.email, name: u.name, role: u.role });
    console.log(`  user  ${u.role.padEnd(6)} ${u.email}`);
  }

  const items: Record<string, unknown>[] = [];
  for (const u of users) {
    items.push({
      PK: Keys.user.pk(u.userId),
      SK: Keys.user.sk,
      GSI1PK: Keys.user.gsi1pk(u.role),
      GSI1SK: Keys.user.gsi1sk(u.name),
      entityType: 'USER',
      ...u,
      createdAt: now,
    });
  }

  // 2. Sites
  for (const s of SITES) {
    items.push({
      PK: Keys.site.pk(s.siteId),
      SK: Keys.site.sk,
      GSI1PK: Keys.site.gsi1pk,
      GSI1SK: Keys.site.gsi1sk(s.name),
      entityType: 'SITE',
      ...s,
      createdAt: now,
    });
  }

  // 3. Submissions + photos for the last DAYS days
  const today = localDate();
  const framers = users.filter((u) => u.role === Role.FRAMER);
  let photoCounter = 0;
  let submissionCount = 0;

  for (let back = DAYS - 1; back >= 0; back--) {
    const date = addDays(today, -back);
    if (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) continue; // no work on Sundays

    for (const [i, f] of framers.entries()) {
      // Today: leave the test framer (index 0) and two others without a form,
      // so the reviewer can submit one and the "not submitted today" list has names.
      if (back === 0 && (i === 0 || i >= 4)) continue;
      if (back > 0 && rand() < 0.12) continue; // someone forgets now and then

      const site = SITES[i % SITES.length];
      const { checklist, notes } = randomChecklist();
      const submissionId = `seed-${date}-${i}`;
      const createdAt = `${date}T${String(14 + (i % 3)).padStart(2, '0')}:${String(5 + i * 7).padStart(2, '0')}:00.000Z`;
      const photoTotal = 1 + Math.floor(rand() * 2);

      const submission: SubmissionEntity = {
        submissionId,
        userId: f.userId,
        workerName: f.name,
        siteId: site.siteId,
        siteName: site.name,
        date,
        checklist,
        notes,
        status: SubmissionDomain.computeStatus(checklist),
        photoCount: photoTotal,
        createdAt,
      };
      const dateSk = Keys.submission.dateSk(date, createdAt);
      items.push(
        {
          PK: Keys.submission.pk(submissionId),
          SK: Keys.submission.sk,
          GSI1PK: Keys.submission.byUser(f.userId),
          GSI1SK: dateSk,
          GSI2PK: Keys.submission.bySite(site.siteId),
          GSI2SK: dateSk,
          GSI3PK: Keys.submission.all,
          GSI3SK: dateSk,
          entityType: 'SUBMISSION',
          ...submission,
        },
        {
          PK: Keys.dayLock.pk(f.userId, site.siteId, date),
          SK: Keys.dayLock.sk,
          entityType: 'DAYLOCK',
          submissionId,
        },
      );

      for (let p = 0; p < photoTotal; p++) {
        const file = PHOTO_FILES[photoCounter++ % PHOTO_FILES.length];
        const photoId = `${submissionId}-p${p}`;
        const s3Key = `submissions/${submissionId}/${photoId}.jpg`;
        const body = readFileSync(join(__dirname, 'seed-photos', file));
        await s3.send(
          new PutObjectCommand({
            Bucket: out.PhotoBucketName,
            Key: s3Key,
            Body: body,
            ContentType: 'image/jpeg',
          }),
        );
        items.push({
          PK: Keys.photo.pk(submissionId),
          SK: Keys.photo.sk(photoId),
          entityType: 'PHOTO',
          photoId,
          submissionId,
          s3Key,
          contentType: 'image/jpeg',
          sizeBytes: body.length,
          uploadedAt: createdAt,
        });
      }
      submissionCount++;
    }
  }

  await batchPut(out.DynamoTableName, items);
  console.log(`  ${SITES.length} sites, ${submissionCount} submissions, ${photoCounter} photos`);
  console.log('\nTest logins:');
  console.log(`  Admin : admin@example.com  / ${ADMIN_PASSWORD}`);
  console.log(`  Framer: framer@example.com / ${FRAMER_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
