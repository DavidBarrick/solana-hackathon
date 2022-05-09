import React, { useRef, useState } from "react";
import {
  Box,
  VStack,
  Button,
  useToast,
  Input,
  Text,
  Stack,
  Image,
} from "@chakra-ui/react";
import { Auth, input } from "aws-amplify";
import { showErrorToast, AUTH_STATES } from "./utils";
import { Redirect, Route, Switch, useHistory } from "react-router-dom";
import kydfull from "./rolling2-c.png";

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

      let _phoneNumber = phoneNumber || inputRef.current.value;
      if (_phoneNumber.indexOf("+") !== 0) {
        _phoneNumber = `+1${_phoneNumber}`;
      }
      const params = {
        username: _phoneNumber,
        password: getRandomString(30),
      };
      await Auth.signUp(params);

      const res = await Auth.signIn(_phoneNumber);
      setAuthenticatingUser(res);

      history.push("/auth/code");
      inputRef.current.value = "";
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
      if (phoneNumber.indexOf("+") !== 0) {
        phoneNumber = `+1${phoneNumber}`;
      }
      const res = await Auth.signIn(phoneNumber);
      history.push("/auth/code");
      inputRef.current.value = "";

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
    <VStack
      backdropColor="black"
      backgroundImage={
        "repeating-radial-gradient( circle at 0 0, transparent 0, #000000 4px ), repeating-linear-gradient( #ffffff55, #ffffff )"
      }
      w="100%"
      h="100vh"
      p={5}
    >
      <VStack maxW="lg" h="100%" spacing={1} justifyContent="center" p={5}>
        <Image
          maxW={"100%"}
          src={kydfull}
          onClick={() =>
            window.open("https://github.com/davidbarrick/solana-hackathon")
          }
        />

        <VStack w="100%" bg="black" p={5}>
          {authState === AUTH_STATES.NEEDS_AUTH && (
            <Switch>
              <Route path="/auth/phone">
                <Stack spacing={4} color="white">
                  <Stack>
                    <Text
                      letterSpacing={"2.5px"}
                      fontWeight={"bold"}
                      fontSize={"3xl"}
                    >
                      Enter phone.
                    </Text>
                    <Text
                      letterSpacing={"1px"}
                      maxW={"80%"}
                      fontStyle="italic"
                      fontWeight={"semibold"}
                      fontSize={"xl"}
                    >
                      Welcome to the future of tickets.
                    </Text>
                  </Stack>

                  <Input
                    isDisabled={loading}
                    ref={inputRef}
                    fontSize="3xl"
                    h="50px"
                    color="black"
                    fontWeight={"bold"}
                    rounded={"none"}
                    borderBottomColor="#ffdc29"
                    borderBottomWidth={"3px"}
                    bg="white"
                    type={"number"}
                  />

                  <Button
                    h="50px"
                    bg="#ffdc29"
                    w="60%"
                    color="black"
                    fontWeight="bold"
                    fontSize={"xl"}
                    rounded="none"
                    isLoading={loading}
                    onClick={onSignIn}
                  >
                    Sign In
                  </Button>
                </Stack>
              </Route>
              <Route path="/auth/code">
                <Stack spacing={4} color="white">
                  <Stack>
                    <Text
                      letterSpacing={"2.5px"}
                      fontWeight={"bold"}
                      fontSize={"3xl"}
                    >
                      Enter code.
                    </Text>
                    <Text
                      letterSpacing={"1px"}
                      maxW={"85%"}
                      fontStyle="italic"
                      fontWeight={"semibold"}
                      fontSize={"xl"}
                    >
                      Check your texts for a verification code.
                    </Text>
                  </Stack>

                  <Input
                    isDisabled={loading}
                    ref={inputRef}
                    fontSize="4xl"
                    h="50px"
                    fontWeight={"bold"}
                    textAlign="center"
                    rounded={"none"}
                    borderBottomColor="#ffdc29"
                    borderBottomWidth={"3px"}
                    bg="white"
                    color="black"
                    type={"number"}
                  />

                  <Button
                    h="50px"
                    bg="#ffdc29"
                    w="60%"
                    color="black"
                    fontWeight="bold"
                    fontSize={"xl"}
                    rounded="none"
                    isLoading={loading}
                    onClick={onVerificationCode}
                  >
                    Submit
                  </Button>
                </Stack>
              </Route>
              <Redirect to="/auth/phone" />
            </Switch>
          )}
        </VStack>
      </VStack>
    </VStack>
  );
};

export default SignIn;
