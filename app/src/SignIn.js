import React, { useRef, useState } from "react";
import { Box, VStack, Button, useToast, Input } from "@chakra-ui/react";
import { Auth, input } from "aws-amplify";
import { showErrorToast, AUTH_STATES } from "./utils";
import { Redirect, Route, Switch, useHistory } from "react-router-dom";

const SignIn = ({ fetchAuthState, authState }) => {
  const toast = useToast();
  const inputRef = useRef(null);
  const history = useHistory();

  const [authenticatingUser, setAuthenticatingUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSignUp = async (phoneNumber) => {
    setLoading(true);
    try {
      if ((!inputRef || !inputRef.current) && !phoneNumber) {
        throw Error("Phone required");
      }

      const _phoneNumber = phoneNumber || inputRef.current.value;
      const params = {
        username: _phoneNumber,
        password: getRandomString(30),
      };
      await Auth.signUp(params);

      const res = await Auth.signIn(_phoneNumber);
      setAuthenticatingUser(res);

      history.push("/auth/code");
    } catch (err) {
      showErrorToast(toast, err.message);
    }
    setLoading(false);
  };

  const getRandomString = (bytes) => {
    const randomValues = new Uint8Array(bytes);
    window.crypto.getRandomValues(randomValues);
    return Array.from(randomValues).map(intToHex).join("");
  };

  const intToHex = (nr) => {
    return nr.toString(16).padStart(2, "0");
  };

  const onSignIn = async () => {
    setLoading(true);
    let phoneNumber;
    try {
      if (!inputRef || !inputRef.current || !inputRef.current.value) {
        throw Error("Phone required");
      }

      phoneNumber = inputRef.current.value;
      const res = await Auth.signIn(phoneNumber);

      history.push("/auth/code");

      setAuthenticatingUser(res);
    } catch (err) {
      if (err.code === "UserLambdaValidationException") {
        await onSignUp(phoneNumber);
      } else {
        showErrorToast(toast, err.message);
      }
    }
    setLoading(false);
  };

  const onVerificationCode = async () => {
    setLoading(true);
    try {
      if (!inputRef || !inputRef.current || !inputRef.current.value) {
        throw Error("Verification code required");
      }

      await Auth.sendCustomChallengeAnswer(
        authenticatingUser,
        inputRef.current.value
      );
    } catch (err) {
      showErrorToast(toast, err.message);
    }
    setLoading(false);
  };

  return (
    <Box bgGradient="linear(to-r, #fee140, #fa709a)" w="100%" h="100vh">
      <VStack h="100%" maxW="lg" mx="auto" justifyContent="center">
        <VStack w="100%">
          {authState === AUTH_STATES.NEEDS_AUTH && (
            <Switch>
              <Route path="/auth/phone">
                <Input ref={inputRef} fontSize="4xl" textAlign="center" />
                <Button
                  h="50px"
                  bg="blue.300"
                  colorScheme="blue"
                  shadow="md"
                  w="100%"
                  color="white"
                  onClick={onSignIn}
                >
                  Sign In
                </Button>
              </Route>
              <Route path="/auth/code">
                <Input ref={inputRef} fontSize="4xl" textAlign="center" />
                <Button
                  h="50px"
                  bg="blue.300"
                  colorScheme="blue"
                  shadow="md"
                  w="100%"
                  color="white"
                  onClick={onVerificationCode}
                >
                  Submit
                </Button>
              </Route>
              <Redirect to="/auth/phone" />
            </Switch>
          )}
        </VStack>
      </VStack>
    </Box>
  );
};

export default SignIn;
