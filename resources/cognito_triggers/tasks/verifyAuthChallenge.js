const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_ID = process.env.TWILIO_VERIFY_SERVICE_ID;
const twilioClient = require("twilio")(accountSid, authToken);

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { request = {} } = event;
  const { userAttributes = {}, challengeAnswer } = request;
  const { phone_number } = userAttributes;

  const isValid = await verifyCode(phone_number, challengeAnswer);
  if (isValid) {
    event.response.answerCorrect = true;
  } else {
    event.response.answerCorrect = false;
  }

  return event;
};

const verifyCode = async (phone_number, code) => {
  const result = await twilioClient.verify
    .services(TWILIO_VERIFY_SERVICE_ID)
    .verificationChecks.create({ to: phone_number, code: code });

  console.log("Result: ", JSON.stringify(result));
  return result.valid;
};
