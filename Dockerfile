FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/maze-escape-1.0.0.jar app.jar
EXPOSE 8080
CMD ["sh", "-c", "java -XX:+UseSerialGC -Xms64m -Xmx384m -Dserver.port=${PORT:-8080} -jar app.jar"]
