const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

const candymachine = require("./helpers/candymachine");

const md5 = require("crypto-js/md5");

const S3_BUCKET = process.env.S3_BUCKET;
const RPC_HOST = process.env.RPC_HOST;
const TABLE_NAME = process.env.TABLE_NAME;

const EVENT_ID = "EV5d63af5a-f6a2-404b-94f0-da7ce676878d";

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { requestContext = {}, body = "{}" } = event;
  const { authorizer = {} } = requestContext;
  const { claims = {} } = authorizer;
  const { sub: user_id } = claims;

  const { code = "" } = JSON.parse(body);

  const [pubkey, iso_date, checksum] = code.split("#");

  try {
    let result = { is_valid: false };
    const d = new Date(iso_date);
    const thirtySecondsAgo = new Date();
    thirtySecondsAgo.setSeconds(d.getSeconds() - 30);

    console.log("Compare: ", [pubkey, iso_date].join("#"));
    const checksumCompare = md5([pubkey, iso_date].join("#")).toString();
    console.log("Checksum: ", checksumCompare);
    if (checksum !== checksumCompare) {
      result.valid_reason = "Invalid checksum. Might be screenshot.";
    } else if (d.getTime() > thirtySecondsAgo && d.getTime() < Date.now()) {
      const { is_valid, mint, valid_reason } = await fetchTicket(
        pubkey,
        EVENT_ID
      );
      result.is_valid = is_valid;
      result.valid_reason = valid_reason;
      result.mint = mint;
    }

    console.log("Result: ", JSON.stringify(result));

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          success: true,
          result,
        },
        null,
        2
      ),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify(
        { message: err.message || "An unknown error occured" },
        null,
        2
      ),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  }
};

const fetchTicket = async (pubkey, event_id) => {
  const params = {
    TableName: TABLE_NAME,
    IndexName: "sk-data-index",
    KeyConditionExpression: `#sk = :sk AND begins_with(#data, :data)`,
    ExpressionAttributeNames: {
      "#sk": "sk",
      "#data": "data",
      "#metadata": "metadata",
      "#event_id": "event_id",
    },
    ExpressionAttributeValues: {
      ":sk": `WALLET#${pubkey}`,
      ":data": "TICKET#OPEN#",
      ":event_id": event_id,
    },
    FilterExpression: "#metadata.#event_id = :event_id",
    Limit: 1,
  };

  const { Items = [] } = await dynamo.query(params).promise();
  if (Items.length > 0) {
    const ticket = Items.pop();
    const metadata = ticket.metadata || {};
    await updateTicket({
      ticket_id: ticket.pk.split("#").pop(),
      event_id: metadata.event_id,
      pubkey: metadata.pubkey,
    });
    return { is_valid: true, mint: metadata.mint };
  }

  return { is_valid: false, valid_reason: "No ticket found in wallet" };
};

const updateTicket = async ({ ticket_id, event_id, pubkey }) => {
  const params = {
    TransactItems: [
      {
        Update: {
          TableName: TABLE_NAME,
          Key: {
            pk: `TICKET#${ticket_id}`,
            sk: `TICKET#${ticket_id}`,
          },
          UpdateExpression: "SET #metadata.#attended = :true",
          ExpressionAttributeNames: {
            "#metadata": "metadata",
            "#attended": "attended",
          },
          ExpressionAttributeValues: {
            ":true": true,
          },
        },
      },
      {
        Update: {
          TableName: TABLE_NAME,
          Key: {
            pk: `TICKET#${ticket_id}`,
            sk: `WALLET#${pubkey}`,
          },
          UpdateExpression: "SET #metadata.#attended = :true",
          ExpressionAttributeNames: {
            "#metadata": "metadata",
            "#attended": "attended",
          },
          ExpressionAttributeValues: {
            ":true": true,
          },
        },
      },
      {
        Update: {
          TableName: TABLE_NAME,
          Key: {
            pk: `TICKET#${ticket_id}`,
            sk: `EVENT#${event_id}`,
          },
          UpdateExpression: "SET #metadata.#attended = :true",
          ExpressionAttributeNames: {
            "#metadata": "metadata",
            "#attended": "attended",
          },
          ExpressionAttributeValues: {
            ":true": true,
          },
        },
      },
    ],
  };

  await dynamo.transactWrite(params).promise();
};
