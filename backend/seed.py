import datetime
from bson import ObjectId
from database import users_col, tickets_col, comments_col, is_mock, persist_to_disk, load_from_disk
from auth import hash_password

def seed_initial_data(force=False):
    """
    In production/live mode, default seed does not inject demo accounts.
    Users and administrators register via the live registration portal.
    Support staff accounts are provisioned exclusively by administrators.
    """
    if not force:
        if load_from_disk():
            return
        if users_col.count_documents({}) > 0:
            return

    # Clean data store with zero mock accounts
    persist_to_disk()
    print("Database initialized for production live mode (0 demo accounts).")

if __name__ == "__main__":
    seed_initial_data(force=True)

