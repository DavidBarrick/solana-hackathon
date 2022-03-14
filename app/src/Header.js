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
        backgroundImage="linear-gradient(135deg,#6c33da,#a431ff)"
        color="white"
        maxH="100px"
        {...props}
      >
        <Flex align="center" mr={5} mt={3}>
          <Heading as="h1" size="lg">
            kyd
          </Heading>
        </Flex>

        <Box>
          <Link to="/home">
            <Button
              mt={3}
              mr={3}
              p={[2, 4]}
              bg={
                location.pathname.startsWith("/home") ? "white" : "transparent"
              }
              border={location.pathname.startsWith("/home") ? "none" : "1px"}
              borderColor={
                location.pathname.startsWith("/home") ? "none" : "white"
              }
              color={location.pathname.startsWith("/home") ? "black" : "white"}
              fontWeight={
                location.pathname.startsWith("/home") ? "bold" : "normal"
              }
              rounded="full"
            >
              <Text fontSize={["xs", "md"]}>Home</Text>
            </Button>
          </Link>
          <Link to="/candidates">
            <Button
              mt={3}
              mr={3}
              p={[2, 4]}
              bg={
                location.pathname.startsWith("/candidates")
                  ? "white"
                  : "transparent"
              }
              border={
                location.pathname.startsWith("/candidates") ? "none" : "1px"
              }
              borderColor={
                location.pathname.startsWith("/candidates") ? "none" : "white"
              }
              color={
                location.pathname.startsWith("/candidates") ? "black" : "white"
              }
              fontWeight={
                location.pathname.startsWith("/candidates") ? "bold" : "normal"
              }
              rounded="full"
            >
              <Text fontSize={["xs", "md"]}>Candidates</Text>
            </Button>
          </Link>
        </Box>
      </Flex>
    </>
  );
};

export default Header;
