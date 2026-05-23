import Modal from "../../../../modal/Modal";

function NotesModal({
  isOpen,
  onClose,
  selectedDeal,
  notesDraft,
  setNotesDraft,
  saveNotes,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Notes for ${selectedDeal?.address}`}
      style={{ maxWidth: "500px" }}
      actions={
        <>
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-btn" onClick={saveNotes}>
            Save Notes
          </button>
        </>
      }
    >
      <textarea
        value={notesDraft}
        onChange={(e) => setNotesDraft(e.target.value)}
        rows="6"
        placeholder="Add your notes here..."
      />
    </Modal>
  );
}

export default NotesModal;
