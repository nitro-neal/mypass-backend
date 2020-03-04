cd /~
mkdir CIRCLE-CI-MYPASS-BACKEND || echo Directory Exists, Continuing...


cd CIRCLE-CI-MYPASS-BACKEND
git clone https://github.com/nitro-neal/mypass-backend.git || echo Already Cloned, Continuing...

cd mypass-backend
git pull

yarn

forever stop --uid "backend"
forever start --uid "backend" app.js

echo ~~FINISHED~~