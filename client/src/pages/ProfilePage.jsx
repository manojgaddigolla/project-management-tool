import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import useAuthStore from "../store/authStore";
import { updateProfile } from "../services/authService";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    avatar: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedUser = await updateProfile({
        name: formData.name,
        email: formData.email,
        avatar: formData.avatar,
      });
      setUser(updatedUser);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.msg || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="profile-page-container">
      <div className="profile-header">
        <h1>Your Profile</h1>
        <p>Manage your account settings and preferences.</p>
      </div>

      <div className="profile-content">
        <div className="profile-avatar-section">
          <div className="avatar-preview">
            {formData.avatar ? (
              <img src={formData.avatar} alt={formData.name} />
            ) : (
              <div className="avatar-placeholder">
                {formData.name?.slice(0, 2).toUpperCase() || "U"}
              </div>
            )}
          </div>
          <div className="avatar-info">
            <h3>Profile Picture</h3>
            <p>Provide a valid image URL to update your avatar.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="avatar">Avatar URL</label>
            <input
              type="url"
              id="avatar"
              name="avatar"
              value={formData.avatar}
              onChange={handleChange}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <button type="submit" className="profile-save-button" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
