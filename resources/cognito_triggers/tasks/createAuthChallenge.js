const AWS = require("aws-sdk");
const digitGenerator = require("crypto-secure-random-digit");

const sns = new AWS.SNS();

module.exports.handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  try {
    const { request = {} } = event;
    const { session = [], userAttributes = {}, userNotFound } = request;
    if (userNotFound) {
      throw { status: 400, message: "User not found" };
    }

    let secretLoginCode;
    if (!session || !session.length) {
      // This is a new auth session
      // Generate a new secret login code and mail it to the user
      secretLoginCode = digitGenerator.randomDigits(6).join("");
      await sendSms(userAttributes.phone_number, secretLoginCode);
    } else {
      // There's an existing session. Don't generate new digits but
      // re-use the code from the current session. This allows the user to
      // make a mistake when keying in the code and to then retry, rather
      // the needing to e-mail the user an all new code again.
      const previousChallenge = session.slice(-1)[0];
      secretLoginCode =
        previousChallenge.challengeMetadata.match(/CODE-(\d*)/)[1];
    }

    // Add the secret login code to the private challenge parameters
    // so it can be verified by the "Verify Auth Challenge Response" trigger
    event.response.privateChallengeParameters = { secretLoginCode };

    // Add the secret login code to the session so it is available
    // in a next invocation of the "Create Auth Challenge" trigger
    event.response.challengeMetadata = `CODE-${secretLoginCode}`;

    return event;
  } catch (err) {
    throw err.message;
  }
};

const sendSms = async (phone_number, secretLoginCode) => {
  const params = {
    Message: `Code: ${secretLoginCode}` /* required */,
    PhoneNumber: phone_number,
  };

  await sns.publish(params).promise();
};
