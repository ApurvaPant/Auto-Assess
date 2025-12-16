import { useState, useEffect } from 'react';
import apiClient, { updateStudentProfile } from '../api/client';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function StudentProfile() {
  const [name, setName] = useState('');
  const [newDob, setNewDob] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('studentAuthToken');
    if (!token) {
      // No need to fetch if not logged in - this is fine for password change
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/student/profile');
        if (res.data.name) setName(res.data.name);
      } catch (error) {
        // 401 is expected if token is invalid - just ignore
        console.log("Could not load profile (expected if not logged in)");
      }
    };
    fetchProfile();
  }, []);

  // Ideally fetch current name here if we had a getProfile endpoint, 
  // but for now we just handle updates.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Only send fields that are filled
      const payloadName = name.trim() || null;
      const payloadDob = newDob || null;
      const payloadCode = code || null;

      if (!payloadName && !payloadDob) {
        toast.error("Please enter Name or New Password to update.");
        setLoading(false);
        return;
      }

      if (payloadDob && !payloadCode) {
        toast.error("Teacher Code is required to change password.");
        setLoading(false);
        return;
      }

      const response = await updateStudentProfile(payloadName, payloadDob, payloadCode);
      toast.success(response.data.message);
      if (payloadDob) {
        toast.success("Password changed. Please login again.");
        navigate('/student');
      }
      setCode(''); setNewDob(''); // Clear sensitive fields
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      {/* Global Background Effects matching other pages */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md border-none shadow-2xl bg-surface/30 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-text-primary">Manage Account</CardTitle>
          <p className="mt-2 text-sm text-center text-text-muted">Update your profile details</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                <User className="h-4 w-4" /> Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1 block w-full px-3 py-2 bg-background/50 border border-white/10 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-text-muted mt-1">This will be displayed on your dashboard.</p>
            </div>

            <div className="border-t border-white/5 pt-4">
              <label className="text-sm font-medium text-text-muted flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4" /> Change Password (DOB)
              </label>
              <div className="space-y-3">
                <input
                  type="date"
                  value={newDob}
                  onChange={(e) => setNewDob(e.target.value)}
                  className="block w-full px-3 py-2 bg-background/50 border border-white/10 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter Teacher Code"
                  className="block w-full px-3 py-2 bg-background/50 border border-white/10 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-text-muted">A valid teacher code is required to change your password.</p>
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
