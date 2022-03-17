import React, { useRef, useState } from "react";
import { Box, VStack, Button, useToast, Input, Text } from "@chakra-ui/react";
import { Auth } from "aws-amplify";
import { showErrorToast, AUTH_STATES } from "./utils";
import { Redirect, Route, Switch, useHistory } from "react-router-dom";

const SignIn = ({ authState }) => {
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
      inputRef.current.value = "";
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
      setLoading(false);
      showErrorToast(toast, err.message);
    }
  };

  return (
    <Box bgGradient="linear(to-r, #fee140, #fa709a)" w="100%" h="100vh" p={5}>
      <VStack
        h="100%"
        rounded="lg"
        maxW="lg"
        bg="gray.50"
        mx="auto"
        justifyContent="center"
        p={5}
      >
        <VStack w="100%">
          {authState === AUTH_STATES.NEEDS_AUTH && (
            <Switch>
              <Route path="/auth/phone">
                <Text>Phone Number</Text>
                <Input
                  isDisabled={loading}
                  ref={inputRef}
                  fontSize="4xl"
                  h="75px"
                  fontWeight={"bold"}
                  textAlign="center"
                  placeholder="Phone Number"
                />
                <Button
                  h="60px"
                  bg="blue.300"
                  colorScheme="blue"
                  shadow="md"
                  w="100%"
                  color="white"
                  isLoading={loading}
                  onClick={onSignIn}
                >
                  Sign In
                </Button>
              </Route>
              <Route path="/auth/code">
                <Text>Verification Code</Text>
                <Input
                  isDisabled={loading}
                  ref={inputRef}
                  fontSize="4xl"
                  h="75px"
                  fontWeight={"bold"}
                  textAlign="center"
                  placeholder="Verification Code"
                />
                <Button
                  h="60px"
                  bg="blue.300"
                  colorScheme="blue"
                  shadow="md"
                  w="100%"
                  color="white"
                  isLoading={loading}
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
