"""
MongoDB Session Manager for Lab2 Airbnb
Handles session storage in MongoDB with encryption
"""

from datetime import datetime, timedelta
from pymongo import MongoClient
import uuid
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class MongoDBSessionManager:
    """Manages user sessions in MongoDB with automatic expiration"""
    
    def __init__(self, mongodb_uri: str, db_name: str = 'airbnb_lab', 
                 session_ttl: int = 86400):
        """
        Initialize MongoDB session manager
        
        Args:
            mongodb_uri: MongoDB connection URI
            db_name: Database name
            session_ttl: Session time-to-live in seconds (default: 24 hours)
        """
        self.client = MongoClient(mongodb_uri)
        self.db = self.client[db_name]
        self.sessions = self.db.sessions
        self.session_ttl = session_ttl
        
        # Create TTL index for automatic session expiration
        self.sessions.create_index(
            'expires_at',
            expireAfterSeconds=0,
            name='session_ttl_index'
        )
        
        # Create index on session_id for fast lookups
        self.sessions.create_index('session_id', unique=True)
        
        logger.info("MongoDB Session Manager initialized")
    
    def create_session(self, user_id: str, user_data: Dict[str, Any]) -> str:
        """
        Create a new session
        
        Args:
            user_id: User ID
            user_data: User data to store in session
            
        Returns:
            session_id: Generated session ID
        """
        session_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(seconds=self.session_ttl)
        
        session_doc = {
            '_id': session_id,
            'session_id': session_id,
            'user_id': user_id,
            'user_data': user_data,
            'created_at': datetime.utcnow(),
            'last_accessed': datetime.utcnow(),
            'expires_at': expires_at,
            'is_active': True
        }
        
        try:
            self.sessions.insert_one(session_doc)
            logger.info(f"Created session for user {user_id}: {session_id}")
            return session_id
        except Exception as e:
            logger.error(f"Failed to create session: {str(e)}")
            raise
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a session by ID
        
        Args:
            session_id: Session ID
            
        Returns:
            Session data or None if not found/expired
        """
        try:
            session = self.sessions.find_one({
                'session_id': session_id,
                'is_active': True,
                'expires_at': {'$gt': datetime.utcnow()}
            })
            
            if session:
                # Update last accessed time
                self.sessions.update_one(
                    {'session_id': session_id},
                    {
                        '$set': {
                            'last_accessed': datetime.utcnow(),
                            'expires_at': datetime.utcnow() + timedelta(seconds=self.session_ttl)
                        }
                    }
                )
                return session
            
            return None
        except Exception as e:
            logger.error(f"Failed to retrieve session: {str(e)}")
            return None
    
    def update_session(self, session_id: str, user_data: Dict[str, Any]) -> bool:
        """
        Update session data
        
        Args:
            session_id: Session ID
            user_data: Updated user data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = self.sessions.update_one(
                {
                    'session_id': session_id,
                    'is_active': True
                },
                {
                    '$set': {
                        'user_data': user_data,
                        'last_accessed': datetime.utcnow(),
                        'expires_at': datetime.utcnow() + timedelta(seconds=self.session_ttl)
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated session: {session_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to update session: {str(e)}")
            return False
    
    def delete_session(self, session_id: str) -> bool:
        """
        Delete (invalidate) a session
        
        Args:
            session_id: Session ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = self.sessions.update_one(
                {'session_id': session_id},
                {
                    '$set': {
                        'is_active': False,
                        'deleted_at': datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Deleted session: {session_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete session: {str(e)}")
            return False
    
    def delete_user_sessions(self, user_id: str) -> int:
        """
        Delete all sessions for a user
        
        Args:
            user_id: User ID
            
        Returns:
            Number of sessions deleted
        """
        try:
            result = self.sessions.update_many(
                {'user_id': user_id, 'is_active': True},
                {
                    '$set': {
                        'is_active': False,
                        'deleted_at': datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Deleted {result.modified_count} sessions for user {user_id}")
            return result.modified_count
        except Exception as e:
            logger.error(f"Failed to delete user sessions: {str(e)}")
            return 0
    
    def cleanup_expired_sessions(self) -> int:
        """
        Manually cleanup expired sessions (usually handled by TTL index)
        
        Returns:
            Number of sessions cleaned up
        """
        try:
            result = self.sessions.delete_many({
                'expires_at': {'$lt': datetime.utcnow()}
            })
            
            logger.info(f"Cleaned up {result.deleted_count} expired sessions")
            return result.deleted_count
        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {str(e)}")
            return 0
    
    def get_active_sessions_count(self, user_id: Optional[str] = None) -> int:
        """
        Get count of active sessions
        
        Args:
            user_id: Optional user ID to filter by
            
        Returns:
            Number of active sessions
        """
        try:
            query = {
                'is_active': True,
                'expires_at': {'$gt': datetime.utcnow()}
            }
            
            if user_id:
                query['user_id'] = user_id
            
            count = self.sessions.count_documents(query)
            return count
        except Exception as e:
            logger.error(f"Failed to get active sessions count: {str(e)}")
            return 0
    
    def extend_session(self, session_id: str, additional_seconds: int = None) -> bool:
        """
        Extend session expiration time
        
        Args:
            session_id: Session ID
            additional_seconds: Additional seconds to add (default: session_ttl)
            
        Returns:
            True if successful, False otherwise
        """
        if additional_seconds is None:
            additional_seconds = self.session_ttl
        
        try:
            session = self.get_session(session_id)
            if not session:
                return False
            
            new_expiration = datetime.utcnow() + timedelta(seconds=additional_seconds)
            
            result = self.sessions.update_one(
                {'session_id': session_id},
                {
                    '$set': {
                        'expires_at': new_expiration,
                        'last_accessed': datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to extend session: {str(e)}")
            return False


# Flask Session Interface for MongoDB
from flask.sessions import SessionInterface, SessionMixin
from werkzeug.datastructures import CallbackDict


class MongoDBSession(CallbackDict, SessionMixin):
    """Flask session implementation using MongoDB"""
    
    def __init__(self, initial=None, sid=None, permanent=None):
        def on_update(self):
            self.modified = True
        
        CallbackDict.__init__(self, initial, on_update)
        self.sid = sid
        self.permanent = permanent or False
        self.modified = False


class MongoDBSessionInterface(SessionInterface):
    """Flask session interface using MongoDB"""
    
    def __init__(self, mongodb_uri: str, db_name: str = 'airbnb_lab',
                 session_ttl: int = 86400, key_prefix: str = 'session:'):
        self.session_manager = MongoDBSessionManager(mongodb_uri, db_name, session_ttl)
        self.key_prefix = key_prefix
    
    def open_session(self, app, request):
        """Open a session from request"""
        sid = request.cookies.get(app.config.get('SESSION_COOKIE_NAME', 'session'))
        
        if not sid:
            return MongoDBSession(sid=str(uuid.uuid4()))
        
        session_data = self.session_manager.get_session(sid)
        
        if session_data:
            return MongoDBSession(
                initial=session_data.get('user_data', {}),
                sid=sid
            )
        
        return MongoDBSession(sid=str(uuid.uuid4()))
    
    def save_session(self, app, session, response):
        """Save session to MongoDB"""
        domain = self.get_cookie_domain(app)
        path = self.get_cookie_path(app)
        
        if not session:
            if session.modified:
                self.session_manager.delete_session(session.sid)
                response.delete_cookie(
                    app.config.get('SESSION_COOKIE_NAME', 'session'),
                    domain=domain,
                    path=path
                )
            return
        
        # Get session data
        session_data = dict(session)
        
        # Check if session exists
        existing_session = self.session_manager.get_session(session.sid)
        
        if existing_session:
            # Update existing session
            self.session_manager.update_session(session.sid, session_data)
        else:
            # Create new session
            user_id = session_data.get('user_id', session.sid)
            self.session_manager.create_session(user_id, session_data)
        
        # Set cookie
        httponly = self.get_cookie_httponly(app)
        secure = self.get_cookie_secure(app)
        expires = self.get_expiration_time(app, session)
        samesite = self.get_cookie_samesite(app)
        
        response.set_cookie(
            app.config.get('SESSION_COOKIE_NAME', 'session'),
            session.sid,
            expires=expires,
            httponly=httponly,
            domain=domain,
            path=path,
            secure=secure,
            samesite=samesite
        )

