@echo off
echo Current Directory:
cd
echo.
echo Files in current directory:
dir /b
echo.
echo Starting VS Code Extension...
code --extensionDevelopmentPath="%CD%"
pause