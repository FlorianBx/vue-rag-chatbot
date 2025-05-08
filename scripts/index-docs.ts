import * as fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readAllMarkdownFiles(dir: string): { file: string, content: string }[] {
  let results: { file: string, content: string }[] = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(readAllMarkdownFiles(filePath));
    } else if (file.endsWith('.md')) {
      results.push({
        file: filePath,
        content: fs.readFileSync(filePath, 'utf8')
      });
    }
  }
  return results;
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map(p => p.trim())
    .filter(p => p.length > 30);
}

async function getEmbedding(text: string, model = 'nomic-embed-text') {
  const res = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  });
  const json = await res.json();
  return json.embedding as number[];
}

async function buildRagIndex() {
  const docsDir = path.resolve(__dirname, '../vue-docs');
  const docs = readAllMarkdownFiles(docsDir);
  const index: any[] = [];
  for (const doc of docs) {
    const paragraphs = splitIntoParagraphs(doc.content);
    for (let i = 0; i < paragraphs.length; i++) {
      const text = paragraphs[i];
      try {
        const embedding = await getEmbedding(text);
        index.push({ file: doc.file, chunk: i, text, embedding });
        console.log(`Embedded chunk ${i} of ${doc.file}`);
      } catch (e) {
        console.error(`Erreur embedding : ${e}`);
      }
    }
  }
  fs.writeFileSync('vue-docs-embeddings.json', JSON.stringify(index, null, 2));
  console.log('Index JSON prêt !');
}

buildRagIndex();
