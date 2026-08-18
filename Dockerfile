# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY safetynet-api/pom.xml .
COPY safetynet-api/src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
