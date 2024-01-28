FROM maven:3.8.3-openjdk-17 as BUILD

COPY pom.xml /usr/api/build/
WORKDIR /usr/api/build
RUN mvn dependency:go-offline -B

COPY src /usr/api/build/src

RUN mvn package -Dmaven.test.skip=true

FROM openjdk:17

COPY --from=BUILD /usr/api/build/target/api-0.0.1-SNAPSHOT.jar /usr/src/app/api.jar

EXPOSE 8080
ENTRYPOINT ["java","-Xverify:none","-jar", "/usr/src/app/api.jar"]