export function chunkText(text, chunkSize = 1000, overlap = 150) {
  const chunks = [];

  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;

    chunks.push(text.slice(start, end));

    start = end - overlap;
  }

  return chunks;
}
