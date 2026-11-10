import Modal from "../../../../modal/Modal";
import ModalActions, { ActionButton } from "../../../../elements/ModalActions";

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
        <ModalActions
          end={
            <>
              <ActionButton label="Cancel" onClick={onClose} />
              <ActionButton
                label="Save Notes"
                tone="primary"
                onClick={saveNotes}
              />
            </>
          }
        />
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
