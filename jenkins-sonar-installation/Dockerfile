# Jenkins com as ferramentas que o Jenkinsfile usa: Docker CLI, Python 3 (venv), zip, Azure CLI
# e Node.js (o SonarQube precisa dele para analisar o JavaScript do painel).
# O repositório da Azure CLI ainda não publica pacotes para o Debian 13 (trixie), base do
# jenkins:lts; o pacote do bookworm funciona nele.
FROM jenkins/jenkins:lts-jdk17

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg lsb-release git make zip \
        python3 python3-venv python3-pip nodejs \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /etc/apt/keyrings/microsoft.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/azure-cli/ bookworm main" \
        > /etc/apt/sources.list.d/azure-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-buildx-plugin azure-cli \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV DOCKER_BUILDKIT=1

# O socket do Docker do host é montado pela compose; o Jenkins roda como root para usá-lo.
EXPOSE 8080 50000
