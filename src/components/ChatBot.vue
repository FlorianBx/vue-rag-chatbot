<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const messages = ref<ChatMessage[]>([]);
const input = ref<string>('');
const isLoading = ref<boolean>(false);
const isKBLoading = ref<boolean>(true);
const vectorStore = ref<MemoryVectorStore | null>(null);

messages.value.push({
  role: 'assistant',
  content: 'Hello! I am your Vue.js assistant. How can I help you today?'
});

const model = new ChatOllama({
  baseUrl: 'http://localhost:11434',
  model: 'qwen',
  temperature: 0.5,
});

const prompt = ChatPromptTemplate.fromTemplate(`
  You are a helpful Vue.js expert assistant.

  Use the following documentation context to answer the question:

  {context}

  Question: {question}

  If the information is not in the provided context, be honest and say so.
  Answer concisely and precisely.
`);

onMounted(async () => {
  debugger;
  try {
    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: "http://localhost:11434",
    });

    const response = await fetch('./vue_docs_index.json');
    if (!response.ok) throw new Error('Failed to load vector store data');
    const memoryVectors = await response.json();


    const store = new MemoryVectorStore(embeddings);
    console.log(store);

    for (const vector of memoryVectors) {
      await store.addDocuments(
        [{ pageContent: vector.document.pageContent, metadata: vector.document.metadata }],
        { vectors: [vector.embedding] }
      );
    }

    vectorStore.value = store;
    console.log("Knowledge base loaded successfully");
  } catch (error) {
    console.error("Error loading knowledge base:", error);
    messages.value.push({
      role: 'system',
      content: "⚠️ Could not load the knowledge base. Answers will not be based on documentation."
    });
  } finally {
    isKBLoading.value = false;
  }
});

async function sendMessage(): Promise<void> {
  if (!input.value.trim() || isLoading.value || isKBLoading.value) return;

  const userMessage = input.value.trim();
  input.value = '';

  messages.value.push({
    role: 'user',
    content: userMessage
  });

  isLoading.value = true;

  try {
    let response = '';

    if (vectorStore.value) {
      const retriever = vectorStore.value.asRetriever({ k: 3 });
      const chain = RunnableSequence.from([
        {
          question: (question: string) => question,
          context: async (question: string) => {
            const docs = await retriever.getRelevantDocuments(question);
            return formatDocumentsAsString(docs);
          },
        },
        prompt,
        model,
        new StringOutputParser(),
      ]);
      response = await chain.invoke(userMessage);
    } else {
      const result = await model.invoke(userMessage);
      response = result.content.toString();
    }

    messages.value.push({
      role: 'assistant',
      content: response
    });

  } catch (error) {
    console.error('Error generating response:', error);
    messages.value.push({
      role: 'assistant',
      content: "Sorry, an error occurred while generating the response."
    });
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
      >
        {{ message.content }}
      </div>
      <div v-if="isLoading" class="self-start p-3 rounded-lg bg-white border border-gray-200 flex items-center space-x-1">
        <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
        <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
      </div>
      <div v-if="isKBLoading" class="self-center text-gray-500 text-sm">
        Loading knowledge base...
      </div>
    </div>
    <div class="flex gap-4 p-4 bg-white text-slate-800 border-t border-gray-200">
      <input
        v-model="input"
        @keyup.enter="sendMessage"
        placeholder="Ask a question about Vue.js..."
        :disabled="isLoading || isKBLoading"
        class="flex-1 p-3 border border-gray-300 rounded-lg mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button 
        @click="sendMessage" 
        :disabled="isLoading || isKBLoading"
        class="px-5 py-3 bg-blue-600 text-white font-medium rounded-lg disabled:bg-blue-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        Send
      </button>
    </div>
  </div>
</template>
