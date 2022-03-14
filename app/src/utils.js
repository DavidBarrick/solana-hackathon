import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import { detect } from "detect-browser";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);

const TIME_ZONES = {
  EST: "Eastern",
  CST: "Central",
  MST: "Mountain",
  PST: "Pacific",
  EDT: "Eastern",
  CDT: "Central",
  MDT: "Mountain",
  PDT: "Pacific",
};

const showErrorToast = (toast, message) => {
  toast({
    title: "Woops!",
    description: message,
    status: "error",
    duration: 5000,
    isClosable: true,
  });
};

const showSuccessToast = (toast, message) => {
  toast({
    title: "Success!",
    description: message,
    status: "success",
    duration: 5000,
    isClosable: true,
  });
};

const convertTZ = (timestamp, options = {}) => {
  const { mode, showTimeZone } = options;
  if (mode === "countdown") {
    const classTime = new Date(timestamp);
    const difference = classTime - new Date();
    let countdownStr;

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    if (days === 0 && hours === 0 && minutes <= 15) {
      countdownStr = `⏰ ${minutes}m ${seconds}s`;
    } else {
      countdownStr = `Check back ${dayjs(
        timestamp
      ).fromNow()} to join the class!`;
    }

    return countdownStr;
  }

  let [date, timeZoneCode] = dayjs(timestamp)
    .utc()
    .format("ddd, MMM D - h:mmA#z")
    .split("#");

  if (mode === "date") return date.split(" - ").shift();
  if (mode === "time") date = date.split(" - ").pop();

  if (showTimeZone)
    return TIME_ZONES[timeZoneCode]
      ? `${date} ${TIME_ZONES[timeZoneCode]}`
      : `${date} ${timeZoneCode}`;

  return date;
};

const currentTz = () => {
  return dayjs.tz.guess();
};

/**
 * Checks to see if the timestamp given is before the current date in regards to minutes
 * @param {string} timestamp
 */
const isBeforeClassTime = (timestamp) => {
  // Get current time and if it is less than class time, return true
  const today = dayjs();
  return today.diff(timestamp, "minute") < 0;
};

/**
 * Checks to see if the timestamp given is before the current date in regartds to days
 * @param {string} timestamp
 */
const isDaysBeforeClassTime = (timestamp) => {
  // Get current time and if it is less than class time, return true
  const today = dayjs();
  const classTime = dayjs(timestamp);

  return classTime.diff(today, "d") > 0;
};

/**
 * Checks to see if browser is currently running on iOS device
 */
const isiOSDevice = () => {
  const browser = detect();
  return browser && browser.os.toLowerCase() === "ios";
};

/**
 * Checks native functions for Safari to see if the user is on Safari browser
 */
const isSafari = () => {
  const browser = detect();

  return (
    (browser && browser.name.toLowerCase() === "safari") ||
    (browser && browser.name.toLowerCase() === "ios")
  );
};

/**
 * Checks to see if the current browser is mobile chrome on iOS
 */
const isMobileChrome = () => {
  const browser = detect();

  if (browser) {
    const browserName = browser.name.toLowerCase();
    return isiOSDevice() && browserName === "crios";
  }

  return false;
};

/**
 * Checks to see if the current browser is mobile Safari
 */
const isMobileSafari = () => {
  const browser = detect();

  if (browser) {
    const browserName = browser.name.toLowerCase();
    return isiOSDevice() && (browserName === "ios" || browserName === "safari");
  }

  return false;
};

/**
 * Checks to see if the current browser has granted the camera permission given a mediaStream
 * @param {object} mediaStream
 */
const isCameraPermissionGrantedAsync = async (mediaStream) => {
  // If Safari, check media source
  if (isSafari()) {
    return mediaStream !== null;
  }

  // If Chrome, request via query
  const result = await navigator.permissions.query({ name: "camera" });
  return result.state === "granted";
};

/**
 * Checks to see if the current browser has granted the microphone permission given a mediaStream
 * @param {object} mediaStream
 */
const isMicPermissionGrantedAsync = async (mediaStream) => {
  // If Safari, check media source
  if (isSafari()) {
    return mediaStream !== null;
  }

  // If Chrome, request via query
  const result = await navigator.permissions.query({ name: "microphone" });
  return result.state === "granted";
};

/**
 * Checks to see if the current browser is on a mobile device
 */
const isMobileDevice = () => {
  const { userAgent } = navigator;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent
  );
};

const confirmDialog = (msg) => {
  return new Promise(function (resolve, reject) {
    const confirmed = window.confirm(msg);

    return confirmed ? resolve(true) : reject(false);
  });
};

const shortAddress = (address) => {
  return `${address.slice(0, 5)}...${address.slice(address.length - 5)}`;
};

export {
  convertTZ,
  showErrorToast,
  showSuccessToast,
  isBeforeClassTime,
  isDaysBeforeClassTime,
  isCameraPermissionGrantedAsync,
  isMicPermissionGrantedAsync,
  isMobileDevice,
  confirmDialog,
  currentTz,
  isSafari,
  isMobileSafari,
  isiOSDevice,
  isMobileChrome,
  shortAddress,
};
