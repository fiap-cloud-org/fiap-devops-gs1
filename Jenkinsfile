// Pipeline de CI/CD: testes, análise no SonarQube, imagem no Docker Hub e deploy no Azure Web App.
//
// Credenciais que precisam existir no Jenkins (Manage Jenkins > Credentials):
//   dockerhub        Username with password  usuário e token de acesso do Docker Hub
//   azure-sp         Username with password  appId (client id) e senha do Service Principal
//   azure-tenant-id  Secret text             tenant id do Azure AD
//   sonar-token      Secret text             token do SonarQube (usado pelo servidor "sonar-server")
pipeline {
    agent any

    parameters {
        string(name: 'DOCKERHUB_REPO', defaultValue: 'william201192/fiap-devops-gs1', description: 'Repositório da imagem no Docker Hub (usuario/nome)')
        string(name: 'AZURE_APP_NAME', defaultValue: 'fiap-devops-gs1', description: 'Nome do Azure Web App')
        string(name: 'AZURE_RG', defaultValue: 'rg-fiap-devops-gs1', description: 'Resource group do Web App')
        booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Publicar a imagem e fazer o deploy no Azure')
    }

    environment {
        IMAGE_TAG = "${BUILD_NUMBER}"
        IMAGE = "${params.DOCKERHUB_REPO}:${BUILD_NUMBER}"
    }

    options {
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Preparar ambiente') {
            steps {
                sh '''
                    python3 -m venv venv
                    . venv/bin/activate
                    pip install -r requirements-dev.txt
                '''
            }
        }

        stage('Testes') {
            steps {
                sh '''
                    . venv/bin/activate
                    pytest --cov=. --cov-report=xml:coverage.xml --junitxml=report.xml
                '''
            }
            post {
                always {
                    junit 'report.xml'
                }
            }
        }

        stage('SonarQube') {
            environment {
                SCANNER_HOME = tool 'sonar-scanner'
            }
            steps {
                withSonarQubeEnv('sonar-server') {
                    sh '${SCANNER_HOME}/bin/sonar-scanner'
                }
            }
        }

        stage('Docker build') {
            steps {
                sh '''
                    docker build \
                        --build-arg APP_VERSION="$BUILD_NUMBER" \
                        --build-arg GIT_COMMIT="${GIT_COMMIT:-}" \
                        -t "$IMAGE" -t "${DOCKERHUB_REPO}:latest" .
                '''
            }
        }

        stage('Push para o Docker Hub') {
            when { expression { params.DEPLOY } }
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKERHUB_USER', passwordVariable: 'DOCKERHUB_TOKEN')]) {
                    sh '''
                        echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin
                        docker push "$IMAGE"
                        docker push "${DOCKERHUB_REPO}:latest"
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy no Azure Web App') {
            when { expression { params.DEPLOY } }
            steps {
                withCredentials([
                    usernamePassword(credentialsId: 'azure-sp', usernameVariable: 'AZURE_CLIENT_ID', passwordVariable: 'AZURE_CLIENT_SECRET'),
                    string(credentialsId: 'azure-tenant-id', variable: 'AZURE_TENANT_ID')
                ]) {
                    sh '''
                        az login --service-principal -u "$AZURE_CLIENT_ID" -p "$AZURE_CLIENT_SECRET" --tenant "$AZURE_TENANT_ID" --output none
                        rm -f app.zip
                        zip -r app.zip main.py requirements.txt templates static
                        az webapp config appsettings set --resource-group "$AZURE_RG" --name "$AZURE_APP_NAME" --output none \
                            --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true APP_ENV=prod APP_VERSION="$BUILD_NUMBER" GIT_COMMIT="${GIT_COMMIT:-}"
                        az webapp config set --resource-group "$AZURE_RG" --name "$AZURE_APP_NAME" --output none \
                            --startup-file "gunicorn --bind=0.0.0.0 --timeout 600 main:app"
                        az webapp deploy --resource-group "$AZURE_RG" --name "$AZURE_APP_NAME" --src-path app.zip --type zip
                        az logout
                    '''
                }
            }
        }
    }

    post {
        always {
            deleteDir()
        }
        success {
            echo "Pipeline concluído: ${env.IMAGE}"
        }
        failure {
            echo 'Pipeline falhou.'
        }
    }
}
