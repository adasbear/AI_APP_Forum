import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getQuestions } from "../../services/core/question.service";

export default function MyQuestions() {
  const { user } = useAuth(); // ← MOVE HERE! Top level!
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
      const msg = err.response?.data?.msg || err.response?.data?.message || err.message;
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
                  border: "1px solid #ddd",
                  padding: "15px",
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <h3 style={{ margin: "0 0 10px 0" }}>{q.title}</h3>
                <p style={{ margin: "0 0 10px 0", color: "#666" }}>
                  {q.content}
                </p>
                <small style={{ color: "#999" }}>
                  {q.answerCount} answer(s) • By {q.author.firstName}{" "}
                  {q.author.lastName}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
