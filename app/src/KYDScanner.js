import React, { useState, useRef } from "react";
import {
  Text,
  VStack,
  Spinner,
  Stack,
  Input,
  useRadio,
  Button,
} from "@chakra-ui/react";
import { QrReader } from "react-qr-reader";
import actions from "./actions";

const KYDScanner = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const isValid = () => {
    if (!data) {
      return "black";
    }

    return data && data.is_valid ? "green.500" : "red.500";
  };

  const successfulScan = async function (code) {
    setLoading(true);
    try {
      const res = await actions.scanTicketCode(code);
      setData(res);
      console.log({ res });
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  const processPhone = (phone_number) => {
    console.log(phone_number);
    phone_number = `+1${phone_number}`;
    successfulScan(phone_number);
  };

  return (
    <VStack
      minH="100vh"
      p="5"
      backgroundImage={
        "repeating-radial-gradient( circle at 0 0, transparent 0, #000000 4px ), repeating-linear-gradient( #534600b0, #FFDC29 );"
      }
      pt={"50px"}
    >
      <Stack
        w="100%"
        maxW="lg"
        h="full"
        bg="black"
        p="3"
        color={"white"}
        textAlign="left"
        justifyContent="space-between"
      >
        {!loading && (
          <QrReader
            constraints={{ facingMode: "environment" }}
            onResult={(result, error) => {
              if (!!result) {
                if (!loading) successfulScan(result.text);
              }
            }}
          />
        )}
        {loading && (
          <VStack bg="#ffdc29" p={5} spacing={5}>
            <Spinner size={"lg"} color="black" />
            <Text color="black" fontWeight={"semibold"}>
              LOADING
            </Text>
          </VStack>
        )}
        {!loading && (
          <VStack
            spacing={5}
            p={5}
            bg={isValid()}
            textAlign="left"
            color={"white"}
            borderWidth={"1px"}
            borderColor="gray.500"
            borderStyle="solid"
          >
            {!!data && data.valid_reason && (
              <Text lineHeight={"5"} fontSize={"s"} fontWeight="semibold">
                Valid: {data.valid_reason}
              </Text>
            )}
            {!!data && (
              <Text
                lineHeight={"5"}
                fontSize={"xs"}
                maxW="2xs"
                style={{
                  wordWrap: "break-word",
                }}
              >
                Ticket: {data.mint}
              </Text>
            )}
            {/*!data && (
              <Text lineHeight={"5"} fontSize={"s"} fontWeight="semibold">
                Scan to start
              </Text>
            )*/}
            <Input
              h="50px"
              placeholder="phone"
              inputMode="tel"
              ref={inputRef}
            />
            <Button
              onClick={() => processPhone(inputRef.current.value)}
              w="100%"
              color="black"
              bg="#ffdc29"
            >
              Search
            </Button>
          </VStack>
        )}
      </Stack>
    </VStack>
  );
};

export default KYDScanner;
