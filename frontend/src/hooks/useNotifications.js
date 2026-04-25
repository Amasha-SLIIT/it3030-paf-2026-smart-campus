import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification,
} from '../api/notificationApi';
import { toast } from 'react-toastify';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);

  const lastCountRef = useRef(null);
  const isFirstFetch = useRef(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      const newCount = Number(res.data.count);

      if (isFirstFetch.current) {
        isFirstFetch.current = false;
        lastCountRef.current = newCount;
        setUnreadCount(newCount);

        if (newCount > 0) {
          try {
            const notifRes = await getNotifications();
            setNotifications(notifRes.data);
            const unread = notifRes.data.filter(n => !n.read);
            unread.forEach((n, i) => {
              setTimeout(() => {
                toast.info(`🔔 ${n.title} — ${n.message}`, {  
                  toastId: `login-notif-${n.id}`,
                  autoClose: 6000,
                });
              }, i * 800);
            });
          } catch (err) {
            console.error('Failed to fetch notifications for login toast', err);
          }
        }
        return;
      }

      if (lastCountRef.current !== null && newCount > lastCountRef.current) {
        toast.info('🔔 You have a new notification!', {
          toastId: 'new-notif',
          autoClose: 3000,
        });
      }

      lastCountRef.current = newCount;
      setUnreadCount(newCount);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  }, []);

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => {
      const next = Math.max(0, prev - 1);
      lastCountRef.current = next;
      return next;
    });
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    lastCountRef.current = 0;
  };

  const handleDelete = async (id) => {
    const notif = notifications.find(n => n.id === id);
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (!notif?.read) {
      setUnreadCount(prev => {
        const next = Math.max(0, prev - 1);
        lastCountRef.current = next;
        return next;
      });
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []); 

  return {
    notifications, unreadCount, loading,
    fetchNotifications,
    handleMarkAsRead, handleMarkAllAsRead, handleDelete,
  };
}