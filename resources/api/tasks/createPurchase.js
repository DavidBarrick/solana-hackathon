const AWS = require("aws-sdk");
const stripe = require("stripe")(process.env.STRIPE_SK);
const { KYD_EVENTS } = require("./helpers/utils");

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { requestContext = {}, headers = {} } = event;
  const { authorizer = {} } = requestContext;
  const { claims = {} } = authorizer;
  const { sub: user_id } = claims;
  const { origin = "http://localhost:3001" } = headers;

  try {
    const url = await createCheckoutSession(user_id, origin);
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

const createCheckoutSession = async (user_id, origin) => {
  const kydEvent = KYD_EVENTS[0];
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
    },
  });

  return session.url;
};
