<template>
  <a-card v-if='connectedTo'>
    <a-comment v-for='item in messages[connectedTo]' :key='item.time'>
      <template #author><a>{{ item.name }}</a></template>
      <template #avatar>
        <a-avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" alt="Han Solo" />
      </template>
      <template #content>
        <p>
          {{ item.message }}
        </p>
      </template>
      <template #datetime>
        <a-tooltip :title="item.time">
          <span>{{ item.time }}</span>
        </a-tooltip>
      </template>
    </a-comment>
    <a-comment>
      <template #content>
        <a-form-item>
          <a-textarea :rows="4" :value="message" @change="handleChange" />
        </a-form-item>
        <a-form-item>
          <a-button html-type="submit" type="primary" @click="sendMsg">
            Отправить
          </a-button>
        </a-form-item>
      </template>
    </a-comment>
  </a-card>
</template>
<script lang='ts'>
import { format } from 'date-fns';

export default {
  props: ['messages', 'connectedTo', 'message', 'setMessage', 'sendMsg', 'username'],
  methods: {
    dateFormat: format,
    handleChange(event: any) {
      console.log(this.messages)
      this.setMessage(event.target.value)
    }
  }
};
</script>
