import { useEffect, useState, useCallback } from "react";
import { ChakraProvider, Box, Text, Stack, LightMode } from "@chakra-ui/react";

import theme from "./theme";
import { Switch, Route, Redirect, BrowserRouter } from "react-router-dom";
import Header from "./Header";

import SignIn from "./SignIn";
import KYDEvents from "./KYDEvents";

import { detect } from "detect-browser";
import ProfileContext from "./Context/ProfileContext";
import awsconfig from "./aws-exports";
import Amplify, { Auth, Hub } from "aws-amplify";
import { AUTH_STATES } from "./utils";

import "@fontsource/prompt/200.css";
import "@fontsource/prompt/400.css";
import "@fontsource/prompt/400.css";
import "@fontsource/prompt/500.css";
import "@fontsource/prompt/700.css";
import "@fontsource/prompt/900.css";

Amplify.configure(awsconfig);

function App() {
  const browser = detect();

  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);

  const fetchAuthState = useCallback(async () => {
    try {
      const res = await Auth.currentAuthenticatedUser();
      if (res) {
        setAuthState(AUTH_STATES.AUTHENTICATED);
      } else {
        setAuthState(AUTH_STATES.NEEDS_AUTH);
      }
    } catch (err) {
      setAuthState(AUTH_STATES.NEEDS_AUTH);
    }
  }, []);

  const onAuthAction = useCallback(
    (data) => {
      const { payload = {} } = data;
      const { event } = payload;
      if (event === "signIn") {
        fetchAuthState();
      } else if (event === "signOut") {
        setAuthState("needs_auth");
      }
    },
    [fetchAuthState]
  );

  useEffect(() => {
    Hub.listen("auth", onAuthAction);
  }, [onAuthAction]);

  useEffect(() => {
    fetchAuthState();
  }, [fetchAuthState]);

  return (
    <ChakraProvider theme={theme}>
      <LightMode>
        <BrowserRouter>
          {authState === AUTH_STATES.NEEDS_AUTH ? (
            <SignIn authState={authState} fetchAuthState={fetchAuthState} />
          ) : (
            <ProfileContext.Provider
              value={{
                signOut: Auth.signOut,
              }}
            >
              <Box textAlign="center" minH="100vh" fontSize="xl">
                <Header />
                <Switch>
                  <Route exact path="/events">
                    <KYDEvents />
                  </Route>
                  <Redirect to="/events" />
                </Switch>
                <Box
                  d="flex"
                  justifyContent="center"
                  p={[3, null, 5]}
                  bg="white"
                >
                  <Stack alignItems="center">
                    <Stack isInline alignItems="center">
                      <Text color="gray.500" fontWeight="normal" fontSize="sm">
                        © 2022 kyd
                      </Text>
                      <Text color="gray.400" fontSize="xs">
                        v{process.env.REACT_APP_VERSION}
                      </Text>
                      {browser && (
                        <Text color="gray.400" fontSize="xs">
                          {browser.os} | {browser.name}
                        </Text>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              </Box>
            </ProfileContext.Provider>
          )}
        </BrowserRouter>
      </LightMode>
    </ChakraProvider>
  );
}

export default App;
