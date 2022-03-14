import { useEffect, useState, useCallback } from "react";
import { ChakraProvider, Box, Text, Stack, LightMode } from "@chakra-ui/react";

import theme from "./theme";
import {
  Routes,
  Route,
  Navigate,
  BrowserRouter as Router,
} from "react-router-dom";
import Header from "./Header";

import SignIn from "./SignIn";
import { detect } from "detect-browser";
import ProfileContext from "./Context/ProfileContext";
import awsconfig from "./aws-exports";
import Amplify, { Auth, Hub } from "aws-amplify";

import "@fontsource/inter/200.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/900.css";

Amplify.configure(awsconfig);

/*
CTA - Intro Me Now -> modal with email
*/

const AUTH_STATES = {
  LOADING: "loading",
  AUTHENTICATED: "authenticated",
  NEEDS_AUTH: "needs_auth",
  ONBOARDING: "onboarding",
};

function App() {
  const browser = detect();
  const [profile, setProfile] = useState({});

  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);

  /*const fetchProfile = async () => {
    try {
      const {
        profile: p = {},
      } = await actions.fetchProfile();
      setProfile({ ...p });

      return p;
    } catch (err) {
      console.log(err);
      return {};
    }
  };*/

  const fetchAuthState = useCallback(async () => {
    try {
      const res = await Auth.currentAuthenticatedUser();
      if (res) {
        //const { company_id } = await fetchProfile();
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
        {authState === AUTH_STATES.NEEDS_AUTH ? (
          <SignIn fetchAuthState={fetchAuthState} />
        ) : (
          <ProfileContext.Provider
            value={{
              profile,
              fetchProfile: () => {},
              signOut: Auth.signOut,
            }}
          >
            <Box textAlign="center" minH="100vh" fontSize="xl">
              <Router>
                <Header />
                <Routes>
                  <Route exact path="/home" element={<Text>Signed In</Text>} />
                  <Route path="*" element={<Navigate replace to="/home" />} />
                </Routes>
              </Router>
              <Box d="flex" justifyContent="center" p={[3, null, 5]} bg="white">
                <Stack alignItems="center">
                  <Stack spacing={5} isInline>
                    <Text fontWeight="medium" fontSize="sm">
                      <a
                        href="https://zipschool.webflow.io/terms-of-service"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Terms Of Service
                      </a>
                    </Text>
                    <Text fontWeight="medium" fontSize="sm">
                      <a
                        href="https://zipschool.webflow.io/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Privacy Policy
                      </a>
                    </Text>
                  </Stack>
                  <Stack isInline alignItems="center">
                    <Text color="gray.500" fontWeight="normal" fontSize="sm">
                      © 2022{" "}
                      <a
                        href="https://zipschool.com?ref=app"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        kyd
                      </a>
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
      </LightMode>
    </ChakraProvider>
  );
}

export default App;
