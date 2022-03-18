import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Heading,
  Flex,
  Image,
  Button,
  Text,
  VStack,
  Spinner,
  Modal,
  Icon,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalOverlay,
  useToast,
  Stack,
  HStack,
} from "@chakra-ui/react";
import { useLocation, Link } from "react-router-dom";
import actions from "./actions";
import QRCode from "react-qr-code";
import { showErrorToast } from "./utils";
import ReactCardFlip from "react-card-flip";
import { FaMap, FaCalendar, FaClock } from "react-icons/fa";
import kydmark from "./kydmark.svg";
import buttonbg from "./buttonbg.svg";

const KYDEvents = () => {
  const [kydEvents, setKYDEvents] = useState([]);
  const [loading, setLoading] = useState(null);
  const [loadingPurchase, setLoadingPurchase] = useState(null);

  const [pubkey, setPubkey] = useState(null);
  const [walletModal, setWalletModal] = useState(false);
  const [processingText, setProcessingText] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const toast = useToast();

  const urlSearchParams = new URLSearchParams(window.location.search);

  const startPolling = useCallback(() => {
    const interval = setInterval(async () => {
      await fetchEvents();

      setRetryCount((prevCount) => {
        return prevCount + 1;
      });
    }, 2000);

    console.log("Set Interval: ", interval);
    setPollingInterval(interval);
  }, []);

  useEffect(() => {
    const purchasedEvent = kydEvents.find((k) => k.is_purchased);
    if (purchasedEvent && pollingInterval) {
      clearInterval(pollingInterval);
      setLoading(false);
      window.history.replaceState({}, document.title, "/events");
    }
  }, [kydEvents, pollingInterval]);

  useEffect(() => {
    console.log("Retry Count: ", retryCount);
    if (retryCount === 10) {
      pollingInterval.clearInterval();
      setLoading(false);
      window.history.replaceState({}, document.title, "/events");
    }
  }, [retryCount, pollingInterval]);

  useEffect(() => {
    const processingParam = urlSearchParams.get("processing");
    if (processingParam) {
      setProcessingText(decodeURIComponent(processingParam));
      startPolling();
    } else {
      fetchEvents();
    }
  }, []);

  const onPurchase = async () => {
    setLoadingPurchase(true);
    try {
      const res = await actions.createPurchase("abc");
      window.location.assign(res.url);
    } catch (err) {
      setLoadingPurchase(false);
      showErrorToast(toast, err);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { events = [], pubkey } = await actions.fetchEvents();
      setKYDEvents(events);
      setPubkey(pubkey);
    } catch (err) {
      if (err !== "No current user") {
        showErrorToast(toast, err);
      }
    }

    if (!pollingInterval) {
      setLoading(false);
    }
  };

  const renderQRCode = (kydEvent) => (
    <VStack spacing={5} w="100%">
      <QRCode w="100%" value={pubkey} />
      <Stack
        py={5}
        w="100%"
        backgroundColor="black"
        color={"white"}
        textAlign="left"
        p={3}
        spacing={4}
        bg="black"
      >
        <Stack px={4} spacing={-1}>
          <Text
            fontSize={"sm"}
            fontStyle={"italic"}
            color="#ffdc29"
            fontWeight={"extrabold"}
          >
            Event:
          </Text>
          <Text fontSize={"xl"} fontWeight="bold">
            KYDNYC Kickoff Party
          </Text>
        </Stack>

        <Stack px={4}>
          <Text lineHeight={"5"} fontSize={"xs"} fontWeight="semibold">
            {kydEvent.description}
          </Text>
        </Stack>

        <Stack px={4}>
          <HStack spacing={4}>
            <Icon color={"#ffdc29"} as={FaMap} />
            <Text fontWeight={"semibold"} fontSize="sm" color={"#ffdc29"}>
              {kydEvent.location}
            </Text>
          </HStack>

          <HStack spacing={4}>
            <Icon color={"#ffdc29"} as={FaCalendar} />
            <Text fontWeight={"semibold"} fontSize="sm" color={"#ffdc29"}>
              {kydEvent.date}
            </Text>
          </HStack>

          <HStack spacing={4}>
            <Icon color={"#ffdc29"} as={FaClock} />
            <Text fontWeight={"semibold"} fontSize="sm" color={"#ffdc29"}>
              {kydEvent.time}
            </Text>
          </HStack>
        </Stack>
      </Stack>

      <Button
        bg="#ffdc29"
        w="100%"
        h="50px"
        rounded="none"
        color="black"
        fontSize={"lg"}
        fontWeight={"semibold"}
        onClick={() => setWalletModal(false)}
      >
        Close
      </Button>
    </VStack>
  );

  return (
    <VStack
      minH={"100vh"}
      backgroundImage={
        "repeating-radial-gradient( circle at 0 0, transparent 0, #000000 4px ), repeating-linear-gradient( #ffdc2955, #FFDC29 );"
      }
      pt={"50px"}
    >
      <Image src={kydmark} maxW="15%" />
      <VStack maxW={"lg"} p={3}>
        {loading && (
          <VStack spacing={5}>
            {processingText && <Text>{processingText}</Text>}
            <Spinner size={"lg"} color="white" />
          </VStack>
        )}
        {!loading && (
          <VStack>
            <VStack w="100%" p={5}>
              {kydEvents.map((kydEvent) => (
                <ReactCardFlip
                  isFlipped={walletModal}
                  flipDirection="horizontal"
                  key={kydEvent.title}
                >
                  <Stack
                    key={kydEvent.title}
                    w="100%"
                    backgroundColor="black"
                    color={"white"}
                    textAlign="left"
                    p={3}
                    spacing={4}
                  >
                    <Image
                      borderWidth={"1px"}
                      borderColor="gray.500"
                      borderStyle="solid"
                      src={kydEvent.image}
                    />
                    <Stack px={4} spacing={-1}>
                      <Text
                        fontSize={"sm"}
                        fontStyle={"italic"}
                        color="#ffdc29"
                        fontWeight={"extrabold"}
                      >
                        Event:
                      </Text>
                      <Text fontSize={"xl"} fontWeight="bold">
                        KYDNYC Kickoff Party
                      </Text>
                    </Stack>

                    <Stack px={4}>
                      <Text
                        lineHeight={"5"}
                        fontSize={"xs"}
                        fontWeight="semibold"
                      >
                        {kydEvent.description}
                      </Text>
                    </Stack>

                    <Stack px={4}>
                      <HStack spacing={4}>
                        <Icon color={"#ffdc29"} as={FaMap} />
                        <Text
                          fontWeight={"semibold"}
                          fontSize="sm"
                          color={"#ffdc29"}
                        >
                          {kydEvent.location}
                        </Text>
                      </HStack>

                      <HStack spacing={4}>
                        <Icon color={"#ffdc29"} as={FaCalendar} />
                        <Text
                          fontWeight={"semibold"}
                          fontSize="sm"
                          color={"#ffdc29"}
                        >
                          {kydEvent.date}
                        </Text>
                      </HStack>

                      <HStack spacing={4}>
                        <Icon color={"#ffdc29"} as={FaClock} />
                        <Text
                          fontWeight={"semibold"}
                          fontSize="sm"
                          color={"#ffdc29"}
                        >
                          {kydEvent.time}
                        </Text>
                      </HStack>
                    </Stack>
                    {/*kydEvent.is_purchased && <Text>✅ Purchased</Text>*/}
                    <Stack pb={4} px={4}>
                      {kydEvent.is_purchased && (
                        <Button
                          h="50px"
                          w="60%"
                          bg="#ffdc29"
                          fontWeight={"semibold"}
                          border="none"
                          color="black"
                          rounded="none"
                          fontSize={"lg"}
                          onClick={() => {
                            setWalletModal(true);
                            document.body.scrollTop = 0; // For Safari
                            document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
                          }}
                        >
                          View Ticket
                        </Button>
                      )}
                      {!kydEvent.is_purchased && (
                        <Button
                          isLoading={loadingPurchase}
                          h="50px"
                          w="60%"
                          bg="#ffdc29"
                          fontWeight={"semibold"}
                          border="none"
                          color="black"
                          rounded="none"
                          fontSize={"lg"}
                          onClick={onPurchase}
                        >
                          Buy Ticket
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                  <VStack>{renderQRCode(kydEvent)}</VStack>
                </ReactCardFlip>
              ))}
            </VStack>
          </VStack>
        )}
      </VStack>
    </VStack>
  );
};

export default KYDEvents;
