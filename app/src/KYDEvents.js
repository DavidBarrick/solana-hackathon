import React from "react";
import { Box, Heading, Flex, Button, Text, VStack } from "@chakra-ui/react";
import { useLocation, Link } from "react-router-dom";
import actions from "./actions";

const KYDEvents = () => {
  const location = useLocation();

  const onPurchase = async () => {
    try {
      const res = await actions.createPurchase("abc");
      console.log(res);
      window.open(res.url);
    } catch (err) {}
  };

  return (
    <VStack>
      <VStack rounded={"lg"} border="1px">
        <Text>Event 1</Text>
        <Button onClick={onPurchase}>Purchase</Button>
      </VStack>
    </VStack>
  );
};

export default KYDEvents;
