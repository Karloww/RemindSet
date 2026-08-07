import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ProfileProvider } from '@/lib/ProfileContext';
import AppLayout from '@/components/AppLayout';
// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Onboarding from '@/pages/Onboarding';
// App pages
import Home from '@/pages/Home';
import Classrooms from '@/pages/Classrooms';
import CreateClassroom from '@/pages/CreateClassroom';
import ClassroomDetail from '@/pages/ClassroomDetail';
import LessonDetail from '@/pages/LessonDetail';
import UploadLesson from '@/pages/UploadLesson';
import AssignLesson from '@/pages/AssignLesson';
import EditLesson from '@/pages/EditLesson';
import CustomizeTheme from '@/pages/CustomizeTheme';
import StudentActivities from '@/pages/StudentActivities';
import StudentLessons from '@/pages/StudentLessons';
import Announcements from '@/pages/Announcements';
import StudentsMissed from '@/pages/StudentsMissed';
import Profile from '@/pages/Profile';
import EditProfile from '@/pages/EditProfile';
import ManageAccount from '@/pages/ManageAccount';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';
import NotificationSettings from '@/pages/NotificationSettings';
import HowToUse from '@/pages/HowToUse';
import UserProfile from '@/pages/UserProfile';
import AdminLayout from '@/components/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import ManageUsers from '@/pages/admin/ManageUsers';
import ManageShop from '@/pages/admin/ManageShop';
import AdminNotifications from '@/pages/admin/AdminNotifications';
import MaintenanceMode from '@/pages/admin/MaintenanceMode';
import ManageWebsite from '@/pages/admin/ManageWebsite';
import ManageReports from '@/pages/admin/ManageReports';
import ActivityBuilder from '@/pages/ActivityBuilder';
import TakeActivity from '@/pages/TakeActivity';
import CalendarPage from '@/pages/CalendarPage';
import Resources from '@/pages/Resources';
import Users from '@/pages/Users';
import Messages from '@/pages/Messages';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, maintenanceMode, maintenanceMessage } = useAuth();

  // Show maintenance screen for non-admin users
  if (maintenanceMode && user?.role !== "admin") {
    return <MaintenanceScreen message={maintenanceMessage} />;
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {/* Onboarding is standalone (no app shell) */}
        <Route path="/onboarding" element={<Onboarding />} />
        {/* Admin routes */}
        <Route element={<ProfileProvider><AdminLayout /></ProfileProvider>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/shop" element={<ManageShop />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/maintenance" element={<MaintenanceMode />} />
          <Route path="/admin/reports" element={<ManageReports />} />
          <Route path="/admin/website" element={<ManageWebsite />} />
        </Route>
        {/* App shell with theme + navigation */}
        <Route element={<ProfileProvider><AppLayout /></ProfileProvider>}>
          <Route path="/" element={<Home />} />
          <Route path="/classrooms" element={<Classrooms />} />
          <Route path="/create-classroom" element={<CreateClassroom />} />
          <Route path="/classrooms/:id" element={<ClassroomDetail />} />
          <Route path="/classrooms/:id/upload-lesson" element={<UploadLesson />} />
          <Route path="/classrooms/:id/activities/new" element={<ActivityBuilder />} />
          <Route path="/classrooms/:id/activities/:activityId" element={<ActivityBuilder />} />
          <Route path="/classrooms/:id/activities/:activityId/take" element={<TakeActivity />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/users" element={<Users />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:conversationId" element={<Messages />} />
          <Route path="/classrooms/:id/lessons/:lessonId/assign" element={<AssignLesson />} />
          <Route path="/classrooms/:id/lessons/:lessonId/edit" element={<EditLesson />} />
          <Route path="/lessons/:id" element={<LessonDetail />} />
          <Route path="/customize-theme" element={<CustomizeTheme />} />
          <Route path="/activities" element={<StudentActivities />} />
          <Route path="/lessons" element={<StudentLessons />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/students-missed" element={<StudentsMissed />} />
          <Route path="/shop" element={<Navigate to="/customize-theme" replace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/manage-account" element={<ManageAccount />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/how-to-use" element={<HowToUse />} />
          <Route path="/users/:userId" element={<UserProfile />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App