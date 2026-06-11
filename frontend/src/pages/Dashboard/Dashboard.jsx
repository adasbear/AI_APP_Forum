/**
 * Dashboard: default home after login; question list, quick actions, URL-driven search.
 * Data: `questionService` (keyword `q`, semantic `semantic`, or full list).
 */

// import { useAuth } from '../../contexts/AuthContext';

// export default function Dashboard() {
//   const { user } = useAuth();

//   const firstName = user?.firstName?.trim();
//   const welcomeLine = firstName
//     ? `Good to see you, ${firstName}.`
//     : 'Welcome to the forum.';

//   return (
//     <div>
//       <h3>{welcomeLine}</h3>
//     </div>
//   );
// }



import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { questionService } from '../../services/questions/question.service.js';
import { timeAgo, isAuthoredByUser } from '../../lib/utils.js';
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
  Edit3,
  BarChart2,
  BookOpen,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────────── */

/** Deterministic colour palette for avatar initials. */
const AVATAR_COLORS = [
  '#f97316', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f59e0b', '#ef4444',
];

function hashCode(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getAvatarColor(name) {
  return AVATAR_COLORS[hashCode(name) % AVATAR_COLORS.length];
}

function getInitials(firstName = '', lastName = '') {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
}

/* ─── component ───────────────────────────────────────────────────── */

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('keyword'); // 'keyword' | 'semantic'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── data fetcher ─────────────────────────────────────────────── */

  const fetchQuestions = async (searchVal = '', mode = searchMode) => {
    setIsLoading(true);
    setError(null);
    try {
      let data = [];
      if (searchVal.trim() === '') {
        const response = await questionService.getQuestions();
        data = response.data || [];
      } else {
        if (mode === 'semantic') {
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

  /* ── sync with URL search params from the Navbar ──────────────── */

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const sem = searchParams.get('semantic') || '';

    if (sem) {
      setSearchQuery(sem);
      setSearchMode('semantic');
      fetchQuestions(sem, 'semantic');
    } else if (q) {
      setSearchQuery(q);
      setSearchMode('keyword');
      fetchQuestions(q, 'keyword');
    } else {
      setSearchQuery('');
      fetchQuestions('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* ── local search handlers (in-page search bar) ──────────────── */

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestions(searchQuery, searchMode);
  };

  const handleModeChange = (mode) => {
    setSearchMode(mode);
    if (searchQuery.trim() !== '') {
      fetchQuestions(searchQuery, mode);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchQuestions('', searchMode);
  };

  /* ── computed stats ───────────────────────────────────────────── */

  const stats = useMemo(() => {
    const total = questions.length;
    const replies = questions.reduce((sum, q) => sum + (q.answerCount ?? 0), 0);
    const unanswered = questions.filter((q) => (q.answerCount ?? 0) === 0).length;
    const yours = questions.filter((q) => isAuthoredByUser(q, user)).length;
    return { total, replies, unanswered, yours };
  }, [questions, user]);

  /* ── first name for greeting ──────────────────────────────────── */

  const firstName = user?.firstName || 'there';

  /* ─── render ────────────────────────────────────────────────────── */

  return (
    <div className={styles.dashboard}>
      {/* ── Hero / Welcome ────────────────────────────────────────── */}
      <section className={styles.hero}>
        <span className={styles.heroLabel}>FORUM HOME</span>
        <h1 className={styles.heroTitle}>Good to see you, {firstName}.</h1>
        <p className={styles.heroSubtitle}>
          Start a topic, revisit your own threads, or skim the live feed. Search above works from any page
          once you are back on Home.
        </p>

        {/* Quick-action cards */}
        <div className={styles.quickActions}>
          <Link to="/questions/ask" className={styles.quickCard}>
            <span className={styles.quickCardIcon}>
              <Edit3 size={22} />
            </span>
            <div>
              <strong>New question</strong>
              <span>Share context, errors, and what you already tried</span>
            </div>
          </Link>
          <Link to="/my-questions" className={styles.quickCard}>
            <span className={styles.quickCardIcon}>
              <BarChart2 size={22} />
            </span>
            <div>
              <strong>Your topics</strong>
              <span>Filtered list of threads you authored</span>
            </div>
          </Link>
          <Link to="/rag-documents" className={styles.quickCard}>
            <span className={styles.quickCardIcon}>
              <BookOpen size={22} />
            </span>
            <div>
              <strong>Knowledge base</strong>
              <span>Course library, uploads, and retrieval-backed context for threads</span>
            </div>
          </Link>
        </div>

        {/* Loading hint while stats load */}
        {isLoading ? (
          <p className={styles.statsHint}>Loading snapshot for the list below…</p>
        ) : (
          <>
            {/* Horizontal rule */}
            <hr className={styles.heroDivider} />
            <p className={styles.statsHint}>
              Figures below describe the newest threads in this feed (up to 100 from the API).
            </p>

            {/* Stats cards */}
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Questions</span>
                <span className={styles.statValue}>{stats.total}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Replies</span>
                <span className={styles.statValue}>{stats.replies}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Unanswered</span>
                <span className={styles.statValue}>{stats.unanswered}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Yours</span>
                <span className={styles.statValue}>{stats.yours}</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Discussion feed wrapper ───────────────────────────────── */}
      <section className={styles.feedSection}>
        {/* Feed header */}
        <div className={styles.feedHeader}>
          <div>
            <h2 className={styles.feedTitle}>Discussion feed</h2>
            <p className={styles.feedSubtitle}>
              Your threads use a slim left accent in this list.
            </p>
          </div>
          <span className={styles.newestBadge}>NEWEST THREADS</span>
        </div>

        <hr className={styles.feedDivider} />

        {/* ── Search (in-page) ──────────────────────────────────── */}
        <div className={styles.searchContainer}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.searchBar}>
              {searchMode === 'semantic' ? (
                <Sparkles className={styles.searchIconSemantic} size={20} />
              ) : (
                <Search className={styles.searchIcon} size={20} />
              )}
              <input
                id="dashboard-search"
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

        {/* ── Content States ────────────────────────────────────── */}
        {isLoading ? (
          <div className={styles.loadingState}>
            <p className={styles.loadingText}>Loading recent questions…</p>
          </div>
        ) : error ? (
          <div
            className={`${ui.pageStates__message} ${ui['pageStates__message--error']} ${styles.errorMessage}`}
          >
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
          <div
            className={`${ui.pageStates__message} ${ui['pageStates__message--empty']} ${styles.emptyState}`}
          >
            <HelpCircle size={40} className={styles.emptyIcon} />
            <h4>No questions found</h4>
            <p>
              {searchQuery
                ? `We couldn't find any questions matching your query in ${
                    searchMode === 'semantic' ? 'AI Semantic' : 'Keyword'
                  } mode.`
                : 'No questions found. Be the first to ask!'}
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
              const authorFirst = question.author?.firstName || '';
              const authorLast = question.author?.lastName || '';
              const authorName = authorFirst
                ? `${authorFirst} ${authorLast}`
                : 'Anonymous';
              const initials = getInitials(authorFirst, authorLast);
              const avatarBg = getAvatarColor(authorName);
              const isMine = isAuthoredByUser(question, user);

              return (
                <Link
                  key={question.questionHash || question.id}
                  to={`/questions/${question.questionHash}`}
                  className={`${styles.questionCard} ${isMine ? styles.questionCardMine : ''}`}
                >
                  {/* Colored left accent bar */}
                  <span
                    className={styles.cardAccent}
                    style={{ backgroundColor: isMine ? 'var(--primary)' : avatarBg }}
                  />

                  {/* Avatar */}
                  <div
                    className={styles.avatar}
                    style={{ backgroundColor: avatarBg }}
                  >
                    {initials}
                  </div>

                  {/* Card body */}
                  <div className={styles.cardContent}>
                    <div className={styles.cardTitleRow}>
                      <h4 className={styles.questionTitle}>{question.title}</h4>
                      {isMine && (
                        <span className={styles.yoursBadge}>YOURS</span>
                      )}
                    </div>

                    <p className={styles.questionSnippet}>
                      {question.content
                        ? question.content.replace(/[#*`]/g, '').slice(0, 180) +
                          (question.content.length > 180 ? '…' : '')
                        : ''}
                    </p>

                    <div className={styles.questionMeta}>
                      <span className={styles.metaItem}>
                        <MessageSquare size={14} />
                        <span>
                          {question.answerCount ?? 0}{' '}
                          {(question.answerCount ?? 0) === 1 ? 'reply' : 'replies'}
                        </span>
                      </span>
                      <span className={styles.metaItem}>
                        <Clock size={14} />
                        <span>{timeAgo(question.createdAt)}</span>
                      </span>
                      <span className={styles.metaItem}>
                        <User size={14} />
                        <span>{authorName}</span>
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
      </section>
    </div>
  );
}

