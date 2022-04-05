const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();
const stripe = require("stripe")(process.env.STRIPE_SK);
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = process.env.TABLE_NAME;
const CANDY_MACHINE_ID = process.env.CANDY_MACHINE_ID;

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { requestContext = {}, headers = {}, pathParameters = {} } = event;
  const { event_id } = pathParameters;
  const { authorizer = {} } = requestContext;
  const { claims = {} } = authorizer;
  const { sub: user_id } = claims;
  const { origin = "http://localhost:3001" } = headers;

  try {
    const kydEvent = await fetchEvent(event_id);

    const existingSession = await fetchExistingSession(user_id, event_id);
    let url;
    if (existingSession) {
      console.log(
        "Found Ecisting Dynamo Session: ",
        JSON.stringify(existingSession, null, 2)
      );
      url = await fetchCheckoutSession(existingSession);
    } else {
      const mints = await fetchAvailableMints(event_id, kydEvent.capacity);
      console.log("Mints: ", mints);
      const { session_id, mint } = await attemptMintClaim(
        user_id,
        kydEvent,
        mints
      );
      url = await createCheckoutSession(
        user_id,
        origin,
        kydEvent,
        session_id,
        mint
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, result: { url } }, null, 2),
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

const fetchEvent = async (event_id) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      pk: `EVENT#${event_id}`,
      sk: `EVENT#${event_id}`,
    },
  };

  const { Item = {} } = await dynamo.get(params).promise();
  Item.metadata.id = event_id;
  return Item.metadata;
};

const fetchAvailableMints = async (event_id, capacity) => {
  const start = 0;
  const end = capacity;
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "#pk = :pk AND #sk BETWEEN :start AND :end",
    ExpressionAttributeNames: {
      "#pk": "pk",
      "#sk": "sk",
    },
    ExpressionAttributeValues: {
      ":pk": `EVENT#${event_id}`,
      ":start": `MINT#OPEN#${start.toString().padStart(5, "0")}#`,
      ":end": `MINT#OPEN#${end.toString().padStart(5, "0")}#`,
    },
    Limit: 5,
  };

  console.log("Params: ", JSON.stringify(params, null, 2));

  const { Items = [] } = await dynamo.query(params).promise();
  if (Items.length === 0) {
    throw { status: 400, message: "Event sold out 🙃" };
  }

  Items.forEach((i) => {
    i.id = i.sk.split("#").pop();
  });

  return Items;
};

const attemptMintClaim = async (user_id, kydEvent, mintRecords = []) => {
  for (const mintRecord of mintRecords) {
    try {
      const session_id = await createDDBSession(user_id, kydEvent, mintRecord);
      return { session_id, mint: mintRecord.id };
    } catch (err) {
      console.error(err);
      console.error("Failed to claim mint: ", mintRecord.id);
    }
  }

  throw { status: 400, message: `Failed for claim ticket. Please try again.` };
};

const fetchExistingSession = async (user_id, event_id) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - 5);
  const params = {
    TableName: TABLE_NAME,
    IndexName: "sk-data-index",
    KeyConditionExpression: "#sk = :sk AND #data BETWEEN :start AND :end",
    ExpressionAttributeNames: {
      "#sk": "sk",
      "#data": "data",
    },
    ExpressionAttributeValues: {
      ":sk": `USER#${user_id}#${event_id}`,
      ":start": `SESSION#OPEN#${d.toISOString()}`,
      ":end": `SESSION#OPEN#${new Date().toISOString()}`,
    },
    Limit: 1,
  };

  console.log("Look For Existing Session: ", JSON.stringify(params, null, 2));
  const { Items = [] } = await dynamo.query(params).promise();
  if (Items.length > 0) {
    const session = Items.pop();
    const metadata = session.metadata;
    metadata.id = session.pk.split("#").pop();
    return metadata;
  }
};

const createDDBSession = async (user_id, kydEvent, mintRecord) => {
  const sessionId = `SE${uuidv4()}`;

  const mint = mintRecord.sk.split("#").pop();
  const metadata = {
    mint,
    event_id: kydEvent.id,
  };
  const d = new Date();
  const params = {
    TransactItems: [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `SESSION#${sessionId}`,
            sk: `SESSION#${sessionId}`,
            data: `#`,
            metadata,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `SESSION#${sessionId}`,
            sk: `SESSION#CREATED`,
            data: `SESSION#OPEN#${d.toISOString()}`,
            metadata,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `SESSION#${sessionId}`,
            sk: `USER#${user_id}#${metadata.event_id}`,
            data: `SESSION#OPEN#${d.toISOString()}`,
            metadata,
          },
        },
      },
      {
        Delete: {
          TableName: TABLE_NAME,
          Key: {
            pk: mintRecord.pk,
            sk: mintRecord.sk,
          },
          ExpressionAttributeNames: {
            "#pk": "pk",
            "#sk": "sk",
            "#session_id": "session_id",
          },
          ConditionExpression:
            "attribute_exists(#pk) AND attribute_exists(#sk) AND attribute_not_exists(#session_id)",
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            ...mintRecord,
            sk: mintRecord.sk.replace("OPEN", "CLAIMED"),
            session_id: sessionId,
          },
        },
      },
    ],
  };

  await dynamo.transactWrite(params).promise();

  return sessionId;
};

const fetchCheckoutSession = async (session) => {
  const checkoutSession = await stripe.checkout.sessions.retrieve(
    session.stripe_checkout_session_id
  );
  console.log("Found existing session: ", JSON.stringify(session, null, 2));
  return checkoutSession.url;
};

const createCheckoutSession = async (
  user_id,
  origin,
  kydEvent,
  session_id,
  mint
) => {
  const session = await stripe.checkout.sessions.create(
    {
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: kydEvent.title,
              description: kydEvent.description,
              images: [kydEvent.image],
            },
            unit_amount: kydEvent.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/events?processing=${encodeURIComponent(
        "Processing ticket"
      )}`,
      cancel_url: `${origin}/events`,
      metadata: {
        user_id,
        mint,
        session_id,
        candy_machine_id: CANDY_MACHINE_ID,
      },
    },
    {
      idempotencyKey: session_id,
    }
  );

  await updateSession(session_id, user_id, kydEvent.id, session.id);

  return session.url;
};

const updateSession = async (
  session_id,
  user_id,
  event_id,
  stripe_checkout_session_id
) => {
  const params = {
    TransactItems: [
      {
        Update: {
          TableName: TABLE_NAME,
          Key: {
            pk: `SESSION#${session_id}`,
            sk: `SESSION#${session_id}`,
          },
          UpdateExpression:
            "SET #metadata.stripe_checkout_session_id = :stripe_checkout_session_id",
          ExpressionAttributeNames: {
            "#metadata": "metadata",
          },
          ExpressionAttributeValues: {
            ":stripe_checkout_session_id": stripe_checkout_session_id,
          },
        },
      },
      {
        Update: {
          TableName: TABLE_NAME,
          Key: {
            pk: `SESSION#${session_id}`,
            sk: `USER#${user_id}#${event_id}`,
          },
          UpdateExpression:
            "SET #metadata.stripe_checkout_session_id = :stripe_checkout_session_id",
          ExpressionAttributeNames: {
            "#metadata": "metadata",
          },
          ExpressionAttributeValues: {
            ":stripe_checkout_session_id": stripe_checkout_session_id,
          },
        },
      },
    ],
  };

  await dynamo.transactWrite(params).promise();
};
