import { reactive } from 'vue'

interface IStore {
  connection: any,
  videoConnection: any,
  channel: any,
  connectedUser: any,
  setConnectedUser: (value: any) => void,
  updateConnection: (value: any) => void,
  updateVideoConnection: (value: any) => void,
  updateChannel: (value: any) => void,
}

export const store = reactive({
  videoConnection: null,
  channel: null,
  connectedUser: null,
  setConnectedUser(connectedUser: any) {
    this.connectedUser = connectedUser
  },
  updateConnection(connection: any) {
    this.connection = connection
  },
  updateVideoConnection(videoConnection: any) {
    this.videoConnection = videoConnection
  },
  updateChannel(channel: any) {
    this.channel = channel
  }
} as IStore)