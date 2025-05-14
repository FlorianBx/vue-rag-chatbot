<script setup lang="ts">
import { ref } from 'vue';
import { Marked } from 'marked';
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';
import { useSemanticSearch } from '@/composables/useSemanticSearch';

interface Message {
  "role": 'user' | 'assistant';
  "content": string;
}

const messages = ref<Message[]>([]);
const input = ref('');

const {
  isIndexLoaded,
  generateEmbedding,
  searchMostSimilar,
  generateAnswer,
} = useSemanticSearch();

const isLoading = ref(false);

const marked = new Marked(
  markedHighlight({
	emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

async function sendMessage() {
  if (!input.value.trim() || isLoading.value || !isIndexLoaded.value) return;

  const userQuestion = input.value;
  input.value = '';
  messages.value.push({ role: 'user', content: userQuestion });
  isLoading.value = true;

  try {
    const questionEmbedding = await generateEmbedding(userQuestion);
    const similarPassages = searchMostSimilar(questionEmbedding, 3);

    const contextText = similarPassages.length
      ? similarPassages
          .map((searchResult) => `- ${searchResult.text}`)
          .join('\n')
      : "Aucun passage pertinent trouvé.";

    const systemPrompt = `
      Tu es un assistant. Utilises ce contexte pour répondre à la question de l'utilisateur.
      Si la réponse n'est pas dans le contexte, répondez que tu ne sais pas.

      Contexte :
      ${contextText}

      Question : ${userQuestion}

      Réponse :
    `.trim();

    const aiAnswer = await generateAnswer(systemPrompt);
    const answerInMarkdown = await marked.parse(aiAnswer.content);
    console.log(answerInMarkdown);
    messages.value.push({ role: aiAnswer.role, content: answerInMarkdown });
  } catch (_error) {
    messages.value.push({ role: 'assistant', content: "Erreur lors de la recherche contextuelle." });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
<div class="flex flex-col gap-4 h-[80vh] rounded-lg shadow-sm overflow-hidden">
  <div class="flex-1 p-5 overflow-y-auto bg-stone-900 text-stone-50 flex flex-col gap-3">
    <div 
      v-for="(message, index) in messages" 
      :key="index"
      :class="[
        'p-3 rounded-lg max-w-[70%] break-words', 
        message.role === 'user' 
          ? 'bg-blue-600 text-white self-end' 
          : 'bg-stone-800 border border-gray-200 self-start shadow-sm'
      ]"
      v-dompurify-html="message.content"
    >
    </div>
    <div v-if="isLoading" class="self-start p-3 rounded-lg bg-stone-900 border border-gray-200 flex items-center space-x-1">
      <div class="w-2 h-2 bg-gray-50 rounded-full animate-bounce"></div>
      <div class="w-2 h-2 bg-gray-50 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
      <div class="w-2 h-2 bg-gray-50 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
    </div>
    <div v-if="!isIndexLoaded" class="self-center text-gray-500 text-sm">
      Chargement de la base de docs...
    </div>
  </div>
  <div class="flex gap-4 p-4 bg-stone-900 text-stone-50 border-t border-gray-200">
    <input
      v-model="input"
      @keyup.enter="sendMessage"
      placeholder="Pose ta question sur Vue.js..."
      :disabled="isLoading || !isIndexLoaded"
      class="flex-1 p-3 border border-gray-300 rounded-lg mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <button 
      @click="sendMessage" 
      :disabled="isLoading || !isIndexLoaded"
      class="px-5 py-3 bg-blue-600 text-white font-medium rounded-lg disabled:bg-blue-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
    >
      Envoyer
    </button>
  </div>
</div>
</template>
