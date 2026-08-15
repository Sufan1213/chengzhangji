@echo off
cd /d "%~dp0"
echo 正在启动本地静态服务器（http://localhost:8080）...
echo 启动后请在浏览器打开 http://localhost:8080
python -m http.server 8080
pause
