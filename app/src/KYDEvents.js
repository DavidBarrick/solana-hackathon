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
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalOverlay,
  useToast,
} from "@chakra-ui/react";
import { useLocation, Link } from "react-router-dom";
import actions from "./actions";
import QRCode from "react-qr-code";
import { showErrorToast } from "./utils";
import ReactCardFlip from "react-card-flip";

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
      window.open(res.url);
    } catch (err) {
      showErrorToast(toast, err);
    }
    setLoadingPurchase(false);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { events = [], pubkey } = await actions.fetchEvents();
      setKYDEvents(events);
      setPubkey(pubkey);
    } catch (err) {
      showErrorToast(toast, err);
    }
    setLoading(false);
  };

  const renderQRCode = () => (
    <VStack spacing={5} w="100%">
      <QRCode w="100%" value={pubkey} />
      <Button
        bg="purple.500"
        color="white"
        w="100%"
        h="50px"
        onClick={() => setWalletModal(false)}
      >
        Close
      </Button>
    </VStack>
  );

  return (
    <VStack>
      <VStack maxW={"lg"} p={5}>
        {loading && (
          <VStack spacing={5}>
            {processingText && <Text>{processingText}</Text>}
            <Spinner />
          </VStack>
        )}
        {!loading && (
          <VStack spacing={5}>
            <VStack w="100%">
              {kydEvents.map((kydEvent) => (
                <ReactCardFlip
                  isFlipped={walletModal}
                  flipDirection="horizontal"
                >
                  <VStack
                    key={kydEvent.title}
                    w="100%"
                    border="1px"
                    p={5}
                    rounded={"lg"}
                  >
                    <Image rounded={"lg"} maxW={"100%"} src={kydEvent.image} />
                    <Text fontWeight="semibold">{kydEvent.title}</Text>
                    <Text>{kydEvent.date}</Text>
                    <Text>{kydEvent.time}</Text>
                    <Text>{kydEvent.location}</Text>
                    {kydEvent.is_purchased && <Text>✅ Purchased</Text>}

                    {kydEvent.is_purchased && (
                      <Button
                        h="50px"
                        w="100%"
                        onClick={() => setWalletModal(true)}
                      >
                        View Ticket
                      </Button>
                    )}

                    {!kydEvent.is_purchased && (
                      <Button
                        isLoading={loadingPurchase}
                        h="50px"
                        w="100%"
                        onClick={onPurchase}
                      >
                        Purchase
                      </Button>
                    )}
                  </VStack>
                  <VStack>{renderQRCode()}</VStack>
                </ReactCardFlip>
              ))}
            </VStack>
            <Text fontSize={"xs"}>{pubkey}</Text>
          </VStack>
        )}
      </VStack>
    </VStack>
  );
};

export default KYDEvents;
