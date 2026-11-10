import Modal from "../../modal/Modal";
import { trimFieldOnBlur } from "../../../utils/utils";
import ModalActions, { ActionButton } from "../../elements/ModalActions";

function ProfileModal({
  currentUser,
  isOpen,
  profileForm,
  setProfileForm,
  onClose,
  onSave,
  onProfileImageChange,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      style={{ maxWidth: "500px" }}
      actions={
        <ModalActions
          end={
            <>
              <ActionButton label="Cancel" onClick={onClose} />
              <ActionButton
                label="Save Profile"
                tone="primary"
                onClick={onSave}
              />
            </>
          }
        />
      }
    >
      <div className="auth-form">
        <label className="auth-field">
          <span>Profile Photo</span>
          <div className="profile-image-field">
            <div className="profile-image-preview">
              {profileForm.profileImage ? (
                <img
                  src={profileForm.profileImage}
                  alt="Profile preview"
                  className="profile-image-preview-img"
                />
              ) : (
                <span className="profile-image-preview-fallback">
                  {String(profileForm.firstName || currentUser?.username || "U")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={onProfileImageChange}
            />
            {profileForm.profileImage && (
              <button
                type="button"
                className="secondary-btn profile-photo-clear-btn"
                onClick={() =>
                  setProfileForm((prev) => ({ ...prev, profileImage: "" }))
                }
              >
                Remove Photo
              </button>
            )}
          </div>
        </label>

        <label className="auth-field">
          <span>First Name</span>
          <input
            value={profileForm.firstName}
            onChange={(event) =>
              setProfileForm((prev) => ({
                ...prev,
                firstName: event.target.value,
              }))
            }
            onBlur={trimFieldOnBlur((event) =>
              setProfileForm((prev) => ({
                ...prev,
                firstName: event.target.value,
              })),
            )}
            placeholder="First name"
          />
        </label>

        <label className="auth-field">
          <span>Last Name</span>
          <input
            value={profileForm.lastName}
            onChange={(event) =>
              setProfileForm((prev) => ({
                ...prev,
                lastName: event.target.value,
              }))
            }
            onBlur={trimFieldOnBlur((event) =>
              setProfileForm((prev) => ({
                ...prev,
                lastName: event.target.value,
              })),
            )}
            placeholder="Last name"
          />
        </label>
      </div>
    </Modal>
  );
}

export default ProfileModal;
