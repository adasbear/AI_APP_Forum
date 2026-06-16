import { apiClient } from '../core/api.client';

export const listDocuments = async () => {
  try {
    const response = await apiClient.get('/api/rag/documents');
    const docs = response.data.data || [];
    return docs.map(doc => ({
      ...doc,
      id: doc.document_id || doc.id,
      file_name: doc.title || doc.file_name
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
      headers: { 'Content-Type': 'multipart/form-data' }
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
    // Backend returns { query, results: [...] }, we need just the results array
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
    // Backend returns { answer, citations, chunksUsed }
    return response.data.data;
  } catch (error) {
    console.error('Error querying document:', error);
    throw error;
  }
};

export const fetchPdfObjectUrl = async (documentId) => {
  try {
    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/file`,
      { responseType: 'blob' }
    );
    return URL.createObjectURL(response.data);
  } catch (error) {
    console.error('Error fetching PDF:', error);
    throw error;
  }
};