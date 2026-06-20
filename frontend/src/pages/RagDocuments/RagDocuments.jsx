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
import { Upload, FileText, Sparkles, Search, Trash2 } from 'lucide-react';
import Button from '../../components/Button/Button';
import RagAnswerBody from '../../components/RagAnswerBody/RagAnswerBody';

export default function RagDocuments() {
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [aiAnswer, setAiAnswer] = useState(null);
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
      const result = await queryDocument(activeDocument.id, query);
      // Result contains { answer, citations, chunksUsed }
      setAiAnswer(result);
    } catch (err) {
      setAiAnswer({ answer: 'Error: ' + err.message, citations: [], chunksUsed: [] });
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

  const handlePreview = async (docId) => {
    if (!docId) return;
    try {
      setPdfUrl(null); // Clear previous PDF
      console.log('Fetching PDF for document:', docId);
      const url = await fetchPdfObjectUrl(docId);
      console.log('PDF URL created:', url);
      setPdfUrl(url);
    } catch (err) {
      console.error('Failed to load PDF:', err);
      alert('Failed to load PDF: ' + err.message);
    }
  };

  useEffect(() => {
    if (activeDocument && activeDocument.status === 'ready') {
      handlePreview(activeDocument.id);
    } else {
      setPdfUrl(null); // Clear PDF if document is not ready
    }
  }, [activeDocument]);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <p className={styles.pageLabel}>KNOWLEDGE BASE</p>
        <h1 className={styles.pageTitle}>Private PDF library</h1>
        <p className={styles.pageSubtitle}>
          Upload study or reference PDFs to your own workspace. Each file is indexed for semantic search and
          optional AI answers that cite passages from that document only. File size limits apply on the server;
          other users never see your uploads.
        </p>
      </div>
      
      <div className={styles.container}>
        {/* LEFT SIDEBAR */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Library</h2>
            <p className={styles.sidebarSubtitle}>Add PDFs here. Processing runs once per upload.</p>
          </div>

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
              <FileText size={18} /> Choose file
            </button>
            <Button
              variant='primary'
              size='medium'
              isLoading={isUploading}
              loadingText='Uploading...'
              disabled={!selectedFile}
              onClick={handleUpload}
              icon={<Upload size={18} />}
            >
              Upload
            </Button>
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
                setPdfUrl(null);
                setSearchResults([]);
                setAiAnswer(null);
                setQuery('');
              }}
              className={`${styles.docItem} ${activeDocument?.id === doc.id ? styles.active : ''}`}
            >
              <div className={styles.docInfo}>
                <p className={styles.docName}>{doc.file_name}</p>
                <span className={`${styles.statusBadge} ${doc.status === 'ready' ? styles.statusReady : styles.statusProcessing}`}>
                  {doc.status?.toUpperCase() || 'PROCESSING'}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(doc.id);
                }}
                className={styles.deleteBtn}
              >
                <Trash2 size={16} />
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
        ) : activeDocument.status !== 'ready' ? (
          <div className={styles.emptyState}>
            <p>This document is not ready for preview or AI tools. Current status: <strong>{activeDocument.status}</strong>.</p>
          </div>
        ) : (
          <div className={styles.documentContainer}>
            {/* READER SECTION */}
            <div className={styles.sectionBlock}>
              <h3 className={styles.sectionTitle}>Reader</h3>
              <p className={styles.sectionSubtitle}>Inline preview of the selected PDF.</p>
              <div className={styles.previewBox}>
                {pdfUrl ? (
                  <object
                    data={pdfUrl}
                    type="application/pdf"
                    className={styles.pdfIframe}
                    aria-label="PDF Preview"
                  >
                    <embed
                      src={pdfUrl}
                      type="application/pdf"
                      className={styles.pdfIframe}
                    />
                  </object>
                ) : (
                  <p className={styles.loadingText}>Loading PDF...</p>
                )}
              </div>
            </div>

            <hr className={styles.divider} />

            {/* SEARCH SECTION */}
            <div className={styles.sectionBlock}>
              <h3 className={styles.sectionTitle}>Semantic search</h3>
              <p className={styles.sectionSubtitle}>Finds passages by meaning (embeddings), not only exact keywords.</p>
              
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Search query</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Describe the topic or phrase you are looking for"
                  className={styles.textInput}
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className={styles.actionBtn}
                >
                  {isSearching ? '⏳ Searching...' : <><Search size={16} /> Search</>}
                </button>
              </div>
              
              {searchResults.length > 0 && (
                <div className={styles.resultsArea}>
                  {searchResults.map((result, idx) => (
                    <div key={idx} className={styles.searchResult}>
                      <p className={styles.resultText}>{result.excerpt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className={styles.divider} />

            {/* ASK AI SECTION */}
            <div className={styles.sectionBlock}>
              <h3 className={styles.sectionTitle}>Ask with AI</h3>
              <p className={styles.sectionSubtitle}>Answers use only retrieved excerpts from this PDF, with citations where possible. When the document includes code, the reply may show it in formatted blocks you can copy.</p>
              
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Question</label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What does this PDF recommend for route persistence?"
                  className={styles.textArea}
                />
                <Button
                  variant='ai'
                  size='medium'
                  isLoading={isQueryingAI}
                  loadingText='Asking...'
                  onClick={handleAskAI}
                  icon={<Sparkles size={16} />}
                >
                  Ask
                </Button>
              </div>

              {aiAnswer && (
                <div className={aiAnswer.answer?.startsWith('Error') ? styles.errorAnswerBox : styles.answerBox}>
                  <RagAnswerBody>{aiAnswer.answer}</RagAnswerBody>
                  {aiAnswer.citations && aiAnswer.citations.length > 0 && (
                    <div className={styles.citationsBox}>
                      <p className={styles.citationsTitle}>Citations:</p>
                      <ul>
                        {aiAnswer.citations.map((citation, idx) => (
                          <li key={idx}>
                            [Chunk {citation.chunkIndex}]
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}