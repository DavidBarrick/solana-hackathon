import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Flex,
  Button,
  Text,
  VStack,
  Spinner,
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalOverlay,
} from "@chakra-ui/react";
import { useLocation, Link } from "react-router-dom";
import actions from "./actions";
import QRCode from "react-qr-code";

const KYDEvents = () => {
  const [kydEvents, setKYDEvents] = useState([]);
  const [loading, setLoading] = useState(null);
  const [pubkey, setPubkey] = useState(null);
  const [walletModal, setWalletModal] = useState(false);

  const location = useLocation();

  const onPurchase = async () => {
    setLoading(true);
    try {
      const res = await actions.createPurchase("abc");
      console.log(res);
      window.open(res.url);
    } catch (err) {}
    setLoading(false);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { events = [], tickets = [], pubkey } = await actions.fetchEvents();
      console.log(pubkey);
      setKYDEvents(events);
      setPubkey(pubkey);
    } catch (err) {
      console.log(err);
      return {};
    }
    setLoading(false);
  };

  const renderModal = () => {
    return (
      <Modal isOpen={true}>
        <ModalOverlay />
        <ModalContent>
          <ModalBody p={5}>
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
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <VStack p={5}>
      {walletModal && renderModal()}
      {loading && <Spinner />}
      {!loading && (
        <VStack spacing={5}>
          <Text fontSize={"xs"}>{pubkey}</Text>
          <Button onClick={() => setWalletModal(true)}>View Wallet</Button>
          <VStack rounded={"lg"} border="1px">
            <Text>Event 1</Text>
            <Button onClick={onPurchase}>Purchase</Button>
          </VStack>
        </VStack>
      )}
    </VStack>
  );
};

export default KYDEvents;
