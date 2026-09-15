import os
import json
from datetime import datetime
from bson import ObjectId
import pymongo


DATA_FILE = os.path.join(os.path.dirname(__file__), "data_store.json")

def get_database():
    mongo_uri = os.environ.get("MONGO_URI")
    db_name = os.environ.get("DB_NAME", "it_helpdesk_db")

    if mongo_uri:
        try:
            client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            client.server_info() # Test connection
            print(f"Connected to MongoDB via MONGO_URI ({db_name})")
            return client[db_name], False
        except Exception as e:
            print(f"Could not connect to real MongoDB ({e}). Falling back to local PyMongo mock engine.")

    # Fallback to mongomock
    import mongomock
    client = mongomock.MongoClient()
    db = client[db_name]
    print(f"Using PyMongo-compatible mock database with local JSON persistence ({DATA_FILE})")
    return db, True

db, is_mock = get_database()

# Collections
users_col = db["users"]
tickets_col = db["tickets"]
comments_col = db["comments"]

def persist_to_disk():
    """Saves current collections to data_store.json if running in mock mode"""
    if not is_mock:
        return
    try:
        data = {
            "users": list(users_col.find()),
            "tickets": list(tickets_col.find()),
            "comments": list(comments_col.find())
        }
        # Convert ObjectIds and datetimes to serializable strings
        def serialize_helper(obj):
            if isinstance(obj, ObjectId):
                return str(obj)
            if isinstance(obj, datetime):
                return obj.isoformat()
            if isinstance(obj, list):
                return [serialize_helper(x) for x in obj]
            if isinstance(obj, dict):
                return {k: serialize_helper(v) for k, v in obj.items()}
            return obj

        serializable_data = serialize_helper(data)
        with open(DATA_FILE, "w") as f:
            json.dump(serializable_data, f, indent=2)
    except Exception as err:
        print(f"Error persisting to disk: {err}")

def load_from_disk():
    """Loads state from data_store.json if it exists"""
    if not is_mock or not os.path.exists(DATA_FILE):
        return False
    try:
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
            
        users_col.drop()
        tickets_col.drop()
        comments_col.drop()

        for u in data.get("users", []):
            u["_id"] = ObjectId(u["_id"])
            users_col.insert_one(u)
        for t in data.get("tickets", []):
            t["_id"] = ObjectId(t["_id"])
            tickets_col.insert_one(t)
        for c in data.get("comments", []):
            c["_id"] = ObjectId(c["_id"])
            comments_col.insert_one(c)
        print(f"Restored {users_col.count_documents({})} users, {tickets_col.count_documents({})} tickets from data_store.json")
        return True
    except Exception as err:
        print(f"Could not load data from disk: {err}")
        return False
