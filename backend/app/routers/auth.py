from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
import httpx
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.jwt import create_access_token, get_current_user
from app.core.mobile import normalize_mobile
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserOut

router = APIRouter()

COOKIE_NAME = "access_token"
COOKIE_KWARGS = dict(httponly=True, samesite="lax", secure=False)  # set secure=True in production


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    mobile = normalize_mobile(body.mobile_number)

    # Check for duplicate mobile
    if db.query(User).filter(User.mobile_number == mobile).first():
        raise HTTPException(status_code=400, detail="Mobile number already registered.")

    # Check for duplicate email (only when provided)
    if body.email and db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    display_name = body.display_name.strip()
    if not display_name:
        raise HTTPException(status_code=400, detail="Full name is required.")
    user = User(
        mobile_number=mobile,
        email=body.email or None,
        hashed_password=hash_password(body.password),
        display_name=display_name,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Mobile number or email already registered.")
    db.refresh(user)

    token = create_access_token(user.id)
    response.set_cookie(COOKIE_NAME, token, **COOKIE_KWARGS)
    return user


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=UserOut)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    identifier = body.identifier.strip()
    if "@" in identifier:
        user = db.query(User).filter(User.email == identifier).first()
    else:
        mobile = normalize_mobile(identifier)
        user = db.query(User).filter(User.mobile_number == mobile).first()
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    token = create_access_token(user.id)
    response.set_cookie(COOKIE_NAME, token, **COOKIE_KWARGS)
    return user


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"message": "Logged out."}


# ---------------------------------------------------------------------------
# Me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ---------------------------------------------------------------------------
# Google OAuth — redirect to Google
# ---------------------------------------------------------------------------

@router.get("/google")
def google_login():
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        "&access_type=offline"
    )
    return RedirectResponse(google_auth_url)


# ---------------------------------------------------------------------------
# Google OAuth — callback
# ---------------------------------------------------------------------------

@router.get("/google/callback")
def google_callback(code: str, response: Response, db: Session = Depends(get_db)):
    # Exchange code for tokens
    token_response = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
    )
    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange Google auth code.")

    token_data = token_response.json()
    id_token = token_data.get("id_token")

    # Decode the Google ID token (without verification for simplicity; use google-auth lib in production)
    userinfo_response = httpx.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
    )
    if userinfo_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch Google user info.")

    google_user = userinfo_response.json()
    google_id = google_user.get("sub")
    email = google_user.get("email")
    name = google_user.get("name") or email.split("@")[0]

    # Find existing user by google_id or email
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Link Google identity to existing account
            user.google_id = google_id
        else:
            # Create new account
            user = User(
                email=email,
                google_id=google_id,
                display_name=name,
            )
            db.add(user)

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    redirect = RedirectResponse(url=settings.FRONTEND_URL)
    redirect.set_cookie(COOKIE_NAME, token, **COOKIE_KWARGS)
    return redirect
