@echo off
echo 正在安装后端依赖...
cd server
call npm install
cd ..

echo.
echo 正在安装前端依赖...
cd client
call npm install
cd ..

echo.
echo 依赖安装完成！
pause
