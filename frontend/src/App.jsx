/**
 * Route map: public pages live outside `Layout`; forum tools use
 * `Layout` + `ProtectedRoute`.
 *
 * Add new <Route> entries here, then wire navigation in:
 * - Sidebar.jsx
 * - Layout.jsx (getTitle / getSubtitle)
 *
 * so the shell stays in sync.
 */

import React from "react";
import {
  BrowserRouter,
  Routes,
 Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";

import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

import Auth from "./pages/Auth/Auth";
import Dashboard from "./pages/Dashboard/Dashboard";
import QuestionDetail from "./pages/QuestionDetail/QuestionDetail";
import Landing from "./pages/Landing/Landing";
import PostQuestion from "./pages/PostQuestion/PostQuestion";
import MyQuestions from "./pages/MyQuestions/MyQuestions";
import Profile from "./pages/Profile/Profile";
import RagDocuments from './pages/RagDocuments/RagDocuments';
import MyBookmarks from './pages/MyBookmarks/MyBookmarks';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import ResetPassword from './pages/ResetPassword/ResetPassword';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/questions/ask"
              element={
                <ProtectedRoute>
                  <PostQuestion />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-questions"
              element={
                <ProtectedRoute>
                  <MyQuestions />
                </ProtectedRoute>
              }
            />

            <Route
              path="/questions/:questionHash"
              element={
                <ProtectedRoute>
                  <QuestionDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/rag-documents"
              element={
                <ProtectedRoute>
                  <RagDocuments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-bookmarks"
              element={
                <ProtectedRoute>
                  <MyBookmarks />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-All Redirect */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;