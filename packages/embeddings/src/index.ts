export function generateEmbeddings(text: string): string {
    console.log(`Generating embeddings for: ${text}`);
    return `embeddings_for_${text}`;
  }