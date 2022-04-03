import { API } from "aws-amplify";

const fetchEvents = async () => {
  const params = {
    queryStringParameters: fetchQueryParams(),
  };

  try {
    const { result = {} } = await API.get("KYD_API", `/events`, params);
    return result;
  } catch (err) {
    const errData = err.response ? err.response.data : err;
    throw errData;
  }
};

const createPurchase = async (event_id) => {
  const params = {
    queryStringParameters: fetchQueryParams(),
  };

  try {
    const { result = {} } = await API.post(
      "KYD_API",
      `/events/${event_id}/purchase`,
      params
    );
    return result;
  } catch (err) {
    const errData = err.response ? err.response.data : err;
    throw errData;
  }
};

const scanTicketCode = async (code) => {
  const params = {
    body: {
      code,
    },
  };

  console.log(params);
  try {
    const { result = {} } = await API.post("KYD_API", `/validate`, params);
    return result;
  } catch (err) {
    const errData = err.response ? err.response.data : err;
    throw errData;
  }
};

const fetchQueryParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  var retval;
  // Display the key/value pairs
  for (const pair of searchParams.entries()) {
    if (!retval) retval = { [pair[0]]: pair[1] };
    else retval[pair[0]] = pair[1];
  }

  return retval;
};

const actions = {
  fetchEvents,
  createPurchase,
  scanTicketCode,
};

export default actions;
