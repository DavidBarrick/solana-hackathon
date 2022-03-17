import React from "react";
import { Box, Heading, Flex, Button, Text, Image } from "@chakra-ui/react";
import { useLocation, Link } from "react-router-dom";
import kydmark from "./kydmark.svg";

const Header = ({
  handleLogout,
  authState,
  onRouteChange,
  profile,
  ...props
}) => {
  const location = useLocation();

  return (
    <>
      <Flex
        as="nav"
        align="center"
        justify="center"
        wrap="wrap"
        padding="1.5rem"
        color="white"
        maxH="100px"
        {...props}
      >
        <Flex align="center" mr={5} mt={3}>
          <Heading as="h1" size="lg">
            <Image src={kydmark} />
          </Heading>
        </Flex>
      </Flex>
    </>
  );
};

export default Header;
