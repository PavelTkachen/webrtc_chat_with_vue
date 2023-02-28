<template>
  <div v-if='!socketOpen'>
    <wechat-outlined style='font-size: 64px;' />
    <a-typography-title :level="3">WebRTC Чат-приложение</a-typography-title>
    <a-spin tip="Устанавливаем соединение..." :spinning="true" />
  </div>
  <div v-else style='margin-top: 0; padding-top: 0;'>
    <wechat-outlined style='font-size: 64px;' />
    <a-typography-title :level="3">WebRTC Чат-приложение</a-typography-title>
    <a-form v-if='!isLogged' :model="formState" name="form-login" autocomplete="off" @finish="handleLoginSubmit"
      style='display: flex; width: 100%; padding-left: 43%;'>
      <a-form-item label="Логин" name="name" :rules="[{ required: true, message: 'Задайте имя пользователя' }]"
        style='width: 200px;'>
        <a-input v-model:value="formState.name" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit">Войти</a-button>
      </a-form-item>
    </a-form>
    <a-typography-body v-else>Текущий пользователь: {{ name }}</a-typography-body>
    <a-row>
      <a-col :span="12">
        <UserList :connection='connecting' :connected-to='connectedTo' :toggle-connection='toggleConnection'
          :users='users' />
      </a-col>
      <a-col :span="12">
        <MessageContainer :init-video-chat='initVideoChat' :messages='messages' :connected-to='connectedTo'
          :message='message' :set-message='setMessage' :sendMsg='sendMsg' :username='name' :is-video='isVideo'
          :initVideo='initVideoChat' />
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts">
import { notification } from 'ant-design-vue';
import { format } from 'date-fns';
import { WechatOutlined } from '@ant-design/icons-vue';
import { reactive } from 'vue';
import { store } from '../store';
import UserList from './UserList.vue';
import MessageContainer from './MessageContainer.vue';
import { config, mediaConstraints } from '../constants/config';

export default {
  setup() {
    const formState = reactive({
      name: '',
    });
    return {
      formState,
    };
  },
  components: {
    WechatOutlined,
    UserList,
    MessageContainer,
  },
  data() {
    return {
      socketOpen: false as boolean,
      socketMessages: [] as any[],
      isLogged: false as boolean,
      name: null as any,
      isLogging: false as boolean,
      users: [] as any[],
      wsConnection: null as any,
      connectedTo: "" as string,
      connecting: false as boolean,
      isVideo: false as boolean,
      messages: {} as any,
      message: "" as string,
    };
  },
  methods: {
    initVideoChat() {
      this.isVideo = true;
      navigator.mediaDevices.getUserMedia({ ...mediaConstraints, audio: false })
        .then((localStream) => {
          const localVideo: HTMLVideoElement | null = document.getElementById('local_video') as HTMLVideoElement;
          if (localVideo) {
            localVideo.srcObject = localStream;
            localStream.getTracks().forEach(track => store.connection.addTrack(track));
          }
        })
        .catch(e => {
          throw new Error(`Error video initialize 1: ${e}`);
        })
      this.createPeerConnection()
    },
    setMessage(value: string) {
      this.message = value;
    },
    updateUsersList({ user }: { user: any }) {
      const oldUsers = [...this.users];
      this.users = [...oldUsers, user];
    },
    removeUser({ user }: { user: any }) {
      this.users = this.users.filter(item => item.username !== user.username)
    },
    sendMsg() {
      try {
        const time = format(new Date(), "yyyy-MM-dd HH:mm:ss");
        let text = { time, message: this.message, name: this.name };
        let userMessages = this.messages[this.connectedTo];
        if (this.messages[this.connectedTo]) {
          userMessages = [...userMessages, text];
          let newMessages = {
            ...this.messages,
            [this.connectedTo]: userMessages
          };
          this.messages = newMessages;
        } else {
          userMessages = { ...this.messages, [this.connectedTo]: [text] }
          this.messages = userMessages;
        }
        if (store.channel?.send) {
          store.channel.send(JSON.stringify(text));
        }
        this.message = "";
      } catch (error) {
        console.log('ERROR2: ', error)
      }

    },
    onOffer({ offer, name }: { offer: any, name: string }) {
      this.connectedTo = name;
      store.setConnectedUser(name);
      store.connection
        .setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => store.connection.createAnswer())
        .then((answer: any) => store.connection.setLocalDescription(answer))
        .then(() => this.send({
          type: "answer",
          answer: store.connection.localDescription,
          name
        }))
        .catch((error: any) => {
          notification.error({ message: `Ошибка выполнения ${error}` });
        })
    },
    onAnswer({ answer }: { answer: any }) {
      store.connection.setRemoteDescription(new RTCSessionDescription(answer));
    },
    onVideoAnswer({ sdp }: { sdp: any }) {
      console.log('answer', sdp)
      store.connection.setRemoteDescription(new RTCSessionDescription(sdp));
    },
    onCandidate({ candidate }: { candidate: any }) {
      if (candidate) {
        store.connection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    },
    handleDataChannelMessageReceived({ data }: { data: any }) {
      const message = JSON.parse(data);
      const { name: user } = message;
      let userMessages = this.messages[user];
      if (userMessages) {
        userMessages = [...userMessages, message];
        let newMessages = { ...this.messages, [user]: userMessages };
        this.messages = newMessages;
      } else {
        let newMessages = { ...this.messages, [user]: [message] };
        this.messages = newMessages;
      }
    },
    handleConnection(username: string) {
      try {
        if (store.connection) {
          let dataChannel = store.connection.createDataChannel("messenger");
          if (dataChannel) {
            dataChannel.onopen = function () {
              let readyState = dataChannel.readyState;
              if (readyState == "open" && dataChannel) {
                this.send(JSON.stringify("Hello"));
              }
            };
            dataChannel.onerror = (error: any) => {
              notification.error({ message: `Ошибка выполнения ${error}` })
            }
            dataChannel.onmessage = this.handleDataChannelMessageReceived;
            store.updateChannel(dataChannel);
            store.connection
              .createOffer()
              .then((offer: any) => store.connection.setLocalDescription(offer))
              .then(() => this.send({
                type: "offer",
                offer: store.connection.localDescription,
                name: username
              }))
              .catch((e: any) => {
                notification.error({ message: `Ошибка выполнения ${e}` })
              });
          }
        }
      } catch (error) {
        console.log("ERROR: ", error)
      }
    },
    send(data: { type: string; name: any; candidate?: any; offer?: any, answer?: any, sdp?: any }) {
      this.wsConnection.send(JSON.stringify(data));
    },
    toggleConnection(username: string) {
      if (store.connectedUser === username) {
        this.connecting = true;
        this.connectedTo = "";
        store.setConnectedUser("");
        this.connecting = false;
      } else {
        this.connecting = true;
        this.connectedTo = username;
        store.setConnectedUser(username);
        this.handleConnection(username);
        this.connecting = false;
      }
    },
    setConnection(wsConnection: any) {
      this.wsConnection = wsConnection;
    },
    setSocketMessages(data: any[]) {
      this.socketMessages = data;
    },
    setSocketOpen() {
      this.socketOpen = true;
    },
    handleLoginSubmit(values: { name: any; }) {
      this.isLogging = true;
      this.name = values.name;
      this.send({
        type: "login",
        name: values.name
      });
    },
    onLogin({ success, message, users: loggedIn }: { success: any, message: any, users: any }) {
      this.isLogging = false;
      if (success) {
        notification.success({ message: "Вы успешно вошли в чат" });
        this.isLogged = true;
        this.users = loggedIn;
        this.createPeerConnection();
      } else {
        notification.error({ message: message });
      }
    },
    onVideoOffer(msg: any) {
      console.log(1)
      let localStream: any = null;

      // this.createPeerConnection();

      let desc = new RTCSessionDescription(msg.sdp);

      store.connection.setRemoteDescription(desc).then(function () {
        return navigator.mediaDevices.getUserMedia({...mediaConstraints, audio: false});
      })
        .then(function (stream: any) {
          const localVideo: HTMLVideoElement | null = document.getElementById('local_video') as HTMLVideoElement;
          if (localVideo) {
            localStream = stream;
            localVideo.srcObject = localStream;
            localStream.getTracks().forEach((track: any) => store.connection.addTrack(track));
          }
        })
        .then(function () {
          return store.connection.createAnswer();
        })
        .then(function (answer: any) {
          return store.connection.setLocalDescription(answer);
        })
        .then(() => {
          this.send({
            name: msg.name,
            type: "video-answer",
            sdp: store.connection.localDescription
          });
        })
        .catch((e: any) => {
          throw new Error("Error handle video offer: " + `${e}`);
        });
    },
    createPeerConnection() {
      let localConnection = new RTCPeerConnection(config);
      localConnection.onicecandidate = (({ candidate }) => {
        let connectedTo = store.connectedUser;
        if (candidate && !!connectedTo) {
          this.send({
            name: connectedTo,
            type: "candidate",
            candidate
          })
        }
      });
      localConnection.ondatachannel = event => {
        let receiveChannel = event.channel;
        if (receiveChannel) {
          receiveChannel.onopen = () => {
            console.log("Data channel is success open and ready to be userd");
            receiveChannel.onmessage = this.handleDataChannelMessageReceived;
          }
          store.updateChannel(receiveChannel);
        }
      };
      localConnection.onnegotiationneeded = () => {
        store.connection.createOffer()
          // .then((offer: any) => {
          //   console.log('offer', offer)
          //   return store.connection.setLocalDescription(offer);
          // })
          .then(() => {
            this.send({
              name: this.connectedTo,
              type: "video-offer",
              sdp: store.connection.localDescription
            });
          })
          .catch((e: any) => {
            throw new Error("Error negotiation: " + `${e}`);
          });
      };
      localConnection.ontrack = (event: any) => {
        const receivedVideo: HTMLVideoElement | null = document.getElementById('received_video') as HTMLVideoElement;
        if (receivedVideo) {
          receivedVideo.srcObject = event?.streams?.[0];
        }
      };
      store.updateConnection(localConnection);
    }
  },
  created() {
    try {
      const wsConnection = new WebSocket("ws://134.0.113.112:9000");

      wsConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.setSocketMessages([...this.socketMessages, data]);
        this.setConnection(wsConnection);
      };
      wsConnection.onclose = () => {
        wsConnection.close();
      };
    } catch (error) {
      notification.error({ message: `Ошибка: ${error}` });
    }
  },
  watch: {
    socketMessages(newValue, prevValue) {
      if (newValue.length !== prevValue.length) {
        let lastMsg: any = this.socketMessages[this.socketMessages.length - 1];
        if (lastMsg) {
          switch (lastMsg.type) {
            case "connect":
              this.setSocketOpen();
              break;
            case "login":
              this.onLogin(lastMsg);
              break;
            case "updateUsers":
              this.updateUsersList(lastMsg);
              break;
            case "removeUser":
              this.removeUser(lastMsg);
              break;
            case "offer":
              this.onOffer(lastMsg);
              break;
            case "answer":
              this.onAnswer(lastMsg);
              break;
            case "video-offer":
              console.log('video-offer', lastMsg)
              this.onVideoOffer(lastMsg);
              break;
            case "video-answer":
              console.log('video-answer', lastMsg)
              this.onVideoAnswer(lastMsg);
              break;
            case "candidate":
              this.onCandidate(lastMsg);
              break;
            default:
              break;
          }
        }
      }
    }
  }
};
</script>