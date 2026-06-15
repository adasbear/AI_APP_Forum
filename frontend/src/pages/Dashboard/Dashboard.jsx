import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
export default function Dashboard() {
  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('keyword'); // 'keyword' | 'semantic'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuestions = async (searchVal = '', mode = searchMode) => {
    setIsLoading(true);
    setError(null);
    try {
      let data = [];
      if (searchVal.trim() === '') {
        // Empty search query: fetch all questions
        const response = await questionService.getQuestions();
        data = response.data || [];
      } else {
        if (mode === 'semantic') {
          // Semantic search requires min 5 characters (API validation limit)
          if (searchVal.trim().length < 5) {
            setError('AI Semantic search query must be at least 5 characters long.');
            setIsLoading(false);
            return;
          }
          const response = await questionService.searchQuestionsSemantic(searchVal);
          data = response.data || [];
        } else {
          const response = await questionService.getQuestions({ search: searchVal });
          data = response.data || [];
        }
      }
      setQuestions(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch initial questions on mount
  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      await Promise.resolve();
      if (isMounted) {
        fetchQuestions();
      }
    };
    initFetch();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestions(searchQuery, searchMode);
  };

  const handleModeChange = (mode) => {
    setSearchMode(mode);
    // Automatically re-run search if there's an active query
    if (searchQuery.trim() !== '') {
      fetchQuestions(searchQuery, mode);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchQuestions('', searchMode);
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
          {questions.map((question) => {
            const authorName = question.author
              ? `${question.author.firstName} ${question.author.lastName}`
              : 'Anonymous';
            
            return (
              <Link
                key={question.questionHash || question.id}
                to={`/questions/${question.questionHash}`}
                className={styles.questionCard}
              >
                <div className={styles.cardContent}>
                  <h4 className={styles.questionTitle}>{question.title}</h4>
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
        </div>
      )}
    </div>
  );
}

