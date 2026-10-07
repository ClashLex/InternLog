# Hosted run: build jar, then run with env DB_URL/DB_USER/DB_PASS/CORS_ORIGINS/JWT_SECRET.
# Render/Railway/Fly: build `mvn -DskipTests package`, start `java -jar app.jar`.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/internlog-backend-1.0.0.jar app.jar
ENV PORT=8080
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
