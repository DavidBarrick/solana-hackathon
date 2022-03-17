import React from "react";
import { Box, Heading, Flex, Button, Text } from "@chakra-ui/react";
import { useLocation, Link } from "react-router-dom";

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
        bg="purple.500"
        backgroundImage="linear-gradient(135deg,#fee140,#fa709a)"
        color="white"
        maxH="100px"
        {...props}
      >
        <Flex align="center" mr={5} mt={3}>
          <Heading as="h1" size="lg">
            🎟 kyd
          </Heading>
        </Flex>
      </Flex>
    </>
  );
};

export default Header;
