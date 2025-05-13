cd frontend
npm install
npm run build
cd ..

cd backend
dotnet publish ./Backend.csproj -c Release 
cd ..

DIR="./bin"
[ -d "$DIR" ] && rm -r "$DIR"
mv ./backend/bin/Release/net8.0/publish "$DIR"

[ -d "$DIR/wwwroot" ] && rm -r "$DIR/wwwroot"
mv ./frontend/build/client "$DIR/wwwroot"