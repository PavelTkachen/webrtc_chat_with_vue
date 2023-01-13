<template>
  <div>
    <a-typography-title :level="5">Список пользователей</a-typography-title>
    <a-list item-layout="horizontal" :data-source="users">
      <template #renderItem="{ item }">
        <a-list-item class='list-item'>
          <a-list-item-meta>
            <template #title>
              <span>{{ item.username }}</span>
            </template>
          </a-list-item-meta>
          <template #actions>
            <a-button :disabled="!!connectedTo && connectedTo !== item.username"
              :loading="connectedTo === item.username && connecting" :onclick='() => toggleConnection(item.username)' >{{
              connectedTo === item.username ? "Отключиться" :
              "Подключиться"}}</a-button>
          </template>
        </a-list-item>
      </template>
    </a-list>
  </div>

</template>

<script lang='ts'>

export default {
  props: ['users', 'connectedTo', 'connecting', 'toggleConnection']
};
</script>

<style scoped>

.list-item {
  font-style: italic;
}
</style>