@echo off

REM Start Training Engine in development mode

echo Starting AI Training Engine...

REM Activate virtual environment if it exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM Start server with auto-reload
python main.py
