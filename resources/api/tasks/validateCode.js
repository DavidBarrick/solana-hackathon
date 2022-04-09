const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

const { Keypair } = require("@solana/web3.js");

const md5 = require("crypto-js/md5");

const S3_BUCKET = process.env.S3_BUCKET;
const USER_POOL_ID = process.env.USER_POOL_ID;
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
    if (code.substring(0, 1) === "+") {
      const { pubkey: _userPubkey } = await fetchUser(code);

      const { is_valid, mint, valid_reason } = await fetchTicket(
        _userPubkey,
        EVENT_ID
      );
      result.is_valid = is_valid;
      result.valid_reason = valid_reason;
      result.mint = mint;
    } else {
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

const fetchUser = async (phone_number) => {
  const params = {
    Username: phone_number,
    UserPoolId: USER_POOL_ID,
  };

  const { Username } = await cognito.adminGetUser(params).promise();
  if (Username) {
    const pubkey = await fetchUserPubkey(Username);
    console.log("User Pubkey: ", pubkey.publicKey.toString());
    return {
      user_id: Username,
      pubkey: pubkey.publicKey.toString(),
    };
  }
  throw { status: 404, message: `User not found` };
};

const fetchUserPubkey = async (user_id) => {
  console.log("Fetch Secret Key: ", user_id);
  const params = {
    Bucket: S3_BUCKET,
    Key: `${user_id}/secretkey.json`,
  };

  try {
    const { Body } = await s3.getObject(params).promise();
    const secretKey = JSON.parse(Body.toString());
    return Keypair.fromSecretKey(Buffer.from(secretKey));
  } catch (err) {
    console.log(`No master wallet for user: ${user_id}`);
    throw { status: 404, messages: `User not found` };
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
