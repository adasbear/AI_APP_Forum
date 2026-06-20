import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { questionService } from '../../services/questions/question.service.js';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import Button from '../../components/Button/Button';
import ReactMarkdown from 'react-markdown';
import styles from './PostQuestion.module.css';
import { Sparkles, Send, Check } from 'lucide-react';

/**
 * Enhanced PostQuestion component with integrated MarkdownEditor
 * 
 * This version replaces the standard textarea with a rich text editor
 * that provides real-time Markdown formatting, character counting,
 * and a professional editing experience.
 */
export default function PostQuestionWithMarkdownEditor() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [contentCharCount, setContentCharCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoaching, setIsCoaching] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);

  // Search for similar questions based on title
  useEffect(() => {
    const title = formData.title.trim();
    if (title.length < 5) {
      setSimilarQuestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingSimilar(true);
      try {
        const result = await questionService.searchQuestionsSemantic(title);
        const questionsArray = result.data || result;
        setSimilarQuestions(Array.isArray(questionsArray) ? questionsArray : []);
      } catch (err) {
        console.error('Failed to fetch similar questions', err);
      } finally {
        setIsSearchingSimilar(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.title]);

  const validate = () => {
    const errors = {};
    if (!formData.title || formData.title.trim().length < 5 || formData.title.trim().length > 255) {
      errors.title = 'Question title must be at least 5 characters';
    }
    if (contentCharCount < 10) {
      errors.content = `Question content must be at least 10 characters (currently ${contentCharCount})`;
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTitleChange = (e) => {
    setFormData({ ...formData, title: e.target.value });
    if (validationErrors.title) {
      setValidationErrors({ ...validationErrors, title: null });
    }
    setError(null);
  };

  // Handle MarkdownEditor content changes
  const handleContentChange = (markdown, charCount) => {
    setFormData({ ...formData, content: markdown });
    setContentCharCount(charCount);
    if (validationErrors.content) {
      setValidationErrors({ ...validationErrors, content: null });
    }
    setError(null);
  };

  const handleCoachDraft = async () => {
    if (!formData.title || contentCharCount < 10) {
      validate();
      return;
    }
    setIsCoaching(true);
    setCoachFeedback(null);
    setError(null);
    try {
      const response = await questionService.generateQuestionDraftCoach(formData);
      setCoachFeedback(response);
    } catch (err) {
      setError(err.message || 'Failed to get AI feedback. Please try again.');
    } finally {
      setIsCoaching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await questionService.createQuestion(formData);
      setSuccessData(response.data || response);
    } catch (err) {
      setError('Failed to post question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Success screen
  if (successData) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.header}>
          <span className={styles.headerLabel}>ASK THE COHORT</span>
          <h1 className={styles.title}>Publish to the forum</h1>
          <p className={styles.subtitle}>
            Public threads help the whole cohort. Write as if a classmate will debug your issue tomorrow. They only know what you put on the page.
          </p>
        </div>

        <div className={styles.formCard}>
          <div className={styles.successContainer}>
            <div className={styles.successIcon}>
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 className={styles.successTitle}>Thread published</h2>
            <p className={styles.successText}>
              Your post is indexed for keyword search and embedding-based similarity. Share the link in study groups, or stay on the thread to answer follow-up questions from peers.
            </p>
            <div className={styles.successActions}>
              <Link to="/dashboard" className={styles.dashboardLink}>Back to Dashboard</Link>
              {successData.questionHash || successData.id ? (
                <Link to={`/questions/${successData.questionHash || successData.id}`} className={styles.viewQuestionBtn}>
                  View Question
                </Link>
              ) : (
                <button className={styles.viewQuestionBtn} onClick={() => navigate('/dashboard')}>
                  View Question
                </button>
              )}
              <button className={styles.askAnotherBtn} onClick={() => {
                setSuccessData(null);
                setFormData({ title: '', content: '' });
                setContentCharCount(0);
              }}>
                Ask Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>ASK THE COHORT</span>
        <h1 className={styles.title}>Publish to the forum</h1>
        <p className={styles.subtitle}>
          Public threads help the whole cohort. Write as if a classmate will debug your issue tomorrow. They only know what you put on the page.
        </p>
      </div>

      <div className={styles.infoBanner}>
        <h3>Write questions people can answer in one pass</h3>
        <p>Mentors volunteer their time. Give them runnable context, expected vs actual behavior, and a tight scope so they can reproduce the issue without guessing your setup.</p>
        
        <h4 className={styles.infoSectionTitle}>Checklist before you post</h4>
        <ul className={styles.infoList}>
          <li><strong>Title as a headline</strong> that states the symptom and tech stack (e.g., "React 19: state resets after navigation").</li>
          <li><strong>Repro steps</strong> numbered, with environment (OS, browser, Node version) when it matters.</li>
          <li><strong>Minimal code</strong> in fenced markdown blocks; trim unrelated lines so readers scan faster.</li>
          <li><strong>Exact errors</strong> copied verbatim, including stack trace snippets when debugging backend routes.</li>
        </ul>

        <h4 className={styles.infoSectionTitle}>Validation rules (enforced by the form)</h4>
        <ul className={styles.infoList}>
          <li><strong>Title length:</strong> Must be between 5 and 255 characters.</li>
          <li><strong>Body length:</strong> Must contain a minimum of 10 characters detailing your problem.</li>
          <li><strong>Single topic:</strong> Split unrelated bugs into separate threads so search and embeddings stay precise.</li>
        </ul>
      </div>

      <div className={styles.formCard}>
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title Field */}
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>Title</label>
            <span className={styles.sublabel}>Be specific and imagine you're asking a question to another person.</span>
            <input
              type="text"
              id="title"
              name="title"
              className={`${styles.input} ${validationErrors.title ? styles.inputError : ''}`}
              value={formData.title}
              onChange={handleTitleChange}
              disabled={isSubmitting}
              placeholder="e.g., How do I fix CORS errors in my Express API?"
            />
            {validationErrors.title && (
              <span className={styles.errorText}>{validationErrors.title}</span>
            )}
            
            {/* Similar Questions Panel */}
            {(similarQuestions.length > 0 || isSearchingSimilar) && (
              <div className={styles.similarQuestionsPanel}>
                <h4 className={styles.similarQuestionsHeader}>
                  {isSearchingSimilar ? 'Checking for similar questions...' : 'Similar questions already asked:'}
                </h4>
                {!isSearchingSimilar && similarQuestions.length > 0 && (
                  <ul className={styles.similarQuestionsList}>
                    {similarQuestions.map(sq => (
                      <li key={sq.questionHash || sq.id}>
                        <a 
                          href={`/questions/${sq.questionHash || sq.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.similarQuestionLink}
                        >
                          {sq.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Markdown Editor - Replaces the textarea */}
          <div className={styles.formGroup}>
            <MarkdownEditor
              value={formData.content}
              onChange={handleContentChange}
              minCharacters={10}
              error={validationErrors.content}
              placeholder="Include all the information someone would need to answer your question... You can use Markdown to format your code!"
            />
          </div>

          {/* AI Coach Section */}
          <div className={styles.aiSection}>
            <Button
              variant='ai'
              size='medium'
              isLoading={isCoaching}
              loadingText='Getting suggestions...'
              disabled={isSubmitting}
              onClick={handleCoachDraft}
              icon={<Sparkles size={16} />}
            >
              AI suggestions
            </Button>
            <span className={styles.aiDisclaimer}>Suggestions only. You still choose what to post.</span>
          </div>

          {coachFeedback && (
            <div className={styles.aiFeedbackPanel}>
              <div className={styles.aiHeader}>
                <div className={styles.aiHeaderLeft}>
                  <Sparkles size={20} className={styles.aiIcon} />
                  <h3 className={styles.aiHeaderTitle}>AI Suggestions</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setCoachFeedback(null)}
                  aria-label="Close suggestions"
                >
                  ×
                </button>
              </div>

              {/* Feedback Summary */}
              {coachFeedback.feedback && (
                <div className={styles.feedbackSummary}>
                  <ReactMarkdown>{coachFeedback.feedback}</ReactMarkdown>
                </div>
              )}

              {/* Suggestions Container */}
              <div className={styles.suggestionsContainer}>
                {/* Title Suggestion */}
                {coachFeedback.improvedTitle && (
                  <div className={styles.suggestionBlock}>
                    <div className={styles.suggestionLabel}>
                      <span className={styles.labelText}>Improved Title</span>
                    </div>
                    <div className={styles.suggestionBox}>
                      <p className={styles.suggestionText}>{coachFeedback.improvedTitle}</p>
                    </div>
                    <button
                      type="button"
                      className={styles.applyBtn}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, title: coachFeedback.improvedTitle }));
                      }}
                    >
                      Apply Title
                    </button>
                  </div>
                )}

                {/* Content Suggestion */}
                {coachFeedback.improvedContent && (
                  <div className={styles.suggestionBlock}>
                    <div className={styles.suggestionLabel}>
                      <span className={styles.labelText}>Improved Content</span>
                    </div>
                    <div className={styles.suggestionBox}>
                      <ReactMarkdown className={styles.suggestionMarkdown}>
                        {coachFeedback.improvedContent}
                      </ReactMarkdown>
                    </div>
                    <button
                      type="button"
                      className={styles.applyBtn}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, content: coachFeedback.improvedContent }));
                      }}
                    >
                      Apply Content
                    </button>
                  </div>
                )}
              </div>

              {/* Tips Section */}
              {coachFeedback.tips && coachFeedback.tips.length > 0 && (
                <div className={styles.tipsSection}>
                  <div className={styles.tipsLabel}>💡 Tips</div>
                  <ul className={styles.tipsList}>
                    {coachFeedback.tips.map((tip, idx) => (
                      <li key={idx} className={styles.tipItem}>
                        <ReactMarkdown>{tip}</ReactMarkdown>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bottom Actions */}
              <div className={styles.aiActions}>
                <button
                  type="button"
                  className={styles.applyAllBtn}
                  onClick={() => {
                    setFormData(prev => ({
                      title: coachFeedback.improvedTitle || prev.title,
                      content: coachFeedback.improvedContent || prev.content,
                    }));
                    setCoachFeedback(null);
                  }}
                >
                  Apply All & Close
                </button>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button 
              type="button" 
              className={styles.cancelBtn} 
              onClick={handleCancel} 
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <Button
              type='submit'
              variant='primary'
              size='medium'
              isLoading={isSubmitting}
              loadingText='Posting...'
              disabled={contentCharCount < 10}
              icon={!isSubmitting && <Send size={16} />}
            >
              Post Question
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
