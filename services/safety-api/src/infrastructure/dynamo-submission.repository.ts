import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { PhotoEntity, SubmissionEntity } from '@ras/shared';

import { ConflictError } from '../application/errors';
import { DateRange, ISubmissionRepository } from '../application/ports';
import { ddb, queryAll, stripKeys, tableName } from './dynamo-client';
import { dateBetween, Keys } from './dynamo-keys';

export class DynamoSubmissionRepository implements ISubmissionRepository {
  /**
   * One transaction writes: the submission, a "day lock" row and one row per photo.
   * The lock row has a condition "must not exist" -> a 2nd form for the same
   * worker + site + day fails the whole transaction (no half-saved data).
   */
  async create(submission: SubmissionEntity, photos: PhotoEntity[]): Promise<void> {
    const s = submission;
    const dateSk = Keys.submission.dateSk(s.date, s.createdAt);
    try {
      await ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: tableName(),
                Item: {
                  PK: Keys.dayLock.pk(s.userId, s.siteId, s.date),
                  SK: Keys.dayLock.sk,
                  entityType: 'DAYLOCK',
                  submissionId: s.submissionId,
                },
                ConditionExpression: 'attribute_not_exists(PK)',
              },
            },
            {
              Put: {
                TableName: tableName(),
                Item: {
                  PK: Keys.submission.pk(s.submissionId),
                  SK: Keys.submission.sk,
                  GSI1PK: Keys.submission.byUser(s.userId),
                  GSI1SK: dateSk,
                  GSI2PK: Keys.submission.bySite(s.siteId),
                  GSI2SK: dateSk,
                  GSI3PK: Keys.submission.all,
                  GSI3SK: dateSk,
                  entityType: 'SUBMISSION',
                  ...s,
                },
                ConditionExpression: 'attribute_not_exists(PK)',
              },
            },
            ...photos.map((p) => ({
              Put: {
                TableName: tableName(),
                Item: {
                  PK: Keys.photo.pk(p.submissionId),
                  SK: Keys.photo.sk(p.photoId),
                  entityType: 'PHOTO',
                  ...p,
                },
              },
            })),
          ],
        }),
      );
    } catch (err) {
      if (err instanceof TransactionCanceledException) {
        throw new ConflictError(
          `A safety form for ${s.siteName} on ${s.date} was already submitted`,
        );
      }
      throw err;
    }
  }

  /** One query returns the submission AND its photos (same partition key). */
  async findById(submissionId: string) {
    const res = await ddb.send(
      new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': Keys.submission.pk(submissionId) },
      }),
    );
    const items = res.Items ?? [];
    const details = items.find((i) => i.SK === Keys.submission.sk);
    if (!details) return null;
    return {
      submission: stripKeys<SubmissionEntity>(details),
      photos: items
        .filter((i) => String(i.SK).startsWith(Keys.photo.skPrefix))
        .map((i) => stripKeys<PhotoEntity>(i))
        .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt)),
    };
  }

  async existsForDay(userId: string, siteId: string, date: string): Promise<boolean> {
    const res = await ddb.send(
      new GetCommand({
        TableName: tableName(),
        Key: { PK: Keys.dayLock.pk(userId, siteId, date), SK: Keys.dayLock.sk },
      }),
    );
    return !!res.Item;
  }

  listByUser(userId: string, range: DateRange) {
    return this.queryIndex('GSI1', Keys.submission.byUser(userId), range);
  }

  listBySite(siteId: string, range: DateRange) {
    return this.queryIndex('GSI2', Keys.submission.bySite(siteId), range);
  }

  listAll(range: DateRange) {
    return this.queryIndex('GSI3', Keys.submission.all, range);
  }

  private async queryIndex(
    index: 'GSI1' | 'GSI2' | 'GSI3',
    pk: string,
    range: DateRange,
  ): Promise<SubmissionEntity[]> {
    const { start, end } = dateBetween(range.from, range.to);
    const items = await queryAll<Record<string, unknown>>({
      TableName: tableName(),
      IndexName: index,
      KeyConditionExpression: `${index}PK = :pk AND ${index}SK BETWEEN :start AND :end`,
      ExpressionAttributeValues: { ':pk': pk, ':start': start, ':end': end },
      ScanIndexForward: false, // newest first
    });
    return items.map((i) => stripKeys<SubmissionEntity>(i));
  }
}
