import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import axiosInstance from '../api/axios';
import useAuthStore from '../store/authStore';
import { NotificationContext } from './notificationContext';

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = useAuthStore((state) => state.user);
  const socketRef = useRef(null);
  const [prevUser, setPrevUser] = useState(user);

  // Clear notifications during render when user logs out, avoiding a
  // synchronous setState inside an effect.
  if (prevUser !== user) {
    setPrevUser(user);
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }

  useEffect(() => {
    if (user) {
      const fetchNotifications = async () => {
        try {
          const res = await axiosInstance.get('/notifications');
          setNotifications(res.data);
          setUnreadCount(res.data.filter(n => !n.read).length);
        } catch (err) {
          console.error('Failed to fetch notifications', err);
        }
      };
      fetchNotifications();

      socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token'),
        },
      });

      socketRef.current.on('newNotification', (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        toast.info(newNotification.message);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.off('newNotification');
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [user]);

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await axiosInstance.put('/notifications/mark-read');
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};