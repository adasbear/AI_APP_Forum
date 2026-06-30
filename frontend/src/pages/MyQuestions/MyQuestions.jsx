import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getQuestions } from "../../services/core/question.service";
import styles from "./MyQuestions.module.css";

export default function MyQuestions() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const backendUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3777";

  // ✅ FIXED FETCH (no ESLint warning)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      if (!user?.id) return;

      const data = await getQuestions({ mine: true }, user.id);
      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id, fetchData]);

  // Helpers
  const getColor = (name = "") => {
    const colors = ["#ff6a00", "#0077cc", "#22c55e", "#a855f7", "#ef4444"];
    let hash = 0;

    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (first, last) =>
    `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1>Your topics</h1>
          <p>Questions you have posted.</p>
        </div>

        <button className={styles.newBtn} onClick={() => navigate("/questions/ask")}>
          + New question
        </button>
      </div>

      {/* LIST */}
      {loading ? (
        <p>Loading...</p>
      ) : questions.length === 0 ? (
        <p>No questions found</p>
      ) : (
        <div className={styles.list}>
          {questions.map((q) => {
            const first = q.author?.firstName || "U";
            const last = q.author?.lastName || "";

            // ✅ FIXED AVATAR FIELD (matches Profile page)
            const avatar = q.author?.avatarUrl;

            let baseUrl = backendUrl;
            if (baseUrl.endsWith('/api')) {
              baseUrl = baseUrl.slice(0, -4);
            } else if (baseUrl.endsWith('/api/')) {
              baseUrl = baseUrl.slice(0, -5);
            }
            baseUrl = baseUrl.replace(/\/$/, '');

            const avatarSrc = avatar
              ? avatar.startsWith("http")
                ? avatar
                : `${baseUrl}${avatar.startsWith('/') ? avatar : `/${avatar}`}`
              : null;

            return (
              <div
                key={q.id}
                className={styles.card}
                onClick={() =>
                  navigate(`/questions/${q.questionHash || q.id}`)
                }>
                <div className={styles.accent} />

                {/* AVATAR */}
                <div className={styles.avatarWrap}>
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      className={styles.avatar}
                      alt="avatar"
                    />
                  ) : (
                    <div
                      className={styles.fallbackAvatar}
                      style={{ background: getColor(first + last) }}>
                      {getInitials(first, last)}
                    </div>
                  )}
                </div>

                {/* BODY */}
                <div className={styles.body}>
                  <div className={styles.titleRow}>
                    <h3>{q.title}</h3>
                    <span className={styles.yours}>YOURS</span>
                  </div>

                  <p className={styles.preview}>
                    {q.content?.length > 180
                      ? q.content.slice(0, 180) + "..."
                      : q.content}
                  </p>

                  <div className={styles.meta}>
                    <span>{q.answerCount || 0} replies</span>
                    <span>•</span>
                    <span>
                      {q.createdAt
                        ? new Date(q.createdAt).toLocaleDateString()
                        : "—"}
                    </span>
                    <span>•</span>
                    <span>
                      {first} {last}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
