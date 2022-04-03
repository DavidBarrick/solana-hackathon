// Download the helper library from https://www.twilio.com/docs/node/install
// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_ID = process.env.TWILIO_VERIFY_SERVICE_ID;
const twilioClient = require("twilio")(accountSid, authToken);

module.exports.handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  try {
    const { request = {} } = event;
    const { userAttributes = {}, userNotFound } = request;
    const { phone_number } = userAttributes;
    if (userNotFound) {
      throw { status: 400, message: "User not found" };
    }

    let secretLoginCode = "ABC";

    // Add the secret login code to the private challenge parameters
    // so it can be verified by the "Verify Auth Challenge Response" trigger
    event.response.privateChallengeParameters = { secretLoginCode };

    // Add the secret login code to the session so it is available
    // in a next invocation of the "Create Auth Challenge" trigger
    event.response.challengeMetadata = `CODE-${secretLoginCode}`;

    await sendSms(phone_number);

    return event;
  } catch (err) {
    throw err.message;
  }
};

const sendSms = async (phone_number) => {
  const result = await twilioClient.verify
    .services(TWILIO_VERIFY_SERVICE_ID)
    .verifications.create({ to: phone_number, channel: "sms" });

  console.log("Result: ", JSON.stringify(result));
};
