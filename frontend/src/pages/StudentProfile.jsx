import { useState, useEffect, useRef } from 'react';
import apiClient, { updateStudentProfile, uploadStudentPhoto } from '../api/client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowLeft, Mail, Camera } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function StudentProfile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('studentAuthToken');
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/student/profile');
        if (res.data.name) setName(res.data.name);
        if (res.data.email) setEmail(res.data.email);
        if (res.data.photo_url) setPhotoUrl(res.data.photo_url);
      } catch (error) {
        console.log("Could not load profile (expected if not logged in)");
      }
    };
    fetchProfile();
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2 MB.');
      return;
    }
    setPhotoLoading(true);
    try {
      const res = await uploadStudentPhoto(file);
      setPhotoUrl(res.data.photo_url);
      toast.success('Photo updated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload photo.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payloadName = name.trim() || null;
      const payloadCurrentPassword = currentPassword || null;
      const payloadNewPassword = newPassword || null;

      if (!payloadName && !payloadNewPassword) {
        toast.error("Please enter Name or New Password to update.");
        setLoading(false);
        return;
      }

      if (payloadNewPassword && !payloadCurrentPassword) {
        toast.error("Current password is required to set a new password.");
        setLoading(false);
        return;
      }

      const response = await updateStudentProfile(payloadName, payloadCurrentPassword, payloadNewPassword);
      toast.success(response.data.message);
      if (payloadNewPassword) {
        toast.success("Password changed. Please login again.");
        localStorage.removeItem('studentAuthToken');
        navigate('/student');
      }
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      {/* Global Background Effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md border-none shadow-2xl bg-surface/30 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-text-primary">Manage Account</CardTitle>
          <p className="mt-2 text-sm text-center text-text-muted">Update your profile details</p>
        </CardHeader>
        <CardContent>
          {/* Photo Upload */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {photoLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <p className="text-xs text-text-muted mt-2">Click to change photo (max 2 MB)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email (read-only) */}
            {email && (
              <div>
                <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="mt-1 block w-full px-3 py-2 bg-background/30 border border-overlay/5 rounded-md text-text-muted cursor-not-allowed"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                <User className="h-4 w-4" /> Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1 block w-full px-3 py-2 bg-background/50 border border-overlay/10 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-text-muted mt-1">This will be displayed on your dashboard.</p>
            </div>

            <div className="border-t border-overlay/5 pt-4">
              <label className="text-sm font-medium text-text-muted flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4" /> Change Password
              </label>
              <div className="space-y-3">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="block w-full px-3 py-2 bg-background/50 border border-overlay/10 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="block w-full px-3 py-2 bg-background/50 border border-overlay/10 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-text-muted">Enter your current password to set a new one.</p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full shadow-lg shadow-primary/20"
            >
              {loading ? 'Updating...' : 'Save Changes'}
            </Button>
          </form>
          <div className="text-center mt-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-text-muted hover:text-text-primary">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
