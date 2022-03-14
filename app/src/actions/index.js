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

const updateIntro = async (user_id, intro_id, data = {}) => {
  const params = {
    queryStringParameters: fetchQueryParams(),
    body: data,
  };

  try {
    const { result = {} } = await API.put(
      "KYD_API",
      `/users/${user_id}/intros/${intro_id}`,
      params
    );
    return result;
  } catch (err) {
    const errData = err.response ? err.response.data : err;
    throw errData;
  }
};

const updateCandidate = async (candidate_id, action, data) => {
  const params = {
    queryStringParameters: fetchQueryParams(),
    body: {
      action,
      data,
    },
  };

  try {
    const { result = {} } = await API.put(
      "KYD_API",
      `/candidates/${candidate_id}`,
      params
    );
    return result;
  } catch (err) {
    const errData = err.response ? err.response.data : err;
    throw errData;
  }
};

const createIntro = async (candidate_id) => {
  const params = {
    queryStringParameters: fetchQueryParams(),
  };

  try {
    const { result = {} } = await API.post(
      "KYD_API",
      `/candidates/${candidate_id}/intros`,
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
  createIntro,
  updateIntro,
  updateCandidate,
};

export default actions;
