const AWS = require("aws-sdk");
const stripe = require("stripe")(process.env.STRIPE_SK);
const { KYD_EVENTS } = require("./helpers/utils");

const testEvent = {
  title: "KYD Miami",
  symbol: "KYDMIAMI",
  date: "April 8th, 2022",
  time: "7:00PM",
  image: "https://staging.draggos.xyz/assets/kyd_01.JPG",
  location: "Soho House",
  price: 5,
  seat: "GA",
  description:
    "KYD is proud to announce our offical launch party at NYC's greatest venue: Madison Square Garden. Come for the mems.",
};

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { requestContext = {}, headers = {} } = event;
  const { authorizer = {} } = requestContext;
  const { claims = {} } = authorizer;
  const { sub: user_id } = claims;
  const { origin = "http://localhost:3001" } = headers;

  try {
    const url = await createEvent(testEvent);
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
const createEvent = async (eventParams = {}) => {
  const eventId = `EV${uuidv4()}`;
  const {
    title,
    symbol,
    date,
    time,
    image,
    location,
    price,
    seat,
    description,
    capacity,
  } = eventParams;
  const metadata = {
    title,
    symbol,
    date,
    time,
    image,
    location,
    price,
    seat,
    description,
    capacity,
  };

  const params = {
    TransactItems: [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `EVENT#${eventId}`,
            sk: `EVENT#${eventId}`,
            data: "#",
            metadata,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `EVENT#${ticketId}`,
            sk: `MINT#${mint}`,
            data: `EVENT#OPEN#${new Date().toISOString()}`,
          },
        },
      },
    ],
  };

  return dynamo.transactWrite(params).promise();
};
