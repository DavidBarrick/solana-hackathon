import { createContext } from "react";

const ProfileContext = createContext({
  fetchProfile: () => {},
});

export default ProfileContext;
