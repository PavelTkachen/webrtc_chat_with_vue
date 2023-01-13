import { reactive } from 'vue'

interface IStore {
  connection: any,
  channel: any,
  connectedUser: any,
  setConnectedUser: (value: any) => void,
  updateConnection: (value: any) => void,
  updateChannel: (value: any) => void,
}

export const store = reactive({
  connection: null,
  channel: null,
  connectedUser: null,
  setConnectedUser(connectedUser: any) {
    this.connectedUser = connectedUser
  },
  updateConnection(connection: any) {
    this.connection = connection
  },
  updateChannel(channel: any) {
    this.channel = channel
  }
} as IStore)