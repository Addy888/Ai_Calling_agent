"""Middleware for training engine."""

from typing import Callable

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware


async def verify_token(token: str = None) -> str:
    """
    Verify JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Verified token
        
    Raises:
        HTTPException: If token is invalid
    """
    # In production, implement actual JWT verification
    # For now, accept any token for development
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )
    
    # TODO: Implement JWT verification
    # jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    
    return token


async def authentication_middleware(request: Request, call_next):
    """
    Authentication middleware.
    
    Args:
        request: FastAPI request
        call_next: Next middleware/route handler
        
    Returns:
        Response
    """
    # Skip authentication for health and docs endpoints
    if request.url.path in ["/", "/health", "/api/v1/health", "/docs", "/redoc", "/openapi.json"]:
        return await call_next(request)
    
    # Check for Authorization header
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        return await call_next(request)  # Allow for now
    
    # Verify token
    try:
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            await verify_token(token)
    except Exception:
        pass  # Allow for now
    
    return await call_next(request)


async def error_handling_middleware(request: Request, call_next):
    """
    Error handling middleware.
    
    Args:
        request: FastAPI request
        call_next: Next middleware/route handler
        
    Returns:
        Response
    """
    try:
        return await call_next(request)
    except Exception as e:
        # Log error
        print(f"Error: {str(e)}")
        
        # Return error response
        from fastapi.responses import JSONResponse
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Internal server error",
                "error": str(e),
            },
        )


async def logging_middleware(request: Request, call_next):
    """
    Logging middleware.
    
    Args:
        request: FastAPI request
        call_next: Next middleware/route handler
        
    Returns:
        Response
    """
    # Log request
    print(f"{request.method} {request.url.path}")
    
    # Process request
    response = await call_next(request)
    
    # Log response
    print(f"Status: {response.status_code}")
    
    return response


__all__ = [
    "verify_token",
    "authentication_middleware",
    "error_handling_middleware",
    "logging_middleware",
]
