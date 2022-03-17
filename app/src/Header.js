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
        justify="space-between"
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

        <Box>
          <Link to="/events">
            <Button
              mt={3}
              mr={3}
              p={[2, 4]}
              bg={
                location.pathname.startsWith("/events")
                  ? "white"
                  : "transparent"
              }
              border={location.pathname.startsWith("/events") ? "none" : "1px"}
              borderColor={
                location.pathname.startsWith("/events") ? "none" : "white"
              }
              color={
                location.pathname.startsWith("/events") ? "black" : "white"
              }
              fontWeight={
                location.pathname.startsWith("/events") ? "bold" : "normal"
              }
              rounded="full"
            >
              <Text fontSize={["xs", "md"]}>Events</Text>
            </Button>
          </Link>
        </Box>
      </Flex>
    </>
  );
};

export default Header;
