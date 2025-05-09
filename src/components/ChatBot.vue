<script setup lang="ts">
import { ref } from 'vue';
import { useSemanticSearch } from '@/composables/useSemanticSearch';

const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([]);
const input = ref('');

const {
  isIndexLoaded,
  generateEmbedding,
  searchMostSimilar,
} = useSemanticSearch();

const isLoading = ref(false);

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
          .map((searchResult, passageIndex) => `- ${searchResult.text}`)
          .join('\n')
      : "Aucun passage pertinent trouvé.";

    const systemPrompt = `
      Vous êtes un assistant. Utilisez ce contexte pour répondre à la question de l'utilisateur.
      Si la réponse n'est pas dans le contexte, répondez que vous ne savez pas.

      Contexte :
      ${contextText}

      Question : ${userQuestion}

      Réponse :
    `.trim();

    messages.value.push({ role: 'assistant', content: `\`\`\`\n${systemPrompt}\n\`\`\`` });
  } catch (_error) {
    messages.value.push({ role: 'assistant', content: "Erreur lors de la recherche contextuelle." });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
<div class="flex flex-col gap-4 h-[80vh] border border-gray-200 rounded-lg shadow-sm overflow-hidden">
  <div class="flex-1 p-5 overflow-y-auto bg-gray-50 text-slate-800 flex flex-col gap-3">
    <div 
      v-for="(message, idx) in messages" 
      :key="idx"
      :class="[
        'p-3 rounded-lg max-w-[70%] break-words', 
        message.role === 'user' 
          ? 'bg-blue-600 text-white self-end' 
          : message.role === 'system'
            ? 'bg-amber-100 border border-amber-300 self-center text-amber-800 text-sm'
            : 'bg-white border border-gray-200 self-start shadow-sm'
      ]"
      v-html="message.content"
    >
    </div>
    <div v-if="isLoading" class="self-start p-3 rounded-lg bg-white border border-gray-200 flex items-center space-x-1">
      <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
      <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
      <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
    </div>
    <div v-if="!isIndexLoaded" class="self-center text-gray-500 text-sm">
      Chargement de la base de docs...
    </div>
  </div>
  <div class="flex gap-4 p-4 bg-white text-slate-800 border-t border-gray-200">
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
