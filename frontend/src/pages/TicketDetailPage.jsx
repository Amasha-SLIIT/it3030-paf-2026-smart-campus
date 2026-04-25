
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getTicketById, getComments, addComment, editComment, deleteComment,
  assignTicket, updateTicketStatus, respondToAssignment, updatePriority,
} from '../api/ticketApi';
import api from '../api/axiosInstance';
import { Send, Edit2, Trash2, ChevronLeft } from 'lucide-react';
import { toast } from 'react-toastify';

const STATUS_CONFIG = {
  OPEN:        { label: 'Open',        bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
  IN_PROGRESS: { label: 'In Progress', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  RESOLVED:    { label: 'Resolved',    bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  CLOSED:      { label: 'Closed',      bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  REJECTED:    { label: 'Rejected',    bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

const PRIORITY_COLORS = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' };

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'USER';

  const [ticket,      setTicket]      = useState(null);
  const [comments,    setComments]    = useState([]);
  const [commentText, setCommentText] = useState('');
  const [editingId,   setEditingId]   = useState(null);
  const [editText,    setEditText]    = useState('');
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);

  // Admin panels
  const [showAssign,    setShowAssign]    = useState(false);
  const [staffEmail,    setStaffEmail]    = useState('');  // FIX #11: use email
  const [assignLoading, setAssignLoading] = useState(false);
  const [showReject,    setShowReject]    = useState(false);
  const [rejectReason,  setRejectReason]  = useState('');

  // Staff panels
  const [showResolve,      setShowResolve]      = useState(false);
  const [resolutionNotes,  setResolutionNotes]  = useState('');
  const [showStaffReject,  setShowStaffReject]  = useState(false);
  const [staffRejectReason,setStaffRejectReason]= useState('');
  const [taskAccepted, setTaskAccepted] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      
      const [t, c] = await Promise.all([
        getTicketById(id),
        getComments(id),
      ]);
      setTicket(t);
      setComments(Array.isArray(c) ? c : []);
    } catch (err) {
      console.error('Load ticket error:', err);
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  // ── Comments ─────────────────────────────────────────────────────────────

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
     
      const c = await addComment(id, commentText.trim());
      setComments(prev => [...prev, c]);
      setCommentText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send comment');
    } finally {
      setSending(false);
    }
  };

  const handleEditSave = async (cid) => {
    try {
      const updated = await editComment(id, cid, editText);
      setComments(prev => prev.map(c => c.id === cid ? updated : c));
      setEditingId(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to edit comment');
    }
  };

  const handleDeleteComment = async (cid) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(id, cid);
      setComments(prev => prev.filter(c => c.id !== cid));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete comment');
    }
  };

  // ── Admin: Assign ─────────────────────────────────────────────────────────
  
  const handleAdminAssign = async () => {
    if (!staffEmail.trim()) { toast.warn('Enter staff email'); return; }
    setAssignLoading(true);
    try {
      // Fetch all users and find by email
      const res = await api.get('/users');
      const staffUser = res.data.find(
        u => u.email.toLowerCase() === staffEmail.toLowerCase()
      );
      if (!staffUser) { toast.error('No user found with that email'); return; }
      if (staffUser.role !== 'ACADEMIC_STAFF' && staffUser.role !== 'ADMIN') {
        toast.error('That user is not Academic Staff'); return;
      }
      const updated = await assignTicket(id, staffUser.id);
      setTicket(updated);
      setShowAssign(false);
      setStaffEmail('');
      toast.success(`Ticket assigned to ${staffUser.name}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Assign failed');
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Admin: Reject ─────────────────────────────────────────────────────────
 
  const handleAdminReject = async () => {
    if (!rejectReason.trim()) { toast.warn('Rejection reason is required'); return; }
    try {
      const updated = await updateTicketStatus(id, {
        status: 'REJECTED',
        rejectionReason: rejectReason,
      });
      setTicket(updated);
      setShowReject(false);
      toast.success('Ticket rejected');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Reject failed');
    }
  };

  // ── Admin: Close ──────────────────────────────────────────────────────────
  const handleAdminClose = async () => {
    if (!window.confirm('Close this resolved ticket?')) return;
    try {
      const updated = await updateTicketStatus(id, { status: 'CLOSED' });
      setTicket(updated);
      toast.success('Ticket closed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Close failed');
    }
  };

  // ── Staff: Accept ─────────────────────────────────────────────────────────
  const handleStaffAccept = async () => {
  try {
    const updated = await respondToAssignment(id, true);
    setTicket(updated);
    setTaskAccepted(true); // ← lock out reject option
    toast.success('Assignment accepted');
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Action failed');
  }
};

  // ── Staff: Reject Assignment ───────────────────────────────────────────────
  const handleStaffRejectAssignment = async () => {
    if (!staffRejectReason.trim()) { toast.warn('Reason required'); return; }
    try {
      const updated = await respondToAssignment(id, false, staffRejectReason);
      setTicket(updated);
      setShowStaffReject(false);
      toast.success('Assignment rejected — admin notified');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed');
    }
  };

  // ── Staff: Resolve ────────────────────────────────────────────────────────
  const handleStaffResolve = async () => {
    if (!resolutionNotes.trim()) { toast.warn('Resolution notes are required'); return; }
    try {
      const updated = await updateTicketStatus(id, {
        status: 'RESOLVED',
        resolutionNotes,
      });
      setTicket(updated);
      setShowResolve(false);
      toast.success('Ticket marked as resolved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Resolve failed');
    }
  };


  const handlePriorityChange = async (p) => {
    if (p === ticket.currentPriority) return;
    try {
      const updated = await updatePriority(id, p);
      setTicket(updated);
      toast.success(`Priority updated to ${p}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update priority');
    }
  };

  if (loading) return <div style={loadingWrap}>Loading ticket...</div>;
  if (!ticket)  return <div style={loadingWrap}>Ticket not found.</div>;

  const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
  const myId = user?.id || user?.userId;
  const isOwner    = ticket.reportedBy?.id === myId;
  const isAssigned = ticket.assignedTo?.id === myId;
  const isAdmin    = role === 'ADMIN';
  const isStaff    = role === 'ACADEMIC_STAFF';

  const canComment = ticket.status !== 'REJECTED' && ticket.status !== 'CLOSED'
    && (isOwner || isAssigned || isAdmin);

  const canChangePriority = (isAdmin || isAssigned)
    && (ticket.status === 'IN_PROGRESS' || ticket.status === 'OPEN');

  return (
    <div style={pageWrap}>
      <button onClick={() => navigate(-1)} style={backBtn}>
        <ChevronLeft size={16} /> Back
      </button>

      <div style={contentGrid}>
        {/* ── LEFT: ticket detail ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Main card */}
          <div style={card}>
            <div style={cardTopBar}>
              <div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>#{ticket.id}</span>
                <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: 'white' }}>
                  {ticket.subject}
                </h2>
              </div>
              <span style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
              }}>
                ● {sc.label}
              </span>
            </div>

            <div style={{ padding: 24 }}>
              {/* Meta grid */}
              <div style={metaGrid}>
                <MetaField icon="🏷️" label="Category"     value={ticket.category?.replace(/_/g, ' ')} />
                <MetaField icon="📍" label="Location"     value={ticket.location || 'N/A'} />
                <MetaField icon="🏛️" label="Resource"     value={ticket.resourceType || ticket.resourceName || 'N/A'} />
                <MetaField icon="👤" label="Reported By"  value={ticket.reportedBy?.name} />
                <MetaField icon="📞" label="Contact"      value={ticket.contactDetails} />
                <MetaField icon="🕐" label="Submitted"    value={new Date(ticket.createdAt).toLocaleString()} />
                {ticket.assignedTo && (
                  <MetaField icon="👷" label="Assigned To" value={ticket.assignedTo.name} />
                )}
              </div>

              
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                  PRIORITY {canChangePriority && <span style={{ color: '#9ca3af', fontWeight: 400 }}>(click to change)</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['LOW', 'MEDIUM', 'HIGH'].map(p => {
                    const active = ticket.currentPriority === p;
                    const c = PRIORITY_COLORS[p];
                    return (
                      <button key={p} onClick={() => canChangePriority && handlePriorityChange(p)}
                        style={{
                          padding: '6px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          border: `2px solid ${active ? c : '#e5e7eb'}`,
                          background: active ? `${c}15` : '#f9fafb',
                          color: active ? c : '#9ca3af',
                          cursor: canChangePriority ? 'pointer' : 'default',
                          transition: 'all 0.15s',
                        }}>
                        {p}
                        {ticket.requestedPriority === p && p !== ticket.currentPriority && (
                          <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}>(req)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {ticket.requestedPriority !== ticket.currentPriority && (
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                    User requested: <b>{ticket.requestedPriority}</b> — Current: <b>{ticket.currentPriority}</b>
                  </p>
                )}
              </div>

              {/* Description */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>DESCRIPTION</div>
                <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.6,
                  background: '#f8fafc', padding: 14, borderRadius: 8 }}>
                  {ticket.description}
                </p>
              </div>

              {/* Images */}
              {ticket.imageUrls?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                    EVIDENCE ({ticket.imageUrls.length})
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {ticket.imageUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt={`evidence-${i + 1}`}
                          style={{ width: 120, height: 90, objectFit: 'cover',
                            borderRadius: 8, border: '1.5px solid #e5e7eb', cursor: 'pointer' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution notes (read-only) */}
              {ticket.resolutionNotes && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 8 }}>✅ RESOLUTION NOTES</div>
                  <p style={{ margin: 0, fontSize: 14, color: '#166534', lineHeight: 1.6,
                    background: '#dcfce7', padding: 14, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                    {ticket.resolutionNotes}
                  </p>
                </div>
              )}

              {/* Rejection reason */}
              {ticket.rejectionReason && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', marginBottom: 8 }}>❌ REJECTION REASON</div>
                  <p style={{ margin: 0, fontSize: 14, color: '#991b1b', lineHeight: 1.6,
                    background: '#fee2e2', padding: 14, borderRadius: 8, border: '1px solid #fecaca' }}>
                    {ticket.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── ADMIN ACTION PANEL (OPEN tickets) ── */}
          {isAdmin && ticket.status === 'OPEN' && (
            <div style={actionCard('#eff6ff', '#bfdbfe')}>
              <h4 style={{ margin: '0 0 14px', color: '#1e40af', fontSize: 14 }}>🛡️ Admin Actions</h4>

              {!showAssign && !showReject && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowAssign(true)} style={proceedBtn}>✅ Assign Staff</button>
                  <button onClick={() => setShowReject(true)} style={rejectBtn}>❌ Reject</button>
                </div>
              )}

              
              {showAssign && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Staff Email Address
                  </label>
                  <input
                    placeholder="e.g. staff@campus.lk"
                    value={staffEmail}
                    onChange={e => setStaffEmail(e.target.value)}
                    style={smallInput}
                    type="email"
                  />
                  <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
                    Must be a registered user with role ACADEMIC_STAFF
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleAdminAssign} disabled={assignLoading} style={proceedBtn}>
                      {assignLoading ? 'Assigning…' : 'Confirm Assign'}
                    </button>
                    <button onClick={() => { setShowAssign(false); setStaffEmail(''); }} style={cancelSmBtn}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showReject && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea placeholder="Rejection reason (required)" rows={2}
                    value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    style={smallInput} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleAdminReject} style={rejectBtn}>Confirm Reject</button>
                    <button onClick={() => { setShowReject(false); setRejectReason(''); }} style={cancelSmBtn}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ADMIN: Close resolved ticket ── */}
          {isAdmin && ticket.status === 'RESOLVED' && (
            <div style={actionCard('#dcfce7', '#bbf7d0')}>
              <h4 style={{ margin: '0 0 12px', color: '#166534', fontSize: 14 }}>🔒 Close Ticket</h4>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#374151' }}>
                Resolution notes: <em>{ticket.resolutionNotes}</em>
              </p>
              <button onClick={handleAdminClose} style={proceedBtn}>Close Ticket</button>
            </div>
          )}

          {/* ── STAFF ACTION PANEL ── */}
          {isStaff && isAssigned && ticket.status === 'IN_PROGRESS' && (
            <div style={actionCard('#fffbeb', '#fde68a')}>
              <h4 style={{ margin: '0 0 12px', color: '#92400e', fontSize: 14 }}>👷 Your Actions</h4>

              {!showResolve && !showStaffReject && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {!taskAccepted && (
                    <button onClick={handleStaffAccept} style={proceedBtn}>Accept Task</button>
                  )}
                  {taskAccepted && (
                    <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>✅ Task Accepted</span>
                  )}
                  <button onClick={() => setShowResolve(true)}
                    style={{ ...proceedBtn, background: '#166534' }}>
                    Mark Resolved
                  </button>
                  {/* Only show reject if not yet accepted */}
                  {!taskAccepted && (
                    <button onClick={() => setShowStaffReject(true)} style={rejectBtn}>
                      Reject Assignment
                    </button>
                  )}
                </div>
              )}

              {showResolve && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea placeholder="Resolution notes (required)" rows={3}
                    value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)}
                    style={smallInput} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleStaffResolve} style={{ ...proceedBtn, background: '#166534' }}>
                      Submit Resolution
                    </button>
                    <button onClick={() => setShowResolve(false)} style={cancelSmBtn}>Cancel</button>
                  </div>
                </div>
              )}

              {showStaffReject && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea placeholder="Reason for rejecting assignment" rows={2}
                    value={staffRejectReason} onChange={e => setStaffRejectReason(e.target.value)}
                    style={smallInput} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleStaffRejectAssignment} style={rejectBtn}>Confirm</button>
                    <button onClick={() => setShowStaffReject(false)} style={cancelSmBtn}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: comment thread ── */}
        <div style={commentPanel}>
          <div style={commentHeader}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e3a5f' }}>
              💬 Comments ({comments.length})
            </h3>
          </div>

          {ticket.status === 'REJECTED' ? (
            <div style={disabledNote}>Comments are disabled for rejected tickets.</div>
          ) : (
            <>
              <div style={commentList}>
                {comments.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                    No comments yet. Start the conversation!
                  </p>
                ) : comments.map(c => {
                  
                  const isMe = c.author?.id === myId;
                  const roleIcon = c.author?.role === 'ADMIN' ? '🛡️'
                    : c.author?.role === 'ACADEMIC_STAFF' ? '👷' : '👤';

                  return (
                    <div key={c.id} style={{
                      ...commentBubble,
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      background: isMe ? '#eff6ff' : '#f9fafb',
                      border: `1.5px solid ${isMe ? '#bfdbfe' : '#e5e7eb'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                          {roleIcon} {c.author?.name}
                          {c.author?.role !== 'USER' && (
                            <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>
                              ({c.author?.role?.replace(/_/g, ' ')})
                            </span>
                          )}
                        </span>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {editingId === c.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <textarea rows={2} value={editText}
                            onChange={e => setEditText(e.target.value)} style={smallInput} />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleEditSave(c.id)} style={smGreenBtn}>Save</button>
                            <button onClick={() => setEditingId(null)} style={cancelSmBtn}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                          {c.message}
                        </p>
                      )}

                      {isMe && editingId !== c.id && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button onClick={() => { setEditingId(c.id); setEditText(c.message); }} style={tinyBtn}>
                            <Edit2 size={11} /> Edit
                          </button>
                          <button onClick={() => handleDeleteComment(c.id)} style={tinyBtn}>
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {canComment && (
                <div style={commentInputRow}>
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                    placeholder="Type a message…"
                    style={commentInputStyle}
                  />
                  <button onClick={handleSendComment} disabled={sending || !commentText.trim()} style={sendBtn}>
                    <Send size={16} />
                  </button>
                </div>
              )}
              {!canComment && ticket.status === 'CLOSED' && (
                <div style={disabledNote}>This ticket is closed.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaField({ icon, label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 2 }}>{icon} {label}</div>
      <div style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

const pageWrap    = { maxWidth: 1200, margin: '0 auto', padding: '24px' };
const contentGrid = { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginTop: 16, alignItems: 'start' };
const card        = { background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' };
const cardTopBar  = { background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const metaGrid    = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 };
const backBtn     = { display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: '#374151', marginBottom: 8 };
const commentPanel    = { background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' };
const commentHeader   = { padding: '16px 20px', borderBottom: '1.5px solid #f3f4f6' };
const commentList     = { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 };
const commentBubble   = { borderRadius: 10, padding: '10px 14px', maxWidth: '90%' };
const commentInputRow = { padding: '12px 16px', borderTop: '1.5px solid #f3f4f6', display: 'flex', gap: 8 };
const commentInputStyle = { flex: 1, padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' };
const sendBtn     = { padding: '9px 14px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' };
const actionCard  = (bg, border) => ({ background: bg, border: `1.5px solid ${border}`, borderRadius: 12, padding: 20 });
const proceedBtn  = { padding: '8px 16px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const rejectBtn   = { padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const cancelSmBtn = { padding: '8px 14px', background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13 };
const smGreenBtn  = { padding: '5px 12px', background: '#166534', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 };
const smallInput  = { width: '100%', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' };
const tinyBtn     = { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' };
const disabledNote = { padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 };
const loadingWrap  = { textAlign: 'center', padding: 60, color: '#6b7280', fontSize: 14 };