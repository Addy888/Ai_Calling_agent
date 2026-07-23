@echo off

REM Setup Training Engine

echo Setting up AI Training Engine...

REM Check Python version
python --version

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo Please edit .env with your configuration
)

REM Create required directories
echo Creating directories...
if not exist "data\training" mkdir data\training
if not exist "data\models" mkdir data\models
if not exist "data\checkpoints" mkdir data\checkpoints
if not exist "logs" mkdir logs

echo Setup complete!
echo To start the server, run: python main.py
