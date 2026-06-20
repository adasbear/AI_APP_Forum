import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { questionService } from '../../services/questions/question.service.js';
import { timeAgo } from '../../lib/utils.js';
import Button from '../../components/Button/Button';
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
          <Button
            type="submit"
            variant={searchMode === 'semantic' ? 'ai' : 'primary'}
            size='medium'
            isLoading={isLoading && !isFetchingMore}
            loadingText='Searching...'
            icon={searchMode === 'semantic' ? <Sparkles size={16} /> : <Search size={16} />}
          >
            Search
          </Button>
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
    </div>
  );
}

