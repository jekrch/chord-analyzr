FROM maven:3.8.3-openjdk-17 as BUILD

COPY pom.xml /usr/api/build/
WORKDIR /usr/api/build
RUN mvn dependency:go-offline -B

COPY src /usr/api/build/src

RUN mvn package -Dmaven.test.skip=true

FROM openjdk:17-buster

# install pg client for init.sh
RUN apt-get update && \
    apt-get install -y postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# copy jar from the build stage
COPY --from=BUILD /usr/api/build/target/api-0.0.1-SNAPSHOT.jar /usr/src/app/api.jar

# copy the init.sh script into the final image
COPY init.sh /usr/src/app/init.sh

# Fix Windows line endings
RUN sed -i 's/\r$//' /usr/src/app/init.sh

RUN chmod +x /usr/src/app/init.sh

EXPOSE 8080

ENTRYPOINT ["/usr/src/app/init.sh"]
