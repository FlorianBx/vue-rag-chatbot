import { ref } from 'vue';

export interface Chunk {
  text: string;
  embedding: number[];
  [key: string]: unknown;
}

export interface EmbeddingResponse {
  embedding: number[];
}

export interface SearchResult {
  text: string;
  similarity: number;
}

const INDEX_PATH = '/data/vue-docs-embeddings.json';

export function useSemanticSearch() {
  const index = ref<Chunk[]>([]);
  const isIndexLoaded = ref(false);
  const loadError = ref<string | null>(null);

  async function loadIndex(): Promise<void> {
    try {
      const res = await fetch(INDEX_PATH);
      if (!res.ok) throw new Error('Failed to load index');
      index.value = await res.json() as Chunk[];
      isIndexLoaded.value = true;
      loadError.value = null;
    } catch (e) {
      loadError.value = 'Error loading embeddings index';
      isIndexLoaded.value = false;
      index.value = [];
    }
  }

  // auto-load index at composable creation
  loadIndex();

  async function generateEmbedding(prompt: string): Promise<number[]> {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt
      })
    });
    if (!response.ok) throw new Error('Ollama embedding request failed');
    const res: EmbeddingResponse = await response.json();
    return res.embedding;
  }

  function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    return dot === 0 || normA === 0 || normB === 0 ? 0 : dot / (normA * normB);
  }

  function searchMostSimilar(questionEmbedding: number[], howMany = 3): SearchResult[] {
    if (!index.value.length) return [];
    const results: SearchResult[] = index.value.map(chunk => ({
      text: chunk.text,
      similarity: cosineSimilarity(chunk.embedding, questionEmbedding)
    }));
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, howMany);
  }

  return {
    index,
    isIndexLoaded,
    loadError,
    reloadIndex: loadIndex,
    generateEmbedding,
    searchMostSimilar
  };
}
