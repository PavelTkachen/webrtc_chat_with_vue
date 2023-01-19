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
        <UserList :connection='connecting' :connectedTo='connectedTo' :toggleConnection='toggleConnection'
          :users='users' />
      </a-col>
      <a-col :span="12">
        <MessageContainer :messages='messages' :connectedTo='connectedTo' :message='message' :setMessage='setMessage'
          :sendMsg='sendMsg' :username='name' />
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

const config = {
  iseServers: [{ url: 'stun:stun01.sipphone.com' },
  { url: 'stun:stun.ekiga.net' },
  { url: 'stun:stun.fwdnet.net' },
  { url: 'stun:stun.ideasip.com' },
  { url: 'stun:stun.iptel.org' },
  { url: 'stun:stun.rixtelecom.se' },
  { url: 'stun:stun.schlund.de' },
  { url: 'stun:stun.l.google.com:19302' },
  { url: 'stun:stun1.l.google.com:19302' },
  { url: 'stun:stun2.l.google.com:19302' },
  { url: 'stun:stun3.l.google.com:19302' },
  { url: 'stun:stun4.l.google.com:19302' },
  { url: 'stun:stunserver.org' },
  { url: 'stun:stun.softjoys.com' },
  { url: 'stun:stun.voiparound.com' },
  { url: 'stun:stun.voipbuster.com' },
  { url: 'stun:stun.voipstunt.com' },
  { url: 'stun:stun.voxgratia.org' },
  { url: 'stun:stun.xten.com' },
  {
    url: 'turn:numb.viagenie.ca',
    credential: 'muazkh',
    username: 'webrtc@live.com'
  },
  {
    url: 'turn:192.158.29.39:3478?transport=udp',
    credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    username: '28224511:1379330808'
  },
  {
    url: 'turn:192.158.29.39:3478?transport=tcp',
    credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    username: '28224511:1379330808'
  }]
} as RTCConfiguration;

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
      messages: {} as any,
      message: "" as string,
    };
  },
  methods: {
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
        console.log("store", store);
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
        console.log('store.channel.send', store.channel)

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
    onCandidate({ candidate }: { candidate: any }) {
      if (candidate) {
        store.connection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    },
    handleDataChannelMessageReceived({ data }: { data: any }) {
      console.log('8')
      const message = JSON.parse(data);
      const { name: user } = message;
      let userMessages = this.messages[user];
      if (userMessages) {
        console.log('9')
        userMessages = [...userMessages, message];
        let newMessages = { ...this.messages, [user]: userMessages };
        this.messages = newMessages;
      } else {
        console.log('10')

        let newMessages = { ...this.messages, [user]: [message] };
        this.messages = newMessages;
      }
    },
    handleConnection(username: string) {
      try {
        console.log('3')

        if (store.connection) {
          console.log('4')

          let dataChannel = store.connection.createDataChannel("messenger", {
            reliable: false
          });
          console.log('dataChannel', dataChannel);
          if (dataChannel) {
            console.log('5')
            dataChannel.onopen = function () {
              console.log('7')
              var readyState = dataChannel.readyState;
              console.log('readyState', readyState);

              if (readyState == "open" && dataChannel) {
                this.send(JSON.stringify("Hello"));
              }
            };
            dataChannel.onerror = (error: any) => {
              console.log('6', error)
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
    send(data: { type: string; name: any; candidate?: any; offer?: any, answer?: any }) {
      this.wsConnection.send(JSON.stringify(data));
    },
    toggleConnection(username: string) {
      if (store.connectedUser === username) {
        console.log('1')
        this.connecting = true;
        this.connectedTo = "";
        store.setConnectedUser("");
        this.connecting = false;
      } else {
        console.log('2')
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
        let localConnection = new RTCPeerConnection(config);
        localConnection.onicecandidate = (({ candidate }) => {
          console.log('candidate', candidate)
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
          console.log('receiveChannel', receiveChannel);
          if (receiveChannel) {
            receiveChannel.onopen = () => {
              console.log("Data channel is success open and ready to be userd");
              receiveChannel.onmessage = this.handleDataChannelMessageReceived;
            }
            store.updateChannel(receiveChannel);
          }
        };
        store.updateConnection(localConnection);
      } else {
        notification.error({ message: message });
      }
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