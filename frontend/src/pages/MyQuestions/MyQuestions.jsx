import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getQuestions } from "../../services/core/question.service";
import ReactMarkdown from "react-markdown";
import styles from "./MyQuestions.module.css";

export default function MyQuestions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myQuestions, setMyQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyQuestions();
  }, []);

  const fetchMyQuestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const questions = await getQuestions({ mine: true }, user.id);
      setMyQuestions(questions);
    } catch (err) {
      const msg =
        err.response?.data?.msg ||
        err.response?.data?.message ||
        err.message;

      setError(msg || "Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (questionHash) => {
    navigate(`/questions/${questionHash}`);
  };

  const truncateContent = (content, maxLength = 300) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>My Questions</h1>

      {isLoading && <p className={styles.loadingText}>Loading your questions...</p>}

      {error && <p className={styles.errorText}>Error: {error}</p>}

      {!isLoading && myQuestions.length === 0 && (
        <p className={styles.emptyText}>You haven't asked any questions yet.</p>
      )}

      {!isLoading && myQuestions.length > 0 && (
        <div>
          <p className={styles.countText}>
            <strong>Found {myQuestions.length} question(s):</strong>
          </p>

          <div className={styles.questionsGrid}>
            {myQuestions.map((q) => (
              <div
                key={q.id}
                className={styles.questionCard}
                onClick={() => handleQuestionClick(q.questionHash || q.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleQuestionClick(q.questionHash || q.id);
                  }
                }}
              >
                <h3 className={styles.questionTitle}>
                  {q.title}
                </h3>

                <div className={styles.questionContent}>
                  <ReactMarkdown>
                    {truncateContent(q.content)}
                  </ReactMarkdown>
                </div>

                <div className={styles.questionMeta}>
                  <span className={styles.answerCount}>
                    {q.answerCount} answer(s)
                  </span>
                  <span className={styles.divider}>•</span>
                  <span className={styles.authorInfo}>
                    By{" "}
                    <span className={styles.authorName}>
                      {q.author.firstName} {q.author.lastName}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}