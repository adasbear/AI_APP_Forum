import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Bold, Italic, Code, Link2, MessageSquare, ThumbsUp, Trash2, Edit2, Bookmark } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { questionService } from '../../services/questions/question.service.js';
import { answerService } from '../../services/answers/answer.service.js';
import { voteService } from '../../services/votes/vote.service.js';
import { timeAgo, isAuthoredByUser } from '../../lib/utils.js';
import ui from '../../styles/pageStates.module.css';
import styles from './QuestionDetail.module.css';

const avatarColors = [
  '#7be0eb', '#51cf66', '#ffa94d', '#cc5de8',
  '#74c0fc', '#f06595', '#20c997', '#845ef7',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(firstName, lastName) {
  const first = firstName ? firstName[0] : '';
  const last = lastName ? lastName[0] : '';
  return (first + last).toUpperCase() || '?';
}

export default function QuestionDetail() {
  const { questionHash } = useParams();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [relatedQuestions, setRelatedQuestions] = useState([]);

  const [answerText, setAnswerText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(null);

  const [fitResult, setFitResult] = useState(null);
  const [isCheckingFit, setIsCheckingFit] = useState(false);
  const [fitError, setFitError] = useState(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // Edit logic
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete logic
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnQuestion = isAuthoredByUser(question, user);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await questionService.getSingleQuestion(questionHash);
        const data = response.data || response;
        setQuestion(data.question);
        setAnswers(data.answers || []);
        
        // Also check if bookmarked
        if (user) {
          const { bookmarkService } = await import('../../services/bookmarks/bookmark.service.js');
          const bookmarkRes = await bookmarkService.checkBookmark(questionHash);
          setIsBookmarked(bookmarkRes.data?.bookmarked || false);
        }
      } catch (err) {
        setError(err.message || 'Failed to load question.');
      } finally {
        setIsLoading(false);
      }
    };

    if (questionHash) {
      fetchData();
    }
  }, [questionHash]);

  useEffect(() => {
    if (!questionHash) return;
    questionService
      .getSimilarQuestions(questionHash)
      .then(res => {
        const data = res.data || res;
        setRelatedQuestions(Array.isArray(data) ? data : data.questions || []);
      })
      .catch(() => {});
  }, [questionHash]);

  const handleCheckFit = async () => {
    if (!answerText.trim() || answerText.trim().length < 20) return;

    setIsCheckingFit(true);
    setFitError(null);
    setFitResult(null);

    try {
      const response = await answerService.assessAnswerFit(
        questionHash,
        answerText,
      );
      setFitResult(response.data || response);
    } catch (err) {
      setFitError(err.message || 'Failed to check answer fit.');
    } finally {
      setIsCheckingFit(false);
    }
  };

  const handleVote = async (targetType, targetId, currentVote, voteValue) => {
    if (!user) {
      setError('You must be logged in to vote.');
      return;
    }

    const isRemoving = currentVote === voteValue;
    const newVoteValue = isRemoving ? 0 : voteValue;
    const voteDiff = newVoteValue - (currentVote || 0);

    if (targetType === 'question') {
      setQuestion(prev => ({
        ...prev,
        likes: prev.likes + voteDiff,
        userVote: newVoteValue,
      }));
    } else {
      setAnswers(prev => prev.map(ans => {
        if (ans.id === targetId) {
          return {
            ...ans,
            likes: ans.likes + voteDiff,
            userVote: newVoteValue,
          };
        }
        return ans;
      }));
    }

    try {
      if (isRemoving) {
        await voteService.removeVote(targetType, targetId);
      } else {
        await voteService.castVote(targetType, targetId, voteValue);
      }
    } catch (err) {
      if (targetType === 'question') {
        setQuestion(prev => ({
          ...prev,
          likes: prev.likes - voteDiff,
          userVote: currentVote,
        }));
      } else {
        setAnswers(prev => prev.map(ans => {
          if (ans.id === targetId) {
            return {
              ...ans,
              likes: ans.likes - voteDiff,
              userVote: currentVote,
            };
          }
          return ans;
        }));
      }
      setError(err.message || 'Failed to register vote.');
    }
  };

  const handlePostAnswer = async () => {
    if (!answerText.trim() || answerText.trim().length < 20) return;

    setIsPosting(true);
    setPostError(null);

    try {
      const response = await answerService.postAnswer(question.id, answerText);
      const newAnswer = response.data?.answer || response;
      setAnswers(prev => [...prev, newAnswer]);
      setAnswerText('');
      setFitResult(null);
    } catch (err) {
      setPostError(err.message || 'Failed to post answer.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleBookmark = async () => {
    const prevBookmarked = isBookmarked;
    setIsBookmarked(!prevBookmarked);
    try {
      const { bookmarkService } = await import('../../services/bookmarks/bookmark.service.js');
      const res = await bookmarkService.toggleBookmark(question.id);
      const isBookmarked = res.data?.bookmarked ?? res.bookmarked;
      setIsBookmarked(isBookmarked);
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
      setIsBookmarked(prevBookmarked);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || editTitle.trim().length < 5) {
      setEditError("Title must be at least 5 characters.");
      return;
    }
    if (!editContent.trim() || editContent.trim().length < 10) {
      setEditError("Content must be at least 10 characters.");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      await questionService.updateQuestion(questionHash, {
        title: editTitle,
        content: editContent
      });
      setQuestion(prev => ({ ...prev, title: editTitle, content: editContent }));
      setIsEditing(false);
    } catch (err) {
      setEditError(err.message || "Failed to save edits.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await questionService.deleteQuestion(questionHash);
      window.location.href = '/dashboard';
    } catch (err) {
      console.error("Failed to delete question", err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      // Optional: show error toast
    }
  };

  const insertFormatting = (before, after) => {
    const textarea = document.querySelector(`.${styles.editorTextarea}`);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = answerText.substring(start, end);
    const newText =
      answerText.substring(0, start) +
      before +
      selected +
      after +
      answerText.substring(end);
    setAnswerText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    }, 0);
  };

  if (isLoading) {
    return (
      <div className={ui.pageStates__message}>
        Loading question details...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorViewportCenter}>
        <h2 className={styles.mainErrorHeadline}>Failed to load question details.</h2>
        <Link to='/dashboard' className={styles.btnErrorFallback}>
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!question) {
    return (
      <div className={styles.errorViewportCenter}>
        <h2 className={styles.mainErrorHeadline}>Question not found</h2>
        <Link to='/dashboard' className={styles.btnErrorFallback}>
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const questionAuthorName = question.author
    ? `${question.author.firstName} ${question.author.lastName}`
    : 'Anonymous';

  const fitLevelClass =
    fitResult?.level === 'strong'
      ? styles.fitStrong
      : fitResult?.level === 'partial'
        ? styles.fitPartial
        : fitResult?.level === 'weak'
          ? styles.fitWeak
          : '';

  return (
    <div className={styles.page}>
      <Link to='/dashboard' className={styles.backLink}>
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
          <line x1='19' y1='12' x2='5' y2='12' />
          <polyline points='12 19 5 12 12 5' />
        </svg>
        Back to feed
      </Link>

      <div className={styles.twoColumnLayout}>
        <div>
          <article className={styles.card}>
            <div className={styles.authorMeta}>
              <div className={styles.authorInfoLeft}>
                <div
                  className={styles.avatar}
                  style={{ background: getAvatarColor(questionAuthorName) }}
                >
                  {getInitials(question.author?.firstName, question.author?.lastName)}
                </div>
                <div className={styles.authorDetails}>
                  <div className={styles.authorName}>{questionAuthorName}</div>
                  <div className={styles.authorDate}>
                    Posted {timeAgo(question.createdAt)}
                    {question.createdAt !== question.updatedAt && ' (edited)'}
                  </div>
                </div>
              </div>

              {isOwnQuestion && !isEditing && (
                <div className={styles.authorActions}>
                  <button 
                    onClick={() => {
                      setEditTitle(question.title);
                      setEditContent(question.content);
                      setIsEditing(true);
                    }} 
                    className={styles.editBtn}
                    title="Edit question"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className={styles.deleteBtn}
                    title="Delete question"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className={styles.editForm}>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Question title"
                />
                <textarea
                  className={styles.editTextarea}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Question details"
                  rows={6}
                />
                {editError && <div className={styles.errorText}>{editError}</div>}
                <div className={styles.editActions}>
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className={styles.cancelBtn}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveEdit} 
                    className={styles.saveBtn}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className={styles.threadTitle}>{question.title}</h2>

                <div className={styles.postContent}>
                  <ReactMarkdown>{question.content}</ReactMarkdown>
                </div>

                <div className={styles.threadActions}>
                  <button type='button' className={styles.btnAction}>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                      <circle cx='18' cy='5' r='3' />
                      <circle cx='6' cy='12' r='3' />
                      <circle cx='18' cy='19' r='3' />
                      <line x1='8.59' y1='13.51' x2='15.42' y2='17.49' />
                      <line x1='15.41' y1='6.51' x2='8.59' y2='10.49' />
                    </svg>
                    Share
                  </button>
                  <button 
                    className={`${styles.voteBtn} ${question.userVote === 1 ? styles.voteActive : ''}`}
                    onClick={() => handleVote('question', question.id, question.userVote, 1)}
                    title={question.userVote === 1 ? "Unlike this question" : "Like this question"}
                  >
                    <ThumbsUp size={16} />
                    <span className={styles.voteScore}>{question.likes || 0}</span>
                  </button>
                  <button 
                    className={`${styles.btnAction} ${isBookmarked ? styles.bookmarkActive : ''}`}
                    onClick={handleToggleBookmark}
                  >
                    <Bookmark 
                      size={14} 
                      fill={isBookmarked ? 'currentColor' : 'none'} 
                    />
                    {isBookmarked ? 'Saved' : 'Save'}
                  </button>
                  <button type='button' className={styles.btnAction}>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                      <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
                    </svg>
                    {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
                  </button>
                </div>
              </>
            )}
          </article>

          <section className={styles.answersContainer}>
            <h3 className={styles.sectionHeadline}>
              Community Answers ({answers.length})
            </h3>

            {answers.length === 0 && (
              <div className={styles.emptyStateBanner}>
                <div className={styles.emptyStateIcon}>
                  <MessageSquare size={32} strokeWidth={1.5} />
                </div>
                <h5>Be the first to help!</h5>
                <p>
                  This question is waiting for an expert like you. Share your
                  knowledge and earn reputation points.
                </p>
              </div>
            )}

            {answers.map(answer => {
              const answerAuthorName = answer.author
                ? `${answer.author.firstName} ${answer.author.lastName}`
                : 'Anonymous';
              return (
                <article key={answer.id} className={styles.answerCard}>
                  <div className={styles.authorMeta}>
                    <div
                      className={styles.avatar}
                      style={{ background: getAvatarColor(answerAuthorName) }}
                    >
                      {getInitials(answer.author?.firstName, answer.author?.lastName)}
                    </div>
                    <div className={styles.authorDetails}>
                      <div className={styles.authorName}>{answerAuthorName}</div>
                      <div className={styles.authorDate}>
                        {timeAgo(answer.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className={styles.answerContent}>
                    <ReactMarkdown>{answer.content}</ReactMarkdown>
                  </div>
                  <div className={styles.threadActions} style={{ marginTop: '16px', paddingTop: '16px' }}>
                    <button 
                      className={`${styles.voteBtn} ${answer.userVote === 1 ? styles.voteActive : ''}`}
                      onClick={() => handleVote('answer', answer.id, answer.userVote, 1)}
                      title={answer.userVote === 1 ? "Unlike this answer" : "Like this answer"}
                    >
                      <ThumbsUp size={16} />
                      <span className={styles.voteScore}>{answer.likes || 0}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {!isOwnQuestion && (
            <section className={styles.replyContainer}>
              <h3 className={styles.sectionHeadline}>Contribute an answer</h3>

              <div className={styles.editorCard}>
                {postError && (
                  <div className={styles.editorErrorMessage}>
                    {postError}
                  </div>
                )}

                <div className={styles.editorToolbar}>
                  <div className={styles.toolbarActions}>
                    <button
                      type='button'
                      className={styles.toolbarBtn}
                      onClick={() => insertFormatting('**', '**')}
                      title='Bold'
                      disabled={isPosting}
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type='button'
                      className={styles.toolbarBtn}
                      onClick={() => insertFormatting('*', '*')}
                      title='Italic'
                      disabled={isPosting}
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      type='button'
                      className={styles.toolbarBtn}
                      onClick={() => insertFormatting('`', '`')}
                      title='Inline code'
                      disabled={isPosting}
                    >
                      <Code size={14} />
                    </button>
                    <button
                      type='button'
                      className={styles.toolbarBtn}
                      onClick={() => insertFormatting('[', '](url)')}
                      title='Link'
                      disabled={isPosting}
                    >
                      <Link2 size={14} />
                    </button>
                  </div>
                  <div className={styles.characterCounter}>
                    {answerText.length} characters
                  </div>
                </div>

                <textarea
                  className={styles.editorTextarea}
                  placeholder='Type your answer here... You can use Markdown to format your code!'
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  disabled={isPosting}
                />

                <div className={styles.editorFooterControls}>
                  <div className={styles.validationBadgeGroup}>
                    <button
                      type='button'
                      className={styles.btnValidationCheck}
                      onClick={handleCheckFit}
                      disabled={
                        isCheckingFit ||
                        isPosting ||
                        answerText.trim().length < 20
                      }
                    >
                      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
                        <polyline points='22 4 12 14.01 9 11.01' />
                      </svg>
                      {isCheckingFit
                        ? 'Checking...'
                        : 'Check draft fit'}
                    </button>
                    <span className={styles.validationTip}>
                      Relevance only. Not grading correctness. You need at least
                      20 characters.
                    </span>
                  </div>

                  <button
                    type='button'
                    className={`${styles.btnSubmitPost} ${isPosting ? styles.btnSubmitting : ''}`}
                    onClick={handlePostAnswer}
                    disabled={
                      isPosting ||
                      isCheckingFit ||
                      answerText.trim().length < 20
                    }
                  >
                    {isPosting ? 'Posting...' : 'Post Your Answer'}
                  </button>
                </div>
              </div>

              {fitError && <p className={styles.errorText}>{fitError}</p>}

              {fitResult && (
                <div className={`${styles.fitPanel} ${fitLevelClass}`}>
                  <div className={styles.fitHeader}>
                    <span className={styles.fitBadge}>
                      {fitResult.level === 'strong'
                        ? 'Strong fit'
                        : fitResult.level === 'partial'
                          ? 'Partial fit'
                          : 'Weak fit'}
                    </span>
                  </div>
                  <p className={styles.fitNote}>{fitResult.note}</p>
                </div>
              )}
            </section>
          )}

          {isOwnQuestion && (
            <div className={styles.ownQuestionNotice}>
              <p>You cannot answer your own question.</p>
            </div>
          )}
        </div>

        <aside className={styles.relatedColumn}>
          <h3 className={styles.relatedColumnTitle}>Related Questions</h3>
          <div className={styles.relatedList}>
            {relatedQuestions.length === 0 && (
              <p className={styles.relatedEmpty}>No related questions found.</p>
            )}
            {relatedQuestions.map(rq => (
              <Link
                key={rq.questionHash || rq.id}
                to={`/questions/${rq.questionHash}`}
                className={styles.relatedCard}
              >
                <h4 className={styles.relatedCardTitle}>
                  {rq.title}
                </h4>
                <div className={styles.relatedCardMeta}>
                  <span>
                    {rq.author?.firstName} {rq.author?.lastName}
                  </span>
                  <span>{timeAgo(rq.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Delete Question</h3>
            <p>Are you sure you want to delete this question? This action cannot be undone and will also delete all associated answers.</p>
            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className={styles.cancelBtn}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete} 
                className={styles.deleteBtnConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
