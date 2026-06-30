import { apiClient } from '../core/api.client';

export const listDocuments = async () => {
  try {
    const response = await apiClient.get('/api/rag/documents');
    const docs = response.data.data || [];
    return docs.map(doc => ({
      ...doc,
      id: doc.document_id || doc.id,
      file_name: doc.title || doc.file_name,
      // storage_path is the full Cloudinary HTTPS URL
      storage_path: doc.storage_path,
    }));
  } catch (error) {
    console.error('Error listing documents:', error);
    throw error;
  }
};

export const uploadPdf = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/rag/documents', formData, {
      headers: {
        'Content-Type': undefined
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
};

export const deleteDocument = async (documentId) => {
  try {
    const response = await apiClient.delete(`/api/rag/documents/${documentId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const searchInDocument = async (documentId, query) => {
  try {
    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/search?query=${encodeURIComponent(query)}`
    );
    const data = response.data.data;
    return data?.results || [];
  } catch (error) {
    console.error('Error searching document:', error);
    throw error;
  }
};

export const queryDocument = async (documentId, query) => {
  try {
    const response = await apiClient.post(
      `/api/rag/documents/${documentId}/query`,
      { query }
    );
    return response.data.data;
  } catch (error) {
    console.error('Error querying document:', error);
    throw error;
  }
};

/**
 * Fetches the PDF from the backend proxy endpoint as a blob,
 * then creates an object URL for use in an <iframe>.
 *
 * The backend fetches the file from Cloudinary server-side using
 * authenticated credentials, so no Cloudinary auth is needed in the browser.
 *
 * @param {number|string} documentId
 * @returns {Promise<string>} blob object URL
 */
export const fetchPdfObjectUrl = async (documentId) => {
  try {
    const response = await apiClient.get(`/api/rag/documents/${documentId}/file`, {
      responseType: 'blob',
    });
    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  } catch (error) {
    if (error.response && error.response.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        if (json && json.message) {
          throw new Error(json.message);
        }
      } catch (e) {
        // Fallback to original error if blob cannot be parsed
      }
    }
    console.error('Error fetching PDF:', error);
    throw error;
  }
};