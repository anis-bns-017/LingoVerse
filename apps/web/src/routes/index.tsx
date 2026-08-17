import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ProfilePage } from "../pages/ProfilePage";
import { SettingsPage } from "../pages/SettingsPage";
import { VocabularyPage } from "../pages/VocabularyPage";
import { FlashcardPage } from "../pages/FlashcardPage";
import { GrammarPage } from "../pages/GrammarPage";
import { ExercisesPage } from "../pages/ExercisesPage";
import { ProgressPage } from "../pages/ProgressPage";
import { FriendsPage } from "../pages/FriendsPage";
import { SuggestionsPage } from "../pages/SuggestionsPage";
import { BlockedPage } from "../pages/BlockedPage";
import { ChatPage } from "../pages/ChatPage";
import { VoicePage } from "../pages/VoicePage";
// ❌ Remove VoiceRoomView import if not using it directly
// import { VoiceRoomView } from "../components/voice/VoiceRoomView";
import { CommunitiesPage } from "../pages/CommunitiesPage";
import { CommunityPage } from "../pages/CommunityPage";
import { JoinCommunityPage } from "../pages/JoinCommunityPage";
import { NewConversationPage } from "../pages/NewConversationPage";
import { DiscoveryPage } from "../pages/DiscoveryPage";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Learning Routes */}
        <Route
          path="/vocabulary"
          element={
            <ProtectedRoute>
              <VocabularyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/flashcards"
          element={
            <ProtectedRoute>
              <FlashcardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/grammar"
          element={
            <ProtectedRoute>
              <GrammarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exercises"
          element={
            <ProtectedRoute>
              <ExercisesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <ProgressPage />
            </ProtectedRoute>
          }
        />

        {/* Social Routes */}
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suggestions"
          element={
            <ProtectedRoute>
              <SuggestionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blocked"
          element={
            <ProtectedRoute>
              <BlockedPage />
            </ProtectedRoute>
          }
        />

        {/* Chat Routes */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/new"
          element={
            <ProtectedRoute>
              <NewConversationPage />
            </ProtectedRoute>
          }
        />

        {/* ✅ Voice Routes - Both use VoicePage */}
        <Route
          path="/voice"
          element={
            <ProtectedRoute>
              <VoicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voice/:roomId"
          element={
            <ProtectedRoute>
              <VoicePage />
            </ProtectedRoute>
          }
        />

        {/* Community Routes */}
        <Route
          path="/communities"
          element={
            <ProtectedRoute>
              <CommunitiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/:communityId"
          element={
            <ProtectedRoute>
              <CommunityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities/join/:code"
          element={
            <ProtectedRoute>
              <JoinCommunityPage />
            </ProtectedRoute>
          }
        />

        {/* Discovery Route */}
        <Route
          path="/discover"
          element={
            <ProtectedRoute>
              <DiscoveryPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};
