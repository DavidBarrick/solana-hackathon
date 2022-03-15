import { Auth } from "aws-amplify";

const params = {
  Auth: {
    // OPTIONAL - Amazon Cognito User Pool ID
    userPoolId: process.env.REACT_APP_COGNITO_POOL_ID,

    // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
    userPoolWebClientId: process.env.REACT_APP_COGNITO_POOL_CLIENT_ID,

    // OPTIONAL - Enforce user authentication prior to accessing AWS resources or not
    mandatorySignIn: true,

    // OPTIONAL - Manually set the authentication flow type. Default is 'USER_SRP_AUTH'
    // authenticationFlowType: 'USER_SRP_AUTH',
  },
  API: {
    endpoints: [
      {
        name: "KYD_API",
        endpoint: process.env.REACT_APP_ENDPOINT,
        custom_header: async () => {
          let authToken = (await Auth.currentSession())
            .getIdToken()
            .getJwtToken();
          return {
            Authorization: authToken,
            "x-api-key": process.env.REACT_APP_API_KEY,
          };
        },
      },
    ],
  },
};

export default params;
