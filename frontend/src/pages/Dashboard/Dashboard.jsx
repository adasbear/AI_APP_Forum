import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { questionService } from '../../services/questions/question.service.js';
import { timeAgo } from '../../lib/utils.js';
import styles from './Dashboard.module.css';
import ui from '../../styles/pageStates.module.css';
import {
  Search,
  Sparkles,
  MessageSquare,
  User,
  Clock,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  ThumbsUp,
  Bookmark,
  Share2,
} from 'lucide-react';
export default function Dashboard() {
  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('keyword'); // 'keyword' | 'semantic'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [copiedQuestionId, setCopiedQuestionId] = useState(null);
  const [shareModal, setShareModal] = useState(null); // { id, title, questionHash } or null

  const observer = useRef();
  const lastQuestionElementRef = useCallback(node => {
    if (isLoading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingMore, hasMore]);

  const fetchQuestions = async (searchVal = '', mode = searchMode, pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setIsFetchingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      let data = [];
      let currentHasMore = false;

      if (searchVal.trim() === '') {
        // Empty search query: fetch all questions
        const response = await questionService.getQuestions({ page: pageNum, limit: 20 });
        data = response.data || [];
        currentHasMore = response.meta?.hasMore || false;
      } else {
        if (mode === 'semantic') {
          // Semantic search requires min 5 characters (API validation limit)
          if (searchVal.trim().length < 5) {
            setError('AI Semantic search query must be at least 5 characters long.');
            if (isLoadMore) setIsFetchingMore(false);
            else setIsLoading(false);
            return;
          }
          const response = await questionService.searchQuestionsSemantic(searchVal);
          data = response.data || [];
          currentHasMore = false; // Semantic search doesn't paginate
        } else {
          const response = await questionService.getQuestions({ search: searchVal, page: pageNum, limit: 20 });
          data = response.data || [];
          currentHasMore = response.meta?.hasMore || false;
        }
      }

      // Map over questions to add bookmark status if needed, or simply let the API return it if implemented
      // Since we just added the bookmark API, we should fetch bookmarks for the user and cross-reference
      // Wait, we can just fetch the user's bookmarks and add the `isBookmarked` boolean.
      let finalData = data;
      try {
        const { bookmarkService } = await import('../../services/bookmarks/bookmark.service.js');
        // Optimization: if there are many questions, we could add a bulk check endpoint, but for now we'll fetch the user's bookmarks list and check against it.
        const bookmarks = await bookmarkService.getBookmarks({ limit: 100 });
        const bookmarkedIds = new Set((bookmarks.data || []).map(b => b.id));
        finalData = data.map(q => ({
          ...q,
          isBookmarked: bookmarkedIds.has(q.id)
        }));
      } catch (err) {
        console.error("Failed to load bookmark status", err);
      }

      if (isLoadMore) {
        setQuestions(prev => [...prev, ...finalData]);
      } else {
        setQuestions(finalData);
      }
      setHasMore(currentHasMore);
    } catch (err) {
      setError(err.message || 'Failed to fetch questions. Please try again.');
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  // Fetch initial questions on mount
  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      await Promise.resolve();
      if (isMounted) {
        fetchQuestions('', searchMode, 1, false);
      }
    };
    initFetch();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to handle page changes for infinite scroll
  useEffect(() => {
    if (page > 1) {
      fetchQuestions(searchQuery, searchMode, page, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions(searchQuery, searchMode, 1, false);
  };

  const handleModeChange = (mode) => {
    setSearchMode(mode);
    if (searchQuery.trim() !== '') {
      setPage(1);
      fetchQuestions(searchQuery, mode, 1, false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
    fetchQuestions('', searchMode, 1, false);
  };

  const handleToggleBookmark = async (e, questionId) => {
    e.preventDefault(); // Prevent navigating to the question link
    
    // Optimistic UI update
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return { ...q, isBookmarked: !q.isBookmarked };
      }
      return q;
    }));

    try {
      // Import happens at top of file, we will add it next
      const { bookmarkService } = await import('../../services/bookmarks/bookmark.service.js');
      const response = await bookmarkService.toggleBookmark(questionId);
      
      // Sync with actual backend state (response.data.bookmarked)
      const isBookmarked = response.data?.bookmarked ?? response.bookmarked;
      setQuestions(prev => prev.map(q => {
        if (q.id === questionId) {
          return { ...q, isBookmarked };
        }
        return q;
      }));
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
      // Revert optimistic update on error
      setQuestions(prev => prev.map(q => {
        if (q.id === questionId) {
          return { ...q, isBookmarked: !q.isBookmarked };
        }
        return q;
      }));
    }
  };

  const handleShare = (e, question) => {
    e.preventDefault();
    e.stopPropagation();
    setShareModal({
      id: question.id,
      questionHash: question.questionHash,
      title: question.title,
    });
  };

  const handleCopyFromModal = async (questionHash) => {
    const url = `${window.location.origin}/questions/${questionHash}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedQuestionId(questionHash);
      setTimeout(() => setCopiedQuestionId(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedQuestionId(questionHash);
      setTimeout(() => setCopiedQuestionId(null), 2000);
    }
  };

  const handleSocialShare = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.dashboard}>
      {/* Search Section */}
      <div className={styles.searchContainer}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <div className={styles.searchBar}>
            {searchMode === 'semantic' ? (
              <Sparkles className={styles.searchIconSemantic} size={20} />
            ) : (
              <Search className={styles.searchIcon} size={20} />
            )}
            <input
              type="text"
              placeholder={
                searchMode === 'semantic'
                  ? 'Ask a question semantically (e.g. "how to handle token auth in React")'
                  : 'Search questions by title or content...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className={styles.clearButton}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
        </form>

        {/* Search Mode Toggles */}
        <div className={styles.modeContainer}>
          <div className={styles.segmentedControl}>
            <button
              type="button"
              className={`${styles.modeButton} ${
                searchMode === 'keyword' ? styles.modeButtonActive : ''
              }`}
              onClick={() => handleModeChange('keyword')}
            >
              Keyword Search
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${
                searchMode === 'semantic' ? styles.modeButtonActive : ''
              }`}
              onClick={() => handleModeChange('semantic')}
            >
              <Sparkles size={14} className={styles.buttonSparkle} />
              AI Semantic Search
            </button>
          </div>
          {searchMode === 'semantic' && (
            <span className={styles.semanticNotice}>
              concept-based search powered by Gemini
            </span>
          )}
        </div>
      </div>

      {/* Content States */}
      {isLoading ? (
        <div className={styles.skeletonList}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={styles.skeletonCard}>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonText} />
              <div className={styles.skeletonMeta}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonBadge} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={`${ui.pageStates__message} ${ui['pageStates__message--error']} ${styles.errorMessage}`}>
          <AlertCircle size={36} className={styles.errorIcon} />
          <h4>Search Failed</h4>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => fetchQuestions(searchQuery, searchMode)}
            className={styles.retryButton}
          >
            Retry Search
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className={`${ui.pageStates__message} ${ui['pageStates__message--empty']} ${styles.emptyState}`}>
          <HelpCircle size={40} className={styles.emptyIcon} />
          <h4>No questions found</h4>
          <p>
            We couldn't find any questions matching your query in{' '}
            <strong>{searchMode === 'semantic' ? 'AI Semantic' : 'Keyword'}</strong> mode.
          </p>
          <div className={styles.emptyActions}>
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className={styles.clearFiltersButton}
              >
                Clear Filters
              </button>
            )}
            <Link to="/questions/ask" className={styles.askButton}>
              Ask a Question
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.questionsList}>
          {questions.map((question, index) => {
            const authorName = question.author
              ? `${question.author.firstName} ${question.author.lastName}`
              : 'Anonymous';
            const isLastElement = index === questions.length - 1;
            
            return (
              <Link
                key={question.questionHash || question.id}
                to={`/questions/${question.questionHash}`}
                className={styles.questionCard}
                ref={isLastElement ? lastQuestionElementRef : null}
              >
                <div className={styles.cardContent}>
                  <div className={styles.titleRow}>
                    <h4 className={styles.questionTitle}>{question.title}</h4>
                    <button
                      className={styles.bookmarkBtn}
                      onClick={(e) => handleToggleBookmark(e, question.id)}
                      title={question.isBookmarked ? "Remove bookmark" : "Bookmark question"}
                      aria-label="Bookmark question"
                    >
                      <Bookmark 
                        size={20} 
                        className={question.isBookmarked ? styles.bookmarkedIcon : styles.bookmarkIcon} 
                        fill={question.isBookmarked ? "currentColor" : "none"} 
                      />
                    </button>
                  </div>
                  <p className={styles.questionSnippet}>
                    {question.content
                      ? question.content.replace(/[#*`]/g, '').slice(0, 140) +
                        (question.content.length > 140 ? '...' : '')
                      : ''}
                  </p>
                  <div className={styles.questionMeta}>
                    <span className={`${styles.metaItem} ${styles.authorNameItem}`}>
                      <User size={14} />
                      <span className={styles.authorName}>{authorName}</span>
                    </span>
                    <span className={styles.metaItem}>
                      <Clock size={14} />
                      <span>{timeAgo(question.createdAt)}</span>
                    </span>
                    <span className={styles.metaItem}>
                      <MessageSquare size={14} />
                      <span>
                        {question.answerCount ?? 0}{' '}
                        {(question.answerCount ?? 0) === 1 ? 'answer' : 'answers'}
                      </span>
                    </span>
                    <span className={styles.metaItem}>
                      <ThumbsUp size={14} />
                      <span>{question.likes ?? 0}</span>
                    </span>
                    <button
                      className={styles.shareBtn}
                      onClick={(e) => handleShare(e, question)}
                      title="Share question"
                      aria-label="Share question"
                    >
                      <Share2 size={14} />
                    </button>
                    {question.score !== undefined && (
                      <span className={`${styles.metaItem} ${styles.scoreBadge}`}>
                        Match: {Math.round(question.score * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={styles.cardArrow} size={20} />
              </Link>
            );
          })}
          {isFetchingMore && (
            <div className={styles.loadingMore}>
              <div className={styles.spinner} />
              <span>Loading more questions...</span>
            </div>
          )}
        </div>
      )}

      {shareModal && (
        <div className={styles.modalOverlay} onClick={() => setShareModal(null)}>
          <div className={styles.shareModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.shareModalTitle}>Share Question</h3>

            <div className={styles.shareLinkRow}>
              <input
                type='text'
                readOnly
                value={`${window.location.origin}/questions/${shareModal.questionHash}`}
                className={styles.shareInput}
                onClick={e => e.target.select()}
              />
              <button
                onClick={() => handleCopyFromModal(shareModal.questionHash)}
                className={styles.copyBtn}
              >
                {copiedQuestionId === shareModal.questionHash ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className={styles.shareDivider}>
              <span>or share on</span>
            </div>

            <div className={styles.shareSocialRow}>
              <button
                className={styles.socialBtn}
                onClick={() => handleSocialShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareModal.title)}&url=${encodeURIComponent(`${window.location.origin}/questions/${shareModal.questionHash}`)}`)}
                title='Share on X'
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                </svg>
                X
              </button>
              <button
                className={styles.socialBtn}
                onClick={() => handleSocialShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/questions/${shareModal.questionHash}`)}`)}
                title='Share on LinkedIn'
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
                </svg>
                LinkedIn
              </button>
              <button
                className={styles.socialBtn}
                onClick={() => handleSocialShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/questions/${shareModal.questionHash}`)}`)}
                title='Share on Facebook'
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                </svg>
                Facebook
              </button>
              <button
                className={styles.socialBtn}
                onClick={() => handleSocialShare(`https://wa.me/?text=${encodeURIComponent(shareModal.title + ' ' + `${window.location.origin}/questions/${shareModal.questionHash}`)}`)}
                title='Share on WhatsApp'
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
                </svg>
                WhatsApp
              </button>
            </div>

            <button onClick={() => setShareModal(null)} className={styles.cancelBtn} style={{ width: '100%', marginTop: '16px' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

