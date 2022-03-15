import { API } from "aws-amplify";

const fetchProfile = async () => {
  const params = {
    queryStringParameters: fetchQueryParams(),
  };

  try {
    const { result = {} } = await API.get("KYD_API", `/profile`, params);
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
  fetchProfile,
  createPurchase,
};

export default actions;
