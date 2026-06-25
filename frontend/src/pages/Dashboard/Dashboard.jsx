import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { questionService } from '../../services/questions/question.service.js';
import { timeAgo } from '../../lib/utils.js';
import UserAvatar from '../../components/UserAvatar/UserAvatar';
import styles from './Dashboard.module.css';
import ui from '../../styles/pageStates.module.css';
import {
  MessageSquare,
  Clock,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  ThumbsUp,
  Bookmark,
  Share2,
  PenLine,
  Library,
  BookOpen,
  RefreshCw,
} from 'lucide-react';

/* ─────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Search values come from the URL (set by the Navbar)
  const searchQuery = searchParams.get('q') || '';
  const searchMode = searchParams.get('mode') || 'keyword';

  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [copiedQuestionId, setCopiedQuestionId] = useState(null);
  const [shareModal, setShareModal] = useState(null);

  /* Stats derived from loaded questions */
  const stats = {
    questions: questions.length,
    replies: questions.reduce((sum, q) => sum + (q.answerCount ?? 0), 0),
    unanswered: questions.filter(q => (q.answerCount ?? 0) === 0).length,
    yours: questions.filter(q => {
      if (!user) return false;
      const a = q.author;
      return (
        a?.id === user.id ||
        (a?.firstName === user.firstName && a?.lastName === user.lastName)
      );
    }).length,
  };

  /* Infinite scroll sentinel */
  const observer = useRef();
  const lastQuestionElementRef = useCallback(
    node => {
      if (isLoading || isFetchingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
          setPage(prev => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingMore, hasMore],
  );

  /* ── fetch ── */
  const fetchQuestions = async (
    searchVal = '',
    mode = searchMode,
    pageNum = 1,
    isLoadMore = false,
  ) => {
    if (isLoadMore) setIsFetchingMore(true);
    else setIsLoading(true);
    setError(null);

    try {
      let data = [];
      let currentHasMore = false;

      if (searchVal.trim() === '') {
        const response = await questionService.getQuestions({ page: pageNum, limit: 20 });
        data = response.data || [];
        currentHasMore = response.meta?.hasMore || false;
      } else if (mode === 'semantic') {
        if (searchVal.trim().length < 5) {
          setError('AI Semantic search query must be at least 5 characters long.');
          return;
        }
        const response = await questionService.searchQuestionsSemantic(searchVal);
        data = response.data || [];
      } else {
        const response = await questionService.getQuestions({
          search: searchVal,
          page: pageNum,
          limit: 20,
        });
        data = response.data || [];
        currentHasMore = response.meta?.hasMore || false;
      }

      /* Attach bookmark state */
      let finalData = data;
      try {
        const { bookmarkService } = await import(
          '../../services/bookmarks/bookmark.service.js'
        );
        const bookmarks = await bookmarkService.getBookmarks({ limit: 100 });
        const bookmarkedIds = new Set((bookmarks.data || []).map(b => b.id));
        finalData = data.map(q => ({ ...q, isBookmarked: bookmarkedIds.has(q.id) }));
      } catch {
        /* non-fatal */
      }

      if (isLoadMore) setQuestions(prev => [...prev, ...finalData]);
      else setQuestions(finalData);

      setHasMore(currentHasMore);
    } catch (err) {
      setError(err.message || 'Failed to fetch questions. Please try again.');
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    // Re-fetch whenever URL search params change (Navbar drives this)
    setPage(1);
    fetchQuestions(searchQuery, searchMode, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchMode]);

  useEffect(() => {
    if (page > 1) fetchQuestions(searchQuery, searchMode, page, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleClearSearch = () => navigate('/dashboard');

  const handleToggleBookmark = async (e, questionId) => {
    e.preventDefault();
    setQuestions(prev =>
      prev.map(q => (q.id === questionId ? { ...q, isBookmarked: !q.isBookmarked } : q)),
    );
    try {
      const { bookmarkService } = await import(
        '../../services/bookmarks/bookmark.service.js'
      );
      const response = await bookmarkService.toggleBookmark(questionId);
      const isBookmarked = response.data?.bookmarked ?? response.bookmarked;
      setQuestions(prev =>
        prev.map(q => (q.id === questionId ? { ...q, isBookmarked } : q)),
      );
    } catch {
      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId ? { ...q, isBookmarked: !q.isBookmarked } : q,
        ),
      );
    }
  };

  const handleShare = (e, question) => {
    e.preventDefault();
    e.stopPropagation();
    setShareModal({ id: question.id, questionHash: question.questionHash, title: question.title });
  };

  const handleCopyFromModal = async questionHash => {
    const url = `${window.location.origin}/questions/${questionHash}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedQuestionId(questionHash);
    setTimeout(() => setCopiedQuestionId(null), 2000);
  };

  const handleSocialShare = url => window.open(url, '_blank', 'noopener,noreferrer');

  /* ── render ── */
  const firstName = user?.firstName || 'there';

  return (
    <div className={styles.dashboard}>

      {/* ─── Forum Home Hero ─── */}
      <div className={styles.hero}>
        <p className={styles.hero__label}>FORUM HOME</p>
        <h1 className={styles.hero__greeting}>Good to see you, {firstName}.</h1>
        <p className={styles.hero__sub}>
          Start a topic, revisit your own threads, or skim the live feed. Search above works from any page
          once you are back on Home.
        </p>

        {/* Quick-action cards */}
        <div className={styles.quickCards}>
          <button
            type='button'
            className={styles.quickCard}
            onClick={() => navigate('/questions/ask')}
          >
            <PenLine size={22} className={styles.quickCard__icon} />
            <div>
              <p className={styles.quickCard__title}>New question</p>
              <p className={styles.quickCard__desc}>Share context, errors, and what you already tried</p>
            </div>
          </button>

          <button
            type='button'
            className={styles.quickCard}
            onClick={() => navigate('/my-questions')}
          >
            <Library size={22} className={styles.quickCard__icon} />
            <div>
              <p className={styles.quickCard__title}>Your topics</p>
              <p className={styles.quickCard__desc}>Filtered list of threads you authored</p>
            </div>
          </button>

          <button
            type='button'
            className={styles.quickCard}
            onClick={() => navigate('/rag-documents')}
          >
            <BookOpen size={22} className={styles.quickCard__icon} />
            <div>
              <p className={styles.quickCard__title}>Knowledge base</p>
              <p className={styles.quickCard__desc}>Course library, uploads, and retrieval-backed context for threads</p>
            </div>
          </button>
        </div>

        {/* Stats snapshot — only shown once questions have loaded */}
        {!isLoading && !error && questions.length > 0 && (
          <>
            <p className={styles.statsNote}>
              Figures below describe the newest threads in this feed (up to 20 from the API).
            </p>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <p className={styles.statCard__label}>Questions</p>
                <p className={styles.statCard__value}>{stats.questions}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statCard__label}>Replies</p>
                <p className={styles.statCard__value}>{stats.replies}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statCard__label}>Unanswered</p>
                <p className={styles.statCard__value}>{stats.unanswered}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statCard__label}>Yours</p>
                <p className={styles.statCard__value}>{stats.yours}</p>
              </div>
            </div>
          </>
        )}

        {/* Stats snapshot loading state */}
        {isLoading && (
          <p className={styles.statsLoading}>Loading snapshot for the list below…</p>
        )}
      </div>

      {/* ─── Discussion Feed ─── */}
      <div className={styles.feedSection}>
        <div className={styles.feedHeader}>
          <div>
            <h2 className={styles.feedTitle}>Discussion feed</h2>
            <p className={styles.feedSub}>Your threads use a slim left accent in this list.</p>
          </div>
          <button
            type='button'
            className={styles.newestBtn}
            onClick={() => navigate('/dashboard')}
            title='Refresh feed'
          >
            NEWEST THREADS
          </button>
        </div>

        {/* Feed content */}
        <div className={styles.feedContent}>
          {isLoading ? (
            <div className={styles.skeletonList}>
              {[1, 2, 3, 4].map(n => (
                <div key={n} className={styles.skeletonCard}>
                  <div className={styles.skeletonAvatar} />
                  <div className={styles.skeletonBody}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonText} />
                    <div className={styles.skeletonMeta} />
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
                type='button'
                onClick={() => fetchQuestions(searchQuery, searchMode)}
                className={styles.retryButton}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div className={`${ui.pageStates__message} ${ui['pageStates__message--empty']} ${styles.emptyState}`}>
              <HelpCircle size={40} className={styles.emptyIcon} />
              <h4>No questions found</h4>
              <p>
                No questions match your query in{' '}
                <strong>{searchMode === 'semantic' ? 'AI Semantic' : 'Keyword'}</strong> mode.
              </p>
              <div className={styles.emptyActions}>
                {searchQuery && (
                  <button type='button' onClick={handleClearSearch} className={styles.clearFiltersButton}>
                    Clear Filters
                  </button>
                )}
                <Link to='/questions/ask' className={styles.askButton}>
                  Be the first to ask!
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.questionsList}>
              {questions.map((question, index) => {
                const isLastElement = index === questions.length - 1;
                const isOwn =
                  user &&
                  (question.author?.id === user.id ||
                    (question.author?.firstName === user.firstName &&
                      question.author?.lastName === user.lastName));

                return (
                  <Link
                    key={question.questionHash || question.id}
                    to={`/questions/${question.questionHash}`}
                    className={`${styles.questionCard} ${isOwn ? styles['questionCard--own'] : ''}`}
                    ref={isLastElement ? lastQuestionElementRef : null}
                  >
                    {/* Author avatar */}
                    <div className={styles.questionCard__avatar}>
                      <UserAvatar author={question.author} size={36} />
                    </div>

                    {/* Card body */}
                    <div className={styles.cardContent}>
                      <div className={styles.titleRow}>
                        <h4 className={styles.questionTitle}>{question.title}</h4>
                        <button
                          className={styles.bookmarkBtn}
                          onClick={e => handleToggleBookmark(e, question.id)}
                          title={question.isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
                          aria-label='Bookmark question'
                        >
                          <Bookmark
                            size={18}
                            className={question.isBookmarked ? styles.bookmarkedIcon : styles.bookmarkIcon}
                            fill={question.isBookmarked ? 'currentColor' : 'none'}
                          />
                        </button>
                      </div>

                      <p className={styles.questionSnippet}>
                        {question.content
                          ? question.content.replace(/[#*`]/g, '').slice(0, 160) +
                          (question.content.length > 160 ? '…' : '')
                          : ''}
                      </p>

                      <div className={styles.questionMeta}>
                        <span className={`${styles.metaItem} ${styles.authorNameItem}`}>
                          {question.author?.firstName} {question.author?.lastName}
                        </span>
                        <span className={styles.metaItem}>
                          <Clock size={12} />
                          {timeAgo(question.createdAt)}
                        </span>
                        <span className={styles.metaItem}>
                          <MessageSquare size={12} />
                          {question.answerCount ?? 0}{' '}
                          {(question.answerCount ?? 0) === 1 ? 'answer' : 'answers'}
                        </span>
                        <span className={styles.metaItem}>
                          <ThumbsUp size={12} />
                          {question.likes ?? 0}
                        </span>
                        <button
                          className={styles.shareBtn}
                          onClick={e => handleShare(e, question)}
                          title='Share question'
                          aria-label='Share question'
                        >
                          <Share2 size={12} />
                        </button>
                        {question.score !== undefined && (
                          <span className={`${styles.metaItem} ${styles.scoreBadge}`}>
                            Match: {Math.round(question.score * 100)}%
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className={styles.cardArrow} size={18} />
                  </Link>
                );
              })}

              {isFetchingMore && (
                <div className={styles.loadingMore}>
                  <div className={styles.spinner} />
                  <span>Loading more questions…</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Share Modal ─── */}
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
              <button onClick={() => handleCopyFromModal(shareModal.questionHash)} className={styles.copyBtn}>
                {copiedQuestionId === shareModal.questionHash ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className={styles.shareDivider}><span>or share on</span></div>

            <div className={styles.shareSocialRow}>
              {[
                {
                  label: 'X',
                  url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareModal.title)}&url=${encodeURIComponent(`${window.location.origin}/questions/${shareModal.questionHash}`)}`,
                  icon: (
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                      <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                    </svg>
                  ),
                },
                {
                  label: 'LinkedIn',
                  url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/questions/${shareModal.questionHash}`)}`,
                  icon: (
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                      <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
                    </svg>
                  ),
                },
                {
                  label: 'WhatsApp',
                  url: `https://wa.me/?text=${encodeURIComponent(shareModal.title + ' ' + `${window.location.origin}/questions/${shareModal.questionHash}`)}`,
                  icon: (
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
                    </svg>
                  ),
                },
              ].map(({ label, url, icon }) => (
                <button
                  key={label}
                  className={styles.socialBtn}
                  onClick={() => handleSocialShare(url)}
                  title={`Share on ${label}`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <button onClick={() => setShareModal(null)} className={styles.cancelBtn} style={{ width: '100%', marginTop: 16 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
