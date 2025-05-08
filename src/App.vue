<script setup lang="ts">
import ChatBot from './components/ChatBot.vue';
</script>

<template>
  <main class="container mx-auto px-4 py-8">
    <header class="!mb-4">
      <h1 class="text-3xl font-bold text-gray-200 mb-2">Vue.js Documentation Assistant</h1>
      <p class="text-gray-400">Ask any question about Vue.js and get answers from the documentation</p>
    </header>
    
    <div class="max-w-3xl mx-auto">
      <ChatBot />
    </div>
    
    <footer class="mt-10 text-center text-gray-500 text-sm">
      <p>Powered by Ollama, Qwen, and LangChain</p>
    </footer>
  </main>
</template>
