import { useState, useEffect, useRef } from "react";
import { MAX_PROFILE_IMAGE_SIZE, createProfileForm } from "../wholesaleConfig";
import { updateUserProfile } from "../../../../firebase/firestoreService";

export function useProfileManager({ currentUser, setCurrentUser, sessionStorageKey }) {
  const [profileForm, setProfileForm] = useState(() =>
    createProfileForm(currentUser),
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    setProfileForm(createProfileForm(currentUser));
  }, [currentUser?.firstName, currentUser?.lastName, currentUser?.profileImage]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSaveProfile() {
    if (!currentUser?.id) return;

    try {
      const updatedNames = await updateUserProfile({
        id: currentUser.id,
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        profileImage: profileForm.profileImage,
      });

      const nextUser = { ...currentUser, ...updatedNames };
      localStorage.setItem(sessionStorageKey, JSON.stringify(nextUser));
      setCurrentUser(nextUser);
      setIsProfileModalOpen(false);
      setIsProfileMenuOpen(false);
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Unable to update profile. Check your database connection.");
    }
  }

  function handleProfileImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file for your profile photo.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      alert("Profile photo must be smaller than 600 KB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((prev) => ({
        ...prev,
        profileImage: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return {
    profileForm,
    setProfileForm,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isProfileMenuOpen,
    setIsProfileMenuOpen,
    profileMenuRef,
    handleSaveProfile,
    handleProfileImageChange,
  };
}
