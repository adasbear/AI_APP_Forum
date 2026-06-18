import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Bold, Italic, Code, Link2, MessageSquare, ThumbsUp, Trash2, Edit2, Bookmark, Share2, Copy, Check } from 'lucide-react';
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
  const [postSuccess, setPostSuccess] = useState(false);

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

  // Answer edit
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editAnswerContent, setEditAnswerContent] = useState('');
  const [isSavingAnswerEdit, setIsSavingAnswerEdit] = useState(false);
  const [answerEditError, setAnswerEditError] = useState(null);

  // Answer delete
  const [deletingAnswerId, setDeletingAnswerId] = useState(null);
  const [isDeletingAnswer, setIsDeletingAnswer] = useState(false);

  // Share
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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
    setPostSuccess(false);

    try {
      const response = await answerService.postAnswer(question.id, answerText);
      const newAnswer = response.data || response;
      
      // Normalize the answer structure to match what UI expects
      const normalizedAnswer = {
        id: newAnswer.id,
        content: newAnswer.content,
        createdAt: newAnswer.createdAt,
        updatedAt: newAnswer.updatedAt,
        likes: 0, // New answer starts with 0 likes
        userVote: 0, // User hasn't voted on their own answer
        author: newAnswer.author || {
          id: user?.id,
          firstName: user?.firstName,
          lastName: user?.lastName,
        },
      };
      
      // Add the new answer to the list immediately
      setAnswers(prev => [...prev, normalizedAnswer]);
      
      // Clear the editor and reset state
      setAnswerText('');
      setFitResult(null);
      
      // Show success message
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 3000);
      
      // Also clear the textarea DOM element to ensure UI updates
      const textarea = document.querySelector(`.${styles.editorTextarea}`);
      if (textarea) {
        textarea.value = '';
      }
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

  const handleSaveAnswerEdit = async (answerId) => {
    if (!editAnswerContent.trim() || editAnswerContent.trim().length < 20) {
      setAnswerEditError('Content must be at least 20 characters.');
      return;
    }

    setIsSavingAnswerEdit(true);
    setAnswerEditError(null);
    try {
      const response = await answerService.updateAnswer(answerId, editAnswerContent);
      const updated = response.data || response;
      setAnswers(prev => prev.map(a =>
        a.id === answerId
          ? { ...a, content: updated.content, updatedAt: updated.updatedAt }
          : a,
      ));
      setEditingAnswerId(null);
      setEditAnswerContent('');
    } catch (err) {
      setAnswerEditError(err.message || 'Failed to save answer edit.');
    } finally {
      setIsSavingAnswerEdit(false);
    }
  };

  const handleDeleteAnswer = async (answerId) => {
    setIsDeletingAnswer(true);
    try {
      await answerService.deleteAnswer(answerId);
      setAnswers(prev => prev.filter(a => a.id !== answerId));
      setDeletingAnswerId(null);
    } catch (err) {
      console.error('Failed to delete answer', err);
      setIsDeletingAnswer(false);
      setDeletingAnswerId(null);
    }
  };

  const shareUrl = `${window.location.origin}/questions/${questionHash}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // fallback
      const input = document.querySelector(`.${styles.shareInput}`);
      if (input) {
        input.select();
        document.execCommand('copy');
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    }
  };

  const handleSocialShare = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
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
                  <button
                    type='button'
                    className={styles.btnAction}
                    onClick={() => setShowShareModal(true)}
                    title='Share this question'
                  >
                    <Share2 size={14} />
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
              const isOwnAnswer = isAuthoredByUser(answer, user);
              const isEditingThisAnswer = editingAnswerId === answer.id;
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
                        {answer.createdAt !== answer.updatedAt && ' (edited)'}
                      </div>
                    </div>
                    {isOwnAnswer && !isEditingThisAnswer && (
                      <div className={styles.authorActions}>
                        <button
                          onClick={() => {
                            setEditAnswerContent(answer.content);
                            setEditingAnswerId(answer.id);
                            setAnswerEditError(null);
                          }}
                          className={styles.editBtn}
                          title='Edit answer'
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingAnswerId(answer.id)}
                          className={styles.deleteBtn}
                          title='Delete answer'
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingThisAnswer ? (
                    <div className={styles.editForm}>
                      <textarea
                        className={styles.editTextarea}
                        value={editAnswerContent}
                        onChange={e => setEditAnswerContent(e.target.value)}
                        placeholder='Edit your answer...'
                        rows={6}
                      />
                      {answerEditError && (
                        <div className={styles.errorText}>{answerEditError}</div>
                      )}
                      <div className={styles.editActions}>
                        <button
                          onClick={() => {
                            setEditingAnswerId(null);
                            setEditAnswerContent('');
                            setAnswerEditError(null);
                          }}
                          className={styles.cancelBtn}
                          disabled={isSavingAnswerEdit}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveAnswerEdit(answer.id)}
                          className={styles.saveBtn}
                          disabled={isSavingAnswerEdit}
                        >
                          {isSavingAnswerEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.answerContent}>
                      <ReactMarkdown>{answer.content}</ReactMarkdown>
                    </div>
                  )}

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

            {deletingAnswerId && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                  <h3>Delete Answer</h3>
                  <p>Are you sure you want to delete this answer? This action cannot be undone.</p>
                  <div className={styles.modalActions}>
                    <button
                      onClick={() => {
                        setDeletingAnswerId(null);
                        setIsDeletingAnswer(false);
                      }}
                      className={styles.cancelBtn}
                      disabled={isDeletingAnswer}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteAnswer(deletingAnswerId)}
                      className={styles.deleteBtnConfirm}
                      disabled={isDeletingAnswer}
                    >
                      {isDeletingAnswer ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </div>
                </div>
              </div>
            )}
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

                {postSuccess && (
                  <div className={styles.editorSuccessMessage}>
                    Answer posted successfully! Your answer is now visible below.
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

      {showShareModal && (
        <div className={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div className={styles.shareModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.shareModalTitle}>Share Question</h3>

            <div className={styles.shareLinkRow}>
              <input
                type='text'
                readOnly
                value={shareUrl}
                className={styles.shareInput}
                onClick={e => e.target.select()}
              />
              <button onClick={handleCopyLink} className={styles.copyBtn}>
                {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                {linkCopied ? ' Copied' : ' Copy'}
              </button>
            </div>

            <div className={styles.shareDivider}>
              <span>or share on</span>
            </div>

            <div className={styles.shareSocialRow}>
              <button
                className={styles.socialBtn}
                onClick={() => handleSocialShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(question.title)}&url=${encodeURIComponent(shareUrl)}`)}
                title='Share on X (Twitter)'
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                </svg>
                X
              </button>
              <button
                className={styles.socialBtn}
                onClick={() => handleSocialShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`)}
                title='Share on LinkedIn'
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
                </svg>
                LinkedIn
              </button>
              <button
                className={styles.socialBtn}
                onClick={() => handleSocialShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)}
                title='Share on Facebook'
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                </svg>
                Facebook
              </button>
              <button
                className={styles.socialBtn}
                onClick={() => handleSocialShare(`https://wa.me/?text=${encodeURIComponent(question.title + ' ' + shareUrl)}`)}
                title='Share on WhatsApp'
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
                </svg>
                WhatsApp
              </button>
            </div>

            <button onClick={() => setShowShareModal(false)} className={styles.cancelBtn} style={{ width: '100%', marginTop: '16px' }}>
              Close
            </button>
          </div>
        </div>
      )}

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
