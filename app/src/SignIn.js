import React, { useRef } from "react";
import { Box, VStack, Button, useToast, Input } from "@chakra-ui/react";
import { Auth } from "aws-amplify";
import { showErrorToast } from "./utils";

const SignIn = ({ fetchAuthState }) => {
  const toast = useToast();
  const inputRef = useRef(null);

  const onSignIn = async () => {
    try {
      const cognitoUser = await Auth.signIn(
        inputRef.current.value.toLowerCase()
      );

      await Auth.sendCustomChallengeAnswer(cognitoUser, inputRef.current.value);
      await fetchAuthState();
    } catch (err) {
      await Auth.signUp({
        username: inputRef.current.value,
        password: "asdfljh2309wdf90asdf",
      });
      showErrorToast(toast, err.message);
    }
  };

  return (
    <Box bgGradient="linear(to-r, #fccb90, #d57eeb)" w="100%" h="100vh">
      <VStack h="100%" maxW="lg" mx="auto" justifyContent="center">
        <VStack w="100%">
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
        </VStack>
      </VStack>
    </Box>
  );
};

export default SignIn;
