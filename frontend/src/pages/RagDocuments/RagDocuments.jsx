import React, { useState, useEffect } from 'react';
import styles from './RagDocuments.module.css';
import { 
  listDocuments, 
  uploadPdf, 
  deleteDocument,
  queryDocument,
  searchInDocument,
  fetchPdfObjectUrl
} from '../../services/rag/rag.service';

export default function RagDocuments() {
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [activeTab, setActiveTab] = useState('ask');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [aiAnswer, setAiAnswer] = useState('');
  const [isQueryingAI, setIsQueryingAI] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err.message || 'Failed to load documents');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a PDF file');
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    try {
      setIsUploading(true);
      await uploadPdf(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await fetchDocuments();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await deleteDocument(docId);
      setDocuments(documents.filter(doc => doc.id !== docId));
      if (activeDocument?.id === docId) {
        setActiveDocument(null);
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleAskAI = async () => {
    if (!query.trim()) {
      alert('Please enter a question');
      return;
    }

    try {
      setIsQueryingAI(true);
      const answer = await queryDocument(activeDocument.id, query);
      setAiAnswer(answer || 'No answer received');
    } catch (err) {
      setAiAnswer('Error: ' + err.message);
    } finally {
      setIsQueryingAI(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('Please enter a search query');
      return;
    }

    try {
      setIsSearching(true);
      const results = await searchInDocument(activeDocument.id, query);
      setSearchResults(results);
    } catch (err) {
      setSearchResults([]);
      alert('Search failed: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePreview = async () => {
    if (pdfUrl) return;

    try {
      const url = await fetchPdfObjectUrl(activeDocument.id);
      setPdfUrl(url);
    } catch (err) {
      alert('Failed to load PDF: ' + err.message);
    }
  };

  return (
    <div className={styles.container}>
      {/* LEFT SIDEBAR */}
      <div className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Library</h2>

        {/* UPLOAD SECTION */}
        <div className={styles.uploadBox}>
          <p className={styles.uploadText}>
            Accepted format: PDF. Maximum file size is enforced by the server.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className={styles.hiddenInput}
          />

          <div className={styles.uploadButtons}>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={styles.chooseFileBtn}
            >
              📁 Choose file
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={styles.uploadBtn}
            >
              {isUploading ? '⏳ Uploading...' : '⬆️ Upload'}
            </button>
          </div>

          <p className={styles.fileSelected}>
            {selectedFile ? selectedFile.name : 'No file selected.'}
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        {/* LOADING */}
        {isLoading && <p className={styles.loadingText}>Loading documents...</p>}

        {/* DOCUMENTS LIST */}
        {!isLoading && documents.length === 0 && (
          <p className={styles.emptyMessage}>
            No documents yet. Upload one to get started!
          </p>
        )}

        <div>
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => {
                setActiveDocument(doc);
                setActiveTab('ask');
                setPdfUrl(null);
                setSearchResults([]);
                setAiAnswer('');
                setQuery('');
              }}
              className={`${styles.docItem} ${activeDocument?.id === doc.id ? styles.active : ''}`}
            >
              <div className={styles.docInfo}>
                <p className={styles.docName}>{doc.file_name}</p>
                <span className={`${styles.statusBadge} ${doc.status === 'ready' ? styles.statusReady : styles.statusProcessing}`}>
                  {doc.status || 'processing'}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(doc.id);
                }}
                className={styles.deleteBtn}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className={styles.mainContent}>
        {!activeDocument ? (
          <div className={styles.emptyState}>
            <p>
              Choose a document from the library to open the reader, run semantic search over its text, and ask questions with AI-assisted answers grounded in that file.
            </p>
          </div>
        ) : (
          <div className={styles.documentContainer}>
            <h2 className={styles.documentTitle}>{activeDocument.file_name}</h2>

            {/* TABS */}
            <div className={styles.tabsContainer}>
              <button 
                onClick={() => setActiveTab('ask')}
                className={`${styles.tabButton} ${activeTab === 'ask' ? styles.active : ''}`}
              >
                💬 Ask AI
              </button>
              <button 
                onClick={() => setActiveTab('search')}
                className={`${styles.tabButton} ${activeTab === 'search' ? styles.active : ''}`}
              >
                🔍 Search
              </button>
              <button 
                onClick={() => {
                  setActiveTab('preview');
                  handlePreview();
                }}
                className={`${styles.tabButton} ${activeTab === 'preview' ? styles.active : ''}`}
              >
                📄 Preview
              </button>
            </div>

            {/* ASK AI TAB */}
            {activeTab === 'ask' && (
              <div className={styles.tabContent}>
                <h3 className={styles.tabTitle}>Ask AI</h3>
                <div className={styles.queryContainer}>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a question about this document..."
                    className={styles.queryInput}
                  />
                  <button
                    onClick={handleAskAI}
                    disabled={isQueryingAI}
                    className={styles.actionBtn}
                  >
                    {isQueryingAI ? '⏳ Asking...' : 'Ask'}
                  </button>
                </div>
                {aiAnswer && (
                  <div className={styles.resultBox}>
                    <h4 className={styles.resultTitle}>Answer:</h4>
                    <p>{aiAnswer}</p>
                  </div>
                )}
              </div>
            )}

            {/* SEARCH TAB */}
            {activeTab === 'search' && (
              <div className={styles.tabContent}>
                <h3 className={styles.tabTitle}>Semantic Search</h3>
                <div className={styles.queryContainer}>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search in this document..."
                    className={styles.queryInput}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className={styles.actionBtn}
                  >
                    {isSearching ? '⏳ Searching...' : 'Search'}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div>
                    <p style={{ color: '#666' }}>{searchResults.length} results found:</p>
                    {searchResults.map((result, idx) => (
                      <div key={idx} className={styles.searchResult}>
                        <p className={styles.resultText}>{result.excerpt}</p>
                        <small className={styles.resultScore}>
                          Similarity: {(result.score * 100).toFixed(1)}%
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PREVIEW TAB */}
            {activeTab === 'preview' && (
              <div className={styles.previewContainer}>
                <h3 className={styles.tabTitle}>PDF Preview</h3>
                {pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    className={styles.pdfIframe}
                    title="PDF Preview"
                  />
                ) : (
                  <p>Loading PDF...</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}