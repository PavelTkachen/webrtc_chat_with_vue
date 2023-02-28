import { USERNAME, CREDENTIAL } from "../../turn_config";

export const config = {
  iceServers: [
    {
      urls: "stun:relay.metered.ca:80",
    },
    {
      urls: "turn:relay.metered.ca:80",
      username: USERNAME,
      credential: CREDENTIAL,
    },
    {
      urls: "turn:relay.metered.ca:443",
      username: USERNAME,
      credential: CREDENTIAL,
    },
    {
      urls: "turn:relay.metered.ca:443?transport=tcp",
      username: USERNAME,
      credential: CREDENTIAL,
    },
  ],
} as RTCConfiguration;

export const mediaConstraints = {
  audio: true,
  video: true
}