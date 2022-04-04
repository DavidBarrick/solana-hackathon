const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();
const stripe = require("stripe")(process.env.STRIPE_SK);

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
    const url = await createCheckoutSession(user_id, origin, kydEvent);
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

const createDDBSession = async () => {};

const fetchEvent = async (event_id) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      pk: `EVENT#${event_id}`,
      sk: `EVENT#${event_id}`,
    },
  };

  const { Item = {} } = await dynamo.get(params).promise();
  return Item.metadata;
};

const fetchAvailableMint = async (event_id) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :sk)",
    ExpressionAttributeNames: {
      "#pk": "pk",
      "#sk": "sk",
    },
    ExpressionAttributeValues: {
      ":pk": `EVENT#${event_id}`,
      ":sk": "MINT#OPEN#",
    },
    Limit: 1,
  };

  const { Items = [] } = await dynamo.query(params).promise();
  return Items.pop();
};

const createCheckoutSession = async (user_id, origin, kydEvent, mint) => {
  const session = await stripe.checkout.sessions.create({
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
    },
  });

  return session.url;
};
