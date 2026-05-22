FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
RUN apt-get update && apt-get install -y git
RUN git clone https://github.com/DinIsleriYuksekKurulu/AwqatSalah.git .
RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
COPY appsettings.json .
EXPOSE 8082
ENTRYPOINT ["dotnet", "DiyanetNamazVakti.Api.dll"]
