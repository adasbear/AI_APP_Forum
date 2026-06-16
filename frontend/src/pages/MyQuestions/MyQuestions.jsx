import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getQuestions } from "../../services/core/question.service";

export default function MyQuestions() {
  const { user } = useAuth();
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

  return (
    <div style={{ padding: "20px" }}>
      <h1>My Questions</h1>

      {isLoading && <p>Loading your questions...</p>}

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!isLoading && myQuestions.length === 0 && (
        <p>You haven't asked any questions yet.</p>
      )}

      {!isLoading && myQuestions.length > 0 && (
        <div>
          <p>
            <strong>Found {myQuestions.length} question(s):</strong>
          </p>

          <div style={{ display: "grid", gap: "15px", marginTop: "20px" }}>
            {myQuestions.map((q) => (
              <div
                key={q.id}
                style={{
                  border: "1px solid var(--border)",
                  padding: "var(--spacing-md)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--surface)",
                  transition:
                    "background-color var(--transition-fast), border-color var(--transition-fast)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 var(--spacing-sm) 0",
                    color: "var(--text-primary)",
                  }}
                >
                  {q.title}
                </h3>

                <p
                  style={{
                    margin: "0 0 var(--spacing-sm) 0",
                    color: "var(--text-secondary)",
                  }}
                >
                  {q.content}
                </p>

                <small style={{ color: "var(--text-tertiary)" }}>
                  {q.answerCount} answer(s) • By{" "}
                  <span
                    style={{
                      color: "var(--primary)",
                      fontWeight: "var(--font-medium)",
                    }}
                  >
                    {q.author.firstName} {q.author.lastName}
                  </span>
                </small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}