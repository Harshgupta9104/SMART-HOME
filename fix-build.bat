@echo off
echo Clearing Android Gradle Cache...
rmdir /s /q "%USERPROFILE%\.gradle\caches" 2>nul
rmdir /s /q "android\.gradle" 2>nul
rmdir /s /q "android\app\build" 2>nul

echo Clearing node_modules...
rmdir /s /q "node_modules" 2>nul
del package-lock.json 2>nul

echo Installing dependencies...
call npm install

echo Cleaning Android build...
cd android
call gradlew clean
cd ..

echo Build fix complete! Try: npm run android
pause
