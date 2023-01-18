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
  iseServers: [{ url: "stun:stun.1.google.com:19302" }]
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
      if (store.channel.send) {
        store.channel.send(JSON.stringify(text));
      }
      this.message = "";
    },
    onOffer({ offerConnect, name }: { offerConnect: any, name: string }) {
      this.connectedTo = name;
      store.setConnectedUser(name);
      store.connection
        .setRemoteDescription(new RTCSessionDescription(offerConnect))
        .then(() => store.connection.createAnswer())
        .then((answerConnect: any) => store.connection.setLocalDescription(answerConnect))
        .then(() => this.send({
          type: "answerConnect",
          answerConnect: store.connection.localDescription,
          name
        }))
        .catch((error: any) => {
          notification.error({ message: `Ошибка выполнения ${error}` });
        })
    },
    onAnswer({ answerConnect }: { answerConnect: any }) {
      store.connection.setRemoteDescription(new RTCSessionDescription(answerConnect));
    },
    onCandidate({ candidate }: { candidate: any }) {
      store.connection.addIceCandidate(new RTCIceCandidate(candidate));
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
      if (store.connection) {
        let dataChannel = store.connection.createDataChannel("messenger", {
          reliable: false
        });
        if (dataChannel) {
          dataChannel.onopen = function () {
            var readyState = dataChannel.readyState;
            if (readyState == "open" && dataChannel) {
              dataChannel.send(JSON.stringify("Hello"));
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
              type: "offerConnect",
              offerConnect: store.connection.localDescription,
              name: username
            }))
            .catch((e: any) => {
              notification.error({ message: `Ошибка выполнения ${e}` })
            });
        }
      }
    },
    send(data: { type: string; name: any; candidate?: any; offerConnect?: any, answerConnect?: any }) {
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
            case "offerConnect":
              this.onOffer(lastMsg);
              break;
            case "answerConnect":
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