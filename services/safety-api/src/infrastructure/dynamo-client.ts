import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error('TABLE_NAME env variable is not set');
  return name;
}

/** Runs a Query and follows pagination until done (or until maxItems). */
export async function queryAll<T>(input: QueryCommandInput, maxItems = 2000): Promise<T[]> {
  const items: T[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(new QueryCommand({ ...input, ExclusiveStartKey: startKey }));
    items.push(...((res.Items ?? []) as T[]));
    startKey = res.LastEvaluatedKey;
  } while (startKey && items.length < maxItems);
  return items.slice(0, maxItems);
}

/** Remove the DynamoDB key attributes so only the entity fields are returned. */
export function stripKeys<T>(item: Record<string, unknown>): T {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, entityType, ...rest } = item;
  return rest as T;
}
