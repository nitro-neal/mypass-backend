cd /~
mkdir CIRCLE-CI-MYPASS-BACKEND || echo Directory Exists, Continuing...


cd CIRCLE-CI-MYPASS-BACKEND
git clone https://github.com/cityofaustin/mypass.git || echo Already Cloned, Continuing...

cd mypass
git pull

docker-compose down
docker-compose build
docker-compose up -d

echo ~~FINISHED~~