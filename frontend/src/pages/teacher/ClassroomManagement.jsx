import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Copy, Trash2, ArrowRight, Users, ClipboardList, Plus } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { createClassroom, getClassrooms, deleteClassroom } from '../../api/client';
import toast from 'react-hot-toast';

const ClassroomManagement = () => {
  const { selectClassroom } = useAuth();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const res = await getClassrooms();
      setClassrooms(res.data);
    } catch (err) {
      toast.error('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createClassroom(newName.trim());
      const code = res.data.code || res.data.join_code;
      toast.success(`Classroom created! Code: ${code}`);
      setNewName('');
      fetchClassrooms();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create classroom');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteClassroom(id);
      toast.success('Classroom deleted');
      fetchClassrooms();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete classroom');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (id, name) => {
    selectClassroom(id, name);
    toast.success(`Switched to ${name}`);
    navigate('/teacher');
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <School className="h-7 w-7" />
          Classroom Management
        </h1>
        <p className="text-sm text-text-muted mt-1">Create and manage your classrooms</p>
      </div>

      {/* Create Classroom */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Create New Classroom
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Classroom Name"
                placeholder="e.g. CS101 - Fall 2026"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Button type="submit" isLoading={creating} disabled={!newName.trim()}>
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Classrooms */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Your Classrooms</h2>

        {loading ? (
          <div className="text-center py-12 text-text-muted text-sm">Loading classrooms...</div>
        ) : classrooms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <School className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No classrooms yet. Create one above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classrooms.map((c) => {
              const code = c.code || c.join_code || '';
              return (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Code */}
                    <div className="flex items-center justify-between bg-overlay/[0.04] rounded-lg px-3 py-2 border border-overlay/[0.06]">
                      <div>
                        <p className="text-[10px] text-text-muted">Join Code</p>
                        <p className="text-sm font-mono font-bold text-text-primary tracking-widest">{code}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(code)}
                        className="text-text-muted hover:text-text-primary transition-colors p-1"
                        title="Copy code"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-text-muted">
                      Students can join with code: <span className="font-mono font-semibold text-text-primary">{code}</span>
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {c.student_count ?? 0} students
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5" />
                        {c.assignment_count ?? 0} assignments
                      </span>
                    </div>

                    {/* Created date */}
                    {c.created_at && (
                      <p className="text-[10px] text-text-muted">
                        Created {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleSelect(c.id, c.name)}
                      >
                        Select <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-text-muted hover:text-error"
                        onClick={() => handleDelete(c.id, c.name)}
                        isLoading={deletingId === c.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomManagement;
