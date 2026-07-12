// Lambda handler for Exercise Duel sync. Editable copy — the deployed copy lives
// inline in backend-template.yaml (keep them in sync, or switch the template to
// package this file if it grows). Two routes behind a Function URL:
//   GET  /state?code=XXXXXX   -> { state, rev } | 404
//   PUT  /state  {code,state,rev} -> { state, rev } | 409 { state, rev } on conflict
// Auth: shared x-api-key header (whole auth model for a 2-person app).
const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const TABLE = process.env.TABLE_NAME;
const API_KEY = process.env.API_KEY;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const json = (status, body) => ({
  statusCode: status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const method =
      event.requestContext?.http?.method || event.httpMethod || "GET";
    const headers = lowerKeys(event.headers || {});
    if (!API_KEY || headers["x-api-key"] !== API_KEY) {
      return json(401, { error: "unauthorized" });
    }

    if (method === "GET") {
      const code = (event.queryStringParameters || {}).code;
      if (!validCode(code)) return json(400, { error: "bad code" });
      const r = await ddb.send(
        new GetCommand({ TableName: TABLE, Key: { code } })
      );
      if (!r.Item) return json(404, { error: "not found" });
      return json(200, { state: r.Item.state, rev: r.Item.rev });
    }

    if (method === "PUT") {
      const body = JSON.parse(event.body || "{}");
      const { code, state, rev } = body;
      if (!validCode(code) || !state || typeof state !== "object" || typeof rev !== "number") {
        return json(400, { error: "bad request" });
      }
      const nextRev = rev + 1;
      try {
        await ddb.send(
          new PutCommand({
            TableName: TABLE,
            Item: { code, state, rev: nextRev },
            // rev==0 means "create" (item must not exist); otherwise the stored
            // rev must equal the client's base rev (optimistic concurrency).
            ConditionExpression:
              rev === 0
                ? "attribute_not_exists(code)"
                : "rev = :base",
            ExpressionAttributeValues:
              rev === 0 ? undefined : { ":base": rev },
          })
        );
        return json(200, { state, rev: nextRev });
      } catch (e) {
        if (e.name === "ConditionalCheckFailedException") {
          // Return the latest so the client can replay its mutation.
          const r = await ddb.send(
            new GetCommand({ TableName: TABLE, Key: { code } })
          );
          return json(409, { state: r.Item?.state ?? null, rev: r.Item?.rev ?? 0 });
        }
        throw e;
      }
    }

    return json(405, { error: "method not allowed" });
  } catch (e) {
    console.error(e);
    return json(500, { error: "server error" });
  }
};

const lowerKeys = (o) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v]));
const validCode = (c) => typeof c === "string" && /^[A-Z2-9]{6}$/.test(c);
