FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/ ./
RUN npm install 
RUN npm run build


FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build

WORKDIR /app/backend
COPY backend/ ./
RUN dotnet restore "./Backend.csproj"
RUN dotnet publish "./Backend.csproj" -c Release -o /app/publish  /p:UseAppHost=false


FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final

WORKDIR /app
COPY --from=backend-build /app/publish ./

# Replace assets with frontend
RUN rm -rf wwwroot
COPY --from=frontend-build /app/frontend/build/client ./wwwroot

EXPOSE 8080
EXPOSE 8081

ENTRYPOINT ["dotnet", "Backend.dll"]