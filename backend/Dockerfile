# Build from the repository root: docker build -f backend/Dockerfile -t internlog .
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app/backend
COPY backend/pom.xml .
RUN mvn -q dependency:go-offline
COPY backend/src ./src
COPY index.html 404.html /app/
COPY css /app/css
COPY js /app/js
COPY user /app/user
COPY company /app/company
COPY admin /app/admin
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/backend/target/internlog-backend-1.0.0.jar app.jar
ENV PORT=8080
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
