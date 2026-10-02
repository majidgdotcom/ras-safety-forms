import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Role, SiteEntity, UserEntity } from '@ras/shared';

import { ISiteRepository, IUserRepository } from '../application/ports';
import { ddb, queryAll, stripKeys, tableName } from './dynamo-client';
import { Keys } from './dynamo-keys';

export class DynamoSiteRepository implements ISiteRepository {
  async list(): Promise<SiteEntity[]> {
    const items = await queryAll<Record<string, unknown>>({
      TableName: tableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': Keys.site.gsi1pk },
    });
    return items.map((i) => stripKeys<SiteEntity>(i));
  }

  async findById(siteId: string): Promise<SiteEntity | null> {
    const res = await ddb.send(
      new GetCommand({ TableName: tableName(), Key: { PK: Keys.site.pk(siteId), SK: Keys.site.sk } }),
    );
    return res.Item ? stripKeys<SiteEntity>(res.Item) : null;
  }
}

export class DynamoUserRepository implements IUserRepository {
  async listByRole(role: Role): Promise<UserEntity[]> {
    const items = await queryAll<Record<string, unknown>>({
      TableName: tableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': Keys.user.gsi1pk(role) },
    });
    return items.map((i) => stripKeys<UserEntity>(i));
  }

  /** Create or refresh the profile row. createdAt is only set the first time. */
  async upsert(user: Omit<UserEntity, 'createdAt'>): Promise<void> {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: Keys.user.pk(user.userId), SK: Keys.user.sk },
        UpdateExpression:
          'SET entityType = :t, userId = :id, email = :email, #name = :name, #role = :role, ' +
          'GSI1PK = :gpk, GSI1SK = :gsk, createdAt = if_not_exists(createdAt, :now)',
        ExpressionAttributeNames: { '#name': 'name', '#role': 'role' },
        ExpressionAttributeValues: {
          ':t': 'USER',
          ':id': user.userId,
          ':email': user.email,
          ':name': user.name,
          ':role': user.role,
          ':gpk': Keys.user.gsi1pk(user.role),
          ':gsk': Keys.user.gsi1sk(user.name),
          ':now': new Date().toISOString(),
        },
      }),
    );
  }
}
